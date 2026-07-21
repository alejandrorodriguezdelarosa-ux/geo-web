"use client"

type Issue = { severity: string; area: string; msg: string; fix: string }
export type GeoAudit = {
  input_mode: string
  detected_niche: string
  geo_score: number
  subscores: Record<string, number | null>
  overall_citation_prob: number
  accessibility: null | {
    robots_fetched: boolean
    crawlers: Record<string, { allowed: boolean; source: string }>
    blocked_key: string[]
    llms_txt_present: boolean
    rendering: { visible_text_chars: number; js_dependent_risk: boolean }
    score: number
    issues: Issue[]
  }
  passages: {
    passages: { text: string; word_count: number; score: number; position_ratio: number; optimal_length: boolean }[]
    passage_count: number
    front_loading: { first60_score: number; answer_up_front: boolean; best_position_ratio: number | null; best_in_first_30pct: boolean }
    length: { optimal_count: number; total: number }
    score: number
    issues: Issue[]
  }
  structure: { score: number; issues: Issue[] }
  top_changes: Issue[]
}

function scoreColor(s: number): string {
  if (s >= 70) return "#16a34a"
  if (s >= 40) return "#d97706"
  return "#dc2626"
}
const SEV: Record<string, string> = {
  alta: "bg-red-100 text-red-800",
  media: "bg-amber-100 text-amber-800",
  baja: "bg-gray-100 text-gray-700",
}
const SUB_LABEL: Record<string, string> = {
  citability: "Citabilidad", structure: "Estructura", technical: "Técnica",
  authority: "Autoridad", visibility: "Visibilidad",
}

export default function GeoReport({ data }: { data: GeoAudit }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-5 rounded-xl border border-[#e2e8f0] bg-white p-6">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4"
             style={{ borderColor: scoreColor(data.geo_score) }}>
          <span className="text-3xl font-bold" style={{ color: scoreColor(data.geo_score) }}>{data.geo_score}</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#0f172a]">GEO Readiness Score</h3>
          <p className="text-sm text-[#64748b]">
            Sobre 100. Nicho: {data.detected_niche}. Probabilidad media de cita: {Math.round(data.overall_citation_prob * 100)}%.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {["citability", "structure", "technical", "authority", "visibility"].map((k) => {
          const v = data.subscores[k]
          const pending = k === "authority" || k === "visibility"
          return (
            <div key={k} className="rounded-lg border border-[#e2e8f0] bg-white p-3 text-center">
              <div className="text-xs font-medium text-[#64748b]">{SUB_LABEL[k]}</div>
              <div className="mt-1 text-xl font-bold" style={{ color: v == null ? "#94a3b8" : scoreColor(v) }}>
                {v == null ? (pending ? "Próx." : "N/A") : v}
              </div>
            </div>
          )
        })}
      </div>

      {data.top_changes.length > 0 && (
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
          <h3 className="mb-3 text-base font-semibold text-[#0f172a]">Top cambios de mayor impacto</h3>
          <ul className="flex flex-col gap-3">
            {data.top_changes.map((c, i) => (
              <li key={i} className="flex flex-col gap-1 border-l-2 border-[#EC1E63] pl-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEV[c.severity] || SEV.baja}`}>{c.severity}</span>
                  <span className="text-sm font-medium text-[#0f172a]">{c.msg}</span>
                </div>
                <span className="text-xs text-[#64748b]">→ {c.fix}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.accessibility && (
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
          <h3 className="mb-3 text-base font-semibold text-[#0f172a]">Accesibilidad para IA</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            {Object.entries(data.accessibility.crawlers).map(([name, c]) => (
              <span key={name} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.allowed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {c.allowed ? "✓" : "✗"} {name}
              </span>
            ))}
          </div>
          <ul className="flex flex-col gap-1 text-sm text-[#475569]">
            <li>Renderizado dependiente de JavaScript: {data.accessibility.rendering.js_dependent_risk ? "riesgo (los crawlers de IA no ejecutan JS)" : "no detectado"}</li>
            <li>/llms.txt: {data.accessibility.llms_txt_present ? "presente" : "ausente"}</li>
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
        <h3 className="mb-2 text-base font-semibold text-[#0f172a]">Citabilidad por pasaje</h3>
        <p className="mb-3 text-sm text-[#64748b]">
          {data.passages.front_loading.answer_up_front
            ? "Hay una respuesta citable en las primeras ~60 palabras."
            : "Falta una respuesta autocontenida en las primeras ~60 palabras."}{" "}
          {data.passages.length.optimal_count}/{data.passages.length.total} pasajes en longitud óptima (134-167 palabras).
        </p>
        <div className="flex flex-col gap-2">
          {data.passages.passages.map((p, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-[#f1f5f9] p-2">
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${p.score >= 0.5 ? "bg-green-100 text-green-800" : p.score >= 0.25 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"}`}>
                {Math.round(p.score * 100)}%
              </span>
              <span className="text-xs text-[#475569]">{p.text}{p.word_count > 167 ? ` … (${p.word_count} palabras — conviene dividir)` : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
