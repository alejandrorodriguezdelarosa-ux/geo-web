import { Inter_Tight } from "next/font/google"
import RegisterForm from "./RegisterForm"

const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight" })

export const metadata = { title: "Crear cuenta" }

export default function RegisterPage() {
  return (
    <main
      className={`${interTight.variable} font-[family-name:var(--font-inter-tight)] flex min-h-screen items-center justify-center bg-[#f5f3ee] px-4`}
    >
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-stone-900">
          Crear cuenta
        </h1>
        <RegisterForm />
      </div>
    </main>
  )
}
