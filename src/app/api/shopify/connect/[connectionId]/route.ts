import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "node:crypto"

const OAUTH_SCOPES =
  "read_products,write_products,read_content,write_content,read_themes,write_themes"

const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/shopify/callback`

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ connectionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    const base = process.env.NEXTAUTH_URL ?? req.nextUrl.origin
    return NextResponse.redirect(new URL("/login", base))
  }

  const { connectionId } = await ctx.params

  const connection = await prisma.shopifyConnection.findUnique({
    where: { id: connectionId },
    select: { userId: true, shopDomain: true, clientId: true, status: true },
  })

  if (!connection || connection.userId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  if (connection.status !== "pending") {
    const base = process.env.NEXTAUTH_URL ?? req.nextUrl.origin
    return NextResponse.redirect(new URL("/app/shopify", base))
  }

  const nonce = randomBytes(16).toString("hex")
  // State is the nonce only (no colon separator), so URLSearchParams won't
  // percent-encode any special characters and Shopify signs exactly what we expect.
  const state = nonce

  const shopifyAuthUrl = new URL(
    `https://${connection.shopDomain}/admin/oauth/authorize`
  )
  shopifyAuthUrl.searchParams.set("client_id", connection.clientId)
  shopifyAuthUrl.searchParams.set("scope", OAUTH_SCOPES)
  shopifyAuthUrl.searchParams.set("redirect_uri", REDIRECT_URI)
  shopifyAuthUrl.searchParams.set("state", state)

  const response = NextResponse.redirect(shopifyAuthUrl)
  // Cookie stores "connectionId|nonce" — both values, pipe-separated, HttpOnly.
  response.cookies.set("__shopify_state", `${connectionId}|${nonce}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/shopify",
    maxAge: 600,
  })

  return response
}
