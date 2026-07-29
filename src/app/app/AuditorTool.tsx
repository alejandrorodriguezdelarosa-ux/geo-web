"use client"

import { useEffect, useState } from "react"
import GeoReport, { type GeoAudit } from "./GeoReport"
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
  product_category?: string | null
}

type QuestionMeasure = {
  probability: number
  conclusion: string
  strengths: string[]
  improvements: { titulo: string; por_que: string; como: string }[]
  prompt: string
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
  const [manualComp, setManualComp] = useState("")
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geo, setGeo] = useState<GeoAudit | null>(null)
  const [question, setQuestion] = useState("")
  const [qLoading, setQLoading] = useState(false)
  const [qError, setQError] = useState<string | null>(null)
  const [qResult, setQResult] = useState<QuestionMeasure | null>(null)
  // El analisis es una sola accion con varios pasos: se cuenta por donde va.
  const [paso, setPaso] = useState<string | null>(null)
  const [empresas, setEmpresas] = useState<{ id: string; name: string }[]>([])
  const [empresaId, setEmpresaId] = useState("")

  useEffect(() => {
    fetch("/api/empresas")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.empresas) setEmpresas(j.empresas) })
      .catch(() => {})
  }, [])

  async function analizarTodo() {
    setError(null); setResult(null); setComp(null); setCompError(null)
    setGeo(null); setGeoError(null); setQResult(null)
    setLoading(true)

    const cuerpoBase = {
      mode,
      text: mode === "text" ? text : undefined,
      url: mode === "url" ? url : undefined,
      title: title || undefined,
      niche: niche || undefined,
      companyId: empresaId || undefined,
    }

    try {
      // Competidores guardados de esta URL: deciden si al final hay comparativa.
      let compUrls: string[] = []
      if (mode === "url" && url) {
        setPaso("Recuperando tus competidores…")
        try {
          const rs = await fetch(`/api/auditor/competitor-set?url=${encodeURIComponent(url)}`)
          if (rs.ok) {
            const j = await rs.json()
            if (Array.isArray(j.competitors)) {
              compUrls = j.competitors
              setManualComp(j.competitors.join("\n"))
            }
          }
        } catch {}
      }

      setPaso("Analizando la página…")
      try {
        const res = await fetch("/api/auditor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpoBase),
        })
        const data = await res.json()
        if (res.ok) setResult(data as QuestionsResult)
        else setError(data.error ?? "Error al analizar")
      } catch {
        setError("Error de conexión al analizar la página")
      }

      setPaso("Preparando el informe…")
      try {
        const res = await fetch("/api/auditor/geo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpoBase),
        })
        const data = await res.json()
        if (res.ok) setGeo(data as GeoAudit)
        else setGeoError(data.error || "Error al generar el informe")
      } catch {
        setGeoError("Error de conexión al generar el informe")
      }

      if (compUrls.length > 0) {
        setPaso("Comparando con tu competencia…")
        setCompLoading(true)
        try {
          const res = await fetch("/api/auditor/competitors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...cuerpoBase, manual_competitor_urls: compUrls }),
          })
          const data = await res.json()
          if (res.ok) setComp(data as CompetitorResult)
          else setCompError(data.error ?? "Error al comparar con competencia")
        } catch {
          setCompError("Error de conexión al comparar")
        } finally {
          setCompLoading(false)
        }
      }
    } finally {
      setPaso(null)
      setLoading(false)
    }
  }

  async function compare() {
    if (!result) return
    setCompError(null)
    setComp(null)
    setCompLoading(true)

    const compUrls = manualComp
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    if (mode === "url" && url) {
      try {
        await fetch("/api/auditor/competitor-set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, competitors: compUrls }),
        })
      } catch {}
    }

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
          manual_competitor_urls: compUrls,
          companyId: empresaId || undefined,
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

  async function geoAudit() {
    setGeoError(null)
    setGeo(null)
    setGeoLoading(true)
    try {
      const res = await fetch("/api/auditor/geo", {
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
      if (!res.ok) { setGeoError(data.error || "Error al generar el informe"); return }
      setGeo(data as GeoAudit)
    } catch {
      setGeoError("Error de conexión")
    } finally {
      setGeoLoading(false)
    }
  }

  async function askQuestion() {
    if (question.trim().length < 5) return
    setQError(null); setQResult(null); setQLoading(true)
    try {
      const res = await fetch("/api/auditor/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          text: mode === "text" ? text : undefined,
          url: mode === "url" ? url : undefined,
          title: title || undefined,
          niche: niche || undefined,
          prompt: question.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setQError(data.error || "Error al medir la pregunta"); return }
      setQResult(data as QuestionMeasure)
    } catch { setQError("Error de conexión") } finally { setQLoading(false) }
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
            if (canAnalyze) analizarTodo()
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

          {empresas.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[#475569]">Empresa (opcional)</span>
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="w-full max-w-xs rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63]"
              >
                <option value="">Sin asignar</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <span className="text-xs text-[#94a3b8]">
                Si la eliges, este análisis queda en la ficha de esa empresa.
              </span>
            </label>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={!canAnalyze}
              className="self-start rounded-md bg-[#EC1E63] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#c4154f] disabled:opacity-60"
            >
              {loading ? (paso ?? "Analizando…") : "Analizar"}
            </button>
            <p className="text-xs text-[#94a3b8]">
              Un solo análisis: preguntas, informe completo y, si tienes competidores guardados para
              esta URL, la comparativa con ellos.
            </p>
          </div>
        </form>
      </section>

      {result && (
        <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#0f172a]">
                Análisis de preguntas
              </h3>
            </div>
            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <p className="mb-1 text-sm font-semibold text-[#0f172a]">Tus competidores para esta URL</p>
              <p className="mb-3 text-xs text-[#64748b]">Pon las webs con las que quieres compararte (una URL por línea). Se guardan para esta URL y se recargan la próxima vez que la analices.</p>
              <textarea
                value={manualComp}
                onChange={(e) => setManualComp(e.target.value)}
                rows={5}
                placeholder={"https://competidor1.com\nhttps://competidor2.com"}
                className="w-full rounded-md border border-[#cbd5e1] bg-white p-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
              />
              <button
                onClick={compare}
                disabled={compLoading}
                className="mt-3 rounded-md bg-[#EC1E63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4154f] disabled:opacity-60"
              >
                {compLoading ? "Comparando…" : "Guardar y comparar"}
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
                  {comp.competitors.filter((c) => c.status === "ok").map((c, i) => (
                    <tr
                      key={i}
                      className=""
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
            {comp.competitors.filter((c) => c.status !== "ok").length > 0 && (
              <p className="mt-3 text-xs text-[#94a3b8]">
                {comp.competitors.filter((c) => c.status !== "ok").length} descartados por no ser relevantes o no accesibles.
              </p>
            )}
          </div>

          <div className="text-xs text-[#94a3b8]">
            <p>
              Tiempo: <span className="font-medium">{comp.elapsed_seconds}s</span>
            </p>
            <p>
              Preguntas usadas:{" "}
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

      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-base font-semibold text-[#0f172a]">Mídelo con tu propia pregunta</h3>
        <p className="mb-4 text-sm text-[#64748b]">Escribe una pregunta real de usuario y mide cómo de preparada está esta página para ser citada por una IA al responderla.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ej: ¿qué camisetas de algodón orgánico comprar?"
            className="flex-1 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
          />
          <button
            type="button"
            onClick={askQuestion}
            disabled={qLoading || question.trim().length < 5 || (mode === "text" ? text.length < 50 : url.length === 0)}
            className="rounded-md bg-[#EC1E63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4154f] disabled:opacity-60"
          >
            {qLoading ? "Midiendo…" : "Medir"}
          </button>
        </div>
        {qError && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{qError}</p>}
        {qResult && (
          <div className="mt-5 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#EC1E63]">{Math.round(qResult.probability * 100)}%</div>
                <p className="text-xs font-medium text-[#64748b]">Probabilidad de ser citada</p>
              </div>
              <p className="flex-1 text-sm text-[#334155]">{qResult.conclusion}</p>
            </div>
            {qResult.strengths.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-[#0f172a]">Qué juega a favor</h4>
                <ul className="flex flex-col gap-1">
                  {qResult.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#475569]"><span className="mt-0.5 text-green-600">✓</span><span>{s}</span></li>
                  ))}
                </ul>
              </div>
            )}
            {qResult.improvements.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-[#0f172a]">Qué mejorar y cómo</h4>
                <ul className="flex flex-col gap-3">
                  {qResult.improvements.map((m, i) => (
                    <li key={i} className="rounded-lg border border-[#e2e8f0] p-3">
                      <p className="text-sm font-medium text-[#0f172a]">{m.titulo}</p>
                      {m.por_que && <p className="mt-1 text-sm text-[#475569]"><span className="font-medium text-[#334155]">Por qué:</span> {m.por_que}</p>}
                      {m.como && <p className="mt-1 text-sm text-[#475569]"><span className="font-medium text-[#334155]">Cómo:</span> {m.como}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        {/* El informe llega con el analisis; este boton solo hace falta para
            reintentarlo si esa parte fallo. */}
        {!geo && (result || geoError) && (
          <div>
            <button
              type="button"
              onClick={geoAudit}
              disabled={geoLoading || (mode === "text" ? text.length < 50 : url.length === 0)}
              className="rounded-md bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:opacity-60"
            >
              {geoLoading ? "Generando informe…" : "Reintentar el informe"}
            </button>
          </div>
        )}
        {geoError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{geoError}</p>
        )}
        {geo && (
          <GeoReport
            data={geo}
            input={{
              mode,
              text: mode === "text" ? text : undefined,
              url: mode === "url" ? url : undefined,
              title: title || undefined,
              niche: niche || undefined,
            }}
          />
        )}
      </section>
    </div>
  )
}