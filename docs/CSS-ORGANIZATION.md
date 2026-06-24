# Organización de estilos — `globals.css`

**Estado actual:** un solo archivo `src/app/globals.css` (~6.200 líneas). **No dividir aún** sin confirmación; este documento describe la estructura interna y un plan seguro de modularización.

## Mapa interno (por secciones)

| Líneas aprox. | Módulo futuro | Contenido |
|---------------|---------------|-----------|
| 1–588 | `shared.css` | Tailwind import, `:root`, reset, tipografía, `.player-shell`, navegación inferior, componentes base reutilizables |
| 589–1228 | `player.css` | Pantalla Jugar (`.play-screen`), formularios jugador, wallet, tickets jugador |
| 1229–1493 | `player.css` (+ shared) | Gráficos IA, utilidades visuales del portal jugador |
| 1494–1846 | `receipt.css` | Recibo POS 80 mm estilo ELITE, impresión de ticket |
| 1847–2483 | `player.css` | Ruleta premium (SVG, animación, apuestas) |
| 2484–2946 | `admin.css` | Tablas, stats, formularios admin |
| 2947–3855 | `shared.css` + `admin.css` + `cajero.css` | `.staff-shell`, nav staff, tema claro unificado de paneles |
| 3856–5768 | `cajero.css` | Venta en mostrador, teclado POS, vanquero, carrito cajero |
| 5769–5864 | `print.css` | Impresión silenciosa cajero |
| 5865–fin | `cajero.css` | Monitor de tickets cajero |
| (nuevo) | `shared.css` | `.route-state` — loading/error de rutas |

Hay solapamiento intencional: variables en `:root` y clases `.staff-*` sirven a admin y cajero.

## Plan seguro para dividir (Fase futura)

### Fase A — Preparación (sin cambio visual)

1. Crear `src/styles/` con archivos vacíos o copias comentadas.
2. Añadir en `globals.css` solo `@import` en orden fijo:

```css
@import "tailwindcss";
@import "../styles/shared.css";
@import "../styles/player.css";
@import "../styles/cajero.css";
@import "../styles/admin.css";
@import "../styles/receipt.css";
@import "../styles/print.css";
```

3. Mover bloques **uno por uno**, verificando `npm run build` y smoke test visual tras cada bloque.

### Fase B — Orden de extracción (menor riesgo primero)

1. `print.css` — reglas `@media print` aisladas.
2. `receipt.css` — recibo autocontenido.
3. `admin.css` — panel admin sin dependencias de cajero POS.
4. `cajero.css` — vanquero y POS (el bloque más grande).
5. `player.css` — jugar + ruleta.
6. `shared.css` — lo que quede (variables, staff-shell, route-state).

### Fase C — Validación

- Comparar screenshots de: `/jugar`, `/cajero/vender`, `/admin/tickets`, vista de recibo impreso.
- Revisar que `@media print` y estilos de ticket no se carguen en rutas que no los necesitan (optimización opcional con imports por layout en Next.js 15).

### Riesgos a evitar

- Cambiar especificidad al reordenar imports.
- Partir selectores compuestos (`.staff-main .admin-table`) entre archivos sin mantener el orden de carga.
- Duplicar `:root` en varios archivos.

## Decisión actual

**Mantener monolito** hasta cerrar Fase 2 (auditoría de pantallas). La división se hará con checklist visual y aprobación explícita.
