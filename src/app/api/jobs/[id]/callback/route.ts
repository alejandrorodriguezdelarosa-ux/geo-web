import { timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const callbackSchema = z.object({
  status: z.enum(["succeeded", "failed"]),
  summary: z.string().optional(),
  errorMessage: z.string().optional(),
})

function secretsEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) {
    // Still run a dummy comparison to avoid timing leaks on length
    timingSafeEqual(ab, ab)
    return false
  }
  return timingSafeEqual(ab, bb)
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/jobs/[id]/callback">
) {
  const configuredSecret = process.env.N8N_CALLBACK_SECRET
  if (!configuredSecret) {
    return NextResponse.json({ error: "Callback secret not configured" }, { status: 503 })
  }

  const incomingSecret = req.headers.get("x-callback-secret") ?? ""
  if (!secretsEqual(incomingSecret, configuredSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const parsed = callbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const job = await prisma.job.findUnique({ where: { id }, select: { id: true, status: true } })
  if (!job) {
    return NextResponse.json({ error: "Job no encontrado" }, { status: 404 })
  }

  // Detect Shopify auth failures so the UI can surface a "Reconnect" CTA.
  // We do NOT auto-revoke the ShopifyConnection — a 401 can be transient.
  let failureReason: string | null = null
  if (parsed.data.status === "failed" && parsed.data.errorMessage) {
    const msg = parsed.data.errorMessage.toLowerCase()
    if (
      msg.includes("401") ||
      msg.includes("403") ||
      msg.includes("unauthorized") ||
      msg.includes("invalid api key") ||
      msg.includes("invalid_token") ||
      msg.includes("authentication") ||
      msg.includes("revoked")
    ) {
      failureReason = "token_revoked"
    }
  }

  // Si el job ya está en estado terminal, se acepta la llamada igualmente y se sobreescribe.
  // n8n podría reintentar el callback; rechazarlo con 4xx provocaría bucles de reintento.
  await prisma.job.update({
    where: { id },
    data: {
      status: parsed.data.status,
      summary: parsed.data.summary ?? null,
      errorMessage: parsed.data.errorMessage ?? null,
      failureReason,
      finishedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}
