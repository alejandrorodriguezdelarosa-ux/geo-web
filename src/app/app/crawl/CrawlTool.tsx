"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"

const formSchema = z.object({
  url: z
    .string()
    .min(1, "Requerido")
    .url("Introduce una URL válida (empieza por https://)")
    .refine(
      (u) => u.startsWith("http://") || u.startsWith("https://"),
      "Solo se aceptan URLs http o https"
    ),
  maxPages: z.number().int().min(1, "Mínimo 1").max(30, "Máximo 30"),
})

type FormValues = z.infer<typeof formSchema>

type PageResult = {
  url: string
  detectedType?: string
  jsonLd?: Record<string, unknown>
  error?: string
}

type JobStatus = {
  jobId: string
  status: "pending" | "running" | "succeeded" | "failed"
  total: number
  done: number
  succeeded: number
  failed: number
  errorMessage: string | null
  results: PageResult[]
}

const TYPE_COLORS: Record<string, string> = {
  Product: "bg-purple-100 text-purple-800",
  Article: "bg-blue-100 text-blue-800",
  BlogPosting: "bg-blue-100 text-blue-800",
  FAQPage: "bg-orange-100 text-orange-800",
  Organization: "bg-teal-100 text-teal-800",
  WebSite: "bg-indigo-100 text-indigo-800",
  WebPage: "bg-gray-100 text-gray-700",
  AboutPage: "bg-green-100 text-green-800",
  ContactPage: "bg-yellow-100 text-yellow-800",
  CollectionPage: "bg-pink-100 text-pink-800",
}

function typeBadgeClass(type: string) {
  return TYPE_COLORS[type] ?? "bg-gray-100 text-gray-700"
}

