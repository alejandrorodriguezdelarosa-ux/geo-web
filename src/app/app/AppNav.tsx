"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const ITEMS = [
  { href: "/app", label: "Auditor GEO" },
  { href: "/app/sitio", label: "Auditoría de sitio" },
  { href: "/app/enriquecimiento", label: "Enriquecimiento Shopify" },
  { href: "/app/generador", label: "Generador Schema.org por URL" },
  { href: "/app/crawl", label: "Crawling multipágina" },
  { href: "/app/wordpress", label: "WordPress" },
  { href: "/app/shopify", label: "Shopify OAuth" },
  { href: "/app/mcp", label: "Conectar con Claude Code" },
]

export default function AppNav() {
  const pathname = usePathname()
  return (
    <nav className="mb-8 flex flex-wrap gap-2">
      {ITEMS.map((it) => {
        const active =
          it.href === "/app" ? pathname === "/app" : pathname.startsWith(it.href)
        return (
          <Link
            key={it.href}
            href={it.href}
            className={
              active
                ? "rounded-full border border-[#EC1E63] bg-white px-3 py-1 text-xs font-medium text-[#EC1E63]"
                : "rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-xs font-medium text-[#475569] hover:border-[#EC1E63] hover:text-[#EC1E63]"
            }
          >
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}
