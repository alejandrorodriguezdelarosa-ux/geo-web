import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const altaSchema = z.object({
  name: z.string().trim().min(2, "El nombre necesita al menos 2 caracteres").max(120),
  website: z.string().trim().max(300).optional().or(z.literal("")),
  sector: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const empresas = await prisma.company.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, website: true, sector: true, updatedAt: true },
  })
  return NextResponse.json({ empresas })
}

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
  const parsed = altaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    )
  }
  const { name, website, sector, notes } = parsed.data
  try {
    const empresa = await prisma.company.create({
      data: {
        userId: session.user.id,
        name,
        website: website || null,
        sector: sector || null,
        notes: notes || null,
      },
      select: { id: true, name: true, website: true, sector: true },
    })
    return NextResponse.json({ empresa }, { status: 201 })
  } catch (err) {
    // El índice único (userId, name) evita duplicados: se avisa en lugar de fallar.
    const codigo = (err as { code?: string })?.code
    if (codigo === "P2002") {
      return NextResponse.json({ error: "Ya tienes una empresa con ese nombre" }, { status: 409 })
    }
    return NextResponse.json({ error: "No se pudo crear la empresa" }, { status: 500 })
  }
}
