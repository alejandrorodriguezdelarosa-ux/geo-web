import Link from "next/link"

export const metadata = {
  title: "Cómo obtener el token de Shopify — Geo Web",
  description:
    "Guía paso a paso para crear una Custom App en Shopify y obtener el Admin API access token necesario para usar Geo Web.",
}

const SCOPES = [
  { scope: "read_products", desc: "Leer productos, colecciones manuales y smart collections" },
  { scope: "read_content", desc: "Leer páginas, blogs y artículos" },
  { scope: "read_themes", desc: "Leer temas activos y sus archivos" },
  { scope: "write_themes", desc: "Subir snippets Liquid con el marcado Schema.org generado" },
  { scope: "write_metafields", desc: "Guardar el Schema.org como metafield en productos y colecciones" },
]

export default function AyudaPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      {/* Nav */}
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight text-[#0f172a]">
            Geo Web
          </Link>
          <Link href="/app" className="text-sm font-medium text-[#475569] hover:text-[#0f172a]">
            ← Volver al panel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        {/* Title */}
        <h1 className="text-4xl font-extrabold tracking-tight">
          Cómo obtener el token de Shopify
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[#475569]">
          Geo Web necesita un <strong className="text-[#0f172a]">Admin API access token</strong> para
          leer el contenido de tu tienda y guardar los datos estructurados que genera. Este token
          se obtiene creando una <em>Custom App</em> dentro del propio panel de Shopify —
          no necesitas instalar nada externo.
        </p>

        {/* Steps */}
        <ol className="mt-10 flex flex-col gap-8">

          {/* Step 1 */}
          <li className="flex gap-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white">
              1
            </div>
            <div className="pt-0.5">
              <h2 className="text-lg font-bold">Abre la sección de apps de tu admin</h2>
              <p className="mt-1 text-[#475569]">
                En el panel de administración de Shopify ve a{" "}
                <strong className="text-[#0f172a]">Settings → Apps and sales channels</strong> y
                después haz clic en <strong className="text-[#0f172a]">Develop apps</strong>.
              </p>
            </div>
          </li>

          {/* Step 2 */}
          <li className="flex gap-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white">
              2
            </div>
            <div className="pt-0.5">
              <h2 className="text-lg font-bold">Activa el desarrollo de apps (si está deshabilitado)</h2>
              <p className="mt-1 text-[#475569]">
                Si ves el botón{" "}
                <strong className="text-[#0f172a]">Allow custom app development</strong>, haz
                clic en él y confirma. Solo es necesario hacerlo una vez.
              </p>
            </div>
          </li>

          {/* Step 3 */}
          <li className="flex gap-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white">
              3
            </div>
            <div className="pt-0.5">
              <h2 className="text-lg font-bold">Crea la app</h2>
              <p className="mt-1 text-[#475569]">
                Haz clic en <strong className="text-[#0f172a]">Create an app</strong>, ponle un
                nombre descriptivo (por ejemplo <em>Geo Web Schema</em>) y confirma.
              </p>
            </div>
          </li>

          {/* Step 4 */}
          <li className="flex gap-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white">
              4
            </div>
            <div className="pt-0.5">
              <h2 className="text-lg font-bold">Configura los permisos de la Admin API</h2>
              <p className="mt-1 text-[#475569]">
                Dentro de la app, ve a la pestaña{" "}
                <strong className="text-[#0f172a]">Configuration</strong> y abre la sección{" "}
                <strong className="text-[#0f172a]">Admin API integration</strong>. Activa
                exactamente estos permisos:
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {SCOPES.map(({ scope, desc }) => (
                  <li key={scope} className="flex items-start gap-3 rounded-lg border border-[#e2e8f0] bg-white px-4 py-3">
                    <code className="shrink-0 rounded bg-[#eff6ff] px-2 py-0.5 text-xs font-semibold text-[#2563eb]">
                      {scope}
                    </code>
                    <span className="text-sm text-[#475569]">{desc}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-[#64748b]">
                No es necesario activar ningún otro permiso. Mantener el acceso al mínimo
                necesario es una buena práctica de seguridad.
              </p>
            </div>
          </li>

          {/* Step 5 */}
          <li className="flex gap-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white">
              5
            </div>
            <div className="pt-0.5">
              <h2 className="text-lg font-bold">Guarda e instala la app</h2>
              <p className="mt-1 text-[#475569]">
                Haz clic en <strong className="text-[#0f172a]">Save</strong> para guardar la
                configuración y después en{" "}
                <strong className="text-[#0f172a]">Install app</strong>. Shopify te pedirá
                confirmar los permisos seleccionados.
              </p>
            </div>
          </li>

          {/* Step 6 */}
          <li className="flex gap-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white">
              6
            </div>
            <div className="pt-0.5">
              <h2 className="text-lg font-bold">Copia el token</h2>
              <p className="mt-1 text-[#475569]">
                Ve a la pestaña <strong className="text-[#0f172a]">API credentials</strong>.
                Verás el campo{" "}
                <strong className="text-[#0f172a]">Admin API access token</strong> con un botón
                para revelar el valor. El token empieza por <code className="rounded bg-[#eff6ff] px-1.5 py-0.5 text-xs font-semibold text-[#2563eb]">shpat_</code>.
                Cópialo y pégalo en Geo Web.
              </p>
            </div>
          </li>
        </ol>

        {/* Warning */}
        <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">
            El token se muestra una sola vez
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Shopify solo te permite ver el valor del token en el momento de la instalación.
            Si cierras la pantalla sin copiarlo tendrás que desinstalar la app y reinstalarla
            para obtener uno nuevo.
          </p>
        </div>

        {/* Security note */}
        <div className="mt-4 rounded-xl border border-[#e2e8f0] bg-white px-5 py-4">
          <p className="text-sm font-semibold text-[#0f172a]">
            Nota de seguridad
          </p>
          <p className="mt-1 text-sm text-[#475569]">
            Geo Web <strong>no almacena tu token</strong>. Se envía directamente al motor de
            análisis en el momento de lanzar el trabajo y no queda guardado en ninguna base
            de datos. Cada vez que lances un análisis deberás introducirlo de nuevo.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-10">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-md bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
          >
            Ir al panel →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2e8f0] px-4 py-8">
        <div className="mx-auto max-w-3xl flex items-center justify-between text-xs text-[#64748b]">
          <span className="font-medium">Geo Web</span>
          <span>Proyecto de portafolio — no comercial</span>
        </div>
      </footer>
    </div>
  )
}
