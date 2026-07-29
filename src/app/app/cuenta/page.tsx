import Link from "next/link"
import { auth, signOut } from "@/auth"
import McpPanel from "./McpPanel"

export default async function CuentaPage() {
  const session = await auth()

  async function logout() {
    "use server"
    await signOut({ redirectTo: "/login" })
  }

  const email = session?.user?.email ?? ""
  const inicial = (email.trim()[0] || "?").toUpperCase()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a]">Mi cuenta</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Tus datos de acceso y la conexión del auditor con Claude Code.
        </p>
      </div>

      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fdf2f7] text-lg font-bold text-[#EC1E63]">
              {inicial}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0f172a]">{email}</p>
              <p className="text-xs text-[#64748b]">Sesión activa en OptimoIA</p>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm font-medium text-[#475569] transition hover:border-[#cbd5e1] hover:text-[#0f172a]"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </section>

      <McpPanel />

      <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#0f172a]">Atajos</h2>
        <p className="mt-1 mb-4 text-sm text-[#64748b]">
          Las conexiones con tu web se gestionan en su propia sección.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: "/app/shopify", label: "Permisos de Shopify", hint: "Autorizar la tienda" },
            { href: "/app/wordpress", label: "WordPress", hint: "Publicar marcado" },
            { href: "/app/sitio", label: "Auditoría de sitio", hint: "Informe global y su histórico" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="rounded-lg border border-[#e2e8f0] p-4 transition hover:border-[#EC1E63]"
            >
              <span className="block text-sm font-medium text-[#0f172a]">{a.label}</span>
              <span className="block text-xs text-[#94a3b8]">{a.hint}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
