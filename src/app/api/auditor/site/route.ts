import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export const maxDuration = 900

const bodySchema = z.object({
  url: z.string().min(4),
  max_pages: z.number().int().min(1).max(100).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }) }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Parámetros inválidos" }, { status: 400 })
  }
  const geoApiBase = process.env.GEO_API_BASE
  if (!geoApiBase) {
    return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 })
  }
  let res: Response
  try {
    res = await fetch(`${geoApiBase}/api/site-audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: parsed.data.url, max_pages: parsed.data.max_pages ?? 50 }),
      signal: AbortSignal.timeout(880_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de conexión"
    return NextResponse.json({ error: "No se pudo contactar con el motor geo-predict", details: msg }, { status: 502 })
  }
  if (!res.ok) {
    const raw = await res.text().catch(() => "")
    let detail = raw
    try { detail = JSON.parse(raw).detail ?? raw } catch {}
    return NextResponse.json({ error: detail || "El motor devolvió un error" }, { status: res.status === 400 ? 400 : 502 })
  }
  const data = await res.json()
  try {
    await prisma.siteAudit.create({
      data: {
        userId: session.user.id,
        url: data.base_url ?? parsed.data.url,
        domain: data.domain ?? "",
        score: data.site_score ?? 0,
        pagesAudited: data.audited_count ?? 0,
        result: data,
      },
    })
  } catch {}
  return NextResponse.json(data)
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const domain = (req.nextUrl.searchParams.get("domain") || "").toLowerCase().replace(/^www\./, "")
  if (!domain) return NextResponse.json({ history: [] })
  const rows = await prisma.siteAudit.findMany({
    where: { userId: session.user.id, domain },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, createdAt: true, score: true, pagesAudited: true },
  })
  return NextResponse.json({ history: rows })
}