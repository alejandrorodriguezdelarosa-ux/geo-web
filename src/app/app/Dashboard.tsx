"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z.object({
  storeDomain: z
    .string()
    .min(3, "Dominio muy corto")
    .refine(
      (d) => d.endsWith(".myshopify.com") || /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(d),
      "Dominio inválido"
    ),
  shopifyToken: z
    .string()
    .min(1, "Requerido")
    .refine(
      (t) => t.startsWith("shpat_") || t.startsWith("shpca_"),
      "Token inválido (debe empezar por shpat_ o shpca_)"
    ),
})

type FormValues = z.infer<typeof schema>

type Job = {
  id: string
  storeDomain: string
  status: "pending" | "running" | "succeeded" | "failed"
  summary: string | null
  errorMessage: string | null
  startedAt: string
  finishedAt: string | null
}

const STATUS_LABEL: Record<Job["status"], string> = {
  pending: "Pendiente",
  running: "Procesando",
  succeeded: "Completado",
  failed: "Error",
}

const STATUS_CLASS: Record<Job["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  running: "bg-blue-100 text-blue-800",
  succeeded: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })
}

export default function Dashboard({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    const activeJobs = jobs.filter((j) => j.status === "pending" || j.status === "running")
    if (activeJobs.length === 0) return

    const interval = setInterval(async () => {
      const settled = await Promise.allSettled(
        activeJobs.map((j) =>
          fetch(`/api/jobs/${j.id}`).then((r) => (r.ok ? (r.json() as Promise<Job>) : null))
        )
      )
      const updates = settled
        .filter((r): r is PromiseFulfilledResult<Job> => r.status === "fulfilled" && r.value !== null)
        .map((r) => r.value)

      if (updates.length > 0) {
        setJobs((prev) => prev.map((j) => updates.find((u) => u.id === j.id) ?? j))
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [jobs])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    setSubmitSuccess(false)

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSubmitError(data.error ?? "Error al lanzar el análisis")
      return
    }

    const { jobId } = await res.json()
    setSubmitSuccess(true)
    reset()

    const refreshed = await fetch(`/api/jobs/${jobId}`)
    if (refreshed.ok) {
      const newJob: Job = await refreshed.json()
      setJobs((prev) => [newJob, ...prev])
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* New job form */}
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold tracking-tight text-[#0f172a]">
          Nuevo análisis
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="storeDomain" className="text-sm font-medium text-[#475569]">
              Dominio de la tienda
            </label>
            <input
              id="storeDomain"
              type="text"
              placeholder="mi-tienda.myshopify.com"
              {...register("storeDomain")}
              className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
            />
            {errors.storeDomain && (
              <p className="text-xs text-red-600">{errors.storeDomain.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="shopifyToken" className="text-sm font-medium text-[#475569]">
                Token de acceso de Shopify
              </label>
              <a href="/ayuda" className="text-xs text-[#2563eb] hover:underline">
                ¿Cómo consigo el token?
              </a>
            </div>
            <input
              id="shopifyToken"
              type="password"
              placeholder="shpat_…"
              autoComplete="off"
              {...register("shopifyToken")}
              className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
            />
            {errors.shopifyToken && (
              <p className="text-xs text-red-600">{errors.shopifyToken.message}</p>
            )}
          </div>

          {submitError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {submitError}
            </p>
          )}

          {submitSuccess && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              Análisis iniciado. Puedes ver el progreso abajo.
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="self-start rounded-md bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {isSubmitting ? "Lanzando…" : "Lanzar análisis"}
          </button>
        </form>
      </section>

      {/* Job list */}
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-[#0f172a]">
          Historial de análisis
        </h2>

        {jobs.length === 0 ? (
          <p className="text-sm text-[#64748b]">
            Aún no has lanzado ningún análisis.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-[#0f172a]">
                      {job.storeDomain}
                    </span>
                    <span className="text-xs text-[#94a3b8]">
                      {formatDate(job.startedAt)}
                      {job.finishedAt && ` — ${formatDate(job.finishedAt)}`}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[job.status]}`}
                  >
                    {STATUS_LABEL[job.status]}
                  </span>
                </div>

                {job.status === "succeeded" && job.summary && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-[#475569]">
                    {job.summary}
                  </p>
                )}

                {job.status === "failed" && job.errorMessage && (
                  <p className="mt-3 text-sm text-red-600">{job.errorMessage}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
