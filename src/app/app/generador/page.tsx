import { auth } from "@/auth"
import { redirect } from "next/navigation"
import SchemaGenerator from "./SchemaGenerator"

export const metadata = { title: "Generador de Schema.org" }

export default async function GeneradorPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  return <SchemaGenerator />
}
