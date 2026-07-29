import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "Inicio — OptimoIA" }

function colorNota(n: number): string {
  if (n >= 70) return "#16a34a"
  if (n >= 40) return "#d97706"
  return "#dc2626"
}

function haceCuanto(fecha: Date): string {
  const minutos = Math.round((Date.now() - new Date(fecha).getTime()) / 60000)
  if (minutos < 60) return `hace ${Math.max(1, minutos)} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.round(horas / 24)
  return dias === 1 ? "ayer" : `hace ${dias} días`
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const userId = session.user.id

  // Todo sale de lo que ya existe en la base: no hace falta tabla nueva para dar
  // una pantalla de inicio util.
  const [auditorias, totalAuditorias, competidores, trabajos] = await Promise.all([
    prisma.siteAudit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, domain: true, url: true, score: true, pagesAudited: true, createdAt: true },
    }),
    prisma.siteAudit.count({ where: { userId } }),
    prisma.competitorSet.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { url: true, competitors: true, updatedAt: true },
    }),
    prisma.job.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 3,
      select: { id: true, storeDomain: true, status: true, startedAt: true },
    }),
  ])

  const ultima = auditorias[0]
  const media =
    auditorias.length > 0
      ? Math.round(auditorias.reduce((a, x) => a + x.score, 0) / auditorias.length)
      : null

  const metricas = [
    { etiqueta: "Auditorías de sitio", valor: String(totalAuditorias) },
    { etiqueta: "Última nota", valor: ultima ? String(ultima.score) : "—", color: ultima ? colorNota(ultima.score) : undefined },
    { etiqueta: "Media reciente", valor: media !== null ? String(media) : "—", color: media !== null ? colorNota(media) : undefined },
    { etiqueta: "URLs con competencia", valor: String(competidores.length) },
  ]

  const accesos = [
    { href: "/app/auditor", label: "Auditar una página", hint: "Informe GEO de una URL o un texto" },
    { href: "/app/sitio", label: "Auditar el sitio entero", hint: "Informe global del dominio" },
    { href: "/app/generador", label: "Generar Schema", hint: "Datos estructurados por URL" },
    { href: "/app/cuenta", label: "Conectar Claude Code", hint: "Tu token y el comando" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a]">Inicio</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Tu actividad reciente y los accesos a lo que más usas.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metricas.map((m) => (
          <div key={m.etiqueta} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
            <p className="text-xs font-medium text-[#64748b]">{m.etiqueta}</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: m.color ?? "#0f172a" }}>
              {m.valor}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {accesos.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-xl border border-[#e2e8f0] bg-white p-4 transition hover:border-[#EC1E63]"
          >
            <span className="block text-sm font-semibold text-[#0f172a]">{a.label}</span>
            <span className="mt-0.5 block text-xs text-[#94a3b8]">{a.hint}</span>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0f172a]">Últimas auditorías de sitio</h2>
          <Link href="/app/sitio" className="text-xs font-medium text-[#EC1E63] hover:underline">
            Ir a auditoría de sitio
          </Link>
        </div>

        {auditorias.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#cbd5e1] p-6 text-center">
            <p className="text-sm font-medium text-[#334155]">Aún no has auditado ningún sitio</p>
            <p className="mt-1 text-sm text-[#64748b]">
              Empieza por una página concreta o lanza la auditoría de un dominio completo.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                href="/app/auditor"
                className="rounded-lg bg-[#EC1E63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c4154f]"
              >
                Auditar una página
              </Link>
              <Link
                href="/app/sitio"
                className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm font-medium text-[#475569] hover:border-[#cbd5e1]"
              >
                Auditar un sitio
              </Link>
            </div>
          </div>
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
                    {a.pagesAudited} página{a.pagesAudited === 1 ? "" : "s"} · {haceCuanto(a.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {competidores.length > 0 && (
        <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-[#0f172a]">Páginas con competencia guardada</h2>
          <p className="mb-4 text-sm text-[#64748b]">
            Al analizarlas se comparan solas con los competidores que fijaste.
          </p>
          <ul className="divide-y divide-[#f1f5f9]">
            {competidores.map((c) => (
              <li key={c.url} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-[#0f172a]">{c.url}</p>
                  <p className="text-xs text-[#94a3b8]">
                    {c.competitors.length} competidor{c.competitors.length === 1 ? "" : "es"} ·{" "}
                    {haceCuanto(c.updatedAt)}
                  </p>
                </div>
                <Link
                  href="/app/auditor"
                  className="shrink-0 text-xs font-medium text-[#EC1E63] hover:underline"
                >
                  Analizar
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {trabajos.length > 0 && (
        <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0f172a]">Enriquecimientos recientes</h2>
            <Link href="/app/enriquecimiento" className="text-xs font-medium text-[#EC1E63] hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="divide-y divide-[#f1f5f9]">
            {trabajos.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-[#0f172a]">{t.storeDomain}</p>
                  <p className="text-xs text-[#94a3b8]">{haceCuanto(t.startedAt)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.status === "succeeded"
                      ? "bg-green-100 text-green-800"
                      : t.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {t.status === "succeeded"
                    ? "Terminado"
                    : t.status === "failed"
                      ? "Con errores"
                      : t.status === "running"
                        ? "En curso"
                        : "En cola"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
