// Novedades de OptimoIA. Se mantiene en código a propósito: es contenido editorial,
// no datos de usuario, y así viaja con el despliegue que la introduce.
// Lo más reciente primero.

export type Novedad = {
  fecha: string
  titulo: string
  detalle: string
  tipo: "nuevo" | "mejora" | "arreglo"
}

export const NOVEDADES: Novedad[] = [
  {
    fecha: "2026-07-29",
    titulo: "Empresas e historial",
    detalle:
      "Ya puedes dar de alta a tus clientes como empresas y agrupar su trabajo. Y tienes un historial " +
      "con todo lo que has ejecutado, además de estas novedades.",
    tipo: "nuevo",
  },
  {
    fecha: "2026-07-29",
    titulo: "Panel de inicio y menú lateral",
    detalle:
      "La pantalla de inicio resume tu actividad y tus accesos. Las secciones se agrupan por lo que " +
      "quieres hacer, en un menú lateral que se abre con el icono de tres rayas.",
    tipo: "nuevo",
  },
  {
    fecha: "2026-07-29",
    titulo: "La nota avisa cuando es provisional",
    detalle:
      "Si falla el servicio que genera las preguntas de prueba, el análisis ya no se queda a medias: " +
      "usa preguntas de repuesto, te avisa de que la nota es orientativa y no la guarda en el histórico " +
      "para no falsear la evolución.",
    tipo: "mejora",
  },
  {
    fecha: "2026-07-29",
    titulo: "La visibilidad de marca ya se mide de verdad",
    detalle:
      "Esa dimensión daba casi siempre cero por un fallo interno. Ahora consulta Wikipedia y Wikidata " +
      "directamente y detecta tus perfiles de Reddit, YouTube y LinkedIn. Las puntuaciones suben respecto " +
      "a informes anteriores porque antes estaban infravaloradas.",
    tipo: "arreglo",
  },
  {
    fecha: "2026-07-27",
    titulo: "Conexión con Claude Code",
    detalle:
      "Puedes usar el auditor desde Claude Code con tu propio token, y regenerarlo cuando quieras. " +
      "Está en Mi cuenta.",
    tipo: "nuevo",
  },
  {
    fecha: "2026-07-22",
    titulo: "Auditoría de sitio completo",
    detalle:
      "Analiza un dominio entero leyendo su sitemap y te da un informe global con las páginas peor " +
      "preparadas, los problemas repetidos y la evolución frente a auditorías anteriores.",
    tipo: "nuevo",
  },
  {
    fecha: "2026-07-22",
    titulo: "Informe en lenguaje de negocio",
    detalle:
      "El informe explica cada puntuación, incluye un resumen para tu equipo, un plan de acción " +
      "priorizado con el esfuerzo de cada tarea y se puede descargar como presentación.",
    tipo: "mejora",
  },
  {
    fecha: "2026-07-22",
    titulo: "Competencia fijada por ti",
    detalle:
      "La detección automática de competidores se retiró porque proponía tiendas que no competían de " +
      "verdad. Ahora los eliges tú y quedan guardados para cada página.",
    tipo: "mejora",
  },
]
