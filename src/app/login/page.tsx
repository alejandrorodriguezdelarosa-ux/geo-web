import LoginForm from "./LoginForm"
import { Suspense } from "react"

export const metadata = { title: "Iniciar sesión" }

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#e2e8f0] bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-[#0f172a]">
          Iniciar sesión
        </h1>
        {/* useSearchParams requires Suspense boundary */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
