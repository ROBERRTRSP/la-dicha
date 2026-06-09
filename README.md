# La Dicha

Plataforma web para venta de lotería dominicana: jugadores, cajeros y administración.

**Producción:** [https://consorciobelendejudea.com](https://consorciobelendejudea.com) (alias: [la-dicha.vercel.app](https://la-dicha.vercel.app))

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS v4**
- **Prisma** + **PostgreSQL** (Neon en producción)
- **JWT** (jose) + bcrypt para sesiones

## Módulos

| Área | Rutas |
|------|--------|
| Jugador | `/login`, `/jugar`, `/ruleta`, `/tickets`, `/resultados` |
| Cajero | `/cajero/login`, `/cajero/jugadores`, `/cajero/recargar`, `/cajero/tickets` |
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
| `NEXT_PUBLIC_APP_NAME` | Nombre de la app |

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

## Despliegue en Vercel

El proyecto está configurado para Vercel con Neon Postgres.

```bash
npx vercel link --project la-dicha
npx vercel integration add neon
npx vercel env add AUTH_SECRET production
npx vercel deploy --prod
```

El build (`vercel-build`) ejecuta `prisma db push`, seed y `next build`.

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
