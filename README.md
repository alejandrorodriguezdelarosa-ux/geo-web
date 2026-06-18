# geo-web — Plataforma de enriquecimiento semántico para SEO generativo

Aplicación web full-stack que conecta tiendas Shopify y sitios WordPress con un
pipeline de enriquecimiento automático de datos estructurados **Schema.org**, diseñada
para mejorar la citabilidad de contenidos en motores de búsqueda generativos (GEO).

Proyecto real en producción desarrollado como parte del ecosistema **OptimoIA**.

---

## Qué hace

El flujo principal: el usuario autentica su tienda o sitio, lanza un job de
enriquecimiento, y la plataforma coordina con un workflow n8n que genera y escribe
datos estructurados (JSON-LD) directamente en los metafields de Shopify o en la base
de datos de WordPress, sin alterar el contenido original del comerciante.

Módulos disponibles:

| Módulo | Descripción |
|--------|-------------|
| **Shopify** | OAuth por-comerciante con Custom Apps; escribe Schema.org en metafields y snippets Liquid |
| **WordPress** | Integración vía Application Passwords; plugin propio que registra y renderiza JSON-LD |
| **Generador de Schema** | Genera Schema.org para una URL puntual a través de una API FastAPI intermediaria |
| **Crawl multipágina** | Descubre y enriquece todas las páginas de un sitemap |

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Server Components) |
| Auth | NextAuth v5 (JWT, Credentials provider) |
| ORM / BD | Prisma 7 + PostgreSQL |
| UI | Tailwind CSS, React Hook Form, Zod |
| Orquestación | n8n (webhook) |
| Despliegue | Docker multi-stage, Dokploy, Traefik |

---

## Arquitectura

```
Navegador
   │
   ├─ Server Components (page.tsx)  ──► Prisma ──► PostgreSQL
   │
   └─ Client Components             ──► Route Handlers (src/app/api/)
                                              │
                                    ┌─────────┴─────────┐
                               Prisma ORM          Webhook n8n
                                    │                    │
                               PostgreSQL          Pipeline de
                                                  enriquecimiento
                                                  (Schema.org)
```

Las rutas API actúan como intermediarios server-side: el navegador nunca llama
directamente a n8n ni a la API FastAPI, lo que elimina la exposición de credenciales
al cliente.

---

## Lo más destacable técnicamente

### OAuth multi-comerciante de Shopify

Cada comerciante registra su propia Custom App de Shopify (sin revisión de Shopify).
El flujo OAuth implementa:

- **Cifrado AES-256-GCM** de `clientSecret` y `accessToken` en reposo, usando
  `node:crypto` nativo sin dependencias externas. IV aleatorio por llamada; authTag
  verifica integridad en cada descifrado.
- **Validación HMAC del callback** con `timingSafeEqual` sobre los parámetros
  ordenados según la especificación de Shopify, sin exponer el clientSecret en logs.
- **Cookie CSRF HttpOnly** con nonce de un solo uso para proteger el flujo OAuth.
- **Orden estricto de validaciones**: state → CSRF → ownership → shop → HMAC →
  timestamp → intercambio de code. Fallo rápido con respuesta genérica.
- El `accessToken` se descifra solo en memoria cuando se necesita, y se sobreescribe
  con `""` inmediatamente después.

### Enriquecimiento sin alterar contenido (módulo B)

El workflow n8n escribe Schema.org únicamente en metafields (`seo.schema_org`) y
en snippets Liquid del tema activo. El `body_html` de productos y páginas queda
intacto — condición no negociable para el uso en comercios reales.

### Plugin WordPress propio

`geo-schema-enricher` (en `wordpress-plugin/`) registra el meta `geo_schema_jsonld`
con `show_in_rest: true` (necesario para que la REST API de WordPress no descarte
silenciosamente la escritura) y lo renderiza como `<script type="application/ld+json">`
en el `<head>`. Distribuible como `.zip` estándar de WordPress.

---

## Instalación local

```bash
# 1. Variables de entorno
cp .env.example .env
# Editar .env con las credenciales reales

# 2. Dependencias
npm install

# 3. Migraciones
npx prisma migrate deploy

# 4. Servidor de desarrollo
npm run dev
```

Ver `.env.example` para la lista completa de variables necesarias.

---

## Despliegue

La imagen Docker usa **output standalone** de Next.js (sin servidor Node completo):

```bash
docker build -t geo-web .
```

Las migraciones de base de datos se ejecutan manualmente antes del primer deploy y
tras cada cambio de esquema (no en el entrypoint, para no añadir Prisma CLI a la
imagen de producción).

---

## Nota sobre el código

Este repositorio es una muestra del código real de producción. Se ha eliminado
cualquier credencial, dato de clientes y nota interna de desarrollo. Las variables
de entorno sensibles (claves de cifrado, secrets de auth, tokens) se gestionan
exclusivamente en el entorno de despliegue y nunca se incluyen en el repositorio.
