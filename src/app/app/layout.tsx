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
          <span className="text-sm font-semibold tracking-tight text-[#0f172a]">
            Geo Web
          </span>
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
