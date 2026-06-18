import { auth } from "@/auth"
import { redirect } from "next/navigation"
import WordPressTool from "./WordPressTool"

export const metadata = { title: "WordPress — Schema.org" }

export default async function WordPressPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  return <WordPressTool />
}
