import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const createJobSchema = z.object({
  storeDomain: z.string()
    .min(3)
    .refine(
      (d) => d.endsWith(".myshopify.com") || /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(d),
      "Dominio inválido"
    ),
  shopifyToken: z.string()
    .refine(
      (t) => t.startsWith("shpat_") || t.startsWith("shpca_"),
      "Token de Shopify inválido (debe empezar por shpat_ o shpca_)"
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

  // Crear el job en estado pending
  const job = await prisma.job.create({
    data: {
      userId: session.user.id,
      storeDomain: parsed.data.storeDomain,
      status: "pending",
    },
    select: { id: true },
  })

  // Webhook URL de n8n + secret de callback (se rellenan en T10, por ahora pueden estar vacíos)
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  const callbackSecret = process.env.N8N_CALLBACK_SECRET

  if (!webhookUrl || !callbackSecret) {
    // n8n aún no configurado: marcar como failed para no dejar el job huérfano
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errorMessage: "n8n webhook no configurado todavía (pendiente T10)",
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
        storeDomain: parsed.data.storeDomain,
        shopifyToken: parsed.data.shopifyToken,
        callbackUrl,
        callbackSecret,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`n8n respondió ${res.status}: ${text.slice(0, 200)}`)
    }

    // Actualizar a running
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "running" },
    })

    return NextResponse.json({ jobId: job.id, status: "running" }, { status: 202 })
  } catch (err) {
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
