import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ connectionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { connectionId } = await ctx.params

  const connection = await prisma.shopifyConnection.findUnique({
    where: { id: connectionId },
    select: { userId: true, status: true },
  })

  if (!connection) {
    return NextResponse.json({ error: "Conexión no encontrada" }, { status: 404 })
  }

  if (connection.userId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  if (connection.status === "pending" || connection.status === "revoked") {
    // Hard-delete: pending never completed OAuth; revoked is being cleaned up from the list.
    // In both cases the (userId, shopDomain) unique slot is freed for a fresh registration.
    await prisma.shopifyConnection.delete({ where: { id: connectionId } })
  } else {
    // Active: soft-delete to revoked so the token is still traceable.
    // NOTE: Invalidating the token in Shopify via POST {shop}/admin/oauth/revoke
    // is deferred to phase C.
    await prisma.shopifyConnection.update({
      where: { id: connectionId },
      data: { status: "revoked", revokedAt: new Date() },
    })
  }

  return NextResponse.json({ ok: true })
}
