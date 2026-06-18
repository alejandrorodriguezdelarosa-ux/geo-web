import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/shopify-crypto"

const createJobSchema = z.object({
  storeDomain: z.string()
    .min(3)
    .refine(
      (d) => d.endsWith(".myshopify.com") || /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(d),
      "Dominio inválido"
    ),
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

  const parsed = createJobSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { storeDomain } = parsed.data

  // Obtener el token desde la conexión OAuth activa — nunca del cliente
  const connection = await prisma.shopifyConnection.findFirst({
    where: {
      userId: session.user.id,
      shopDomain: storeDomain,
      status: "active",
    },
    select: { accessTokenEnc: true },
  })

  if (!connection?.accessTokenEnc) {
    return NextResponse.json(
      {
        error:
          "No tienes una conexión activa con esa tienda. Conéctala en /app/shopify.",
      },
      { status: 400 }
    )
  }

  let accessToken: string
  try {
    accessToken = decrypt(connection.accessTokenEnc)
  } catch {
    return NextResponse.json(
      { error: "Error al descifrar el token de acceso. Reconecta la tienda en /app/shopify." },
      { status: 500 }
    )
  }

  // Crear el job en estado pending
  const job = await prisma.job.create({
    data: {
      userId: session.user.id,
      storeDomain,
      status: "pending",
    },
    select: { id: true },
  })

  const webhookUrl = process.env.N8N_WEBHOOK_URL
  const callbackSecret = process.env.N8N_CALLBACK_SECRET

  if (!webhookUrl || !callbackSecret) {
    accessToken = ""
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errorMessage: "n8n webhook no configurado todavía",
        finishedAt: new Date(),
      },
    })
    return NextResponse.json(
      { jobId: job.id, error: "n8n webhook no configurado todavía" },
      { status: 503 }
    )
  }

  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/jobs/${job.id}/callback`

  // Llamar al webhook de n8n
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Callback-Secret": callbackSecret,
      },
      body: JSON.stringify({
        jobId: job.id,
        storeDomain,
        shopifyToken: accessToken,
        callbackUrl,
        callbackSecret,
      }),
    })

    // Limpiar el token de memoria tras la petición
    accessToken = ""

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`n8n respondió ${res.status}: ${text.slice(0, 200)}`)
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { status: "running" },
    })

    return NextResponse.json({ jobId: job.id, status: "running" }, { status: 202 })
  } catch (err) {
    accessToken = ""
    const msg = err instanceof Error ? err.message : "Error desconocido al llamar a n8n"
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errorMessage: msg,
        finishedAt: new Date(),
      },
    })
    return NextResponse.json(
      { jobId: job.id, error: "No se pudo lanzar el enriquecimiento", details: msg },
      { status: 502 }
    )
  }
}
