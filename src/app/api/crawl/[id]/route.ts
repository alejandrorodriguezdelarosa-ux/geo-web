import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await ctx.params

  const schemaApiBase = process.env.SCHEMA_API_BASE
  if (!schemaApiBase) {
    return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 })
  }

  let res: Response
  try {
    res = await fetch(`${schemaApiBase}/crawl-jobs/${id}`, {
      signal: AbortSignal.timeout(10_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de conexión"
    return NextResponse.json(
      { error: "No se pudo contactar con el servicio de rastreo", details: msg },
      { status: 502 }
    )
  }

  const data = await res.json().catch(() => null)

  if (res.status === 404) {
    return NextResponse.json({ error: "Job no encontrado" }, { status: 404 })
  }

  if (!res.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : JSON.stringify(data).slice(0, 300)
    return NextResponse.json(
      { error: "El servicio de rastreo devolvió un error", details: detail },
      { status: 502 }
    )
  }

  return NextResponse.json(data)
}
