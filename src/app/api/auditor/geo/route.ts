import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { registrarActividad } from "@/lib/actividad"
import { buscarFirma } from "@/lib/firmas"

const bodySchema = z.object({
  mode: z.enum(["text", "url"]),
  companyId: z.string().optional(),
  text: z.string().optional(),
  url: z.string().url().optional(),
  title: z.string().optional(),
  niche: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }) }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Parámetros inválidos" }, { status: 400 })
  }
  const { mode, text, url, title, niche } = parsed.data
  if (mode === "text" && (!text || text.length < 50)) {
    return NextResponse.json({ error: "El texto debe tener al menos 50 caracteres" }, { status: 400 })
  }
  if (mode === "url" && !url) {
    return NextResponse.json({ error: "Debes proporcionar una URL" }, { status: 400 })
  }
  const geoApiBase = process.env.GEO_API_BASE
  if (!geoApiBase) return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 })

  // La firma solo tiene sentido cuando se descarga una pagina: en modo texto no hay
  // peticion a ningun sitio.
  let firma: Awaited<ReturnType<typeof buscarFirma>> = { estado: "sin_firma" }
  if (mode === "url" && url) {
    firma = await buscarFirma(session.user.id, url)
    if (firma.estado === "caducada") {
      return NextResponse.json(
        { error: `La firma de rastreo de ${firma.origen} caducó el ${firma.expiraISO.slice(0, 10)}. Pide una nueva en el panel de Shopify de la tienda y actualízala en la ficha de la empresa.` },
        { status: 400 },
      )
    }
    if (firma.estado === "ilegible") {
      return NextResponse.json(
        { error: `La firma guardada de ${firma.origen} no se puede descifrar. Bórrala y vuelve a darla de alta.` },
        { status: 500 },
      )
    }
  }

  const requestBody = mode === "text"
    ? { text, title: title || "", niche: niche || undefined }
    : {
        url,
        title: title || "",
        niche: niche || undefined,
        ...(firma.estado === "vigente" ? { firma: firma.cabeceras, firma_expira: firma.expiraISO } : {}),
      }

  let res: Response
  try {
    res = await fetch(`${geoApiBase}/api/geo-audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(90_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de conexión"
    return NextResponse.json({ error: "No se pudo contactar con el motor geo-predict", details: msg }, { status: 502 })
  }
  if (!res.ok) {
    const raw = await res.text().catch(() => "")
    let detail = raw
    try { detail = JSON.parse(raw).detail ?? raw } catch {}
    const low = (detail || "").toLowerCase()
    let msg = detail || "El motor devolvió un error"
    if (low.includes("descargar la url") || low.includes("403") || low.includes("no se pudo extraer")) {
      msg = "No se pudo leer la página (bloquea el acceso automático o no es accesible). Prueba pegando el contenido en modo Texto."
    }
    return NextResponse.json({ error: msg, details: (detail || "").slice(0, 300) }, { status: res.status === 400 ? 400 : 502 })
  }
  const data = await res.json()
  // El diario se escribe despues de responder bien: solo se apunta trabajo real.
  await registrarActividad({
    userId: session.user.id,
    companyId: parsed.data.companyId ?? null,
    kind: "audit_page",
    target: parsed.data.url ?? (parsed.data.title || "texto pegado"),
    score: typeof data?.geo_score === "number" ? data.geo_score : null,
    detail: { page_type: data?.page_type ?? null, score_method: data?.score_method ?? null },
  })
  return NextResponse.json(data)
}
