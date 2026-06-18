"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"

const REDIRECT_CALLBACK =
  `${process.env.NEXT_PUBLIC_APP_URL ?? "https://tu-dominio.es"}/api/shopify/callback`
const SCOPES_TEXT =
  "read_products, write_products, read_content, write_content, read_themes, write_themes"

const formSchema = z.object({
  shopDomain: z
    .string()
    .regex(
      /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/,
      "Formato: tu-tienda.myshopify.com (minúsculas, sin https)"
    ),
  clientId: z.string().min(1, "Requerido"),
  clientSecret: z.string().min(1, "Requerido"),
})

type FormValues = z.infer<typeof formSchema>

type Connection = {
  id: string
  shopDomain: string
  status: "pending" | "active" | "revoked"
  scopes: string
  installedAt: string | null
  createdAt: string
  revokedAt: string | null
}

const STATUS_LABEL: Record<Connection["status"], string> = {
  pending: "Pendiente",
  active: "Activa",
  revoked: "Revocada",
}

const STATUS_CLASS: Record<Connection["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  revoked: "bg-red-100 text-red-800",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded border border-[#cbd5e1] bg-[#f8fafc] px-2 py-1 text-xs text-[#475569] hover:bg-[#e2e8f0]"
    >
      {copied ? "✓ Copiado" : "Copiar"}
    </button>
  )
}

