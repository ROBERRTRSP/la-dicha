# Variables de entorno en Vercel (La Dicha)

## CRON_SECRET (obligatorio en producción)

Los endpoints `/api/cron/*` exigen `Authorization: Bearer <CRON_SECRET>` cuando el secret está definido.  
Si **VERCEL_ENV=production** y **CRON_SECRET** no existe, responden **503** (misconfiguración).

### Configurar en Vercel

1. Dashboard → proyecto **la-dicha** → **Settings** → **Environment Variables**
2. Añadir:
   - **Name:** `CRON_SECRET`
   - **Value:** cadena aleatoria larga (mín. 32 caracteres). Ejemplo local:
     ```bash
     openssl rand -base64 32
     ```
   - **Environments:** Production (y Preview si usas cron en previews)
3. **Redeploy** tras guardar (las variables no aplican a deploys anteriores).

### Configurar cron jobs en Vercel

En `vercel.json` (o Cron Jobs del dashboard), cada job debe enviar el header:

```
Authorization: Bearer <mismo CRON_SECRET>
```

Rutas cron del proyecto:

| Ruta | Uso |
|------|-----|
| `/api/cron/sync-results` | Sincronizar resultados semana |
| `/api/cron/sync-live` | Sync pendientes en vivo |
| `/api/cron/roulette-rewards` | Reparto premios ruleta |
| `/api/cron/roulette-daily-close` | Cierre diario ruleta |

### Desarrollo local

Sin `CRON_SECRET`, los cron **permiten** acceso en dev (NODE_ENV≠production hosted).  
Para probar auth local:

```bash
# .env.local
CRON_SECRET=dev-secret-local
curl -H "Authorization: Bearer dev-secret-local" http://localhost:3000/api/cron/sync-live
```

## Otras variables críticas

| Variable | Entorno | Descripción |
|----------|---------|-------------|
| `AUTH_SECRET` | All | Firma JWT sesión |
| `DATABASE_URL` | All | PostgreSQL Prisma |
| `NEXT_PUBLIC_APP_URL` | All | URL pública (metadata, links) |
| `CRON_SECRET` | Production | Auth cron (obligatorio) |
