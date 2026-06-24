# Release de producción — La Dicha

## Fecha del release

**10 de junio de 2026**

Estado: **✅ OPERATIVO TÉCNICAMENTE PARA PRODUCCIÓN**

---

## URL oficial

**https://www.consorciobelendejudea.com**

| URL | Comportamiento |
|-----|----------------|
| `https://www.consorciobelendejudea.com` | Sirve el deployment de producción actual |
| `https://consorciobelendejudea.com` | Redirect permanente **308** → `www` |
| `https://la-dicha.vercel.app` | Alias Vercel del mismo deployment |

No deben coexistir dos versiones del sistema. El dominio apex siempre redirige a `www`.

---

## Deployment ID (producción)

| Campo | Valor |
|-------|-------|
| **Deployment ID** | `dpl_3cvJgwFLMxwC2qBfBiMA6YptjHPm` |
| **URL de deployment** | `https://la-dicha-e7bn3egea-roberrtrsps-projects.vercel.app` |
| **Proyecto Vercel** | `la-dicha` (`roberrtrsps-projects`) |
| **Inspector** | https://vercel.com/roberrtrsps-projects/la-dicha/3cvJgwFLMxwC2qBfBiMA6YptjHPm |

---

## Base de datos

| Campo | Valor |
|-------|-------|
| **Proveedor** | Neon (PostgreSQL) |
| **Host (pooler)** | `ep-patient-king-aqrztw7r-pooler.c-8.us-east-1.aws.neon.tech` |
| **Host (directo)** | `ep-patient-king-aqrztw7r.c-8.us-east-1.aws.neon.tech` |
| **Base** | `neondb` |
| **Migración idempotency** | `20250608120000_add_roulette_spin_idempotency` |
| **Tabla crítica** | `RouletteSpinIdempotency` — **confirmada en Neon** |

Verificación local (solo lectura):

```bash
node scripts/check-db-table.mjs
# Esperado: TABLE_EXISTS: YES
```

---

## Variables críticas (Vercel Production)

| Variable | Estado | Notas |
|----------|--------|-------|
| `DATABASE_URL` | ✅ Configurada | Pooler Neon |
| `DATABASE_URL_UNPOOLED` | ✅ Configurada | Conexión directa / Prisma migrate |
| `AUTH_SECRET` | ✅ Configurada | Solo **Production**; obligatoria en prod |
| `NEXT_PUBLIC_APP_URL` | Recomendado | Usar `https://www.consorciobelendejudea.com` |

Si `AUTH_SECRET` falta en `NODE_ENV=production`, la app falla al arrancar (`src/lib/auth-secret.ts`).

---

## Pruebas realizadas

### Build y Prisma

| Comando | Resultado |
|---------|-----------|
| `npx prisma generate` | ✅ OK |
| `npx next build` | ✅ OK |
| `npx prisma migrate deploy` | ✅ Sin migraciones pendientes |
| `node scripts/check-db-table.mjs` | ✅ `TABLE_EXISTS: YES` |

### Post-deploy (producción)

```bash
node scripts/post-deploy-check.mjs https://consorciobelendejudea.com
SKIP_RATE_LIMIT=1 node scripts/post-deploy-check.mjs https://www.consorciobelendejudea.com
```

| URL | Resultado |
|-----|-----------|
| `https://consorciobelendejudea.com` | **25/25 PASS** |
| `https://www.consorciobelendejudea.com` | **25/25 PASS** |

### Áreas verificadas

- Login jugador, cajero y admin
- Jugada con descuento de saldo y ticket generado
- Listado y detalle de tickets
- Ruleta con **idempotency** (sin doble cobro en reintentos)
- Venta cajero transaccional (ticket + banca alineados)
- Panel admin (dashboard, tickets, billeteras, sorteos)
- Rate limit en login (429 tras intentos fallidos repetidos)
- Redirect apex → www (308)

---

## Funcionalidades críticas incluidas en este release

- Ruleta: idempotency (`RouletteSpinIdempotency`) + giro gratis dentro de transacción
- Cajero: venta atómica (`executeCajeroCashSale`) con validación de límites anti-TOCTOU
- Tickets: pago y cancelación con `updateMany` condicional (anti doble cobro/cancelación)
- Admin: ajuste de billeteras atómico; validación de usuarios, resultados y ruleta
- Auth: `AUTH_SECRET` obligatorio en producción
- Rate limit: intentos fallidos de login por IP (jugador / cajero / admin)

---

## Pendientes no críticos

| Item | Prioridad | Notas |
|------|-----------|-------|
| `AUTH_SECRET` en Preview/Development | Media | Evita fallos en preview deploys |
| Rate limit en memoria por instancia | Baja | En Vercel multi-instancia la protección es parcial; considerar Redis/Upstash |
| Asignación formal del apex en Vercel Domains | Baja | Funciona vía alias; `domains add` puede mostrar conflicto histórico |
| `loading.tsx` / `error.tsx` en rutas jugador restantes | Baja | UX |
| Re-liquidación al re-publicar resultados ya settled | Baja | Solo items `PENDING` se liquidan |
| Commits/git sincronizados con deploy CLI | Baja | Deploy actual vía `vercel deploy --prod` desde workspace local |

---

## Procedimiento post-deploy recomendado

Ejecutar después de cada `npx vercel deploy --prod`:

### 1. Confirmar alias del dominio apex

```bash
npx vercel alias set la-dicha.vercel.app consorciobelendejudea.com
npx vercel alias ls
```

Verificar que `consorciobelendejudea.com` y `www.consorciobelendejudea.com` apuntan al **mismo deployment** reciente.

### 2. Verificar redirect apex → www

```bash
curl -I https://consorciobelendejudea.com/login
```

Esperado: `308` (o `307`) con `Location: https://www.consorciobelendejudea.com/login`

### 3. Smoke tests automatizados

```bash
node scripts/post-deploy-check.mjs https://consorciobelendejudea.com
SKIP_RATE_LIMIT=1 node scripts/post-deploy-check.mjs https://www.consorciobelendejudea.com
```

Ambos deben reportar **25/25 PASS**.

> El segundo comando usa `SKIP_RATE_LIMIT=1` para no bloquear el login jugador si el primer script ya probó el rate limit en la misma IP.

### 4. Verificación opcional de base de datos

```bash
node scripts/check-db-table.mjs
```

### 5. Build local (antes de deploy, si hubo cambios de schema)

```bash
npx prisma generate
npx next build
```

En Vercel, `vercel-build` ejecuta `prisma db push` (schema ya sincronizado con migración aplicada).

---

## Scripts de operaciones

| Script | Uso |
|--------|-----|
| `scripts/post-deploy-check.mjs` | Smoke tests HTTP contra producción |
| `scripts/check-db-table.mjs` | Confirma env Neon + tabla idempotency |
| `scripts/run-prisma.mjs` | Ejecuta comandos Prisma con `.env.local` cargado |
| `scripts/generate-migration-diff.mjs` | Genera SQL de diff (desarrollo) |

---

## Contacto / referencia

- **App:** La Dicha — lotería dominicana
- **Repositorio:** https://github.com/ROBERRTRSP/la-dicha
- **Documentación relacionada:** [AUTHENTICATION.md](./AUTHENTICATION.md), [CSS-ORGANIZATION.md](./CSS-ORGANIZATION.md)
