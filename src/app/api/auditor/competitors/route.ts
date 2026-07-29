import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { registrarActividad } from "@/lib/actividad"

const bodySchema = z.object({
  mode: z.enum(["text", "url"]),
  companyId: z.string().optional(),
  text: z.string().optional(),
  url: z.string().url().optional(),
  title: z.string().optional(),
  niche: z.string().optional(),
  positioning: z.string().optional(),
  manual_competitor_urls: z.array(z.string()).optional(),
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

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues
    return NextResponse.json(
      { error: issues[0]?.message ?? "Parámetros inválidos" },
      { status: 400 }
    )
  }

  const { mode, text, url, title, niche, positioning, manual_competitor_urls } = parsed.data

  if (mode === "text" && (!text || text.length < 50)) {
    return NextResponse.json(
      { error: "El texto debe tener al menos 50 caracteres" },
      { status: 400 }
    )
  }

  if (mode === "url" && !url) {
    return NextResponse.json(
      { error: "Debes proporcionar una URL" },
      { status: 400 }
    )
  }

  const geoApiBase = process.env.GEO_API_BASE
  if (!geoApiBase) {
    return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 })
  }

  const requestBody =
    mode === "text"
      ? { text, title: title || "", niche: niche || undefined, positioning: positioning || undefined, manual_competitor_urls: manual_competitor_urls && manual_competitor_urls.length ? manual_competitor_urls : undefined }
      : { url, title: title || "", niche: niche || undefined, positioning: positioning || undefined, manual_competitor_urls: manual_competitor_urls && manual_competitor_urls.length ? manual_competitor_urls : undefined }

  let res: Response
  try {
    res = await fetch(`${geoApiBase}/api/analyze-competitors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(90_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de conexión"
    return NextResponse.json(
      { error: "No se pudo contactar con el motor geo-predict", details: msg },
      { status: 502 }
    )
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    return NextResponse.json(
      { error: "El motor devolvió un error", details: text.slice(0, 300) },
      { status: 502 }
    )
  }

  const data = await res.json()
  const medidos = Array.isArray(data?.competitors)
    ? data.competitors.filter((c: { status?: string }) => c?.status === "ok").length
    : 0
  await registrarActividad({
    userId: session.user.id,
    companyId: parsed.data.companyId ?? null,
    kind: "competitors",
    target: parsed.data.url ?? (parsed.data.title || "texto pegado"),
    score: typeof data?.user_percentile === "number" ? Math.round(data.user_percentile) : null,
    detail: { competidores: medidos },
  })
  return NextResponse.json(data)
}