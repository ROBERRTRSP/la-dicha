# CSS migración — Fase 1

Extraído de `src/app/globals.css` (~1.510 líneas) sin cambiar selectores.

| Archivo | Contenido | Líneas originales |
|---------|-----------|-------------------|
| `src/styles/player-shell.css` | `.player-shell`, `.bottom-nav`, tickets, resultados | 31–654 |
| `src/styles/staff-login.css` | Login jugador/admin/cajero, banners visuales | 1598–1765 |
| `src/styles/roulette-screen.css` | Pantalla ruleta completa (layout, apuestas, historial) | 2273–2988 |

**Nota:** `roulette-premium.css` sigue aportando acabado Vegas encima de `roulette-screen.css`.

**Pendiente fase 2:** bloques admin (~1.000 líneas) y cajero (~2.500 líneas) aún en globals.css.

Importación en `src/app/layout.tsx` (después de globals.css, antes de casino.css).
