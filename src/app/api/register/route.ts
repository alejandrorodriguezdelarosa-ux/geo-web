import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres"),
})

export async function POST(req: NextRequest) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })
  if (exists) {
    return NextResponse.json({ error: "Email ya registrado" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
    },
    select: { id: true, email: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
