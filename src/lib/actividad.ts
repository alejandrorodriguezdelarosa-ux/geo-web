import { prisma } from "@/lib/prisma"

// Tipos de ejecución que se registran en el diario. El texto que ve la persona vive en
// ETIQUETA_ACTIVIDAD, para que el historial no muestre nombres técnicos.
export type TipoActividad =
  | "audit_page"
  | "audit_site"
  | "competitors"
  | "question"
  | "fix"
  | "schema"
  | "enrich"

export const ETIQUETA_ACTIVIDAD: Record<TipoActividad, string> = {
  audit_page: "Auditoría de página",
  audit_site: "Auditoría de sitio",
  competitors: "Comparación con competencia",
  question: "Pregunta a medida",
  fix: "Contenido de mejora generado",
  schema: "Schema generado",
  enrich: "Enriquecimiento de tienda",
}

type Registro = {
  userId: string
  kind: TipoActividad
  target: string
  score?: number | null
  companyId?: string | null
  detail?: Record<string, unknown> | null
}

/**
 * Apunta una ejecución en el diario de actividad.
 *
 * No lanza nunca: el historial es un registro, no parte del trabajo. Si falla la
 * escritura, la acción del usuario debe terminar igual.
 */
export async function registrarActividad(r: Registro): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: r.userId,
        companyId: r.companyId ?? null,
        kind: r.kind,
        target: (r.target || "").slice(0, 500),
        score: typeof r.score === "number" ? Math.round(r.score) : null,
        detail: (r.detail ?? undefined) as never,
      },
    })
  } catch {
    // Silencio deliberado: ver el comentario de arriba.
  }
}
