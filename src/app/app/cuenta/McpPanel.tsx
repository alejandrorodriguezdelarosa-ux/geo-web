"use client"
import { useEffect, useState } from "react"

type TokenData = { token: string; url: string; command: string }

const TOOLS = [
  { name: "auditar_geo", desc: "Informe GEO de una URL o texto: puntuación, subscores y plan de acción." },
  { name: "medir_pregunta", desc: "Mide la probabilidad de que una IA cite la página ante una pregunta concreta, con recomendaciones." },
  { name: "comparar_competencia", desc: "Compara la página con competidores reales del sector." },
  { name: "generar_arreglo", desc: "Genera contenido de mejora (intro, FAQ o Schema JSON-LD) listo para pegar." },
]

export default function McpPanel() {
  const [data, setData] = useState<TokenData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenerated, setRegenerated] = useState(false)

  useEffect(() => {
    fetch("/api/mcp/token")
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (ok) setData(j as TokenData); else setError(j.error || "Error al obtener el token") })
      .catch(() => setError("Error de conexión"))
  }, [])

  function copy() {
    if (!data) return
    navigator.clipboard?.writeText(data.command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function regenerate() {
    setRegenerating(true)
    try {
      const r = await fetch("/api/mcp/token", { method: "POST" })
      const j = await r.json()
      if (r.ok) {
        setData(j as TokenData)
        setRegenerated(true)
        setError(null)
      } else {
        setError(j.error || "Error al regenerar el token")
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setRegenerating(false)
      setConfirming(false)
    }
  }

  return (
    <>
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-[#0f172a]">Conectar con Claude Code</h2>
        <p className="mb-4 text-sm text-[#64748b]">
          Usa el auditor GEO como herramienta dentro de Claude Code. Copia este comando y pégalo en tu terminal para instalarlo; a partir de ahí podrás pedirle a Claude que audite URLs, mida preguntas o compare con la competencia.
        </p>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {!data && !error && <p className="text-sm text-[#94a3b8]">Cargando tu token…</p>}
        {data && (
          <div className="flex flex-col gap-3">
            <div className="relative rounded-md border border-[#cbd5e1] bg-[#f8fafc] p-3">
              <code className="block break-all pr-20 font-mono text-xs text-[#0f172a]">{data.command}</code>
              <button
                type="button"
                onClick={copy}
                className="absolute right-2 top-2 rounded-md bg-[#0f172a] px-3 py-1 text-xs font-semibold text-white hover:bg-[#1e293b]"
              >
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Este token es personal y secreto: no lo compartas. Cualquiera con él puede usar el auditor en tu nombre.
            </p>
            {regenerated && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Token regenerado: el anterior ya no funciona. Si lo tenías instalado en Claude Code, ejecuta
                primero <code className="font-mono">claude mcp remove geo-optimoia</code> y vuelve a pegar el
                comando de arriba.
              </p>
            )}
            {!confirming ? (
              <div>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="rounded-md border border-[#cbd5e1] px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc]"
                >
                  Regenerar token
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                <span className="text-xs text-red-700">
                  El token actual dejará de funcionar al instante y tendrás que reinstalar el comando en Claude Code.
                </span>
                <button
                  type="button"
                  onClick={regenerate}
                  disabled={regenerating}
                  className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {regenerating ? "Regenerando…" : "Sí, regenerar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={regenerating}
                  className="rounded-md border border-[#cbd5e1] px-3 py-1 text-xs font-semibold text-[#475569] hover:bg-white"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-base font-semibold text-[#0f172a]">Herramientas disponibles</h3>
        <ul className="flex flex-col gap-3">
          {TOOLS.map((t) => (
            <li key={t.name} className="text-sm text-[#475569]">
              <span className="font-mono font-medium text-[#0f172a]">{t.name}</span> — {t.desc}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
