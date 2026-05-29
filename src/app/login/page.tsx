import { Inter_Tight } from "next/font/google"
import LoginForm from "./LoginForm"
import { Suspense } from "react"

const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight" })

export const metadata = { title: "Iniciar sesión" }

export default function LoginPage() {
  return (
    <main
      className={`${interTight.variable} font-[family-name:var(--font-inter-tight)] flex min-h-screen items-center justify-center bg-[#f5f3ee] px-4`}
    >
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-stone-900">
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
