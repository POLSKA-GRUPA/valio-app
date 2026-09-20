# ADN de diseño — ¿VALIÓ? web app

Fuentes de evidencia (no se copia identidad visual, solo patrones de interacción):

- 399 capturas de Tinder iOS (marzo 2026) en `/Users/kenyi/Downloads/Tinder ios Mar 2026`, revisadas en hojas de contacto: `SEASI-ALIANZA/docs/research/tinder-ios-mar-2026/`.
- Mobbin (MCP global `mobbin`), consultado 2026-09-20: deck principal `3bf4353d…`, LIKE `10bedf16…`, PASS `c413807e…`, match `e79cb64e…`, ficha `ecfc6a9c…`/`91cf59da…`, tutorial de gestos `5d51441e…`.

## Patrones observados en Tinder que adoptamos (traducidos)

| Patrón Tinder | Traducción ¿VALIÓ? |
|---|---|
| Tarjeta a sangre completa con degradado inferior y datos superpuestos | Tarjeta papel con arte tipográfico de categoría, coste gigante y ficha mínima superpuesta |
| Sellos LIKE/NOPE gigantes al arrastrar, con rotación proporcional | Sellos VALIÓ / NO VALIÓ / EXPLICA / ¿? con rotación y opacidad proporcional al gesto |
| Acciones circulares grandes al alcance del pulgar | 4 acciones: ✓ valió, ✕ no valió, ↑ pido explicaciones, ↓ no puedo valorarlo (mismas que gestos) |
| Barra inferior con icono+etiqueta y estado activo destacado | Navegación inferior de 4 pestañas: Votar · Cabreo · Resultados · Info |
| Onboarding progresivo y omitible + tutorial contextual de gestos | Overlay de tutorial de 4 gestos en primera visita, omitible |
| Match con celebración expresiva (fondo saturado, formas concéntricas) | Pantalla "Match ciudadano" con anillos concéntricos y checklist de los 5 requisitos del PRD |
| Ficha dividida en tarjetas apiladas (intención, bio, datos) | Ficha en 3 capas: resumen → datos → evidencia y estado del dato |
| Enseñar el gesto antes de dejar votar | Tutorial + botones/teclado siempre visibles (accesibilidad) |

## Decisiones propias (anti-copia)

- Nada de logotipos, gradientes de marca Tinder ni textos de Tinder. Identidad propia: papel `#F4F0E6`, tinta `#102A43`, verde cívico, coral, ámbar y azul de estados.
- Tipografía: Archivo Black (cartel civic-protesta) + Public Sans (cuerpo institucional).
- Sin fotos inventadas: el arte de cada tarjeta es generativo (tramas, franjas, tipografía) según categoría.
- Datos de demostración marcados como `DEMO` en la propia tarjeta; ninguna cifra se presenta como real (regla 7 del AGENTS de valio-datos: no inventar).

## Requisitos duros del PRD que manda

- 4 gestos + alternativa accesible por botones/teclado (PRD §4.1, RF Tarjetas).
- Ficha a 1 toque con procedencia mínima: fuente, fecha, estado (PRD §7.2–7.3).
- Match ciudadano = estado colectivo con 5 requisitos simultáneos, no afinidad de personas (PRD §4.4).
- "Pedir explicaciones": la app redacta el borrador, la persona revisa y envía (HITL). Jamás envío automático.
- Mobile-first; si no va en un móvil de gama baja, no vale (PRD §7.1).
