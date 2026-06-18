import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ShopifyTool from "./ShopifyTool"

export const metadata = { title: "Shopify — Conexiones" }

export default async function ShopifyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { error } = await searchParams

  return <ShopifyTool errorParam={error ?? null} />
}
