"use client"
import { useEffect, useRef, useState } from "react"

type SiteAudit = {
  base_url: string
  domain: string
  source: string
  discovered_total: number
  audited_count: number
  site_score: number
  verdict: { label: string; sentence: string }
  executive_text: string
  score_context: string
  distribution: Record<string, number>
  avg_subscores: Record<string, number>
  common_issues: { title: string; count: number; why: string; how: string; impact: string; effort: string }[]
  worst_pages: { url: string; title: string; score: number; top_issue: string }[]
  best_pages: { url: string; title: string; score: number }[]
  pages: { url: string; title: string; page_type: string | null; score: number }[]
  errors: { url: string; error: string }[]
  elapsed_seconds: number
}

type HistoryRow = { id: string; createdAt: string; score: number; pagesAudited: number }

const SUB_LABEL: Record<string, string> = {
  citability: "Citabilidad", commercial_signals: "Señales comerciales", structure: "Estructura",
  technical: "Técnica", authority: "Autoridad", multimodal: "Multimedia", visibility: "Visibilidad de marca",
}

function scoreColor(s: number): string {
  if (s >= 70) return "#16a34a"
  if (s >= 40) return "#d97706"
  return "#dc2626"
}

const IMPACT_COLOR: Record<string, string> = {
  Alto: "bg-red-100 text-red-800", Medio: "bg-amber-100 text-amber-800", Bajo: "bg-gray-100 text-gray-700",
}