export default function ShopifyTool({ errorParam }: { errorParam: string | null }) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) })

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/shopify/connections")
      if (!res.ok) {
        setLoadError("No se pudieron cargar las conexiones")
        return
      }
      setConnections(await res.json())
      setLoadError(null)
    } catch {
      setLoadError("Error de red al cargar las conexiones")
    }
  }, [])

  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  async function onSubmit(values: FormValues) {
    setFormError(null)

    const res = await fetch("/api/shopify/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    const data = await res.json().catch(() => ({}))

    if (res.status === 409) {
      setFormError("Ya tienes una conexión activa o pendiente para esa tienda")
      return
    }

    if (!res.ok) {
      setFormError((data as { error?: string }).error ?? "Error al registrar la conexión")
      return
    }

    reset()
    await loadConnections()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/shopify/connections/${id}`, { method: "DELETE" })
      if (res.ok) await loadConnections()
    } finally {
      setDeletingId(null)
    }
  }

  function handleReconnect(domain: string) {
    setValue("shopDomain", domain)
    document.getElementById("shopify-form")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="flex flex-col gap-8">
      <Link href="/app" className="text-sm font-medium text-[#EC1E63] hover:underline">
        ← Volver al dashboard
      </Link>

      {/* Callback error banner */}
      {errorParam && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-700">
            {errorParam === "access_denied"
              ? "Cancelaste la autorización en Shopify."
              : `Error en el proceso OAuth (${errorParam}).`}
          </p>
          <p className="mt-1 text-sm text-red-600">
            {errorParam === "access_denied"
              ? "Puedes intentarlo de nuevo pulsando «Conectar» en tu conexión pendiente."
              : "Elimina la conexión e inténtalo de nuevo con credenciales correctas."}
          </p>
          <button
            type="button"
            onClick={() => document.getElementById("connections-list")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-2 text-sm font-semibold text-[#EC1E63] hover:underline"
          >
            Ver mis conexiones ↓
          </button>
        </div>
      )}

      {/* Help block */}
      <details className="group rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
        <summary className="flex cursor-pointer select-none list-none items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold text-[#0f172a]">
            ¿Cómo conecto mi tienda Shopify?
          </span>
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
              <p className="text-sm font-semibold text-[#0f172a]">
                Crea una Custom App en Shopify
              </p>
              <p className="text-sm text-[#475569]">
                En tu Shopify Admin:{" "}
                <strong className="font-semibold text-[#0f172a]">
                  Configuración → Apps y canales de venta → Desarrollar apps → Crear una app
                </strong>
                .
              </p>
              <p className="text-sm text-[#64748b]">
                Si no ves «Desarrollar apps», actívalo con{" "}
                <strong className="font-semibold text-[#475569]">
                  Permitir el desarrollo de apps personalizadas
                </strong>{" "}
                en esa misma sección.
              </p>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EC1E63] text-xs font-bold text-white">
              2
            </span>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-[#0f172a]">
                Configura la URL de redirección del OAuth
              </p>
              <p className="text-sm text-[#475569]">
                En la app, abre{" "}
                <strong className="font-semibold text-[#0f172a]">
                  Configuración de la app
                </strong>{" "}
                y añade esta URL exacta en «URL de redirección del OAuth»:
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded bg-[#f1f5f9] px-3 py-1.5 text-xs text-[#475569]">
                  {REDIRECT_CALLBACK}
                </code>
                <CopyButton text={REDIRECT_CALLBACK} />
              </div>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EC1E63] text-xs font-bold text-white">
              3
            </span>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-[#0f172a]">
                Activa los permisos de Admin API
              </p>
              <p className="text-sm text-[#475569]">
                En{" "}
                <strong className="font-semibold text-[#0f172a]">
                  Permisos de la Admin API
                </strong>
                , activa estos 6 scopes:
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded bg-[#f1f5f9] px-3 py-1.5 text-xs text-[#475569]">
                  {SCOPES_TEXT}
                </code>
                <CopyButton text={SCOPES_TEXT} />
              </div>
            </div>
          </div>

          {/* Paso 4 */}
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EC1E63] text-xs font-bold text-white">
              4
            </span>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-[#0f172a]">
                Instala la app en tu tienda
              </p>
              <p className="text-sm text-[#475569]">
                Pulsa{" "}
                <strong className="font-semibold text-[#0f172a]">Instalar app</strong> en tu
                Shopify Admin para que la app quede activa en la tienda.
              </p>
            </div>
          </div>

          {/* Paso 5 */}
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EC1E63] text-xs font-bold text-white">
              5
            </span>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-[#0f172a]">
                Copia las credenciales y pégalas en el formulario de abajo
              </p>
              <p className="text-sm text-[#475569]">
                En tu app, ve a{" "}
                <strong className="font-semibold text-[#0f172a]">Claves de API</strong>. Copia
                el <strong>Client ID</strong> y el <strong>Client Secret</strong> y pégalos
                abajo.
              </p>
            </div>
          </div>

          <p className="rounded-lg bg-[#f8fafc] px-4 py-3 text-sm text-[#64748b]">
            <strong className="font-semibold text-[#475569]">Nota:</strong> Este paso es
            técnico. Si no gestionas tú el desarrollo de tu tienda, pide ayuda a tu
            desarrollador.
          </p>
        </div>
      </details>

      {/* Registration form */}
      <section
        id="shopify-form"
        className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm"
      >
        <h2 className="mb-1 text-lg font-semibold tracking-tight text-[#0f172a]">
          Registrar conexión
        </h2>
        <p className="mb-5 text-sm text-[#64748b]">
          Introduce las credenciales de tu Custom App de Shopify para iniciar el proceso
          de autorización OAuth.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="shopDomain" className="text-sm font-medium text-[#475569]">
              Dominio de la tienda
            </label>
            <input
              id="shopDomain"
              type="text"
              placeholder="tu-tienda.myshopify.com"
              autoComplete="off"
              {...register("shopDomain")}
              className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
            {errors.shopDomain && (
              <p className="text-xs text-red-600">{errors.shopDomain.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="clientId" className="text-sm font-medium text-[#475569]">
              Client ID
            </label>
            <input
              id="clientId"
              type="text"
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              autoComplete="off"
              {...register("clientId")}
              className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
            {errors.clientId && (
              <p className="text-xs text-red-600">{errors.clientId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="clientSecret" className="text-sm font-medium text-[#475569]">
              Client Secret
            </label>
            <input
              id="clientSecret"
              type="password"
              autoComplete="new-password"
              {...register("clientSecret")}
              className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
            {errors.clientSecret && (
              <p className="text-xs text-red-600">{errors.clientSecret.message}</p>
            )}
            <p className="text-xs text-[#94a3b8]">
              Tu Client Secret se cifra con AES-256-GCM y no se comparte; se usa solo para
              completar la conexión con tu tienda.
            </p>
          </div>

          {formError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="self-start rounded-md bg-[#EC1E63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4154f] disabled:opacity-60"
          >
            {isSubmitting ? "Registrando…" : "Registrar conexión"}
          </button>
        </form>
      </section>

      {/* Connections list */}
      <section id="connections-list">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-[#0f172a]">
          Tus conexiones
        </h2>

        {loadError && (
          <p className="text-sm text-red-600">{loadError}</p>
        )}

        {!loadError && connections.length === 0 && (
          <p className="text-sm text-[#64748b]">
            Aún no has registrado ninguna tienda Shopify.
          </p>
        )}

        {connections.length > 0 && (
          <div className="flex flex-col gap-3">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-[#0f172a]">
                      {conn.shopDomain}
                    </span>
                    {conn.installedAt ? (
                      <span className="text-xs text-[#94a3b8]">
                        Activa desde {formatDate(conn.installedAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-[#94a3b8]">
                        Creada {formatDate(conn.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[conn.status]}`}
                    >
                      {STATUS_LABEL[conn.status]}
                    </span>

                    {conn.status === "pending" && (
                      <>
                        <a
                          href={`/api/shopify/connect/${conn.id}`}
                          className="rounded-md bg-[#EC1E63] px-3 py-1 text-xs font-semibold text-white hover:bg-[#c4154f]"
                        >
                          Conectar
                        </a>
                        <button
                          type="button"
                          disabled={deletingId === conn.id}
                          onClick={() => handleDelete(conn.id)}
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                        >
                          {deletingId === conn.id ? "Eliminando…" : "Eliminar"}
                        </button>
                      </>
                    )}

                    {conn.status === "active" && (
                      <button
                        type="button"
                        disabled={deletingId === conn.id}
                        onClick={() => handleDelete(conn.id)}
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                      >
                        {deletingId === conn.id ? "Revocando…" : "Revocar"}
                      </button>
                    )}

                    {conn.status === "revoked" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReconnect(conn.shopDomain)}
                          className="rounded-md border border-[#e2e8f0] bg-white px-3 py-1 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc]"
                        >
                          Reconectar
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === conn.id}
                          onClick={() => handleDelete(conn.id)}
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                        >
                          {deletingId === conn.id ? "Eliminando…" : "Eliminar"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {conn.status === "active" && conn.scopes && (
                  <p className="mt-2 text-xs text-[#94a3b8]">Scopes: {conn.scopes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