export default function CrawlTool() {
  const [phase, setPhase] = useState<"idle" | "polling" | "done">("idle")
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { maxPages: 10 },
  })

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    }
  }, [])

  const poll = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/crawl/${jobId}`)
      if (!res.ok) {
        pollTimeoutRef.current = setTimeout(() => poll(jobId), 3000)
        return
      }
      const data: JobStatus = await res.json()
      setJobStatus(data)
      if (data.status === "pending" || data.status === "running") {
        pollTimeoutRef.current = setTimeout(() => poll(jobId), 2500)
      } else {
        setPhase("done")
      }
    } catch {
      pollTimeoutRef.current = setTimeout(() => poll(jobId), 3000)
    }
  }, [])

  async function onSubmit(values: FormValues) {
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    setFormError(null)
    setJobStatus(null)
    setPhase("idle")

    const res = await fetch("/api/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      if (res.status === 422) {
        setFormError(
          (data as { details?: string }).details ??
          "Este sitio no tiene sitemap.xml. El rastreo multipágina requiere sitemap para descubrir las URLs."
        )
      } else {
        setFormError((data as { error?: string }).error ?? "Error al lanzar el rastreo")
      }
      return
    }

    const { jobId, total } = data as { jobId: string; total: number }
    setJobStatus({
      jobId,
      status: "pending",
      total,
      done: 0,
      succeeded: 0,
      failed: 0,
      errorMessage: null,
      results: [],
    })
    setPhase("polling")
    poll(jobId)
  }

  async function handleCopyOne(index: number, jsonLd: Record<string, unknown>) {
    await navigator.clipboard.writeText(JSON.stringify(jsonLd, null, 2))
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  async function handleCopyAll() {
    if (!jobStatus) return
    const all = jobStatus.results
      .filter((r) => r.jsonLd !== undefined)
      .map((r) => r.jsonLd)
    await navigator.clipboard.writeText(JSON.stringify(all, null, 2))
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  const progressPct = jobStatus
    ? Math.round((jobStatus.done / Math.max(jobStatus.total, 1)) * 100)
    : 0
  const isPolling = phase === "polling"

  return (
    <div className="flex flex-col gap-8">
      <Link href="/app" className="text-sm font-medium text-[#EC1E63] hover:underline">
        ← Volver al dashboard
      </Link>

      {/* Form */}
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold tracking-tight text-[#0f172a]">
          Crawling multipágina
        </h2>
        <p className="mb-5 text-sm text-[#64748b]">
          Rastrearemos tu{" "}
          <code className="rounded bg-[#f1f5f9] px-1 text-xs">sitemap.xml</code> y generaremos
          Schema.org para las primeras N páginas.{" "}
          <span className="text-[#94a3b8]">
            Los sitios sin sitemap no son compatibles con esta herramienta.
          </span>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="url" className="text-sm font-medium text-[#475569]">
              URL del sitio
            </label>
            <input
              id="url"
              type="url"
              placeholder="https://mi-tienda.com"
              {...register("url")}
              className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
            {errors.url && (
              <p className="text-xs text-red-600">{errors.url.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="maxPages" className="text-sm font-medium text-[#475569]">
              Número de páginas (1–30)
            </label>
            <input
              id="maxPages"
              type="number"
              min={1}
              max={30}
              step={1}
              {...register("maxPages", { valueAsNumber: true })}
              className="w-24 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
            {errors.maxPages && (
              <p className="text-xs text-red-600">{errors.maxPages.message}</p>
            )}
          </div>

          {formError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isPolling}
            className="self-start rounded-md bg-[#EC1E63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4154f] disabled:opacity-60"
          >
            {isSubmitting ? "Iniciando…" : isPolling ? "Rastreando…" : "Rastrear sitio"}
          </button>
        </form>
      </section>

      {/* Progress */}
      {jobStatus && (isPolling || phase === "done") && (
        <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-[#0f172a]">Progreso</h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                jobStatus.status === "succeeded"
                  ? "bg-green-100 text-green-800"
                  : jobStatus.status === "failed"
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {jobStatus.status === "pending"
                ? "Iniciando"
                : jobStatus.status === "running"
                ? "Procesando"
                : jobStatus.status === "succeeded"
                ? "Completado"
                : "Error"}
            </span>
          </div>

          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
            <div
              className="h-2 rounded-full bg-[#EC1E63] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-[#64748b]">
            {jobStatus.done} / {jobStatus.total} páginas procesadas
          </p>

          {jobStatus.errorMessage && (
            <p className="mt-3 text-sm text-red-600">{jobStatus.errorMessage}</p>
          )}
        </section>
      )}

      {/* Results */}
      {phase === "done" && jobStatus && jobStatus.results.length > 0 && (
        <section className="flex flex-col gap-4">
          {/* Summary */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#475569]">
              <span className="font-semibold text-[#0f172a]">{jobStatus.total}</span> páginas
              procesadas ·{" "}
              <span className="font-semibold text-green-700">{jobStatus.succeeded}</span> con
              Schema.org
              {jobStatus.failed > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-red-600">{jobStatus.failed} fallidas</span>
                </>
              )}
            </p>
            {jobStatus.succeeded > 0 && (
              <button
                onClick={handleCopyAll}
                className="shrink-0 rounded-md border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-medium text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]"
              >
                {copiedAll ? "¡Copiado!" : "Copiar todos los JSON-LD"}
              </button>
            )}
          </div>

          {/* Per-page cards */}
          {jobStatus.results.map((r, i) => (
            <div key={i} className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
              {r.error ? (
                <>
                  <p className="mb-1 break-all text-xs font-medium text-[#94a3b8]">{r.url}</p>
                  <p className="text-sm text-red-600">{r.error}</p>
                </>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="break-all text-xs font-medium text-[#94a3b8]">{r.url}</p>
                      {r.detectedType && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${typeBadgeClass(r.detectedType)}`}
                        >
                          {r.detectedType}
                        </span>
                      )}
                    </div>
                    {r.jsonLd && (
                      <button
                        onClick={() => handleCopyOne(i, r.jsonLd!)}
                        className="shrink-0 rounded-md border border-[#e2e8f0] bg-white px-3 py-1 text-xs font-medium text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]"
                      >
                        {copiedIndex === i ? "¡Copiado!" : "Copiar JSON-LD"}
                      </button>
                    )}
                  </div>
                  {r.jsonLd && (
                    <pre className="overflow-x-auto rounded-lg bg-[#f8fafc] p-3 text-xs leading-relaxed text-[#0f172a]">
                      <code>{JSON.stringify(r.jsonLd, null, 2)}</code>
                    </pre>
                  )}
                </>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
