"use client"
import { useState } from "react"
import { buildPresentationHtml } from "./presentation"

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
  authority: null | {
    applicable: boolean
    author: { found: boolean; name: string | null; source: string | null }
    dates: { published: string | null; modified: string | null; age_days: number | null; recency: string; source: string | null }
    sources: { external_domains: number }
    schema: { present: string[]; recommended_missing: string[] }
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
  page_type?: string | null
  is_commercial?: boolean | null
  product_category?: string | null
  brand?: string | null
  commercial?: null | {
    score: number
    product_schema: { present: boolean; missing_fields: string[] }
    ratings: { present: boolean; rating: number | null; count: number | null }
    description: { present: boolean; chars: number }
    brand_entity: { organization: boolean; brand_named: boolean; sameas_count: number }
    breadcrumbs: { present: boolean }
    recommended_schema: string[]
    issues: Issue[]
  }
  summary?: null | { verdict_label: string; verdict_sentence: string; score_context: string; executive_text: string }
  action_plan?: null | { title: string; severity: string; area: string; what: string; why: string; how: string; impact: string; effort: string }[]
  dimensions_explained?: null | { key: string; label: string; value: number | null; what: string; why: string; interpretation: string }[]
  strengths?: null | string[]
  glossary?: null | { term: string; definition: string }[]
  multimodal?: null | { score: number; images: { total: number; with_alt: number; without_alt: number }; video: { present: boolean; count: number }; media_schema: { present: boolean }; issues: Issue[] }
  visibility?: null | { score: number; brand: string; presence: Record<string, boolean>; found_count: number; issues: Issue[] }
  platforms?: null | { platforms: { key: string; label: string; score: number | null; tips: string[] }[] }
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
const IMPACT_COLOR: Record<string, string> = {
  Alto: "bg-red-100 text-red-800",
  Medio: "bg-amber-100 text-amber-800",
  Bajo: "bg-gray-100 text-gray-700",
}
const SUB_LABEL: Record<string, string> = {
  citability: "Citabilidad", structure: "Estructura", technical: "Técnica",
  authority: "Autoridad", multimodal: "Multimedia", visibility: "Visibilidad de marca", commercial_signals: "Señales comerciales",
}
const TYPE_LABEL: Record<string, string> = {
  producto: "Producto", coleccion: "Colección", categoria: "Categoría",
  articulo: "Artículo", home: "Home", otro: "Página",
}

export type FixInput = {
  mode: "text" | "url"
  text?: string
  url?: string
  title?: string
  niche?: string
}

export default function GeoReport({ data, input }: { data: GeoAudit; input: FixInput }) {
  const [fixLoading, setFixLoading] = useState<string | null>(null)
  const [fixError, setFixError] = useState<string | null>(null)
  const [fixResult, setFixResult] = useState<{ fix_type: string; format: string; content: string } | null>(null)

  async function runFix(fixType: string) {
    setFixError(null)
    setFixResult(null)
    setFixLoading(fixType)
    try {
      const res = await fetch("/api/auditor/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fix_type: fixType, ...input }),
      })
      const d = await res.json()
      if (!res.ok) { setFixError(d.error || "Error al generar"); return }
      setFixResult(d)
    } catch {
      setFixError("Error de conexión")
    } finally {
      setFixLoading(null)
    }
  }

  function descargarPresentacion() {
    const html = buildPresentationHtml(data)
    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "informe-geo.html"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const subKeys = data.is_commercial
    ? ["commercial_signals", "structure", "technical", "authority", "multimodal", "visibility"]
    : ["citability", "structure", "technical", "authority", "multimodal", "visibility"]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-5 rounded-xl border border-[#e2e8f0] bg-white p-6">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4"
             style={{ borderColor: scoreColor(data.geo_score) }}>
          <span className="text-3xl font-bold" style={{ color: scoreColor(data.geo_score) }}>{data.geo_score}</span>
        </div>
        <div>
          {data.page_type && (
            <span className="mb-1 inline-block rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-xs font-medium text-[#475569]">
              {TYPE_LABEL[data.page_type] || "Página"}
              {data.brand ? ` · ${data.brand}` : ""}
              {data.product_category ? ` · ${data.product_category}` : ""}
            </span>
          )}
          <h3 className="text-lg font-semibold text-[#0f172a]">GEO Readiness Score</h3>
          <p className="text-sm text-[#64748b]">
            Sobre 100. Nicho: {data.detected_niche}. Probabilidad media de cita: {Math.round(data.overall_citation_prob * 100)}%.
          </p>
          {data.summary && (
            <p className="mt-1 text-sm font-medium text-[#0f172a]">
              Preparación: <span className="text-[#EC1E63]">{data.summary.verdict_label}</span> — {data.summary.verdict_sentence}
            </p>
          )}
          <button type="button" onClick={descargarPresentacion} className="mt-3 rounded-md bg-[#0f172a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e293b]">Descargar presentación</button>
        </div>
      </div>

      {data.summary && (
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
          <h3 className="mb-2 text-base font-semibold text-[#0f172a]">Resumen para tu equipo</h3>
          <p className="text-sm leading-relaxed text-[#334155]">{data.summary.executive_text}</p>
          <p className="mt-3 text-xs text-[#94a3b8]">{data.summary.score_context}</p>
        </div>
      )}
      <details className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
        <summary className="cursor-pointer text-sm font-medium text-[#475569]">¿Qué es esto y por qué importa?</summary>
        <p className="mt-2 text-sm leading-relaxed text-[#475569]">
          Cada vez más gente pregunta a asistentes como ChatGPT o Google (AI Overviews) en lugar de buscar a la manera clásica. Estos asistentes leen páginas web y citan las que mejor responden. Este informe mide cómo de preparada está tu página para que esas IA te lean, te entiendan y te mencionen, y te dice qué mejorar para ganar visibilidad ahí.
        </p>
      </details>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {subKeys.map((k) => {
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

      {data.dimensions_explained && data.dimensions_explained.length > 0 && (
        <details className="rounded-xl border border-[#e2e8f0] bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium text-[#0f172a]">Qué mide cada puntuación</summary>
          <ul className="mt-3 flex flex-col gap-3">
            {data.dimensions_explained.map((d) => (
              <li key={d.key} className="text-sm text-[#475569]">
                <span className="font-medium text-[#0f172a]">{d.label}{d.value != null ? ` — ${d.value}/100` : ""}:</span> {d.interpretation}
                <div className="text-xs text-[#64748b]">{d.what} {d.why}</div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {data.platforms && data.platforms.platforms.length > 0 && (
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
          <h3 className="mb-1 text-base font-semibold text-[#0f172a]">Preparación por plataforma de IA</h3>
          <p className="mb-3 text-xs text-[#64748b]">Cada asistente se fija en cosas distintas.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.platforms.platforms.map((p) => (
              <div key={p.key} className="rounded-lg border border-[#e2e8f0] p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#0f172a]">{p.label}</span>
                  <span className="text-sm font-bold" style={{ color: p.score == null ? "#94a3b8" : (p.score >= 70 ? "#16a34a" : p.score >= 40 ? "#d97706" : "#dc2626") }}>{p.score == null ? "N/A" : p.score}</span>
                </div>
                <ul className="flex flex-col gap-1">
                  {p.tips.map((t, i) => (<li key={i} className="text-xs text-[#64748b]">• {t}</li>))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.visibility && (
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
          <h3 className="mb-3 text-base font-semibold text-[#0f172a]">Presencia de tu marca (visibilidad para IA)</h3>
          <p className="mb-3 text-xs text-[#64748b]">Dónde encuentra la IA a tu marca. Las menciones de marca son de las señales que más influyen en que te citen.</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.visibility.presence).map(([name, ok]) => (
              <span key={name} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ok ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                {ok ? "✓" : "✗"} {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.multimodal && (
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
          <h3 className="mb-3 text-base font-semibold text-[#0f172a]">Contenido multimedia</h3>
          <ul className="flex flex-col gap-1 text-sm text-[#475569]">
            <li>Imágenes: {data.multimodal.images.total} ({data.multimodal.images.with_alt} con texto alternativo, {data.multimodal.images.without_alt} sin él)</li>
            <li>Vídeo: {data.multimodal.video.present ? `sí (${data.multimodal.video.count})` : "no"}</li>
            <li>Medios etiquetados para IA (ImageObject/VideoObject): {data.multimodal.media_schema.present ? "sí" : "no"}</li>
          </ul>
        </div>
      )}

      {data.action_plan && data.action_plan.length > 0 ? (
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
          <h3 className="mb-1 text-base font-semibold text-[#0f172a]">Plan de acción priorizado</h3>
          <p className="mb-3 text-xs text-[#64748b]">Ordenado por lo que más impacto tiene en que las IA te citen.</p>
          <ul className="flex flex-col gap-4">
            {data.action_plan.map((a, i) => (
              <li key={i} className="border-l-2 border-[#EC1E63] pl-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#0f172a]">{i + 1}. {a.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${IMPACT_COLOR[a.impact] || "bg-gray-100 text-gray-700"}`}>Impacto {a.impact}</span>
                  <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-xs font-medium text-[#475569]">Esfuerzo {a.effort}</span>
                </div>
                <p className="text-sm text-[#475569]"><span className="font-medium text-[#334155]">Por qué importa:</span> {a.why}</p>
                <p className="mt-1 text-sm text-[#475569]"><span className="font-medium text-[#334155]">Cómo hacerlo:</span> {a.how}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (data.top_changes.length > 0 && (
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
      ))}

      {data.strengths && data.strengths.length > 0 && (
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
          <h3 className="mb-3 text-base font-semibold text-[#0f172a]">Lo que ya haces bien</h3>
          <ul className="flex flex-col gap-2">
            {data.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#475569]">
                <span className="mt-0.5 text-green-600">✓</span><span>{s}</span>
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

      {data.authority && (
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
          <h3 className="mb-3 text-base font-semibold text-[#0f172a]">Autoridad, frescura y Schema</h3>
          <ul className="flex flex-col gap-1 text-sm text-[#475569]">
            <li>Autor: {data.authority.author.found ? data.authority.author.name : "no identificado"}</li>
            <li>
              Fecha: {data.authority.dates.modified || data.authority.dates.published || "sin fecha"}
              {" — "}
              {data.authority.dates.recency}
              {data.authority.dates.age_days != null ? ` (~${data.authority.dates.age_days} días)` : ""}
            </li>
            <li>Enlaces a fuentes externas: {data.authority.sources.external_domains}</li>
            <li>Schema presente: {data.authority.schema.present.length ? data.authority.schema.present.join(", ") : "ninguno"}</li>
            {data.authority.schema.recommended_missing.length > 0 && (
              <li>Recomendado añadir: {data.authority.schema.recommended_missing.join(", ")}</li>
            )}
          </ul>
        </div>
      )}

      {data.commercial && (
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
          <h3 className="mb-3 text-base font-semibold text-[#0f172a]">Señales comerciales (citabilidad de tienda)</h3>
          <ul className="flex flex-col gap-1 text-sm text-[#475569]">
            <li>Datos de producto (Schema Product): {data.commercial.product_schema.present ? "presente" : "ausente"}
              {data.commercial.product_schema.present && data.commercial.product_schema.missing_fields.length > 0
                ? ` (faltan: ${data.commercial.product_schema.missing_fields.join(", ")})` : ""}</li>
            <li>Valoraciones (AggregateRating): {data.commercial.ratings.present
              ? `presentes${data.commercial.ratings.rating != null ? ` (${data.commercial.ratings.rating}${data.commercial.ratings.count != null ? `, ${data.commercial.ratings.count} reseñas` : ""})` : ""}`
              : "ausentes"}</li>
            <li>Descripción citable: {data.commercial.description.present ? `sí (${data.commercial.description.chars} caracteres)` : "insuficiente"}</li>
            <li>Entidad de marca: {data.commercial.brand_entity.organization ? "Schema Organization ✓" : "sin Organization"}; enlaces sameAs: {data.commercial.brand_entity.sameas_count}</li>
            <li>Miga de pan (BreadcrumbList): {data.commercial.breadcrumbs.present ? "presente" : "ausente"}</li>
            {data.commercial.recommended_schema.length > 0 && (
              <li>Recomendado añadir: {data.commercial.recommended_schema.join(", ")}</li>
            )}
          </ul>
        </div>
      )}

      {!data.is_commercial && (
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
      )}

      <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
        <h3 className="mb-1 text-base font-semibold text-[#0f172a]">Arreglos asistidos (IA)</h3>
        <p className="mb-3 text-xs text-[#64748b]">Genera contenido listo para pegar. Cada botón hace una llamada al modelo.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => runFix("answer_intro")} disabled={!!fixLoading}
            className="rounded-md border border-[#e2e8f0] px-3 py-1.5 text-sm font-medium text-[#475569] hover:border-[#EC1E63] hover:text-[#EC1E63] disabled:opacity-60">
            {fixLoading === "answer_intro" ? "Generando…" : "Generar respuesta inicial"}
          </button>
          <button type="button" onClick={() => runFix("schema_jsonld")} disabled={!!fixLoading}
            className="rounded-md border border-[#e2e8f0] px-3 py-1.5 text-sm font-medium text-[#475569] hover:border-[#EC1E63] hover:text-[#EC1E63] disabled:opacity-60">
            {fixLoading === "schema_jsonld" ? "Generando…" : "Generar JSON-LD (Schema)"}
          </button>
          <button type="button" onClick={() => runFix("faq")} disabled={!!fixLoading}
            className="rounded-md border border-[#e2e8f0] px-3 py-1.5 text-sm font-medium text-[#475569] hover:border-[#EC1E63] hover:text-[#EC1E63] disabled:opacity-60">
            {fixLoading === "faq" ? "Generando…" : "Generar FAQ"}
          </button>
        </div>
        {fixError && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{fixError}</p>}
        {fixResult && (
          <div className="mt-4">
            <textarea readOnly value={fixResult.content} rows={10}
              className="w-full rounded-md border border-[#cbd5e1] bg-[#f8fafc] p-3 font-mono text-xs text-[#0f172a]" />
            <button type="button" onClick={() => navigator.clipboard?.writeText(fixResult.content)}
              className="mt-2 rounded-md bg-[#0f172a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e293b]">
              Copiar
            </button>
          </div>
        )}
      </div>

      {data.glossary && data.glossary.length > 0 && (
        <details className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
          <summary className="cursor-pointer text-sm font-medium text-[#475569]">Glosario (términos en cristiano)</summary>
          <ul className="mt-3 flex flex-col gap-2">
            {data.glossary.map((g, i) => (
              <li key={i} className="text-sm text-[#475569]"><span className="font-medium text-[#0f172a]">{g.term}:</span> {g.definition}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
