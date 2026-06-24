# Autenticación — arquitectura de dos capas

La Dicha protege rutas con **middleware** (Edge) y **layouts** (Server Components). Ambas capas leen la misma cookie `la_dicha_session` (JWT firmado con `AUTH_SECRET`).

## Qué protege el middleware

Archivo: `src/middleware.ts`

| Ruta | Comportamiento |
|------|----------------|
| `/jugar`, `/ruleta`, `/tickets`, `/resultados` | Requiere sesión. Sin cookie → `/login`. Con rol distinto de `JUGADOR` → redirige al portal correcto (cajero/admin). Cookie inválida → borra cookie y redirige a login. |
| `/admin/*` (excepto `/admin/login`) | Requiere `role === ADMIN`. Si no → `/admin/login`. |
| `/cajero/*` (excepto `/cajero/login`) | Requiere `role === CAJERO`. Si no → `/cajero/login`. |
| `/login`, `/admin/login`, `/cajero/login` | Si ya hay sesión del rol correcto → redirige al panel correspondiente. |

El middleware **solo valida el JWT** (`userId`, `role`). No consulta la base de datos ni comprueba si el usuario sigue activo.

## Qué protegen los layouts

| Layout | Función | Si falla |
|--------|---------|----------|
| `src/app/(player)/layout.tsx` | `requirePlayer()` — sesión + usuario en BD con `role === JUGADOR` y `active: true` | Redirige a `/login` o logout si hay sesión inválida |
| `src/app/admin/(panel)/layout.tsx` | `requireAdmin()` — sesión + `ADMIN` activo en BD | `/admin/login` |
| `src/app/cajero/(panel)/layout.tsx` | `requireCajero()` — sesión + `CAJERO` activo en BD | `/cajero/login` |

Los helpers viven en `src/lib/auth.ts` y hacen la verificación completa contra Prisma.

## Por qué existen ambas capas

1. **Middleware (rápido, en el borde):** Evita que usuarios sin sesión o con rol incorrecto lleguen siquiera al render del servidor. Redirige antes de ejecutar layouts y páginas pesadas.
2. **Layouts (autoritativo, con BD):** Confirma que el usuario existe, está activo y su rol coincide con lo que dice el JWT. Cubre casos que el middleware no puede ver: usuario desactivado, rol cambiado en BD, token válido pero obsoleto.

En la práctica: el middleware es el **portero**; el layout es el **control de acceso con registro actualizado**.

## Riesgo si una capa cambia y la otra no

| Escenario | Consecuencia |
|-----------|--------------|
| Se añade ruta protegida solo en layout, no en `middleware.matcher` | La ruta podría ser accesible sin redirección temprana; el layout aún bloquea, pero hay ventana de comportamiento inconsistente y posible fuga de metadatos/HTML parcial. |
| Se cambia el matcher del middleware sin actualizar layouts | Redirecciones incorrectas o rutas que el middleware deja pasar pero el layout rechaza (doble redirect, UX confusa). |
| Se cambia la lógica de rol en `auth.ts` sin el middleware | Usuario con JWT de rol viejo podría pasar el middleware hasta que el layout lo rechace. |
| Se endurece solo el middleware (p. ej. exigir BD en Edge) | No es viable sin duplicar Prisma en Edge; por eso la BD queda en layouts. |

**Regla práctica:** cualquier ruta nueva de jugador, cajero o admin debe actualizarse en **dos sitios**: `middleware.ts` (`matcher` + reglas de rol) y el layout del portal correspondiente.

## Recomendación

**Mantener ambas capas** con responsabilidades claras:

- Middleware: rutas cubiertas, rol del JWT, redirecciones entre portales.
- Layouts: verdad en BD (`active`, rol real).

Para reducir deriva a futuro:

1. Documentar en un solo checklist (este archivo) las rutas protegidas.
2. Extraer constantes compartidas de rutas por portal (`PLAYER_ROUTES`, `ADMIN_PREFIX`, etc.) usadas por middleware y tests.
3. Añadir tests de integración que verifiquen: sin cookie, cookie de otro rol, usuario desactivado.
4. **No** unificar todo en middleware sin acceso a BD; **no** eliminar middleware y confiar solo en layouts (peor rendimiento y peor UX en redirects).

Unificación segura a medio plazo: un módulo `src/lib/auth-routes.ts` con la matriz ruta → rol requerido, consumido por middleware y documentación; los layouts siguen usando `requirePlayer/Admin/Cajero`.
