"use client"
import { useEffect, useState } from "react"

type TokenData = { token: string; url: string; command: string }

const TOOLS = [
  { name: "auditar_geo", desc: "Informe GEO de una URL o texto: puntuación, subscores y plan de acción." },
  { name: "medir_pregunta", desc: "Mide la probabilidad de que una IA cite la página ante una pregunta concreta, con recomendaciones." },
  { name: "comparar_competencia", desc: "Compara la página con competidores reales del sector." },
  { name: "generar_arreglo", desc: "Genera contenido de mejora (intro, FAQ o Schema JSON-LD) listo para pegar." },
]

export default function McpPage() {
  const [data, setData] = useState<TokenData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

  return (
    <div className="flex flex-col gap-6">
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
    </div>
  )
}
