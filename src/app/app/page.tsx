import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Dashboard from "./Dashboard"

export const metadata = { title: "Dashboard" }

export default async function AppPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const jobs = await prisma.job.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      storeDomain: true,
      status: true,
      summary: true,
      errorMessage: true,
      startedAt: true,
      finishedAt: true,
    },
  })

  return <Dashboard initialJobs={JSON.parse(JSON.stringify(jobs))} />
}
