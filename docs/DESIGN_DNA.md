# ADN de diseño — ¿VALIÓ? web app

Fuentes de evidencia (no se copia identidad visual, solo patrones de interacción):

- 399 capturas de Tinder iOS (marzo 2026) en `/Users/kenyi/Downloads/Tinder ios Mar 2026`, revisadas en hojas de contacto: `SEASI-ALIANZA/docs/research/tinder-ios-mar-2026/`.
- Mobbin (MCP global `mobbin`), consultado 2026-09-20: deck principal `3bf4353d…`, LIKE `10bedf16…`, PASS `c413807e…`, match `e79cb64e…`, ficha `ecfc6a9c…`/`91cf59da…`, tutorial de gestos `5d51441e…`.

## Patrones observados en Tinder que adoptamos (traducidos)

| Patrón Tinder | Traducción ¿VALIÓ? |
|---|---|
| Tarjeta a sangre completa con degradado inferior y datos superpuestos | Tarjeta de datos: arriba la obra (tipo, municipio, año, titular); abajo la cifra protagonista y la etiqueta de evidencia (desde #39) |
| Sellos LIKE/NOPE gigantes al arrastrar, con rotación proporcional | Sellos VALIÓ / NO VALIÓ / EXPLICA / ¿? con rotación y opacidad proporcional al gesto |
| Acciones circulares grandes al alcance del pulgar | 4 acciones con iconos Lucide: valió, no valió, pido explicaciones, no puedo valorarlo (mismas que gestos) |
| Barra inferior con icono+etiqueta y estado activo destacado | Navegación inferior de 4 pestañas: Votar · Cabreo · Resultados · Info |
| Onboarding progresivo y omitible + tutorial contextual de gestos | Overlay de tutorial de 4 gestos en primera visita, omitible |
| Match con celebración expresiva (fondo saturado, formas concéntricas) | Pantalla "Match ciudadano" con anillos concéntricos y checklist de los 5 requisitos del PRD |
| Ficha dividida en tarjetas apiladas (intención, bio, datos) | Ficha en listas resumen (clave → valor): la obra → lo que dicen los documentos → coste por vecino → evidencia → lo que dicen los vecinos, con fondo arena propio por ser dato alegado (desde #39) |
| Enseñar el gesto antes de dejar votar | Tutorial + botones/teclado siempre visibles (accesibilidad) |

## Decisiones propias (anti-copia)

- Nada de logotipos, gradientes de marca Tinder ni textos de Tinder.
- Sin fotos inventadas. Desde el #39 no hay arte generativo: la tarjeta solo lleva datos (ver abajo).
- Datos de demostración marcados como `DEMO` en la propia tarjeta; ninguna cifra se presenta como real (regla 7 del AGENTS de valio-datos: no inventar).

## Requisitos duros del PRD que manda

- 4 gestos + alternativa accesible por botones/teclado (PRD §4.1, RF Tarjetas).
- Ficha a 1 toque con procedencia mínima: fuente, fecha, estado (PRD §7.2–7.3).
- Match ciudadano = estado colectivo con 5 requisitos simultáneos, no afinidad de personas (PRD §4.4).
- "Pedir explicaciones": la app redacta el borrador, la persona revisa y envía (HITL). Jamás envío automático.
- Mobile-first; si no va en un móvil de gama baja, no vale (PRD §7.1).

## Giro del #39: el contenido manda (2026-10-14)

El primer diseño parecía «generado por IA»: la decoración ocupaba el sitio de los
datos. Referencias: Civio («¿Dónde van mis impuestos?»), Datadista, FixMyStreet y
GOV.UK Design System. Decisiones:

- **Fondo liso** (`#F4F5F6`) y tarjetas blancas con filete fino. Sin sombras duras.
- **Un solo acento**: azul institucional `#1D70B8` (enlaces, foco, pestaña activa,
  botón principal). El verde, el rojo y el ámbar solo significan el voto.
- **Tipografía**: Source Serif 4 para titulares; Public Sans con cifras tabulares
  para los datos.
- **Iconos reales** (Lucide), ningún emoji.
- **Una sola etiqueta de estado**: el nivel de evidencia (patrón *tag* de GOV.UK).
- **Hueco reservado**: el espacio entre el titular y la cifra se deja libre a
  propósito. Ahí irá la foto de la obra o la ortofoto PNOA del IGN (con
  atribución) cuando los datos traigan ubicación. No rellenarlo con decoración.
- Contrastes AA medidos (texto sobre blanco): tinta 19,6:1, texto secundario
  7,1:1, acento 5,2:1, etiqueta «No verificado» 7,8:1.

Alcance: solo tarjeta, ficha, botones de voto y barra inferior. Extenderlo al
resto de pantallas (match, borrador, resultados, cabreo, info) espera el OK de
Kenyi.

## Diseño vigente: la gramática de Luma iOS (2026-10-17)

Sustituye el aspecto del #39 (fondo claro, Source Serif y Public Sans). Kenyi lo
aprobó y pidió una sola versión: no hay interruptor ni diseño anterior en el
código. Se conserva lo que el #39 fijó sobre el contenido: datos reales, una
sola etiqueta de evidencia, iconos Lucide y el verde, el rojo y el ámbar solo
para el voto.

Referencias en Mobbin, consultadas el 2026-10-17 (iOS). Se miraron las
imágenes; no se copia código, logo, texto ni activos de Luma.

| Pantalla Luma | Mobbin | Qué se toma |
|---|---|---|
| Evento con póster grande | https://mobbin.com/screens/fc225571-3761-4e53-96d8-ae3ad2d5ecd0 | Póster redondeado, título grande, fila de tiles, fondo teñido por el póster |
| Evento con aviso verde arriba | https://mobbin.com/screens/ef222d28-3226-4437-b7d3-66bac22fa061 | Aviso en píldora arriba, del color del estado |
| Hoja con deslizar para confirmar | https://mobbin.com/screens/db78c794-320c-4882-b6e4-e07c9492773f | Hoja con icono, título y control deslizante (aquí copia el borrador, no envía) |
| Hoja de condiciones | https://mobbin.com/screens/efa77a29-7e68-4848-bf7f-8fd245f35fd5 | Icono en baldosa, título, texto y botón píldora a todo el ancho |
| Menú contextual | https://mobbin.com/screens/ef73f813-15ff-482a-b856-0c324bb96b65 | Menú oscuro anclado a un botón redondo (orden y filtro) |
| Bienvenida con pósters en abanico | https://mobbin.com/screens/fcb58dd5-1680-40d8-bbb1-aa116e22aae8 | Tres obras reales en abanico sobre la elección de municipio |
| Lista por fechas | https://mobbin.com/screens/f959fe82-8c3e-4bc0-9ad1-6a289eac3845 | Pestaña Obras con «Por votar / Votadas» y grupos por año |
| Ciudades | https://mobbin.com/screens/f2bb3188-3b87-4cb4-abb1-4ec8048eebc6 | Fila de municipio con icono redondo y recuento |
| Barra de pestañas en píldora | https://mobbin.com/screens/fd7a7128-2c46-4574-9d0f-dbd8213ef7c2 | Píldora flotante con segmento activo |

Reglas que no se rompen (detalle y contrastes medidos en `app/luma.css`):

- El póster es la cifra; si la obra tiene vista aérea, la foto PNOA con su
  licencia y su veredicto. Nada de decoración ni foto inventada.
- El tono de cada tipo de obra tiñe la pantalla (índigo, azul, violeta,
  ciruela, pizarra, petróleo). La evidencia va en lavanda.
- Cuatro acciones del mismo peso, con icono y texto.
- Nada que se arrastre lleva `backdrop-filter`; solo se animan `transform` y
  `opacity`. El cristal queda en la barra de pestañas.
- Tipografía: Bricolage Grotesque para cifras y titulares, Hanken Grotesk para
  la interfaz.
