import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ETIQUETA_ACTIVIDAD, type TipoActividad } from "@/lib/actividad"
import FirmasEmpresa from "../FirmasEmpresa"

function colorNota(n: number): string {
  if (n >= 70) return "#16a34a"
  if (n >= 40) return "#d97706"
  return "#dc2626"
}

function fechaCorta(f: Date): string {
  return new Date(f).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function EmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const userId = session.user.id
  const { id } = await params

  const empresa = await prisma.company.findFirst({
    where: { id, userId },
    select: {
      id: true, name: true, website: true, sector: true, notes: true, createdAt: true,
    },
  })
  // Se filtra por userId: nadie puede abrir la ficha de otra cuenta cambiando el id.
  if (!empresa) notFound()

  const [auditorias, competidores, actividad, firmas] = await Promise.all([
    prisma.siteAudit.findMany({
      where: { userId, companyId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, domain: true, score: true, pagesAudited: true, createdAt: true },
    }),
    prisma.competitorSet.findMany({
      where: { userId, companyId: id },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { url: true, competitors: true, updatedAt: true },
    }),
    prisma.activityLog.findMany({
      where: { userId, companyId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, kind: true, target: true, score: true, createdAt: true },
    }),
    prisma.crawlSignature.findMany({
      where: { userId, companyId: id },
      orderBy: { origin: "asc" },
      select: { id: true, origin: true, expiresAt: true },
    }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/app/empresas" className="text-xs font-medium text-[#EC1E63] hover:underline">
          ← Volver a empresas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#0f172a]">{empresa.name}</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          {[empresa.sector, empresa.website?.replace(/^https?:\/\//, "")].filter(Boolean).join(" · ") ||
            "Sin datos adicionales"}
        </p>
      </div>

      {empresa.notes && (
        <section className="rounded-xl border border-[#e2e8f0] bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-[#0f172a]">Notas</h2>
          <p className="whitespace-pre-line text-sm text-[#334155]">{empresa.notes}</p>
        </section>
      )}

      <FirmasEmpresa
        empresaId={empresa.id}
        website={empresa.website}
        firmas={firmas.map((f) => ({
          id: f.id,
          origin: f.origin,
          expiresAt: f.expiresAt.toISOString(),
          diasRestantes: Math.ceil((f.expiresAt.getTime() - Date.now()) / 86400000),
        }))}
      />

      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-[#0f172a]">Auditorías de sitio</h2>
        {auditorias.length === 0 ? (
          <p className="text-sm text-[#64748b]">
            Ninguna todavía. Al lanzar una auditoría de sitio podrás asignarla a esta empresa.
          </p>
        ) : (
          <ul className="divide-y divide-[#f1f5f9]">
            {auditorias.map((a) => (
              <li key={a.id} className="flex items-center gap-4 py-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold"
                  style={{ borderColor: colorNota(a.score), color: colorNota(a.score) }}
                >
                  {a.score}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#0f172a]">{a.domain}</p>
                  <p className="text-xs text-[#94a3b8]">
                    {a.pagesAudited} página{a.pagesAudited === 1 ? "" : "s"} · {fechaCorta(a.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {competidores.length > 0 && (
        <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-[#0f172a]">Competencia fijada</h2>
          <ul className="divide-y divide-[#f1f5f9]">
            {competidores.map((c) => (
              <li key={c.url} className="py-3">
                <p className="truncate text-sm text-[#0f172a]">{c.url}</p>
                <p className="text-xs text-[#94a3b8]">
                  {c.competitors.join(", ") || "sin competidores"} · {fechaCorta(c.updatedAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0f172a]">Actividad</h2>
          <Link href="/app/historial" className="text-xs font-medium text-[#EC1E63] hover:underline">
            Ver todo el historial
          </Link>
        </div>
        {actividad.length === 0 ? (
          <p className="text-sm text-[#64748b]">
            Aquí se irá apuntando cada ejecución que hagas para esta empresa.
          </p>
        ) : (
          <ul className="divide-y divide-[#f1f5f9]">
            {actividad.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0f172a]">
                    {ETIQUETA_ACTIVIDAD[a.kind as TipoActividad] ?? a.kind}
                  </p>
                  <p className="truncate text-xs text-[#94a3b8]" title={a.target}>
                    {a.target} · {fechaCorta(a.createdAt)}
                  </p>
                </div>
                {a.score !== null && (
                  <span
                    className="shrink-0 text-sm font-bold"
                    style={{ color: colorNota(a.score) }}
                  >
                    {a.score}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
