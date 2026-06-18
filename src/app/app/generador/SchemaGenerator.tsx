"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"

const schema = z.object({
  url: z
    .string()
    .min(1, "Requerido")
    .url("Introduce una URL válida (empieza por https://)")
    .refine(
      (u) => u.startsWith("http://") || u.startsWith("https://"),
      "Solo se aceptan URLs http o https"
    ),
})

type FormValues = z.infer<typeof schema>

type SchemaResult = {
  detectedType: string
  jsonLd: Record<string, unknown>
  instructions?: string
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

export default function SchemaGenerator() {
  const [result, setResult] = useState<SchemaResult | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setResult(null)
    setApiError(null)
    setCopied(false)

    const res = await fetch("/api/generate-schema", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: values.url }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setApiError(data.error ?? "Error al generar el schema")
      return
    }

    setResult(data as SchemaResult)
  }

  async function handleCopy() {
    if (!result) return
    await navigator.clipboard.writeText(JSON.stringify(result.jsonLd, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const jsonLdString = result ? JSON.stringify(result.jsonLd, null, 2) : ""

  return (
    <div className="flex flex-col gap-8">
      {/* Back link */}
      <Link
        href="/app"
        className="text-sm font-medium text-[#EC1E63] hover:underline"
      >
        ← Volver al dashboard
      </Link>

      {/* Form */}
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold tracking-tight text-[#0f172a]">
          Generador de Schema.org por URL
        </h2>
        <p className="mb-5 text-sm text-[#64748b]">
          Pega la URL de cualquier página y obtendrás el JSON-LD Schema.org listo para insertar.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="url" className="text-sm font-medium text-[#475569]">
              URL de la página
            </label>
            <input
              id="url"
              type="url"
              placeholder="https://mi-tienda.com/productos/camiseta"
              {...register("url")}
              className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
            {errors.url && (
              <p className="text-xs text-red-600">{errors.url.message}</p>
            )}
          </div>

          {apiError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {apiError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="self-start rounded-md bg-[#EC1E63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4154f] disabled:opacity-60"
          >
            {isSubmitting ? "Generando…" : "Generar Schema.org"}
          </button>
        </form>
      </section>

      {/* Result */}
      {result && (
        <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-[#0f172a]">Resultado</h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeBadgeClass(result.detectedType)}`}
              >
                {result.detectedType}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="rounded-md border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-medium text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]"
            >
              {copied ? "¡Copiado!" : "Copiar JSON-LD"}
            </button>
          </div>

          {result.instructions && (
            <p className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
              {result.instructions}
            </p>
          )}

          <pre className="overflow-x-auto rounded-lg bg-[#f8fafc] p-4 text-xs leading-relaxed text-[#0f172a]">
            <code>{jsonLdString}</code>
          </pre>
        </section>
      )}
    </div>
  )
}
