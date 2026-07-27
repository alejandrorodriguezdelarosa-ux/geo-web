import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const url = req.nextUrl.searchParams.get("url") || ""
  if (!url) return NextResponse.json({ competitors: [] })
  const row = await prisma.competitorSet.findUnique({
    where: { userId_url: { userId: session.user.id, url } },
  })
  return NextResponse.json({ competitors: row?.competitors ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }) }
  const url = typeof body?.url === "string" ? body.url : ""
  const competitors = Array.isArray(body?.competitors)
    ? body.competitors.filter((c: unknown) => typeof c === "string" && c.trim()).map((c: string) => c.trim())
    : []
  if (!url) return NextResponse.json({ error: "Falta url" }, { status: 400 })
  await prisma.competitorSet.upsert({
    where: { userId_url: { userId: session.user.id, url } },
    create: { userId: session.user.id, url, competitors },
    update: { competitors },
  })
  return NextResponse.json({ ok: true, competitors })
}
