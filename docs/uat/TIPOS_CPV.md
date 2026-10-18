# UAT — Tipos de obra por CPV (scripts/tipo-obra.mjs)

**Qué cambia.** El chip de categoría de las obras nacionales ya no sale solo de
las palabras del título: si la licitación trae un **CPV principal específico**
(código oficial de la familia 45, obras), el CPV decide. Si el código es
genérico, desconocido o no existe, se usa la heurística por título de siempre
(sin retocar) y, en última instancia, «urbanismo».

**Qué NO cambia.** Las 7 categorías del mazo (seguridad, medio ambiente,
deporte, educacion, patrimonio, parques, urbanismo), el piloto de Teulada y el
resto de la app. El CPV solo mejora el filtro de los chips; lo que manda sigue
siendo el objeto de la licitación.

## Procedencia del mapeo

Las equivalencias CPV → categoría están verificadas contra el vocabulario
principal del **Reglamento CPV, Anexo I** (DO L 74 de 15.3.2008, versión
vigente), en su PDF oficial español de la Junta Consultiva de Contratación
Pública del Ministerio de Hacienda:

- https://www.hacienda.gob.es/dgpatrimonio/junta%20consultiva/reglamento%20cpv/cpv%20principal.pdf

Cada regla del módulo lleva en comentario el enunciado oficial del código. Solo
hay reglas para la división 45 (trabajos de construcción); los CPV de otras
divisiones (suministros, servicios) caen a la heurística por título.

## Cómo decide el módulo (scripts/tipo-obra.mjs)

1. **Solo el CPV principal** (el primero del array de la licitación). Los
   secundarios se ignoran: un mismo contrato acumula varios y engañan.
2. **Gana el prefijo más largo** (lo específico primero). Así 451127
   (paisajismo → parques) no se come a 45112730 (paisajismo en carreteras →
   urbanismo), 45112714 (cementerios → urbanismo) ni a 4511272 (zonas
   deportivas → deporte).
3. **Genérico o desconocido → título.** 45000000 («trabajos de construcción»),
   45200000, 45230000 (mezcla agua con líneas eléctricas y de comunicación),
   45259000 (mantenimiento de instalaciones)… no deciden: caen a la heurística
   heredada (misma de siempre, sin retocar) y de ahí a «urbanismo».
4. Acepta el código con o sin dígito de control (`45112730` y `45112730-1`).

## Efecto esperado sobre la carga nacional

Simulación con el mismo filtro que `generar-nacional.mjs` sobre la pasada local
de valio-datos (80.403 obras en esta pasada; la cifra exacta puede bailar con
la pasada del día):

| Categoría | Antes (solo título) | Después (CPV + título) |
|---|---|---|
| seguridad | 2.327 | 2.049 |
| medio ambiente | 8.345 | 8.951 |
| deporte | 8.341 | 8.499 |
| educacion | 5.410 | 5.187 |
| patrimonio | 2.834 | 2.982 |
| parques | 3.518 | 3.383 |
| urbanismo | 49.628 | 49.352 |

Unas 23.700 obras pasan a clasificarse por CPV. Los grandes movimientos son
ganancias de precisión: +1.095 urbanismo → medio ambiente (tuberías de agua y
saneamiento con títulos crípticos), +462 urbanismo → patrimonio (casas de
cultura, yacimientos), +415 urbanismo → deporte, +356 urbanismo → parques,
+138 urbanismo → seguridad. En la otra dirección, el CPV corrige falsos amigos
del título: «apellido Castillo» que no es monumento, «camino de La Ermita» que
es un camino, «puerto deportivo» que no es instalación deportiva.

## Tests automáticos

`node --test scripts/tests/tipo-obra.test.mjs` (19 tests): heurística heredada
intacta, CPV específico contra título contradictorio, dígito de control, CPV
desconocido/genérico/ausente, secundarios ignorados, familias 451127 y 4523
repartidas, falsos amigos y conservación con fallback.

## UAT manual (10 min)

Requiere regenerar los datos con `node scripts/generar-nacional.mjs` (paso de
integración, no incluido en este cambio) y arrancar la app.

| # | Escenario | Cómo probarlo | Qué esperar |
|---|---|---|---|
| 1 | Obra con CPV deportivo y título neutro | Municipio con obra «Obras de acondicionamiento» y CPV 45212200 | Chip «deporte» |
| 2 | Paisajismo en carretera (45112730) | Buscar obra de ajardinamiento de carretera o rotonda | Chip «urbanismo», no «parques» |
| 3 | Cementerio (45112714 / 45215400) | Obra de cementerio municipal | Chip «urbanismo» |
| 4 | Biblioteca (45212330) | Obra de biblioteca | Chip «educacion» |
| 5 | Museo / casa de cultura (45212313 / 45212300) | Obra de casa de cultura | Chip «patrimonio» |
| 6 | Depuradora / alcantarillado (45232400) | Obra de saneamiento con título críptico | Chip «medio ambiente» |
| 7 | Obra sin CPV | Cualquier obra de la vieja carga sin cpv | Mismo chip que antes (heurística) |
| 8 | CPV genérico 45000000 | Obra con ese CPV | Chip por título, igual que antes |
| 9 | Puerto deportivo (45242200) | «Ampliación del puerto deportivo» | Chip «urbanismo» (no «deporte») |
| 10 | Piloto Teulada | Entrar en Teulada | Mazo del piloto intacto, sin cambios |

## Límites conocidos (documentados, aceptados)

- **Pavimentos de instalaciones deportivas**: «remodelación de pistas de tenis»
  con CPV 45233251 (repavimentación) sale «urbanismo»: el CPV oficial elegido
  por el órgano es vial. El chip es una ayuda de filtro, no un dato oficial.
- **Heurística heredada sin tocar**: «calle Biblioteca» sin CPV sigue saliendo
  «educacion» (comportamiento anterior, fuera del alcance de este cambio).
- Solo se mapea la división 45: unas decenas de obras con CPV de otras
  divisiones (suministros, servicios) van por título.
- La cobertura CPV no es completa por diseño: códigos genéricos y raros caen al
  título, que mantiene el «urbanismo» masivo como red de seguridad.
