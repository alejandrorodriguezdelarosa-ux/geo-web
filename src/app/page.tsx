import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google"
import Link from "next/link"
import { auth } from "@/auth"

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" })
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })

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

  const fonts = `${fraunces.variable} ${interTight.variable} ${jetbrainsMono.variable}`

  return (
    <div
      className={`${fonts} font-[family-name:var(--font-inter-tight)] min-h-screen bg-[#f5f3ee] text-stone-900`}
    >
      {/* Nav */}
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6">
        <span className="font-[family-name:var(--font-fraunces)] text-lg font-semibold tracking-tight">
          Geo Web
        </span>
        <nav className="flex items-center gap-6 text-sm font-medium">
          {isLoggedIn ? (
            <Link href="/app" className="text-[#c2410c] hover:underline">
              Ir al panel →
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-stone-600 hover:text-stone-900">
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-[#c2410c] px-4 py-1.5 text-white hover:bg-orange-800"
              >
                Empezar
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-16">
        <h1 className="font-[family-name:var(--font-fraunces)] text-5xl font-semibold leading-[1.1] tracking-tight text-stone-900 sm:text-6xl">
          Schema.org automático<br />para tu tienda Shopify
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-600">
          Conecta tu tienda, lanza el análisis y recibe los datos estructurados para SEO y GEO
          aplicados sin esfuerzo manual.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={isLoggedIn ? "/app" : "/register"}
            className="rounded-md bg-[#c2410c] px-6 py-3 text-sm font-semibold text-white hover:bg-orange-800"
          >
            {isLoggedIn ? "Ir al panel" : "Empezar gratis"}
          </Link>
          {!isLoggedIn && (
            <Link
              href="/login"
              className="rounded-md border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-700 hover:border-stone-400"
            >
              Entrar
            </Link>
          )}
        </div>
      </section>

      {/* Steps */}
      <section className="border-t border-stone-200 bg-white px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[family-name:var(--font-fraunces)] mb-10 text-2xl font-semibold tracking-tight">
            Cómo funciona
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col gap-3">
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-sm text-[#c2410c]">
                  {s.n}
                </span>
                <h3 className="font-semibold text-stone-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-stone-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 px-4 py-8">
        <div className="mx-auto max-w-3xl flex items-center justify-between text-xs text-stone-400">
          <span className="font-[family-name:var(--font-fraunces)] font-medium">Geo Web</span>
          <span>Proyecto de portafolio — no comercial</span>
        </div>
      </footer>
    </div>
  )
}
