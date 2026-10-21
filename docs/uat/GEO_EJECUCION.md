> **Gate de publicación (2026-10-18):** PLACE repite a veces la dirección del
> ayuntamiento en el lugar de ejecución. No se publica por coincidencia de
> municipio y calle. La ejecución queda en cuarentena salvo contraste por obra
> en `datos-geo/ejecuciones-contrastadas.json`, con mismo id, objeto y dirección.
> La compacta marca sólo esos casos con `ejecucionContrastada: true`.
> Metadata no contrastada tampoco invalida un título con un CityName administrativo.

# UAT — Ubicaciones por lugar de ejecución del anuncio (feat/geo-ejecucion)

**Qué es esto.** Hasta ahora una obra nacional solo se situaba si su *título*
nombraba un sitio («reforma de la calle Ceres»). Ahora también puede situarse
por el **lugar de ejecución contrastado con otras fuentes oficiales**, además de lo declarado en PLACE
(`lugarEjecucion: { direccion, municipio, pais }`, opcional, una sola
ubicación por obra, del mismo snapshot). Es un fallback: el título sigue
mandando, y si ambos dan puntos a más de 300 m, conflicto → la obra **no se
sitúa** (mejor no situar que situar mal).

**Quién hace qué.** El parser de `valio-datos` añade `lugarEjecucion` a las
obras. El snapshot v8 ya está reconstruido: 605 direcciones en las 93.722
obras de datos y 477 en las 80.358 nacionales de la app. Sólo una ejecución
está contrastada y publicada como punto; las 13.590 ubicaciones anteriores
se conservan (total nacional 13.591).

## Filtros conservadores (scripts/lugar-de-obra.mjs)

Una dirección de ejecución solo vale si:

| Filtro | Qué pasa si no |
|---|---|
| Contraste por obra, objeto y dirección en `ejecuciones-contrastadas.json`, con fuentes | Cuarentena: no se usa la ejecución |
| País España (vacío cuenta como España: PLACE publica contratos españoles y el extranjero viene explícito) | Sin opción de ejecución |
| Municipio del anuncio (CityName) equivalente al de la obra, invertido («Alqueries, les») o bilingüe («Alacant/Alicante») incluido | Sin opción |
| Una sola dirección (dos tipos de vía en el texto = múltiple) | Sin opción |
| Tipo de vía delante («Calle Mayor 12»); nada de «Rehabilitación en calle…» ni solo «C/» | Sin opción |
| Nombre no genérico (reglas de `lugar-del-titulo.mjs`; ojo: «Calle Principal» SÍ vale, es un nombre de vía) | Sin opción |
| Número pegado al nombre → portal («calle Mayor 12» → «calle Mayor, 12») | Se geocodifica el portal (punto de fachada) |

Nunca: centroide del municipio, dirección del órgano contratante ni código
postal solo. Al resolver se mantienen TODOS los filtros de CartoCiudad de
siempre: INE del municipio, mismo tipo de vía, mismo nombre, sin ambigüedad,
vía de más de 1 km fuera.

## Reglas de elección (elegirUbicacion)

1. Título resuelto → se usa el título (origen `titulo`).
2. Título sin resolver y anuncio contrastado resuelto → anuncio (origen `ejecucion`).
3. Ambos resueltos y a ≤ 300 m → título.
4. Ambos resueltos y a > 300 m → **conflicto: no se sitúa**.
5. Ninguno → no se sitúa (como hoy).

Las claves de caché de ejecución llevan versión de extractor + origen
(`VERSION_EXTRACTOR_EJECUCION`), así que las 13.590 entradas de título
siguen intactas y jamás se mezclan.

## UAT

Comandos exactos desde la raíz del repo.

| # | Qué hacer | Qué esperar |
|---|---|---|
| 1 | `node --test scripts/lugar-de-obra.test.mjs` | `# pass 29 · # fail 0` (país, municipio, dirección, portal, claves, fallback, conflicto) |
| 2 | `node scripts/geocodificar.mjs --sin-red` | Sin llamadas de red; 13.591 opciones situadas (1 de ejecución contrastada) con el snapshot de esta entrega. La fecha de generación puede cambiar; los resultados no |
| 3 | `npm run build` | Verde (tipos con `origen` en `UbicacionAproximada` vía plantilla y `lib/municipios.ts`) |
| 4 | `RECUENTO_MEMORIA=1 npm run dev` y abrir una obra situada por el título (p. ej. buscar «calle» en un municipio grande) | Ficha → «Desde el aire»: texto igual que antes («la calle que nombra el título»), foto del IGN, pastilla «Sin fecha comprobada», sin veredicto |
| 5 | Abrir Miranda de Ebro → Obras → «Acondicionamiento de local para Oficina de Atención al Ciudadano (SAC)» | La nota dice «la calle del lugar de ejecución que declara el anuncio» (o «el lugar de ejecución que declara el anuncio»); sigue «aproximada, sin revisar a mano» y sin veredicto |
| 6 | Abrir Torredonjimeno → Obras → restauración del alfarje del castillo | Sin ubicación precisa y sin foto de Constitución 1: el castillo está documentado en Canteras 2, no se acepta la dirección de la sede |
| 7 | `node scripts/generar-nacional.mjs ../valio-datos` | El resumen dice 13.591 situadas, 1 por ejecución; ese registro lleva 4º elemento `"ejecucion"` y `ejecucionContrastada: true` |

