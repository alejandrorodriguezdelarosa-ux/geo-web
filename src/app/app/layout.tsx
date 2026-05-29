import { Inter_Tight } from "next/font/google"
import { auth, signOut } from "@/auth"

const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight" })

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  async function logout() {
    "use server"
    await signOut({ redirectTo: "/login" })
  }

  return (
    <div
      className={`${interTight.variable} font-[family-name:var(--font-inter-tight)] min-h-screen bg-[#f5f3ee]`}
    >
      <header className="border-b border-stone-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-sm font-semibold tracking-tight text-stone-900">
            Geo Web
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-500">{session?.user?.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm font-medium text-stone-600 hover:text-stone-900"
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
