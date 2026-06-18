import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"

const bodySchema = z.object({
  url: z
    .string()
    .url("Debe ser una URL válida (http o https)")
    .refine(
      (u) => u.startsWith("http://") || u.startsWith("https://"),
      "Solo se aceptan URLs http o https"
    ),
  maxPages: z
    .number()
    .int("maxPages debe ser un número entero")
    .min(1, "maxPages debe ser al menos 1")
    .max(30, "maxPages no puede superar 30"),
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

  const schemaApiBase = process.env.SCHEMA_API_BASE
  if (!schemaApiBase) {
    return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 })
  }

  let res: Response
  try {
    res = await fetch(`${schemaApiBase}/crawl-jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: parsed.data.url, maxPages: parsed.data.maxPages }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de conexión"
    return NextResponse.json(
      { error: "No se pudo contactar con el servicio de rastreo", details: msg },
      { status: 502 }
    )
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : JSON.stringify(data).slice(0, 300)
    return NextResponse.json(
      { error: "El servicio de rastreo devolvió un error", details: detail },
      { status: res.status === 422 ? 422 : 502 }
    )
  }

  return NextResponse.json(data, { status: 202 })
}
