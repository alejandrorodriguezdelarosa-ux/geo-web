import Link from "next/link"
import { auth } from "@/auth"

export const metadata = {
  title: "Geo Web — Schema.org automático para Shopify",
  description:
    "Conecta tu tienda Shopify y recibe datos estructurados Schema.org para SEO y GEO, generados automáticamente.",
}

const STEPS = [
  {
    n: "01",
    title: "Conecta tu tienda",
    body: "Introduce el dominio de tu tienda Shopify y un token de acceso con permisos de lectura.",
  },
  {
    n: "02",
    title: "Lanza el análisis",
    body: "En un clic enriquecemos productos, colecciones y páginas con marcado Schema.org estructurado.",
  },
  {
    n: "03",
    title: "Recibe el Schema.org",
    body: "Descarga el resultado listo para integrar en tu tienda y mejorar tu visibilidad en buscadores e IA.",
  },
]

export default async function Home() {
  const session = await auth()
  const isLoggedIn = !!session?.user

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      {/* Nav */}
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6">
        <span className="text-lg font-semibold tracking-tight">Geo Web</span>
        <nav className="flex items-center gap-6 text-sm font-medium">
          {isLoggedIn ? (
            <Link href="/app" className="text-[#2563eb] hover:underline">
              Ir al panel →
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-[#475569] hover:text-[#0f172a]">
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-[#2563eb] px-4 py-1.5 text-white hover:bg-[#1d4ed8]"
              >
                Empezar
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-16">
        <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
          Schema.org automático<br />para tu tienda Shopify
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#475569]">
          Conecta tu tienda, lanza el análisis y recibe los datos estructurados para SEO y GEO
          aplicados sin esfuerzo manual.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={isLoggedIn ? "/app" : "/register"}
            className="rounded-md bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
          >
            {isLoggedIn ? "Ir al panel" : "Empezar gratis"}
          </Link>
          {!isLoggedIn && (
            <Link
              href="/login"
              className="rounded-md border border-[#e2e8f0] bg-white px-6 py-3 text-sm font-semibold text-[#475569] hover:border-[#cbd5e1]"
            >
              Entrar
            </Link>
          )}
        </div>
      </section>

      {/* Steps */}
      <section className="border-t border-[#e2e8f0] bg-white px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-2xl font-bold tracking-tight">Cómo funciona</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-[#2563eb]">{s.n}</span>
                <h3 className="font-semibold text-[#0f172a]">{s.title}</h3>
                <p className="text-sm leading-relaxed text-[#475569]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e2e8f0] px-4 py-8">
        <div className="mx-auto max-w-3xl flex items-center justify-between text-xs text-[#64748b]">
          <span className="font-medium">Geo Web</span>
          <div className="flex items-center gap-4">
            <Link href="/ayuda" className="hover:text-[#2563eb] hover:underline">
              Cómo obtener el token
            </Link>
            <span>Proyecto de portafolio — no comercial</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
