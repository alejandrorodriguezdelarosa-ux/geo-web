import RegisterForm from "./RegisterForm"

export const metadata = { title: "Crear cuenta" }

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#e2e8f0] bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-[#0f172a]">
          Crear cuenta
        </h1>
        <RegisterForm />
      </div>
    </main>
  )
}
