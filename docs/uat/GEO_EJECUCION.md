# UAT — Ubicaciones por lugar de ejecución del anuncio (feat/geo-ejecucion)

**Qué es esto.** Hasta ahora una obra nacional solo se situaba si su *título*
nombraba un sitio («reforma de la calle Ceres»). Ahora también puede situarse
por el **lugar de ejecución que declara el anuncio** de PLACE
(`lugarEjecucion: { direccion, municipio, pais }`, opcional, una sola
ubicación por obra, del mismo snapshot). Es un fallback: el título sigue
mandando, y si ambos dan puntos a más de 300 m, conflicto → la obra **no se
sitúa** (mejor no situar que situar mal).

**Quién hace qué.** El parser de `valio-datos` añade `lugarEjecucion` a las
obras (otro encargo). Este repo extrae, geocodifica e integra. Mientras el
parser no publique un snapshot con `lugarEjecucion`, las compactas no lo
llevan y todo funciona exactamente como antes (verificado: misma huella de
caché, mismas 13.590 obras situadas).

## Filtros conservadores (scripts/lugar-de-obra.mjs)

Una dirección de ejecución solo vale si:

| Filtro | Qué pasa si no |
|---|---|
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
2. Título sin resolver y anuncio resuelto → anuncio (origen `ejecucion`).
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
| 1 | `node --test scripts/lugar-de-obra.test.mjs` | `# pass 20 · # fail 0` (país, municipio, dirección, portal, claves, fallback, conflicto) |
| 2 | `node scripts/geocodificar.mjs --sin-red` | Mismo nº de situadas y **misma huella** que el `datos-geo/geocodificado.json` commitado (13.590, huella `568ece16836a` con los datos actuales). Opciones de ejecución: 0 (el snapshot aún no trae `lugarEjecucion`) |
| 3 | `npm run build` | Verde (tipos con `origen` en `UbicacionAproximada` vía plantilla y `lib/municipios.ts`) |
| 4 | `npm run dev` y abrir una obra situada por el título (p. ej. buscar «calle» en un municipio grande) | Ficha → «Desde el aire»: texto igual que antes («la calle que nombra el título»), foto del IGN, pastilla «Sin fecha comprobada», sin veredicto |
| 5 | Con un snapshot de valio-datos que ya traiga `lugarEjecucion`: regenerar (ver abajo) y abrir una obra situada por el anuncio | La nota dice «la calle del lugar de ejecución que declara el anuncio» (o «el lugar de ejecución que declara el anuncio»); sigue «aproximada, sin revisar a mano» y sin veredicto |
| 6 | En el mismo caso, buscar una obra cuyo título y anuncio dieran puntos lejanos | La obra NO aparece situada (motivo municipio): correcto, conflicto |
| 7 | `node scripts/generar-nacional.mjs` (solo con datos nuevos) | El resumen dice `N situadas (título o anuncio; M por lugar de ejecución)`; los `geo` con anuncio llevan 4º elemento `"ejecucion"` |

**PENDIENTE hasta integrar:** los pasos 5-7 necesitan el snapshot de
`valio-datos` con `lugarEjecucion` (parser en otro encargo) y la regeneración
de `public/datos` que hace el integrador principal. No regenerar desde esta
rama de feature.

## Regeneración (orden de la tubería)

```bash
# 1. valio-datos: parser + snapshot (otro encargo; no tocar desde aquí)
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
- Esto no sitúa «miles de obras» nuevas por sí solo: hace falta la pasada de
  red cuando el snapshot traiga `lugarEjecucion` (no ejecutada en esta rama).

## Revisión de integridad de la dirección

La ejecución debe representar una dirección completa. Se reutilizan los mismos
`CORTES` y `ABREVIATURAS` que el lector de títulos, pero un corte no consumido
rechaza la dirección, en vez de quedarse con el primer tramo. Tampoco se admiten
rangos de portales, sufijos no soportados (12B/bis), ni colas de piso o ciudad.
Los portales simples y nombres compuestos como Ramón y Cajal se conservan.
Todas las variantes de la ciudad del anuncio deben pertenecer al nombre oficial
del municipio: `Teulada/Benissa` no equivale a Teulada.

Prueba: `node --test scripts/lugar-de-obra.test.mjs` → 24 tests verdes.
La revisión independiente reprodujo y cerró ambos fallos antes de la pasada real.

El municipio INE de la obra corresponde al órgano, no siempre al lugar de
los trabajos. Si el campo de ejecución presente declara otro municipio o un
país extranjero, se descarta también el punto del título, aunque haya una
calle homónima en el municipio del órgano. Sin metadatos de ejecución no se
infiere esa contradicción y se conserva la vía antigua por título. El parser omite la dirección extranjera o múltiple, pero publica
`excluirPuntoAutomatico: true` cuando esos metadatos impiden atribuir un punto
único al municipio. La compacta preserva el indicador y la ficha lo explica.
Suite del extractor: 26 tests.
