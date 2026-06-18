import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"

const bodySchema = z.object({
  wpUrl: z
    .string()
    .url("Debe ser una URL válida (http o https)")
    .refine(
      (u) => u.startsWith("http://") || u.startsWith("https://"),
      "Solo se aceptan URLs http o https"
    ),
  wpUser: z.string().min(1, "wpUser no puede estar vacío"),
  appPassword: z.string().min(1, "appPassword no puede estar vacío"),
  maxItems: z
    .number()
    .int("maxItems debe ser un número entero")
    .min(1, "maxItems debe ser al menos 1")
    .max(200, "maxItems no puede superar 200"),
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
    res = await fetch(`${schemaApiBase}/wp-jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteUrl: parsed.data.wpUrl,
        username: parsed.data.wpUser,
        appPassword: parsed.data.appPassword,
        maxItems: parsed.data.maxItems,
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de conexión"
    return NextResponse.json(
      { error: "No se pudo contactar con el servicio de WordPress", details: msg },
      { status: 502 }
    )
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : JSON.stringify(data).slice(0, 300)
    return NextResponse.json(
      { error: "El servicio de WordPress devolvió un error", details: detail },
      { status: res.status === 422 ? 422 : 502 }
    )
  }

  return NextResponse.json(data, { status: 202 })
}
