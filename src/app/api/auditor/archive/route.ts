import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"

export const maxDuration = 130

const bodySchema = z.object({
  url: z.string().min(4),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: "Body invalido" }, { status: 400 }) }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Parametros invalidos" }, { status: 400 })
  }
  const geoApiBase = process.env.GEO_API_BASE
  if (!geoApiBase) {
    return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 })
  }
  let res: Response
  try {
    res = await fetch(`${geoApiBase}/api/archive-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: parsed.data.url }),
      signal: AbortSignal.timeout(120_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de conexion"
    return NextResponse.json({ error: "No se pudo contactar con el motor geo-predict", details: msg }, { status: 502 })
  }
  if (!res.ok) {
    const raw = await res.text().catch(() => "")
    let detail = raw
    try { detail = JSON.parse(raw).detail ?? raw } catch {}
    return NextResponse.json({ error: detail || "El motor devolvio un error" }, { status: res.status === 400 ? 400 : 502 })
  }
  const data = await res.json()
  return NextResponse.json(data)
}
