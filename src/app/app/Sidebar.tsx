"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

type Item = { href: string; label: string; hint: string }
type Grupo = { titulo: string; items: Item[] }

// Las secciones se agrupan por lo que la persona quiere hacer, no por la
// tecnologia que hay detras.
const GRUPOS: Grupo[] = [
  {
    titulo: "Inicio",
    items: [
      { href: "/app", label: "Panel de inicio", hint: "Tu actividad y accesos" },
    ],
  },
  {
    titulo: "Analizar",
    items: [
      { href: "/app/auditor", label: "Auditor GEO", hint: "Una página o un texto" },
      { href: "/app/sitio", label: "Auditoría de sitio", hint: "Todo el dominio, con histórico" },
    ],
  },
  {
    titulo: "Mejorar",
    items: [
      { href: "/app/generador", label: "Generador de Schema", hint: "Datos estructurados por URL" },
      { href: "/app/crawl", label: "Crawling multipágina", hint: "Varias URLs de una vez" },
    ],
  },
  {
    titulo: "Conectar tu web",
    items: [
      { href: "/app/enriquecimiento", label: "Shopify", hint: "Enriquecer catálogo" },
      { href: "/app/wordpress", label: "WordPress", hint: "Publicar marcado" },
      { href: "/app/shopify", label: "Permisos de Shopify", hint: "Autorizar la tienda" },
    ],
  },
  {
    titulo: "Tu trabajo",
    items: [
      { href: "/app/empresas", label: "Empresas", hint: "Fichas de cliente y su trabajo" },
      { href: "/app/historial", label: "Historial", hint: "Tu actividad y las novedades" },
    ],
  },
  {
    titulo: "Tu cuenta",
    items: [
      { href: "/app/cuenta", label: "Mi cuenta", hint: "Datos y Claude Code" },
    ],
  },
]

function esActivo(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href)
}

export default function Sidebar({ email }: { email?: string | null }) {
  const pathname = usePathname()
  const [abierto, setAbierto] = useState(false)
  // El panel se monta en el body con un portal. El boton vive en la cabecera, y esa
  // cabecera lleva desenfoque: un backdrop-filter crea un contexto de posicionamiento
  // nuevo, asi que un panel fijo dentro de ella tomaba la altura de la cabecera en vez
  // de la pantalla completa (aparecia recortado, con el correo encima del menu).
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    setMontado(true)
  }, [])

  // Al navegar se cierra: en un panel superpuesto, dejarlo abierto tapa el contenido.
  useEffect(() => {
    setAbierto(false)
  }, [pathname])

  useEffect(() => {
    function alPulsarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false)
    }
    document.addEventListener("keydown", alPulsarTecla)
    return () => document.removeEventListener("keydown", alPulsarTecla)
  }, [])

  const seccionActual =
    GRUPOS.flatMap((g) => g.items).find((it) => esActivo(pathname, it.href))?.label ?? "OptimoIA"

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir el menú de secciones"
        aria-expanded={abierto}
        className="flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#334155] transition hover:border-[#EC1E63] hover:text-[#EC1E63]"
      >
        <span className="flex flex-col gap-[3px]" aria-hidden="true">
          <span className="block h-[2px] w-4 rounded bg-current" />
          <span className="block h-[2px] w-4 rounded bg-current" />
          <span className="block h-[2px] w-4 rounded bg-current" />
        </span>
        <span className="hidden sm:inline">{seccionActual}</span>
      </button>

      {montado && createPortal(
        <>
          {abierto && (
            <div
              className="fixed inset-0 z-40 bg-[#0f172a]/40"
              onClick={() => setAbierto(false)}
              aria-hidden="true"
            />
          )}

          <aside
            className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-[#e2e8f0] bg-white shadow-xl transition-transform duration-200 ${
              abierto ? "translate-x-0" : "-translate-x-full"
            }`}
            aria-hidden={!abierto}
          >
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-4">
          <Link href="/app" className="flex items-center gap-2">
            <svg viewBox="0 0 64 64" className="h-7 w-7 shrink-0" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="14" fill="#1F2937" />
              <g fill="#EC1E63">
                <path d="M3,29 H25 V13 C25,5 19,0 10,0 L10,7 C16,7 18,10 18,13 H3 Z" transform="translate(4,17)" />
                <path d="M3,29 H25 V13 C25,5 19,0 10,0 L10,7 C16,7 18,10 18,13 H3 Z" transform="translate(32,17)" />
              </g>
            </svg>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-[#0f172a]">OptimoIA</span>
              <span className="text-[11px] text-[#64748b]">Citabilidad en LLMs</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar el menú"
            className="rounded-md p-1 text-xl leading-none text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {GRUPOS.map((grupo) => (
            <div key={grupo.titulo} className="mb-5">
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                {grupo.titulo}
              </p>
              <ul className="flex flex-col gap-1">
                {grupo.items.map((it) => {
                  const activo = esActivo(pathname, it.href)
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        aria-current={activo ? "page" : undefined}
                        className={
                          activo
                            ? "block rounded-lg border-l-[3px] border-[#EC1E63] bg-[#fdf2f7] px-3 py-2"
                            : "block rounded-lg border-l-[3px] border-transparent px-3 py-2 hover:bg-[#f8fafc]"
                        }
                      >
                        <span
                          className={`block text-sm font-medium ${
                            activo ? "text-[#EC1E63]" : "text-[#334155]"
                          }`}
                        >
                          {it.label}
                        </span>
                        <span className="block text-[11px] text-[#94a3b8]">{it.hint}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

            {email && (
              <div className="border-t border-[#e2e8f0] px-5 py-3">
                <p className="truncate text-xs text-[#64748b]" title={email}>
                  {email}
                </p>
              </div>
            )}
          </aside>
        </>,
        document.body,
      )}
    </>
  )
}
