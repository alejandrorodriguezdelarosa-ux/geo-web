import { prisma } from "@/lib/prisma"
import { descifrar } from "@/lib/cripto"
import { normalizarOrigen } from "@/lib/origen"

export type CabecerasFirma = {
  "Signature-Input": string
  "Signature": string
  "Signature-Agent": string
}

export type ResultadoFirma =
  | { estado: "sin_firma" }
  | { estado: "caducada"; origen: string; expiraISO: string }
  | { estado: "ilegible"; origen: string }
  | { estado: "vigente"; origen: string; cabeceras: CabecerasFirma; expiraISO: string }

// Busca la firma del usuario para el origen de esa url. La consulta va SIEMPRE por el
// usuario de la sesion mas el origen normalizado: nunca por un identificador que venga
// del navegador, porque entonces cualquiera podria pedir que se usara la credencial de
// otra empresa cambiando un campo del cuerpo.
export async function buscarFirma(userId: string, url: string): Promise<ResultadoFirma> {
  const origen = normalizarOrigen(url)
  if (!origen) return { estado: "sin_firma" }

  const fila = await prisma.crawlSignature.findFirst({
    where: { userId, origin: origen },
  })
  if (!fila) return { estado: "sin_firma" }

  if (fila.expiresAt.getTime() <= Date.now()) {
    return { estado: "caducada", origen, expiraISO: fila.expiresAt.toISOString() }
  }

  try {
    const contexto = { credencialId: fila.id, origen: fila.origin }
    const cabeceras: CabecerasFirma = {
      "Signature-Input": descifrar(fila.signatureInput, { ...contexto, campo: "signatureInput" }),
      "Signature": descifrar(fila.signature, { ...contexto, campo: "signature" }),
      "Signature-Agent": descifrar(fila.signatureAgent, { ...contexto, campo: "signatureAgent" }),
    }
    return { estado: "vigente", origen, cabeceras, expiraISO: fila.expiresAt.toISOString() }
  } catch {
    // Clave cambiada, fila manipulada o dato corrupto. No se registra el motivo con
    // detalle a proposito: cualquier traza de esto puede acabar en un registro.
    return { estado: "ilegible", origen }
  }
}
