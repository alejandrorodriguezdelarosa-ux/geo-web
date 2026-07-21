import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AuditorTool from "./AuditorTool"

export const metadata = { title: "Auditor GEO" }

export default async function AppPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  return <AuditorTool />
}
