"use client"

import { useState } from "react"
import Link from "next/link"

type QuestionsResult = {
  questions: { question: string; prob: number }[]
  best_prob: number
  detected_niche: string
  niche_confidence: number
  niche_was_overridden: boolean
  structured_data?: { score?: number } | null
}

type CompetitorResult = {
  user_avg: number
  questions_used: string[]
  competitors: {
    url: string
    domain: string
    status: string
    avg_prob?: number | null
    title?: string | null
    error?: string | null
    relevance?: number | null
  }[]
  competitors_avg?: number | null
  user_percentile?: number | null
  tavily_available: boolean
  tavily_warning?: string | null
  elapsed_seconds: number
}

const NICHES = [
  "ecommerce",
  "finanzas",
  "noticias",
  "recetas",
  "salud",
  "tecnologia",
  "cultura",
  "deporte",
  "ocio",
]

function probColor(prob: number): string {
  if (prob >= 0.5) return "bg-green-100 text-green-800"
  if (prob >= 0.25) return "bg-amber-100 text-amber-800"
  return "bg-gray-100 text-gray-700"
}

export default function AuditorTool() {
  const [mode, setMode] = useState<"text" | "url">("text")
  const [text, setText] = useState("")
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [niche, setNiche] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<QuestionsResult | null>(null)
  const [compLoading, setCompLoading] = useState(false)
  const [compError, setCompError] = useState<string | null>(null)
  const [comp, setComp] = useState<CompetitorResult | null>(null)

  async function analyze() {
    setError(null)
    setResult(null)
    setComp(null)
    setCompError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/auditor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          text: mode === "text" ? text : undefined,
          url: mode === "url" ? url : undefined,
          title: title || undefined,
          niche: niche || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al analizar")
        return
      }

      setResult(data as QuestionsResult)
    } finally {
      setLoading(false)
    }
  }

  async function compare() {
    if (!result) return
    setCompError(null)
    setComp(null)
    setCompLoading(true)

    try {
      const res = await fetch("/api/auditor/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          text: mode === "text" ? text : undefined,
          url: mode === "url" ? url : undefined,
          title: title || undefined,
          niche: niche || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setCompError(data.error ?? "Error al comparar con competencia")
        return
      }

      setComp(data as CompetitorResult)
    } finally {
      setCompLoading(false)
    }
  }

  const canAnalyze =
    !loading &&
    !error &&
    ((mode === "text" && text.length >= 50) || (mode === "url" && url.length > 0))

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/app"
        className="text-sm font-medium text-[#EC1E63] hover:underline"
      >
        ← Volver al dashboard
      </Link>

      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold tracking-tight text-[#0f172a]">
          Auditor GEO
        </h2>
        <p className="mb-5 text-sm text-[#64748b]">
          Analiza preguntas frecuentes y compárate con la competencia.
        </p>

        <div className="mb-5 flex gap-3">
          <button
            onClick={() => {
              setMode("text")
              setError(null)
              setResult(null)
              setComp(null)
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              mode === "text"
                ? "bg-[#EC1E63] text-white"
                : "border border-[#e2e8f0] text-[#475569] hover:border-[#EC1E63] hover:text-[#EC1E63]"
            }`}
          >
            Texto
          </button>
          <button
            onClick={() => {
              setMode("url")
              setError(null)
              setResult(null)
              setComp(null)
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              mode === "url"
                ? "bg-[#EC1E63] text-white"
                : "border border-[#e2e8f0] text-[#475569] hover:border-[#EC1E63] hover:text-[#EC1E63]"
            }`}
          >
            URL
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canAnalyze) analyze()
          }}
          className="flex flex-col gap-4"
        >
          {mode === "text" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="text" className="text-sm font-medium text-[#475569]">
                Contenido del artículo
              </label>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Pega el contenido de tu artículo (mínimo 50 caracteres)..."
                rows={6}
                className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
              />
              <p className="text-xs text-[#94a3b8]">
                {text.length} caracteres
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="url" className="text-sm font-medium text-[#475569]">
                URL de la página
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://ejemplo.com/articulo"
                className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className="text-sm font-medium text-[#475569]">
              Título (opcional)
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del artículo"
              className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="niche" className="text-sm font-medium text-[#475569]">
              Nicho
            </label>
            <select
              id="niche"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            >
              <option value="">Detectar automáticamente</option>
              {NICHES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canAnalyze}
            className="self-start rounded-md bg-[#EC1E63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4154f] disabled:opacity-60"
          >
            {loading ? "Analizando…" : "Analizar"}
          </button>
        </form>
      </section>

      {result && (
        <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#0f172a]">
                Análisis de preguntas
              </h3>
              <button
                onClick={compare}
                disabled={compLoading}
                className="rounded-md border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-medium text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a] disabled:opacity-60"
              >
                {compLoading ? "Comparando…" : "Comparar con competencia"}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#EC1E63]">
                  {Math.round(result.best_prob * 100)}%
                </div>
                <p className="text-xs font-medium text-[#64748b]">
                  Probabilidad de citación
                </p>
              </div>
              <div className="flex-1 text-sm text-[#475569]">
                <p className="font-medium">
                  Nicho detectado: <span className="text-[#0f172a]">{result.detected_niche}</span>
                </p>
                <p className="text-xs text-[#64748b]">
                  {Math.round(result.niche_confidence * 100)}% confianza
                </p>
                {result.niche_was_overridden && (
                  <p className="text-xs text-amber-600">
                    (Anulado manualmente)
                  </p>
                )}
              </div>
            </div>

            {result.structured_data?.score != null && (
              <p className="text-sm text-[#475569]">
                Datos estructurados: <span className="font-semibold">{result.structured_data.score}/100</span>
              </p>
            )}
          </div>

          <div className="mb-6">
            <h4 className="mb-3 text-sm font-semibold text-[#0f172a]">
              Preguntas detectadas ({result.questions.length})
            </h4>
            <div className="space-y-2">
              {result.questions.map((q, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-[#f8fafc] p-3">
                  <span className="text-sm text-[#475569]">{q.question}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${probColor(
                      q.prob
                    )}`}
                  >
                    {Math.round(q.prob * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {comp && (
        <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-base font-semibold text-[#0f172a]">
            Comparación con competencia
          </h3>

          {comp.tavily_warning && (
            <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {comp.tavily_warning}
            </div>
          )}

          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <p className="text-xs font-medium text-[#64748b]">Tu media</p>
              <p className="mt-1 text-2xl font-bold text-[#0f172a]">
                {Math.round(comp.user_avg * 100)}%
              </p>
            </div>
            {comp.competitors_avg != null && (
              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <p className="text-xs font-medium text-[#64748b]">
                  Media competidores
                </p>
                <p className="mt-1 text-2xl font-bold text-[#0f172a]">
                  {Math.round(comp.competitors_avg * 100)}%
                </p>
              </div>
            )}
            {comp.user_percentile != null && (
              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <p className="text-xs font-medium text-[#64748b]">
                  Superas al
                </p>
                <p className="mt-1 text-2xl font-bold text-[#0f172a]">
                  {Math.round(comp.user_percentile * 100)}%
                </p>
              </div>
            )}
          </div>

          <div className="mb-4">
            <h4 className="mb-3 text-sm font-semibold text-[#0f172a]">
              Competidores analizados
            </h4>
            <div className="overflow-x-auto rounded-lg border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <thead className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-[#475569]">
                      Dominio
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-[#475569]">
                      Estado
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-[#475569]">
                      Media
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-[#475569]">
                      Relevancia
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comp.competitors.map((c, i) => (
                    <tr
                      key={i}
                      className={c.status !== "ok" ? "bg-[#f8fafc] opacity-60" : ""}
                    >
                      <td className="px-4 py-2 text-[#0f172a]">
                        {c.domain}
                      </td>
                      <td className="px-4 py-2 text-[#64748b]">{c.status}</td>
                      <td className="px-4 py-2 text-[#475569]">
                        {c.status === "ok" && c.avg_prob != null
                          ? `${Math.round(c.avg_prob * 100)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-[#475569]">
                        {c.relevance != null
                          ? Math.round(c.relevance * 100)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-xs text-[#94a3b8]">
            <p>
              Tiempo: <span className="font-medium">{comp.elapsed_seconds}s</span>
            </p>
            <p>
              Preguntas neutrales usadas:{" "}
              <span className="font-medium">{comp.questions_used.length}</span>
            </p>
          </div>
        </section>
      )}

      {compError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {compError}
        </p>
      )}
    </div>
  )
}