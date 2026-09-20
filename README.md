# ¿VALIÓ? · web app

**Lo que costó. Lo que consiguió. Tú decides.**

Aplicación web (PWA) de tarjetas con gestos para valorar obras y gasto público.
Esta es la **demo interactiva** del PRD (fase P1): mecánica completa, datos de
ejemplo marcados como DEMO. Los datos reales verificados llegan del gate P0 en
el repo `valio-datos`.

## Cómo probarla

```bash
npm install
npm run dev
```

Abre `http://localhost:3000` (mejor en el móvil o con la vista de dispositivo
del navegador: es mobile-first).

- Desliza: → valió · ← no valió · ↑ pido explicaciones · ↓ no puedo valorarlo.
- Alternativa accesible: los 4 botones grandes o las flechas del teclado.
- `Enter` abre la ficha de la tarjeta superior.
- Tus votos se guardan solo en tu dispositivo (localStorage).

## Qué hay dentro

| Ruta | Qué |
|---|---|
| `app/` | App Router de Next.js (una pantalla, pestañas inferiores) |
| `components/` | Mazo con gestos (Framer Motion), ficha en 3 capas, match ciudadano, borrador HITL, paneles |
| `lib/obras.ts` | 8 tarjetas DEMO + tipos de voto (4 gestos del PRD §4.1) |
| `lib/store.tsx` | Votos + tutorial en localStorage |
| `public/` | Manifest PWA e iconos SVG |
| `docs/DESIGN_DNA.md` | Qué patrones de Tinder iOS adoptamos y cómo los tradujimos |

## Líneas rojas

- Nada de datos reales sin verificar: las tarjetas dicen DEMO y su fuente es
  "pendiente de verificación P0".
- "Pedir explicaciones" genera un borrador que revisa y envía una persona
  (HITL). La app nunca envía nada.
- Sin cuentas ni rastreo: votos anónimos en tu dispositivo.
- Valio juzga obras y datos, nunca nombres propios.

## Stack

Next.js 15 · React 18 · TypeScript · Framer Motion · CSS propio (sin Tailwind).
Instalable como PWA (manifest + iconos; service worker de shell previsto).
