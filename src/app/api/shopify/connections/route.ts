import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/shopify-crypto"

const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/shopify/callback`

const createConnectionSchema = z.object({
  shopDomain: z
    .string()
    .regex(
      /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/,
      "shopDomain debe tener formato xxx.myshopify.com (minúsculas, sin https)"
    ),
  clientId: z.string().min(1, "clientId no puede estar vacío"),
  clientSecret: z.string().min(1, "clientSecret no puede estar vacío"),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const parsed = createConnectionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    )
  }

  const { shopDomain, clientId, clientSecret } = parsed.data

  const existing = await prisma.shopifyConnection.findFirst({
    where: { userId: session.user.id, shopDomain },
    select: { id: true, status: true },
  })

  if (existing) {
    if (existing.status === "pending" || existing.status === "active") {
      return NextResponse.json(
        { error: "Ya existe una conexión activa o pendiente para este dominio" },
        { status: 409 }
      )
    }
    // Revoked: reset with new credentials so the user can reconnect
    const clientSecretEnc = encrypt(clientSecret)
    const updated = await prisma.shopifyConnection.update({
      where: { id: existing.id },
      data: {
        clientId,
        clientSecretEnc,
        accessTokenEnc: null,
        scopes: "",
        status: "pending",
        revokedAt: null,
        installedAt: null,
      },
      select: { id: true },
    })
    return NextResponse.json(
      { connectionId: updated.id, redirectUrl: REDIRECT_URI },
      { status: 201 }
    )
  }

  const clientSecretEnc = encrypt(clientSecret)
  const connection = await prisma.shopifyConnection.create({
    data: {
      userId: session.user.id,
      shopDomain,
      clientId,
      clientSecretEnc,
      accessTokenEnc: null,
      scopes: "",
      status: "pending",
    },
    select: { id: true },
  })

  return NextResponse.json(
    { connectionId: connection.id, redirectUrl: REDIRECT_URI },
    { status: 201 }
  )
}

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const connections = await prisma.shopifyConnection.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      shopDomain: true,
      clientId: true,
      status: true,
      scopes: true,
      installedAt: true,
      createdAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(connections)
}
