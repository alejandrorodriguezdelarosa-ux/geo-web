import Link from "next/link"
import { auth, signOut } from "@/auth"
import Sidebar from "./Sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  async function logout() {
    "use server"
    await signOut({ redirectTo: "/login" })
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <header className="sticky top-0 z-30 border-b border-[#e2e8f0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* El menú de secciones vive detrás del icono, como pediste: el contenido
              manda y la navegación aparece cuando se necesita. */}
          <div className="flex items-center gap-3">
            <Sidebar email={session?.user?.email} />
          </div>

          <Link href="/app" className="flex items-center gap-2">
            <svg viewBox="0 0 64 64" className="h-7 w-7 shrink-0" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="14" fill="#1F2937" />
              <g fill="#EC1E63">
                <path d="M3,29 H25 V13 C25,5 19,0 10,0 L10,7 C16,7 18,10 18,13 H3 Z" transform="translate(4,17)" />
                <path d="M3,29 H25 V13 C25,5 19,0 10,0 L10,7 C16,7 18,10 18,13 H3 Z" transform="translate(32,17)" />
              </g>
            </svg>
            <span className="text-sm font-bold text-[#0f172a]">OptimoIA</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/app/cuenta"
              className="hidden max-w-[180px] truncate text-sm text-[#64748b] hover:text-[#0f172a] sm:block"
              title={session?.user?.email ?? ""}
            >
              {session?.user?.email}
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-sm font-medium text-[#475569] transition hover:border-[#cbd5e1] hover:text-[#0f172a]"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
