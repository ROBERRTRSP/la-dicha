# Scripts legacy

## `generate-logos.mjs`

**Estado:** legacy — no forma parte del flujo de build ni de despliegue.

Genera SVG locales en `public/logos/` con colores inventados por lotería. Fue útil en etapas tempranas del proyecto antes de tener logos oficiales.

**Flujo actual:** `scripts/fetch-logos.mjs` (invocado por `npm run logos:fetch` y `vercel-build`) descarga los logos reales desde el CDN de loteriasdominicanas.com.

Solo ejecutar `generate-logos.mjs` si necesitas placeholders offline sin red; de lo contrario usar `fetch-logos.mjs`.
