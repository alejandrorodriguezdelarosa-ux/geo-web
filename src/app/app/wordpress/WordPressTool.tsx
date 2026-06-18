"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"

const formSchema = z.object({
  wpUrl: z
    .string()
    .min(1, "Requerido")
    .url("Introduce una URL válida (empieza por https://)")
    .refine(
      (u) => u.startsWith("http://") || u.startsWith("https://"),
      "Solo se aceptan URLs http o https"
    ),
  wpUser: z.string().min(1, "Requerido"),
  appPassword: z.string().min(1, "Requerido"),
  maxItems: z.number().int().min(1, "Mínimo 1").max(200, "Máximo 200"),
})

type FormValues = z.infer<typeof formSchema>

type WpResult = {
  id?: number
  type?: string
  title?: string
  link?: string
  detectedType?: string
  jsonLd?: Record<string, unknown>
  metaWritten?: boolean
  metaWriteError?: string
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
  results: WpResult[]
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

const ITEM_TYPE_COLORS: Record<string, string> = {
  post: "bg-blue-50 text-blue-700",
  page: "bg-indigo-50 text-indigo-700",
  product: "bg-purple-50 text-purple-700",
}

function typeBadgeClass(type: string) {
  return TYPE_COLORS[type] ?? "bg-gray-100 text-gray-700"
}

function itemTypeBadgeClass(type: string) {
  return ITEM_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-700"
}

export default function WordPressTool() {
  const [phase, setPhase] = useState<"idle" | "polling" | "done">("idle")
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { maxItems: 10 },
  })

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    }
  }, [])

  const poll = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/wordpress/${jobId}`)
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

    const res = await fetch("/api/wordpress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setFormError(
        (data as { error?: string; details?: string }).error ??
        (data as { error?: string; details?: string }).details ??
        "Error al lanzar el proceso"
      )
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

  const progressPct = jobStatus
    ? Math.round((jobStatus.done / Math.max(jobStatus.total, 1)) * 100)
    : 0
  const isPolling = phase === "polling"

  return (
    <div className="flex flex-col gap-8">
      <Link href="/app" className="text-sm font-medium text-[#EC1E63] hover:underline">
        ← Volver al dashboard
      </Link>

      {/* Help block */}
      <details className="group rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
        <summary className="flex cursor-pointer select-none list-none items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold text-[#0f172a]">¿Cómo preparo mi WordPress?</span>
          <svg
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-[#64748b] transition-transform duration-200 group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>

        <div className="flex flex-col gap-5 border-t border-[#e2e8f0] px-6 pb-6 pt-5">
          {/* Paso 1 */}
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EC1E63] text-xs font-bold text-white">
              1
            </span>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-[#0f172a]">Instala el plugin GEO Schema Enricher</p>
              <p className="text-sm text-[#475569]">
                Permite que OptimoIA guarde el Schema.org en tu WordPress y lo muestre en cada página.
                Sin este plugin el Schema se generará pero no se guardará ni aparecerá en tu web.
              </p>
              <ol className="mt-0.5 flex list-inside list-decimal flex-col gap-0.5 text-sm text-[#475569]">
                <li>
                  <a
                    href="/geo-schema-enricher.zip"
                    download
                    className="font-medium text-[#EC1E63] hover:underline"
                  >
                    Descarga el plugin (.zip)
                  </a>
                </li>
                <li>
                  En tu panel WordPress:{" "}
                  <strong className="font-semibold text-[#0f172a]">
                    Plugins → Añadir nuevo → Subir plugin
                  </strong>
                </li>
                <li>
                  Selecciona el .zip descargado →{" "}
                  <strong className="font-semibold text-[#0f172a]">Instalar → Activar</strong>
                </li>
              </ol>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EC1E63] text-xs font-bold text-white">
              2
            </span>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-[#0f172a]">Genera un Application Password</p>
              <p className="text-sm text-[#475569]">
                En WordPress:{" "}
                <strong className="font-semibold text-[#0f172a]">
                  Usuarios → Tu perfil → Contraseñas de aplicación
                </strong>
                . Escribe un nombre (p.&nbsp;ej. "OptimoIA") y pulsa{" "}
                <strong className="font-semibold text-[#0f172a]">Añadir</strong>. Copia la
                contraseña que aparece —{" "}
                <em className="text-[#475569]">solo se muestra una vez</em>.
              </p>
              <p className="text-sm text-[#64748b]">
                El usuario es el de tu login de WordPress. El Application Password es distinto a tu
                contraseña habitual.
              </p>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EC1E63] text-xs font-bold text-white">
              3
            </span>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-[#0f172a]">
                Rellena el formulario y pulsa "Enriquecer sitio"
              </p>
              <p className="text-sm text-[#475569]">
                Introduce la URL de tu WordPress, tu usuario y el Application Password del paso
                anterior.
              </p>
            </div>
          </div>
        </div>
      </details>

      {/* Form */}
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold tracking-tight text-[#0f172a]">
          WordPress — Enriquecimiento Schema.org
        </h2>
        <p className="mb-5 text-sm text-[#64748b]">
          Conectamos con tu sitio WordPress vía REST API, generamos Schema.org para cada
          entrada y lo guardamos automáticamente en el meta field{" "}
          <code className="rounded bg-[#f1f5f9] px-1 text-xs">_geo_schema_jsonld</code>.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="wpUrl" className="text-sm font-medium text-[#475569]">
              URL del sitio WordPress
            </label>
            <input
              id="wpUrl"
              type="url"
              placeholder="https://mi-sitio.com"
              {...register("wpUrl")}
              className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
            {errors.wpUrl && (
              <p className="text-xs text-red-600">{errors.wpUrl.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="wpUser" className="text-sm font-medium text-[#475569]">
              Usuario de WordPress
            </label>
            <input
              id="wpUser"
              type="text"
              placeholder="tu-usuario-wp"
              autoComplete="off"
              {...register("wpUser")}
              className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
            {errors.wpUser && (
              <p className="text-xs text-red-600">{errors.wpUser.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="appPassword" className="text-sm font-medium text-[#475569]">
              Application Password
            </label>
            <input
              id="appPassword"
              type="password"
              placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
              autoComplete="off"
              {...register("appPassword")}
              className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
            {errors.appPassword && (
              <p className="text-xs text-red-600">{errors.appPassword.message}</p>
            )}
            <p className="text-xs text-[#94a3b8]">
              Un Application Password es una contraseña de uso único generada desde tu perfil de
              WordPress en <strong>Usuarios → Tu perfil → Contraseñas de aplicación</strong>.
              No se almacena en ningún sitio; se usa exclusivamente para esta solicitud y se
              descarta al terminar.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="maxItems" className="text-sm font-medium text-[#475569]">
              Número de items (1–200)
            </label>
            <input
              id="maxItems"
              type="number"
              min={1}
              max={200}
              step={1}
              {...register("maxItems", { valueAsNumber: true })}
              className="w-24 rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
            {errors.maxItems && (
              <p className="text-xs text-red-600">{errors.maxItems.message}</p>
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
            {isSubmitting ? "Iniciando…" : isPolling ? "Procesando…" : "Enriquecer sitio"}
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
            {jobStatus.done} / {jobStatus.total} items procesados
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
          <p className="text-sm text-[#475569]">
            <span className="font-semibold text-[#0f172a]">{jobStatus.total}</span> items
            procesados ·{" "}
            <span className="font-semibold text-green-700">{jobStatus.succeeded}</span> escritos
            en WordPress
            {jobStatus.failed > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-red-600">{jobStatus.failed} fallidos</span>
              </>
            )}
          </p>

          {/* Per-item rows */}
          <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
            {jobStatus.results.map((r, i) => {
              const hasError = !!r.error
              const writeOk = r.metaWritten === true
              const writeErr = r.metaWriteError

              return (
                <div
                  key={i}
                  className={`flex flex-wrap items-start gap-3 px-5 py-4 ${
                    i > 0 ? "border-t border-[#e2e8f0]" : ""
                  }`}
                >
                  {/* Item type badge */}
                  {r.type && (
                    <span
                      className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${itemTypeBadgeClass(r.type)}`}
                    >
                      {r.type}
                    </span>
                  )}

                  {/* Title + link */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#0f172a]">
                      {r.title || r.link || "—"}
                    </p>
                    {r.link && (
                      <p className="truncate text-xs text-[#94a3b8]">{r.link}</p>
                    )}
                    {hasError && (
                      <p className="mt-1 text-xs text-red-600">{r.error}</p>
                    )}
                    {writeErr && !hasError && (
                      <p className="mt-1 text-xs text-orange-600">{writeErr}</p>
                    )}
                  </div>

                  {/* Detected type badge */}
                  {r.detectedType && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${typeBadgeClass(r.detectedType)}`}
                    >
                      {r.detectedType}
                    </span>
                  )}

                  {/* metaWritten indicator */}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      hasError
                        ? "bg-red-100 text-red-700"
                        : writeOk
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {hasError ? "✗ error" : writeOk ? "✓ escrito" : "✗ no escrito"}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
