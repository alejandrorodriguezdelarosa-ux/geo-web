import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "node:crypto"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { decrypt, encrypt } from "@/lib/shopify-crypto"

// Shopify HMAC verification: per official @shopify/shopify-api library and docs.
// 1. Parse query string with URLSearchParams (URL-decodes every value).
// 2. Remove 'hmac'; sort remaining pairs alphabetically by key.
// 3. Join as "key=value&key=value" with decoded values.
// 4. HMAC-SHA256(message, clientSecret) — hex digest, timingSafeEqual compare.
function verifyShopifyHmac(
  searchParams: URLSearchParams,
  providedHmac: string,
  clientSecret: string
): boolean {
  const pairs: Array<[string, string]> = []
  searchParams.forEach((value, key) => {
    if (key !== "hmac") pairs.push([key, value])
  })
  pairs.sort(([a], [b]) => a.localeCompare(b))
  const message = pairs.map(([k, v]) => `${k}=${v}`).join("&")

  const digest = createHmac("sha256", clientSecret).update(message).digest("hex")
  const digestBuf = Buffer.from(digest, "hex")
  let hmacBuf: Buffer
  try {
    hmacBuf = Buffer.from(providedHmac, "hex")
  } catch {
    return false
  }
  if (digestBuf.length !== hmacBuf.length) return false
  return timingSafeEqual(digestBuf, hmacBuf)
}

function bad400(msg: string): NextResponse {
  const res = NextResponse.json({ error: msg }, { status: 400 })
  res.cookies.set("__shopify_state", "", {
    maxAge: 0,
    path: "/api/shopify",
    httpOnly: true,
    secure: true,
  })
  return res
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    const base = process.env.NEXTAUTH_URL ?? req.nextUrl.origin
    return NextResponse.redirect(new URL("/login", base))
  }

  const sp = req.nextUrl.searchParams

  // Shopify sends ?error=access_denied when the user rejects the OAuth consent.
  // Redirect back to the connections page so the error banner can show a CTA.
  const oauthError = sp.get("error")
  if (oauthError) {
    const base = process.env.NEXTAUTH_URL ?? req.nextUrl.origin
    const dest = new URL("/app/shopify", base)
    dest.searchParams.set("error", oauthError)
    const res = NextResponse.redirect(dest)
    res.cookies.set("__shopify_state", "", {
      maxAge: 0,
      path: "/api/shopify",
      httpOnly: true,
      secure: true,
    })
    return res
  }

  const code = sp.get("code")
  const hmac = sp.get("hmac")
  const shop = sp.get("shop")
  const state = sp.get("state") // just the nonce
  const timestampStr = sp.get("timestamp")

  if (!code || !hmac || !shop || !state || !timestampStr) {
    return bad400("Parámetros incompletos")
  }

  // a. Parse cookie: "connectionId|nonce" (connectionId is HttpOnly, not in URL)
  const stateCookieRaw = req.cookies.get("__shopify_state")?.value ?? ""
  const pipeIdx = stateCookieRaw.indexOf("|")
  if (pipeIdx < 1 || pipeIdx === stateCookieRaw.length - 1) {
    return bad400("State inválido o expirado")
  }
  const connectionId = stateCookieRaw.slice(0, pipeIdx)
  const nonce = stateCookieRaw.slice(pipeIdx + 1)

  // b. CSRF: state from Shopify must equal the nonce from our cookie
  if (state !== nonce) {
    return bad400("State inválido o expirado")
  }

  // c. Load connection and verify ownership + status
  const connection = await prisma.shopifyConnection.findUnique({
    where: { id: connectionId },
    select: {
      userId: true,
      shopDomain: true,
      clientId: true,
      clientSecretEnc: true,
      status: true,
    },
  })

  if (!connection || connection.status !== "pending") {
    return bad400("Conexión no encontrada o no está pendiente")
  }

  if (connection.userId !== session.user.id) {
    const res = NextResponse.json({ error: "No autorizado" }, { status: 403 })
    res.cookies.set("__shopify_state", "", { maxAge: 0, path: "/api/shopify" })
    return res
  }

  // d. shop param must match the registered domain
  if (shop !== connection.shopDomain) {
    return bad400("shop no coincide con el dominio registrado")
  }

  // e. HMAC verification — decrypt client secret, verify, clear immediately
  let clientSecret: string
  try {
    clientSecret = decrypt(connection.clientSecretEnc)
  } catch {
    return bad400("Error interno de configuración")
  }

  const hmacValid = verifyShopifyHmac(sp, hmac, clientSecret)

  if (!hmacValid) {
    clientSecret = ""
    return bad400("HMAC inválido")
  }

  // f. Timestamp window: ±5 minutes
  const timestamp = parseInt(timestampStr, 10)
  if (!Number.isFinite(timestamp)) {
    clientSecret = ""
    return bad400("Timestamp inválido")
  }
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - timestamp) > 300) {
    clientSecret = ""
    return bad400("Timestamp fuera de ventana (replay attack?)")
  }

  // g. Exchange authorization code for access token
  let accessToken: string
  let scopesGranted: string
  try {
    const tokenRes = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: connection.clientId,
          client_secret: clientSecret,
          code,
        }),
        signal: AbortSignal.timeout(15_000),
      }
    )
    clientSecret = "" // clear as soon as the request is done

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => "")
      return bad400(
        `Error de Shopify al intercambiar token: HTTP ${tokenRes.status}`
      )
    }

    const tokenData = await tokenRes.json()
    if (typeof tokenData.access_token !== "string" || !tokenData.access_token) {
      return bad400("Respuesta de Shopify sin access_token")
    }
    accessToken = tokenData.access_token
    scopesGranted = typeof tokenData.scope === "string" ? tokenData.scope : ""
  } catch (err) {
    clientSecret = ""
    const msg = err instanceof Error ? err.message : "Error desconocido"
    const res = NextResponse.json(
      { error: "No se pudo obtener el token de Shopify", details: msg },
      { status: 502 }
    )
    res.cookies.set("__shopify_state", "", { maxAge: 0, path: "/api/shopify" })
    return res
  }

  // h. Persist encrypted token and mark active
  const accessTokenEnc = encrypt(accessToken)
  accessToken = "" // clear from memory

  await prisma.shopifyConnection.update({
    where: { id: connectionId },
    data: {
      accessTokenEnc,
      scopes: scopesGranted,
      status: "active",
      installedAt: new Date(),
    },
  })

  // i. Redirect to app, clearing the state cookie
  const base = process.env.NEXTAUTH_URL ?? req.nextUrl.origin
  const redirectRes = NextResponse.redirect(new URL("/app/shopify", base))
  redirectRes.cookies.set("__shopify_state", "", {
    maxAge: 0,
    path: "/api/shopify",
    httpOnly: true,
    secure: true,
  })
  return redirectRes
}
