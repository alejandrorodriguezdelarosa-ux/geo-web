"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function AltaEmpresa() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [datos, setDatos] = useState({ name: "", website: "", sector: "", notes: "" })

  async function crear() {
    setEnviando(true)
    setError(null)
    try {
      const res = await fetch("/api/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      })
      const j = await res.json()
      if (!res.ok) {
        setError(j.error || "No se pudo crear la empresa")
        return
      }
      setDatos({ name: "", website: "", sector: "", notes: "" })
      setAbierto(false)
      router.refresh()
    } catch {
      setError("Error de conexión")
    } finally {
      setEnviando(false)
    }
  }

  if (!abierto) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="rounded-lg bg-[#EC1E63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4154f]"
        >
          Dar de alta una empresa
        </button>
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-[#0f172a]">Nueva empresa</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#475569]">Nombre</span>
          <input
            value={datos.name}
            onChange={(e) => setDatos({ ...datos, name: e.target.value })}
            placeholder="Wituka"
            className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#475569]">Web</span>
          <input
            value={datos.website}
            onChange={(e) => setDatos({ ...datos, website: e.target.value })}
            placeholder="https://www.wituka.com"
            className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#475569]">Sector</span>
          <input
            value={datos.sector}
            onChange={(e) => setDatos({ ...datos, sector: e.target.value })}
            placeholder="Moda y complementos"
            className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-medium text-[#475569]">Notas (opcional)</span>
          <textarea
            value={datos.notes}
            onChange={(e) => setDatos({ ...datos, notes: e.target.value })}
            rows={2}
            placeholder="Contacto, objetivos, lo que convenga recordar"
            className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm outline-none focus:border-[#EC1E63] focus:ring-2 focus:ring-[#EC1E63]/20"
          />
        </label>
      </div>

      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={crear}
          disabled={enviando || datos.name.trim().length < 2}
          className="rounded-lg bg-[#EC1E63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4154f] disabled:opacity-60"
        >
          {enviando ? "Creando…" : "Crear empresa"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierto(false)
            setError(null)
          }}
          disabled={enviando}
          className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm font-medium text-[#475569] hover:border-[#cbd5e1]"
        >
          Cancelar
        </button>
      </div>
    </section>
  )
}