**Pendiente humano:** repetir los escenarios y autorizar integración/publicación.
La reconstrucción y regeneración automáticas de esta entrega ya están verificadas.

## Regeneración (orden de la tubería)

```bash
# 1. valio-datos: usar el snapshot y caché v8 reconstruidos
# 2. Compactas con lugarEjecucion (las lee el geocodificador):
node scripts/generar-nacional.mjs ../valio-datos
# 3. Geocodificar (resumible; sale con error si hubo fallos de red):
node scripts/geocodificar.mjs            # o --provincias 03 para probar
# 4. Volver a generar para incrustar los geo elegidos:
node scripts/generar-nacional.mjs ../valio-datos
# 5. Plantilla del piloto (origen en UbicacionAproximada):
node scripts/generar-obras.mjs
```

Si `geocodificar` acaba con `✗ N opciones sin resolver por fallos de red`,
nada válido se ha borrado: se relanza y reanuda donde estaba. No se publica
nada con la pasada a medias.

## Límites conocidos

- Las direcciones con abreviaturas de vía sin cubrir por los disparadores
  («CL Mayor 12») se rechazan: conservador a propósito.
- «Avenida Camino de Gandía 12» se rechaza: un segundo tipo de vía dentro
  del texto se trata como dirección múltiple.
- Una obra con título y anuncio resueltos a <300 m se atribuye al título.
- No se han añadido miles de puntos: el ensayo real sólo acreditó uno.
  El resto queda en cuarentena; una sede administrativa no es una obra.

## Revisión de integridad de la dirección

La ejecución debe representar una dirección completa. Se reutilizan los mismos
`CORTES` y `ABREVIATURAS` que el lector de títulos, pero un corte no consumido
rechaza la dirección, en vez de quedarse con el primer tramo. Tampoco se admiten
rangos de portales, sufijos no soportados (12B/bis), ni colas de piso o ciudad.
Los portales simples y nombres compuestos como Ramón y Cajal se conservan.
Todas las variantes de la ciudad del anuncio deben pertenecer al nombre oficial
del municipio: `Teulada/Benissa` no equivale a Teulada.

Prueba: `node --test scripts/lugar-de-obra.test.mjs` → 29 tests verdes.
La revisión independiente reprodujo y cerró ambos fallos antes de la pasada real.

El municipio INE de la obra corresponde al órgano, no siempre al lugar de
los trabajos. Si una ejecución contrastada declara otro municipio o un
país extranjero, se descarta también el punto del título, aunque haya una
calle homónima en el municipio del órgano. Sin metadatos de ejecución no se
infiere esa contradicción y se conserva la vía antigua por título. El parser omite la dirección extranjera o múltiple, pero publica
`excluirPuntoAutomatico: true` cuando esos metadatos impiden atribuir un punto
único al municipio. La compacta preserva el indicador y la ficha lo explica.
Suite del extractor: 29 tests.

## Contraste con los datos reales

Sobre 80.358 obras, 477 traen dirección publicable. El primer ensayo propuso
29 puntos de ejecución: 28 no deben autopublicarse (direcciones administrativas
sin relación acreditada con cada obra) y uno se ha contrastado documentalmente.
No son 28 falsedades demostradas una por una: parte son contradicciones directas
y parte falta de evidencia. Los 29 se revisaron antes de publicar.

| Grupo | Candidatas | Evidencia primaria de sede/contradicción |
|---|---:|---|
| Vera, C/ Mayor 1 | 7 | https://www.vera.es/index.php?page=avisolegal |
| Miranda de Ebro, Plaza España 8 | 10 | https://www.mirandadeebro.es/documentacion/servicio-de-atencion-ciudadana-sac/ |
| Villarrubia, Constitución 1 | 5 | https://www.villarrubiadelosojos.es/ |
| Lucena, Plaza Nueva 1 | 6 | https://lucena.es/ |
| Torredonjimeno, Constitución 1 | 1 | https://www.tosiria.com/ayuntamiento/ y castillo en https://www.tosiria.com/castillo/ (Canteras 2) |

Excepción SAC de Miranda: noticia de la misma reforma del local existente e
importe https://www.mirandadeebro.es/comienzan-las-obras-de-acondicionamiento-del-sac/
y ficha del servicio en Plaza España 8. No es una comprobación física del punto.
Si cambia objeto o dirección, el contraste deja de valer automáticamente.
No se autoriza todo el ayuntamiento por validar una de sus obras.

Regresiones: `node --test scripts/lugar-de-obra.test.mjs` (29 tests): La Charca,
castillo y estadio sin contraste no generan ejecución; el contraste no vale para
otra obra, objeto o dirección. `lib/municipios.ts` tampoco admite un geo de
origen ejecución sin la marca, aunque sobreviva una caché anterior.
