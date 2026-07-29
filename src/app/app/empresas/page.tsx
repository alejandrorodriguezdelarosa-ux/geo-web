import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import AltaEmpresa from "./AltaEmpresa"

export const metadata = { title: "Empresas — OptimoIA" }

export default async function EmpresasPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const userId = session.user.id

  const empresas = await prisma.company.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, website: true, sector: true },
  })

  // Cuánto trabajo cuelga de cada empresa, para que la lista diga algo y no sea
  // solo nombres.
  const ids = empresas.map((e) => e.id)
  const [auditorias, actividad] = await Promise.all([
    ids.length
      ? prisma.siteAudit.groupBy({
          by: ["companyId"],
          where: { userId, companyId: { in: ids } },
          _count: { _all: true },
          _max: { score: true },
        })
      : Promise.resolve([]),
    ids.length
      ? prisma.activityLog.groupBy({
          by: ["companyId"],
          where: { userId, companyId: { in: ids } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ])

  const porEmpresa = new Map<string, { auditorias: number; mejorNota: number | null; acciones: number }>()
  for (const e of empresas) porEmpresa.set(e.id, { auditorias: 0, mejorNota: null, acciones: 0 })
  for (const a of auditorias as { companyId: string | null; _count: { _all: number }; _max: { score: number | null } }[]) {
    if (!a.companyId) continue
    const fila = porEmpresa.get(a.companyId)
    if (fila) {
      fila.auditorias = a._count._all
      fila.mejorNota = a._max.score
    }
  }
  for (const a of actividad as { companyId: string | null; _count: { _all: number } }[]) {
    if (!a.companyId) continue
    const fila = porEmpresa.get(a.companyId)
    if (fila) fila.acciones = a._count._all
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a]">Empresas</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Da de alta a tus clientes y agrupa su trabajo: auditorías, competencia y actividad.
        </p>
      </div>

      <AltaEmpresa />

      {empresas.length === 0 ? (
        <section className="rounded-xl border border-dashed border-[#cbd5e1] bg-white p-8 text-center">
          <p className="text-sm font-medium text-[#334155]">Todavía no tienes empresas</p>
          <p className="mt-1 text-sm text-[#64748b]">
            Crea la primera con el formulario de arriba. Después podrás asignarle auditorías y ver todo su
            historial en un sitio.
          </p>
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {empresas.map((e) => {
            const datos = porEmpresa.get(e.id)!
            return (
              <Link
                key={e.id}
                href={`/app/empresas/${e.id}`}
                className="flex flex-col rounded-xl border border-[#e2e8f0] bg-white p-5 transition hover:border-[#EC1E63]"
              >
                <span className="text-base font-semibold text-[#0f172a]">{e.name}</span>
                {e.sector && <span className="mt-0.5 text-xs text-[#94a3b8]">{e.sector}</span>}
                {e.website && (
                  <span className="mt-1 truncate text-xs text-[#64748b]" title={e.website}>
                    {e.website.replace(/^https?:\/\//, "")}
                  </span>
                )}
                <span className="mt-4 flex items-center gap-3 text-xs text-[#64748b]">
                  <span>
                    {datos.auditorias} auditoría{datos.auditorias === 1 ? "" : "s"}
                  </span>
                  <span className="text-[#e2e8f0]">·</span>
                  <span>
                    {datos.acciones} acción{datos.acciones === 1 ? "" : "es"}
                  </span>
                  {datos.mejorNota !== null && (
                    <>
                      <span className="text-[#e2e8f0]">·</span>
                      <span className="font-semibold text-[#0f172a]">mejor {datos.mejorNota}</span>
                    </>
                  )}
                </span>
              </Link>
            )
          })}
        </section>
      )}
    </div>
  )
}