export default function SitioPage() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SiteAudit | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function loadHistory(domain: string) {
    try {
      const r = await fetch(`/api/auditor/site?domain=${encodeURIComponent(domain)}`)
      if (r.ok) {
        const j = await r.json()
        if (Array.isArray(j.history)) setHistory(j.history)
      }
    } catch {}
  }

  async function run() {
    setError(null)
    setData(null)
    setLoading(true)
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    try {
      const res = await fetch("/api/auditor/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error || "Error al auditar el sitio"); return }
      setData(j as SiteAudit)
      if ((j as SiteAudit).domain) loadHistory((j as SiteAudit).domain)
    } catch {
      setError("Error de conexión (la auditoría puede tardar varios minutos; si se corta, reduce el número de páginas)")
    } finally {
      if (timerRef.current) clearInterval(timerRef.current)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-[#0f172a]">Auditoría de sitio completo</h2>
        <p className="mb-4 text-sm text-[#64748b]">
          Pon el dominio y leo su sitemap para auditar sus páginas (hasta 50) y darte un informe GEO global del sitio, no página a página. Puede tardar varios minutos.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://tudominio.com"
            className="flex-1 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
          />
          <button
            type="button"
            onClick={run}
            disabled={loading || url.trim().length < 4}
            className="rounded-md bg-[#EC1E63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4154f] disabled:opacity-60"
          >
            {loading ? `Auditando… ${elapsed}s` : "Auditar sitio completo"}
          </button>
        </div>
        {loading && (
          <p className="mt-3 text-xs text-[#94a3b8]">Leyendo el sitemap y auditando página a página. No cierres la pestaña.</p>
        )}
        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </section>

      {data && (
        <>
          <section className="flex items-center gap-5 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4"
                 style={{ borderColor: scoreColor(data.site_score) }}>
              <span className="text-3xl font-bold" style={{ color: scoreColor(data.site_score) }}>{data.site_score}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#0f172a]">GEO Score del sitio</h3>
              <p className="text-sm text-[#64748b]">
                {data.domain} — auditadas {data.audited_count} de {data.discovered_total} páginas ({data.source === "sitemap" ? "vía sitemap" : data.source === "links" ? "vía enlaces de la portada" : "sin sitemap"}) en {Math.round(data.elapsed_seconds)}s.
              </p>
              <p className="mt-1 text-sm font-medium text-[#0f172a]">
                Preparación: <span className="text-[#EC1E63]">{data.verdict.label}</span> — {data.verdict.sentence}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-[#e2e8f0] bg-white p-5">
            <h3 className="mb-2 text-base font-semibold text-[#0f172a]">Resumen para tu equipo</h3>
            <p className="text-sm leading-relaxed text-[#334155]">{data.executive_text}</p>
            <p className="mt-3 text-xs text-[#94a3b8]">{data.score_context}</p>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["baja", "Baja (<40)"], ["media", "Media (40-69)"], ["alta", "Alta (70-84)"], ["excelente", "Excelente (85+)"]].map(([k, label]) => (
              <div key={k} className="rounded-lg border border-[#e2e8f0] bg-white p-3 text-center">
                <div className="text-xs font-medium text-[#64748b]">{label}</div>
                <div className="mt-1 text-xl font-bold text-[#0f172a]">{data.distribution[k] ?? 0}</div>
                <div className="text-xs text-[#94a3b8]">páginas</div>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-[#e2e8f0] bg-white p-5">
            <h3 className="mb-3 text-base font-semibold text-[#0f172a]">Medias por dimensión</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
              {Object.entries(data.avg_subscores).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-[#e2e8f0] p-3 text-center">
                  <div className="text-xs font-medium text-[#64748b]">{SUB_LABEL[k] || k}</div>
                  <div className="mt-1 text-xl font-bold" style={{ color: scoreColor(v) }}>{v}</div>
                </div>
              ))}
            </div>
          </section>

          {data.common_issues.length > 0 && (
            <section className="rounded-xl border border-[#e2e8f0] bg-white p-5">
              <h3 className="mb-1 text-base font-semibold text-[#0f172a]">Problemas más repetidos del sitio</h3>
              <p className="mb-3 text-xs text-[#64748b]">Ordenados por cuántas páginas los tienen.</p>
              <ul className="flex flex-col gap-4">
                {data.common_issues.map((c, i) => (
                  <li key={i} className="border-l-2 border-[#EC1E63] pl-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[#0f172a]">{c.title}</span>
                      <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-xs font-medium text-[#475569]">{c.count} páginas</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${IMPACT_COLOR[c.impact] || "bg-gray-100 text-gray-700"}`}>Impacto {c.impact}</span>
                    </div>
                    {c.why && <p className="text-sm text-[#475569]"><span className="font-medium text-[#334155]">Por qué:</span> {c.why}</p>}
                    {c.how && <p className="mt-1 text-sm text-[#475569]"><span className="font-medium text-[#334155]">Cómo:</span> {c.how}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.worst_pages.length > 0 && (
            <section className="rounded-xl border border-[#e2e8f0] bg-white p-5">
              <h3 className="mb-3 text-base font-semibold text-[#0f172a]">Páginas que más te penalizan</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] text-left text-xs text-[#64748b]">
                      <th className="py-2 pr-3">Página</th><th className="py-2 pr-3">Nota</th><th className="py-2">Problema principal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.worst_pages.map((p, i) => (
                      <tr key={i} className="border-b border-[#f1f5f9]">
                        <td className="max-w-[320px] truncate py-2 pr-3 text-[#475569]" title={p.url}>{p.url}</td>
                        <td className="py-2 pr-3 font-bold" style={{ color: scoreColor(p.score) }}>{p.score}</td>
                        <td className="py-2 text-[#475569]">{p.top_issue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="rounded-xl border border-[#e2e8f0] bg-white p-5">
            <h3 className="mb-3 text-base font-semibold text-[#0f172a]">Todas las páginas auditadas ({data.pages.length})</h3>
            <div className="max-h-96 overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-left text-xs text-[#64748b]">
                    <th className="py-2 pr-3">Página</th><th className="py-2 pr-3">Tipo</th><th className="py-2">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pages.map((p, i) => (
                    <tr key={i} className="border-b border-[#f1f5f9]">
                      <td className="max-w-[380px] truncate py-2 pr-3 text-[#475569]" title={p.url}>{p.url}</td>
                      <td className="py-2 pr-3 text-[#64748b]">{p.page_type || "-"}</td>
                      <td className="py-2 font-bold" style={{ color: scoreColor(p.score) }}>{p.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.errors.length > 0 && (
              <p className="mt-3 text-xs text-[#94a3b8]">{data.errors.length} páginas no se pudieron descargar.</p>
            )}
          </section>
        </>
      )}

      {history.length > 0 && (
        <section className="rounded-xl border border-[#e2e8f0] bg-white p-5">
          <h3 className="mb-3 text-base font-semibold text-[#0f172a]">Histórico de auditorías de este sitio</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] text-left text-xs text-[#64748b]">
                <th className="py-2 pr-3">Fecha</th><th className="py-2 pr-3">Nota</th><th className="py-2 pr-3">Evolución</th><th className="py-2">Páginas</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => {
                const prev = history[i + 1]
                const delta = prev ? h.score - prev.score : null
                return (
                  <tr key={h.id} className="border-b border-[#f1f5f9]">
                    <td className="py-2 pr-3 text-[#475569]">{new Date(h.createdAt).toLocaleString("es-ES")}</td>
                    <td className="py-2 pr-3 font-bold" style={{ color: scoreColor(h.score) }}>{h.score}</td>
                    <td className="py-2 pr-3">
                      {delta == null ? <span className="text-xs text-[#94a3b8]">—</span> : (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${delta > 0 ? "bg-green-100 text-green-800" : delta < 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700"}`}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-[#64748b]">{h.pagesAudited}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
