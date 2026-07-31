import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITMO = "aes-256-gcm"
const IV_BYTES = 12
const TAG_BYTES = 16

// Version del esquema de cifrado. Va dentro del valor guardado, asi que se puede
// cambiar el formato sin migrar la tabla: basta con saber leer las versiones viejas.
const VERSION = "v1"

// Version de la clave. Rotar = anadir CRAWL_SIGNATURE_KEY_V2 al entorno, cifrar lo
// nuevo con V2 y recifrar lo viejo cuando se lea. El prefijo del valor dice con cual
// se cifro, asi que no hace falta descifrar nada para saberlo.
const CLAVE_ACTUAL = "V1"

function leerClave(version: string): Buffer {
  const nombre = `CRAWL_SIGNATURE_KEY_${version}`
  const bruta = process.env[nombre]
  if (!bruta) {
    throw new Error(`Falta ${nombre} en el entorno. Genera una con: openssl rand -hex 32`)
  }
  const clave = bruta.length === 64 && /^[0-9a-fA-F]+$/.test(bruta)
    ? Buffer.from(bruta, "hex")
    : Buffer.from(bruta, "base64")
  if (clave.length !== 32) {
    throw new Error(`${nombre} debe tener 32 bytes (tiene ${clave.length})`)
  }
  return clave
}

// Datos autenticados adicionales: atan el valor cifrado a SU fila y SU campo. Sin
// esto, alguien con acceso a la base de datos podria mover un valor cifrado de una
// fila a otra, o cambiar Signature por Signature-Agent, y seguiria descifrando bien.
export type ContextoCifrado = {
  credencialId: string
  origen: string
  campo: string
}

function datosAutenticados(ctx: ContextoCifrado): Buffer {
  return Buffer.from(`${VERSION}|${ctx.credencialId}|${ctx.origen}|${ctx.campo}`, "utf8")
}

export function cifrar(texto: string, ctx: ContextoCifrado): string {
  const clave = leerClave(CLAVE_ACTUAL)
  const iv = randomBytes(IV_BYTES)
  const cifrador = createCipheriv(ALGORITMO, clave, iv)
  cifrador.setAAD(datosAutenticados(ctx))
  const cifrado = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()])
  const tag = cifrador.getAuthTag()
  return [VERSION, CLAVE_ACTUAL, iv.toString("hex"), tag.toString("hex"), cifrado.toString("hex")].join(":")
}

export function descifrar(guardado: string, ctx: ContextoCifrado): string {
  const partes = guardado.split(":")
  if (partes.length !== 5) {
    throw new Error("Formato de valor cifrado no reconocido")
  }
  const [version, versionClave, ivHex, tagHex, cifradoHex] = partes
  if (version !== VERSION) {
    throw new Error(`Version de cifrado no soportada: ${version}`)
  }
  const clave = leerClave(versionClave)
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")
  if (iv.length !== IV_BYTES) throw new Error("Longitud de IV incorrecta")
  if (tag.length !== TAG_BYTES) throw new Error("Longitud de tag incorrecta")
  const descifrador = createDecipheriv(ALGORITMO, clave, iv)
  descifrador.setAAD(datosAutenticados(ctx))
  descifrador.setAuthTag(tag)
  try {
    return Buffer.concat([descifrador.update(Buffer.from(cifradoHex, "hex")), descifrador.final()]).toString("utf8")
  } catch {
    throw new Error("El valor no se pudo descifrar: clave distinta, fila cambiada o dato manipulado")
  }
}
