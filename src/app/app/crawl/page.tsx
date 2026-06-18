import { auth } from "@/auth"
import { redirect } from "next/navigation"
import CrawlTool from "./CrawlTool"

export const metadata = { title: "Crawling multipágina — Schema.org" }

export default async function CrawlPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  return <CrawlTool />
}
