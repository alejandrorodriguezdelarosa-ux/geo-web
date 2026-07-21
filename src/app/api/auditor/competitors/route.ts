import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"

const bodySchema = z.object({
  mode: z.enum(["text", "url"]),
  text: z.string().optional(),
  url: z.string().url().optional(),
  title: z.string().optional(),
  niche: z.string().optional(),
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

  const { mode, text, url, title, niche } = parsed.data

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
      ? { text, title: title || "", niche: niche || undefined }
      : { url, title: title || "", niche: niche || undefined }

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
  return NextResponse.json(data)
}