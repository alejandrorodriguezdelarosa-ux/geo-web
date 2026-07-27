import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const MCP_URL = "https://geo.óptimoia.es/mcp"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }
  let token = user.mcpToken
  if (!token) {
    token = randomBytes(24).toString("hex")
    await prisma.user.update({ where: { id: user.id }, data: { mcpToken: token } })
  }
  const command = `claude mcp add --transport http geo-optimoia ${MCP_URL} --header "Authorization: Bearer ${token}"`
  return NextResponse.json({ token, url: MCP_URL, command })
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }
  const token = randomBytes(24).toString("hex")
  await prisma.user.update({ where: { id: user.id }, data: { mcpToken: token } })
  const command = `claude mcp add --transport http geo-optimoia ${MCP_URL} --header "Authorization: Bearer ${token}"`
  return NextResponse.json({ token, url: MCP_URL, command })
}
