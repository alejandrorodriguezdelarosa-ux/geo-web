import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/jobs/[id]">) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await ctx.params

  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      storeDomain: true,
      status: true,
      summary: true,
      errorMessage: true,
      startedAt: true,
      finishedAt: true,
    },
  })

  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  const { userId: _, ...response } = job
  return NextResponse.json(response)
}
