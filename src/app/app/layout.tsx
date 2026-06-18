import { auth, signOut } from "@/auth"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  async function logout() {
    "use server"
    await signOut({ redirectTo: "/login" })
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 64 64" className="h-7 w-7 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="14" fill="#1F2937"/>
              <g fill="#EC1E63">
                <path d="M3,29 H25 V13 C25,5 19,0 10,0 L10,7 C16,7 18,10 18,13 H3 Z" transform="translate(4,17)"/>
                <path d="M3,29 H25 V13 C25,5 19,0 10,0 L10,7 C16,7 18,10 18,13 H3 Z" transform="translate(32,17)"/>
              </g>
            </svg>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-[#0f172a]">OptimoIA</span>
              <span className="text-xs text-[#64748b]">Citabilidad en LLMs</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#64748b]">{session?.user?.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm font-medium text-[#475569] hover:text-[#0f172a]"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  )
}
