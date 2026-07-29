import { redirect } from "next/navigation"

// La conexión con Claude Code vive ahora dentro de "Mi cuenta". Se mantiene esta ruta
// porque puede estar guardada en marcadores o enlazada desde la documentación.
export default function McpPage() {
  redirect("/app/cuenta")
}
