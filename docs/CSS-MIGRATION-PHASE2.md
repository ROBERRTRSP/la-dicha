# CSS migración — Fase 2

Extraído de `globals.css` (admin + cajero + staff).

| Archivo | Líneas | Contenido |
|---------|--------|-----------|
| `admin-panel.css` | 1.265 | `.admin-*`, modales, ruleta admin, modo riesgo |
| `staff-layout.css` | 1.084 | `.staff-shell`, nav lateral, tema claro |
| `cajero-panel.css` | 2.689 | Venta POS, Vanquero, monitor, impresión |

**`globals.css` restante:** ~1.589 líneas (base, jugar, recibos, estados de ruta).

**Fase 1** (previa): `player-shell.css`, `staff-login.css`, `roulette-screen.css`.

Importación en `layout.tsx` después de `roulette-screen.css`.
