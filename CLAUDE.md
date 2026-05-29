@AGENTS.md

## Forma de trabajar con Claude Code

- **Mantener este CLAUDE.md al día.** Al cerrar cada tarea (tras verificarla), actualizar
  ANTES de pasar a la siguiente: marcar la tarea como ✅ HECHA con una línea de qué se
  verificó, registrar cualquier decisión nueva o desvío del plan, y reflejar cambios en el
  contrato de API o el modelo de datos. No esperar a que el usuario lo pida.

## Sistema de diseño

**Aplicado en commit `70f2c8d`:** Inter única fuente (400–800 via `next/font/google`),
acento `#2563eb` (hover `#1d4ed8`), fondo página `#f8fafc`, tarjetas/header `#ffffff`,
texto principal `#0f172a`, secundario `#475569`, muted `#64748b`, bordes `#e2e8f0`,
bordes input `#cbd5e1`. Paleta idéntica al TFM OptimoIA. Sin dark mode. Sin Fraunces,
Inter Tight ni JetBrains Mono.

## Página /ayuda

Página pública estática (`src/app/ayuda/page.tsx`). Tutorial de 6 pasos para crear
una Custom App en Shopify y obtener el `shpat_` token. Scopes documentados (extraídos
de `n8n/HTML_ENRICH_v3.json`):
- `read_products` — productos, custom_collections, smart_collections
- `read_content` — pages, blogs, articles
- `read_themes` — leer temas y assets
- `write_themes` — subir snippets Liquid
- `write_metafields` — guardar Schema.org en metafields

Enlazada desde: dashboard (junto al campo token) y footer de la landing.

## Tareas de la Fase 1 y estado

- **T5** ✅ HECHA — `POST /api/jobs` verificado E2E 4/4: 401 sin auth, 400 token inválido,
  503 + job marcado failed con n8n sin configurar, job persistido en DB.
- **T6** ✅ HECHA — `POST /api/jobs/[id]/callback` verificado 6/6: 401 secret incorrecto/ausente,
  404 job inexistente, 400 enum inválido, 200 + persistencia correcta en succeeded y failed.
  Valida `X-Callback-Secret` con comparación timing-safe; no usa sesión; no verifica
  ownership por diseño (n8n no tiene sesión de usuario).
- **T7** ✅ HECHA — `GET /api/jobs/[id]` verificado 3/3: 401 sin auth, 404 job ajeno sin
  filtrar existencia (mismo 404 para job inexistente y job de otro usuario), 200 job propio
  sin exponer `userId`.
- **T8** ✅ HECHA — dashboard (`/app`) verificado 6/6: 307 sin auth → login, 200 con auth,
  email del usuario en header, jobs leídos de Prisma visibles en HTML, formulario presente,
  0 errores de render.
- **T11** ✅ IMAGEN CONSTRUIDA Y VERIFICADA — Dockerfile multi-stage (builder node:20-alpine,
  runner standalone sin Prisma CLI); `output: 'standalone'` en next.config.ts; `trustHost: true`
  en auth.ts (necesario detrás de Traefik). Imagen `geo-web:test` probada: `/` → 200,
  `/app` → 307. Estrategia migraciones: MANUAL (no en entrypoint) — la CLI de Prisma 7
  arrastra Studio/pglite/hono (~250MB extra); para este proyecto: `npx prisma migrate deploy`
  desde el host antes del primer deploy y tras cambios de esquema. Pendiente: configurar
  Application en Dokploy y apuntar DNS (T11 completo tras primer deploy exitoso).
  `NEXTAUTH_URL = https://geo.xn--ptimoia-k0a.es` (punycode, ya correcto en .env).
- **T10** ⚙️ ARCHIVO HECHO, pendiente importar+activar en n8n y prueba E2E (T12) —
  `/root/geo-web/n8n/HTML_ENRICH_v4_web.json` generado desde v3: Telegram Trigger →
  Webhook POST `geo-enrich` (responseMode onReceived); Parse Input reescrito para leer
  body de webhook con jobId/callbackUrl/callbackSecret extraídos antes de validar;
  informe añade campos callback y convierte msg a summary texto plano; 2 nodos Telegram
  reemplazados por httpRequest (OK → callbackUrl con status+summary; Error → callbackUrl
  con status:failed+errorMessage); active:false. 48 nodos, pipeline intacto.
  Decisión: errores parciales de IA van en summary, NO marcan failed (solo falla si el
  workflow no llega al nodo informe).
  `N8N_WEBHOOK_URL = https://n8n.xn--ptimoia-k0a.es/webhook/geo-enrich`
- **T9** ✅ HECHA — landing `/` verificada: 200, titular presente, CTAs a `/register` y
  `/login`, 0 errores. Diseño: Fraunces (titulares), Inter Tight (cuerpo), JetBrains Mono
  (números de paso), fondo #f5f3ee, acento #c2410c. Server component; CTA primario cambia
  a "Ir al panel" → /app si el usuario ya tiene sesión.

## Contrato API web ↔ n8n

Endpoints del servidor Next.js que n8n consume:

| Método | Ruta | Quién llama | Auth |
|--------|------|-------------|------|
| POST | `/api/jobs` | UI (usuario autenticado) | Cookie de sesión |
| POST | `/api/jobs/[id]/callback` | n8n | `X-Callback-Secret` header |
| GET | `/api/jobs/[id]` | UI (polling cliente) | Cookie de sesión |

**Desvío registrado:** se eliminó un `GET /api/jobs` de lista que se creó de más y no
estaba en el contrato. El render inicial del dashboard lee los jobs directamente de Prisma
en el server component (`page.tsx`). El polling del cliente llama a `GET /api/jobs/[id]`
por cada job en estado `pending` o `running`.
