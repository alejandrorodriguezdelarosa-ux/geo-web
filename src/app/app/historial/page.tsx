import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ETIQUETA_ACTIVIDAD, type TipoActividad } from "@/lib/actividad"
import { NOVEDADES } from "@/lib/novedades"

export const metadata = { title: "Historial — OptimoIA" }

const COLOR_TIPO: Record<string, string> = {
  nuevo: "bg-[#fdf2f7] text-[#EC1E63]",
  mejora: "bg-blue-50 text-blue-700",
  arreglo: "bg-amber-50 text-amber-700",
}

const NOMBRE_TIPO: Record<string, string> = {
  nuevo: "Nuevo",
  mejora: "Mejora",
  arreglo: "Arreglo",
}

function colorNota(n: number): string {
  if (n >= 70) return "#16a34a"
  if (n >= 40) return "#d97706"
  return "#dc2626"
}

function fechaLarga(f: Date | string): string {
  return new Date(f).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function hora(f: Date): string {
  return new Date(f).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

export default async function HistorialPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const userId = session.user.id

  const [actividad, empresas] = await Promise.all([
    prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, kind: true, target: true, score: true, companyId: true, createdAt: true },
    }),
    prisma.company.findMany({ where: { userId }, select: { id: true, name: true } }),
  ])

  const nombreEmpresa = new Map(empresas.map((e) => [e.id, e.name]))

  // Agrupado por día: leer un diario plano de 60 líneas cuesta más que verlo por fechas.
  const porDia = new Map<string, typeof actividad>()
  for (const a of actividad) {
    const clave = new Date(a.createdAt).toISOString().slice(0, 10)
    const lista = porDia.get(clave) ?? []
    lista.push(a)
    porDia.set(clave, lista)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a]">Historial</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Lo que has ejecutado y lo que va cambiando en OptimoIA.
        </p>
      </div>

      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-[#0f172a]">Tu actividad</h2>

        {actividad.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#cbd5e1] p-6 text-center">
            <p className="text-sm font-medium text-[#334155]">Aún no hay actividad registrada</p>
            <p className="mt-1 text-sm text-[#64748b]">
              Cada auditoría, comparación o contenido que generes quedará apuntado aquí.
            </p>
            <Link
              href="/app/auditor"
              className="mt-4 inline-block rounded-lg bg-[#EC1E63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4154f]"
            >
              Auditar una página
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {[...porDia.entries()].map(([dia, lista]) => (
              <div key={dia}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                  {fechaLarga(dia)}
                </p>
                <ul className="divide-y divide-[#f1f5f9] border-l-2 border-[#f1f5f9] pl-4">
                  {lista.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#0f172a]">
                          {ETIQUETA_ACTIVIDAD[a.kind as TipoActividad] ?? a.kind}
                          {a.companyId && nombreEmpresa.get(a.companyId) && (
                            <span className="ml-2 rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[11px] font-medium text-[#475569]">
                              {nombreEmpresa.get(a.companyId)}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-[#94a3b8]" title={a.target}>
                          {a.target} · {hora(a.createdAt)}
                        </p>
                      </div>
                      {a.score !== null && (
                        <span className="shrink-0 text-sm font-bold" style={{ color: colorNota(a.score) }}>
                          {a.score}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-[#0f172a]">Novedades de OptimoIA</h2>
        <p className="mb-4 text-sm text-[#64748b]">Lo último que se ha añadido o corregido.</p>
        <ul className="flex flex-col gap-4">
          {NOVEDADES.map((n, i) => (
            <li key={`${n.fecha}-${i}`} className="border-l-2 border-[#f1f5f9] pl-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    COLOR_TIPO[n.tipo] ?? "bg-[#f1f5f9] text-[#475569]"
                  }`}
                >
                  {NOMBRE_TIPO[n.tipo] ?? n.tipo}
                </span>
                <span className="text-sm font-semibold text-[#0f172a]">{n.titulo}</span>
                <span className="text-xs text-[#94a3b8]">{fechaLarga(n.fecha)}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[#334155]">{n.detalle}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
