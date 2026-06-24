# La Dicha

Plataforma web para venta de lotería dominicana: jugadores, cajeros y administración.

**Producción (URL oficial):** [https://www.consorciobelendejudea.com](https://www.consorciobelendejudea.com)

> Usar siempre **`www.consorciobelendejudea.com`**. El dominio apex `consorciobelendejudea.com` (sin `www`) redirige permanentemente a `www` — no hay dos versiones del sistema. Alias Vercel: [la-dicha.vercel.app](https://la-dicha.vercel.app).

Ver release de producción: [docs/PRODUCTION-RELEASE.md](docs/PRODUCTION-RELEASE.md)

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS v4**
- **Prisma** + **PostgreSQL** (Neon en producción)
- **JWT** (jose) + bcrypt para sesiones

## Módulos

| Área | Rutas |
|------|--------|
| Jugador | `/login`, `/jugar`, `/ruleta`, `/tickets`, `/tickets/[id]`, `/resultados` |
| Cajero | `/cajero/login`, `/cajero`, `/cajero/vender`, `/cajero/monitor`, `/cajero/tickets`, `/cajero/jugadores`, `/cajero/recargar` |
| Admin | `/admin/login`, `/admin`, `/admin/usuarios`, `/admin/billeteras`, `/admin/tickets`, `/admin/sorteos`, `/admin/resultados`, `/admin/ruleta` |

## Credenciales de demo

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Jugador | `demo` | `1234` |
| Cajero | `cajero` | `1234` |
| Admin | `admin` | `1234` |

## Desarrollo local

### Requisitos

- Node.js 20+
- Cuenta Vercel/Neon (o `DATABASE_URL` de PostgreSQL)

### Instalación

```bash
git clone https://github.com/ROBERRTRSP/la-dicha.git
cd la-dicha
npm install
```

### Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores, o descárgalos desde Vercel:

```bash
npx vercel env pull .env.local
```

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión PostgreSQL (pooler) |
| `DATABASE_URL_UNPOOLED` | Conexión directa (migraciones Prisma) |
| `AUTH_SECRET` | Secreto JWT (string largo aleatorio) |
| `NEXT_PUBLIC_APP_URL` | URL pública — usar `https://www.consorciobelendejudea.com` en producción |
| `CRON_SECRET` | Opcional: protege el cron de sincronización de resultados |

### Base de datos

```bash
npm run db:setup
```

Crea tablas y datos iniciales (loterías, sorteos, usuarios demo).

### Servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:push` | Sincronizar schema Prisma |
| `npm run db:seed` | Datos iniciales |
| `npm run db:setup` | `db:push` + `db:seed` |
| `npm run logos:fetch` | Descarga logos oficiales al CDN (`vercel-build` lo ejecuta) |

**Logos legacy:** `scripts/legacy/generate-logos.mjs` genera SVG placeholder locales; no forma parte del build. Ver `scripts/legacy/README.md`.

## Documentación técnica

| Documento | Contenido |
|-----------|-----------|
| [docs/PRODUCTION-RELEASE.md](docs/PRODUCTION-RELEASE.md) | Release de producción, pruebas 25/25 y post-deploy |
| [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) | Middleware vs layouts, riesgos y recomendaciones |
| [docs/CSS-ORGANIZATION.md](docs/CSS-ORGANIZATION.md) | Mapa de `globals.css` y plan de división futura |

## Despliegue en Vercel

El proyecto está configurado para Vercel con Neon Postgres.

```bash
npx vercel link --project la-dicha
npx vercel integration add neon
npx vercel env add AUTH_SECRET production
npx vercel deploy --prod
```

El build (`vercel-build`) ejecuta `prisma db push`, seed y `next build`.

### Post-deploy (obligatorio tras cada deploy a producción)

1. Confirmar que el alias apex apunta al deployment actual:

```bash
npx vercel alias set la-dicha.vercel.app consorciobelendejudea.com
```

2. Ejecutar smoke tests:

```bash
node scripts/post-deploy-check.mjs https://consorciobelendejudea.com
SKIP_RATE_LIMIT=1 node scripts/post-deploy-check.mjs https://www.consorciobelendejudea.com
```

Esperado: **25/25 PASS** en ambos. Detalle completo en [docs/PRODUCTION-RELEASE.md](docs/PRODUCTION-RELEASE.md).

## Estructura principal

```
src/
  app/           # Rutas Next.js (jugador, cajero, admin, API)
  components/    # UI (ruleta, admin, cajero, tickets)
  lib/           # Auth, Prisma, liquidación, ruleta, tickets
prisma/
  schema.prisma  # Modelos de datos
  seed.ts        # Datos iniciales
```

## Licencia

Proyecto privado — todos los derechos reservados.
