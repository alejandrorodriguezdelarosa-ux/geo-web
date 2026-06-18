import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"

const bodySchema = z.object({
  url: z.string().url("Debe ser una URL válida (http o https)").refine(
    (u) => u.startsWith("http://") || u.startsWith("https://"),
    "Solo se aceptan URLs http o https"
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

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues
    return NextResponse.json(
      { error: issues[0]?.message ?? "URL inválida" },
      { status: 400 }
    )
  }

  const schemaApiBase = process.env.SCHEMA_API_BASE
  if (!schemaApiBase) {
    return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 })
  }

  let res: Response
  try {
    res = await fetch(`${schemaApiBase}/generate-schema`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: parsed.data.url }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de conexión"
    return NextResponse.json(
      { error: "No se pudo contactar con el generador de schema", details: msg },
      { status: 502 }
    )
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    return NextResponse.json(
      { error: "El generador devolvió un error", details: text.slice(0, 300) },
      { status: 502 }
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
