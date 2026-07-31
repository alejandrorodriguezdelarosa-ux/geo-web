// Normaliza a esquema://host:puerto con el puerto siempre explicito y el host en
// punycode. Debe dar EXACTAMENTE el mismo resultado que origen() en el motor
// (app/collectors/firma_bot.py): si los dos lados no coinciden, la firma se guarda
// con un origen y el motor busca otro, y nunca se envia.
export function normalizarOrigen(url: string): string {
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`)
    const esquema = u.protocol.replace(":", "").toLowerCase()
    if (esquema !== "http" && esquema !== "https") return ""
    const host = u.hostname.toLowerCase()
    if (!host) return ""
    const puerto = u.port ? Number(u.port) : (esquema === "https" ? 443 : 80)
    return `${esquema}://${host}:${puerto}`
  } catch {
    return ""
  }
}
