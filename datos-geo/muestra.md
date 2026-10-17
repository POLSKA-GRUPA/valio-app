# Muestra de control — geocodificación por título (CartoCiudad)

Pasada de prueba con `node scripts/geocodificar.mjs --provincias 28,03` (Madrid y
Alicante), reglas `VERSION_REGLAS = 2`, 18/10/2026.

## Cobertura en la prueba

| | Obras |
|---|---|
| Obras de las dos provincias | 9.247 |
| Con un lugar reconocible en el título | 3.777 (40,8 %) |
| Situadas | **2.377** (62,9 % de las que tienen lugar; **25,7 %** del total) |
| — en calle (portal exacto o vía) | 1.353 |
| — en lugar (colegio, parque, cementerio, polígono…) | 1.024 |
| Sin resultado: CartoCiudad no devuelve nada | 769 |
| Sin resultado: ningún candidato del mismo tipo y nombre | 313 |
| Sin resultado: vía de más de 1 km sin número de portal | 267 |
| Sin resultado: ambiguo (dos sitios lejanos con ese nombre) | 51 |

## Muestra al azar (25, semilla 424242)

Criterio de acierto: el punto es la calle/portal o el sitio con nombre que dice
el título, en el municipio de la obra, y es plausible que la obra esté ahí.
Cuando el título da un número, se comprueba que el portal es ese número.

| # | Municipio | Título (resumido) | Consulta | CartoCiudad devuelve | Veredicto |
|---|---|---|---|---|---|
| 1 | Madrid | Reparación del C.E.I.P. Calderón de la Barca | ceip calderon barca | topónimo «CEIP Calderón de la Barca, Madrid» | ✔ |
| 2 | Elda | Remodelación de la calle Independencia | calle independencia | CALLE INDEPENDENCIA, Elda (185 m) | ✔ |
| 3 | Madrid | Urbanización en Calle Tulipero entre Cidro y Aguacate | calle tulipero | CALLE TULIPERO, Madrid (573 m) | ✔ (la obra es un tramo de esa calle) |
| 4 | Sevilla la Nueva | Ampliación de la Calle Velázquez cruce con Caño | calle velazquez | CALLE VELAZQUEZ, Sevilla la Nueva (139 m) | ✔ |
| 5 | Madrid | Retirada de quiosco en calle Pinilla del Valle, 12 | calle pinilla valle | CALLE PINILLA DEL VALLE (255 m; portal 12 no hallado) | ✔ |
| 6 | Villalbilla | Embellecimiento de la Plaza Mayor | plaza mayor | PLAZA MAYOR, Villalbilla | ✔ |
| 7 | Madrid | Medidas de seguridad en Calle Doctor Esquerdo, 30 | calle doctor esquerdo 30 | portal CALLE DOCTOR ESQUERDO 30 | ✔ |
| 8 | Petrer | Reurbanización de la plaza de Baix | plaza baix | PLAÇA BAIX, Petrer | ✔ |
| 9 | Coslada | Pintura del CEIP Alfredo Landa y del CEIP Antoni Tàpies | ceip alfredo landa | topónimo «CEIP Alfredo Landa» | ✔ (el primero de dos colegios) |
| 10 | Torrevieja | Reurbanización del polígono Industrial Casa Grande | poligono industrial casa grande | topónimo «Polígono Industrial Casa Grande» | ✔ |
| 11 | Villalbilla | Bache en la calle Severo Ochoa 18 | calle severo ochoa 18 | portal CALLE SEVERO OCHOA 18 | ✔ |
| 12 | Madrid | Urbanización en la Avenida de Marconi, 14 | avenida marconi | AVENIDA MARCONI (406 m; portal 14 no hallado) | ✔ |
| 13 | Madrid | Seguridad en el CEIP Federico Rubio | ceip federico rubio | topónimo «CEIP Doctor Federico Rubio» | ✔ |
| 14 | San Isidro | Ampliación del cementerio municipal | cementerio | topónimo «Cementerio de San Isidro» | ✔ |
| 15 | Torres de la Alameda | Remodelación calle Cristo | calle cristo | CALLE CRISTO (269 m) | ✔ |
| 16 | Coslada | Hundimiento de calzada en Calle José Martí 29 | calle jose marti 29 | portal CALLE JOSE MARTI 29 | ✔ |
| 17 | Banyeres de Mariola | Reasfaltado Calle Laporta desde Avda. Constitución | calle laporta | CALLE LAPORTA (834 m) | ✔ (tramo de esa calle) |
| 18 | Muro de Alcoy | Mejora en CEIP Montcabrer | ceip montcabrer | topónimo «CEIP Montcabrer» | ✔ |
| 19 | Aranjuez | Caucho y parkour en el parque Pozo de las Nieves | parque pozo nieves | topónimo «Parque Pozo de las Nieves» | ✔ |
| 20 | Madrid | Escuela de Música en Calle Corregidor Diego de Valderrábano 66 | calle corregidor diego valderrabano 66 | portal … VALDERRABANO 66 | ✔ |
| 21 | El Escorial | Accesibilidad de la calle Juliana | calle juliana | CALLE JULIANA (823 m) | ✔ |
| 22 | Dénia | Caseta del CEIP Pou de la Muntanya | ceip pou muntanya | topónimo «CEIP Pou de la Muntanya» | ✔ |
| 23 | San Martín de la Vega | Demolición en calle La Fuente, 6 y 8 | calle fuente 6 | portal CALLE FUENTE 6 | ✔ |
| 24 | Madrid | Fotovoltaica en CEIP Luis Bello | ceip luis bello | topónimo «CEIP Luis Bello» | ✔ |
| 25 | Madrid | Planta en el Parque Tecnológico de Valdemingómez | parque tecnologico valdemingomez | topónimo «Parque Tecnológico de Valdemingómez» | ✔ |

**Resultado: 25/25 aciertos (100 %)** con el criterio de arriba.

## Revisión dirigida a los tipos con más riesgo (42 más, semillas 5/7/9)

Parque (6), cementerio (6), polígono (8), carretera (8), camino (8) y
polideportivo (6): 41/42 aciertos. El fallo:

- Benimassot — «Barandilla para el polideportivo (Zona Antiguo Cementerio)»
  se situaba en el cementerio actual. **Corregido**: un «cementerio» sin
  nombre solo vale si es lo primero que nombra el título y no va precedido
  de «zona / antiguo / camino del / calle del / junto al…».

## Ajustes hechos durante la prueba

1. «Obras de urbanización de…» (sustantivo) ya no se toma por una urbanización.
2. «Parque infantil», «camino de titularidad municipal»: sin mayúscula inicial
   no es nombre propio (salvo títulos todo en mayúsculas).
3. Corte en «nº32», «núm.», «esq.», «tras», «distrito», saltos de línea.
4. «Ramón y Cajal», «Ortega y Gasset»: el corte por « y » no los parte.
5. Número de portal: si el título lo da, se pide el portal exacto; si no
   existe, se cae a la calle.
6. Calle sin portal de más de 1 km (antes 1,5 km): fuera, su punto no
   situaría la obra con honestidad.

## Límites conocidos

- «calle» = un punto de la vía (o el portal si el título da número), no el
  sitio exacto de la obra. Para calles de hasta 1 km, el error máximo es
  ~500 m.
- Títulos con varias calles: se toma la primera que se reconoce.
- Revisión hecha comparando título con la dirección/nombre que devuelve
  CartoCiudad; no se ha mirado ortofoto punto por punto.
