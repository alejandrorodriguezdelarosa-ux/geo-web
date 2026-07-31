"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type Firma = {
  id: string
  origin: string
  expiresAt: string
  diasRestantes: number
}

type Props = {
  empresaId: string
  website: string | null
  firmas: Firma[]
}

export default function FirmasEmpresa({ empresaId, website, firmas }: Props) {
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [datos, setDatos] = useState({
    origin: website || "",
    signatureInput: "",
    signature: "",
    signatureAgent: "",
    expiresAt: "",
  })

  async function guardarFirma() {
    setEnviando(true)
    setError(null)
    try {
      const expiresAtDate = new Date(datos.expiresAt + "T23:59:59Z").toISOString()
      const res = await fetch(`/api/empresas/${empresaId}/firmas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: datos.origin,
          signatureInput: datos.signatureInput,
          signature: datos.signature,
          signatureAgent: datos.signatureAgent,
          expiresAt: expiresAtDate,
        }),
      })
      const j = await res.json()
      if (!res.ok) {
        setError(j.error || "No se pudo guardar la firma")
        return
      }
      setDatos({
        origin: website || "",
        signatureInput: "",
        signature: "",
        signatureAgent: "",
        expiresAt: "",
      })
      router.refresh()
    } catch {
      setError("Error de conexión")
    } finally {
      setEnviando(false)
    }
  }

  async function borrarFirma(id: string, origin: string) {
    if (!confirm(`¿Borrar la firma de ${origin}?`)) return
    try {
      const res = await fetch(`/api/empresas/${empresaId}/firmas?firmaId=${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error || "No se pudo borrar la firma")
        return
      }
      router.refresh()
    } catch {
      setError("Error de conexión")
    }
  }

  return (
    <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-[#0f172a]">Firmas de rastreo</h2>
      <p className="mb-4 text-sm text-[#64748b]">
        Con la firma que te dé el cliente, su tienda nos deja leer muchas más páginas. Sin ella, Shopify nos corta a las pocas.
      </p>

      {firmas.length === 0 ? (
        <p className="mb-6 text-sm text-[#64748b]">Todavía no hay ninguna firma guardada para esta empresa.</p>
      ) : (
        <div className="mb-6 divide-y divide-[#f1f5f9]">
          {firmas.map((f) => {
            let badgeClass = "text-[#64748b]"
            let badgeText = `Caduca en ${f.diasRestantes} días`

            if (f.diasRestantes <= 0) {
              badgeClass = "bg-red-50 text-red-700"
              badgeText = "Caducada"
            } else if (f.diasRestantes < 14) {
              badgeClass = "bg-amber-50 text-amber-800"
              badgeText = `Caduca en ${f.diasRestantes} días`
            }

            return (
              <div key={f.id} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm text-[#0f172a]">{f.origin}</span>
                <div className="flex items-center gap-3">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${badgeClass}`}>
                    {badgeText}
                  </span>
                  <button
                    type="button"
                    onClick={() => borrarFirma(f.id, f.origin)}
                    className="rounded-md border border-[#e2e8f0] px-3 py-1 text-xs font-medium text-[#64748b] hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-[#e2e8f0] bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-[#0f172a]">Añadir firma</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#475569]">Dominio de la tienda</span>
            <input
              type="text"
              value={datos.origin}
              onChange={(e) => setDatos({ ...datos, origin: e.target.value })}
              placeholder="ejemplo.myshopify.com"
              className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
            <p className="text-xs text-[#94a3b8]">Tiene que ser el mismo dominio que la web de la empresa.</p>
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-[#475569]">Signature-Input</span>
            <textarea
              value={datos.signatureInput}
              onChange={(e) => setDatos({ ...datos, signatureInput: e.target.value })}
              rows={2}
              className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-[#475569]">Signature</span>
            <textarea
              value={datos.signature}
              onChange={(e) => setDatos({ ...datos, signature: e.target.value })}
              rows={2}
              className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-[#475569]">Signature-Agent</span>
            <textarea
              value={datos.signatureAgent}
              onChange={(e) => setDatos({ ...datos, signatureAgent: e.target.value })}
              rows={2}
              className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-[#475569]">Caduca el</span>
            <input
              type="date"
              value={datos.expiresAt}
              onChange={(e) => setDatos({ ...datos, expiresAt: e.target.value })}
              className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
            />
            <p className="text-xs text-[#94a3b8]">Shopify las da con tres meses de validez como máximo, y no se renuevan: hay que crear otra.</p>
          </label>
        </div>

        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={guardarFirma}
          disabled={enviando || datos.origin.trim().length < 2}
          className="mt-4 rounded-lg bg-[#EC1E63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4154f] disabled:opacity-60"
        >
          {enviando ? "Guardando..." : "Guardar firma"}
        </button>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <h3 className="mb-3 font-semibold text-[#0f172a]">Cómo consigue el cliente la firma</h3>
        <ol className="list-inside list-decimal space-y-2 text-sm text-[#334155]">
          <li>En su panel de Shopify, entrar en Online Store, luego Preferences.</li>
          <li>Buscar el apartado Crawler access y pulsar Create signature.</li>
          <li>Poner un nombre que identifique al auditor y el dominio de esta herramienta.</li>
          <li>Copiar las tres cabeceras que aparecen y pegarlas aquí. Shopify no las vuelve a mostrar.</li>
        </ol>
      </div>
    </section>
  )
}
