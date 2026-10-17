# Spec — Vista aérea de cada obra

Clasificación: **arquitectural**. Toca datos (valio-datos), el generador, la
tarjeta, la ficha y el despliegue. Decisión de Kenyi (2026-10-17): hacerlo
completo, con calidad antes que rapidez.

## Qué queremos

Que el vecino vea **dónde está la obra y cómo se ve desde el aire**. Si la foto
es posterior a la obra, la foto sirve para comprobar si se hizo o no.

## Lo que la app NO puede prometer

- **No hay vídeo en directo de un parque.** Las fotos aéreas oficiales (PNOA del
  IGN e ICV) tienen fecha de vuelo; la más reciente en Teulada es de 2024.
  Cada imagen lleva su fecha, y la app compara esa fecha con la de la obra.
  Si la foto es anterior, lo dice: «aún no sirve para comprobarla». Nunca
  sugiere que la obra no se hizo.
- **Algunas obras no se ven desde el aire** (acumuladores, vídeo vigilancia,
  baldosas bajo cubierta). Se marca y se explica.
- **Un punto mal puesto engaña.** Mejor «sin ubicación precisa» que un punto
  inventado.

## Datos (valio-datos)

`datos/ubicaciones.csv`, una fila por obra:

| Campo | Valores |
|---|---|
| `id` | `OBRA-XX` |
| `lat`, `lon` | WGS84, 6 decimales; vacío si no hay ubicación |
| `precision` | `punto` · `instalacion` · `zona` · `tramo` · `municipio` · `sin_ubicacion` |
| `radio_m` | radio aproximado del área afectada |
| `visible_aire` | `si` · `parcial` · `no`, con el porqué en `evidencia` |
| `fuente_tipo` | `pliego` · `plano` · `catastro` · `cartociudad` · `ortofoto` |
| `fuente_url` | documento que fija el lugar |
| `referencia_catastral` | si consta |
| `evidencia` | qué documento y página, y qué se ve en la ortofoto |
| `estado_ubicacion` | `propuesta` · `verificada` |
| `fecha_consulta` | AAAA-MM-DD |

Reglas:
- Quien propone una coordenada no la verifica. La verificación es visual,
  contra la ortofoto, y la hace un segundo revisor.
- OSM solo como pista; la coordenada final sale de una fuente oficial o de la
  ortofoto.

## Generador (valio-app)

`scripts/generar-obras.mjs` lee `ubicaciones.csv` y emite `obra.ubicacion`:
`{ lat, lon, precision, radioM, visibleAire, fuente, estado } | null`.

Falla (`fallar`) si encuentra:
- una precisión o un estado desconocidos;
- una coordenada sin fuente;
- una coordenada fuera de la caja del municipio;
- `lat`/`lon` con precisión `sin_ubicacion`.

## Imágenes

`scripts/hornear-vista-aerea.mjs` se ejecuta en local; nunca en el build de
Vercel. Para cada obra con ubicación:

1. **«Ahora»:** la ortofoto oficial más reciente del punto, con su fecha de
   vuelo leída del servicio (GetFeatureInfo).
2. **«Antes»:** el vuelo más reciente anterior a la adjudicación, con cobertura
   comprobada en el punto (no en blanco).

Salida:
- `public/aerea/OBRA-XX-{ahora,antes}.jpg`;
- `lib/aerea.ts` (generado), con fuente, capa, fecha de vuelo, caja y
  atribución de cada imagen.

Comparación honesta, calculada al hornear. El servicio solo da el **mes** del
vuelo, así que se trata como un intervalo y solo se afirma lo que vale para
cualquier día de ese mes:

| Caso | Texto (ficha) |
|---|---|
| el mes entero es posterior al fin previsto (adjudicación + plazo) | «Foto de …, posterior al plazo de la obra» |
| el mes entero cae dentro del plazo | «Foto de …, tomada durante el plazo de la obra» |
| el mes entero es anterior a la adjudicación | «Así estaba el sitio en …, antes de la obra. No consta foto oficial posterior (revisado el …)» |
| solapa con la adjudicación o el fin, o falta el plazo | «no se puede saber si es anterior o posterior a la obra» |

Aparte, si `visible_aire = no`: «Lo contratado no se distingue desde el aire».
La app nunca da la obra por hecha ni sugiere que no se hizo. El comparador
antes/después solo aparece si la foto actual no es anterior a la obra.

**«Tiempo real» honesto:** un job semanal (GitHub Actions) consulta al IGN la
fecha de vuelo de cada punto y al ICV si hay un año nuevo que cubra la zona. Si
hay novedad, vuelve a hornear las imágenes y abre un único PR (rama estable
`auto/vuelos-ign`) para revisión humana. El mapa interactivo usa teselas en vivo del
IGN, así que muestra el vuelo nuevo en cuanto existe.

## Interfaz

- **Tarjeta:** la ortofoto «ahora» ocupa el hueco reservado entre el título y la
  cifra (#39).
  - Anillo centrado con el radio de la obra.
  - Fecha y fuente en una pastilla.
  - Línea con el texto honesto.
  - `draggable={false}` y sin eventos de puntero en la imagen, para no romper
    el gesto de deslizar.
  - Se precarga la imagen de la siguiente tarjeta.
- **Ficha, sección «Desde el aire»:**
  - comparador antes/después con `input type=range`, accesible con teclado y
    con `aria-valuetext`;
  - fechas de cada vuelo y texto honesto;
  - enlaces a Street View, Catastro, el comparador PNOA del IGN, Google Maps y el satélite de Google (rotulado «sin fecha»: Google no publica la fecha de su foto, así que no entra en el veredicto)
    (URLs, sin claves);
  - botón «Explorar en el mapa», que carga un mapa interactivo (lazy,
    `ssr:false`) con teselas PNOA en vivo, el selector de año y el marcador.
- **Sin ubicación:** la tarjeta queda como hoy y la ficha dice «Sin ubicación
  precisa en los documentos públicos».
- **Atribución:** el texto exacto que exige la licencia de cada fuente, visible
  en la tarjeta (corto) y en la ficha (completo).

## Despliegue

- Flag `NEXT_PUBLIC_VISTA_AEREA=1`: activado en preview y apagado en producción
  hasta que Kenyi apruebe las capturas a 375 y 1440 px.
- Revisión de Codex (gpt-6.1-sol, high) en los dos repos.

## Aceptación humana (UAT)

| # | Escenario | Resultado esperado |
|---|---|---|
| A1 | Abrir la app en un móvil y mirar la primera tarjeta con ubicación | Se ve la foto aérea con el anillo sobre la obra, la fecha del vuelo y la fuente |
| A2 | Deslizar 5 tarjetas seguidas | El gesto funciona igual que antes; la foto siguiente ya está cargada |
| A3 | Abrir una obra adjudicada después del último vuelo | El texto dice que la foto es anterior a la obra |
| A4 | Abrir la ficha y mover el comparador con el dedo y con las flechas del teclado | Pasa de «antes» a «ahora»; el lector de pantalla anuncia el año |
| A5 | Pulsar «Explorar en el mapa» | Mapa con la foto del IGN, el marcador y el selector de año |
| A6 | Elegir 5 obras al azar y abrir su pliego o fuente | El lugar del pliego coincide con el punto de la foto |
| A7 | Obra sin ubicación | Ni foto ni anillo; explica que los documentos no la sitúan |
| A8 | Pulsar «Ver a pie de calle» | Street View abre en el sitio de la obra |
| A9 | Con el flag apagado | La app es idéntica a la de hoy |

Guion repetible: `docs/uat/GUION_VISTA_AEREA.md`. Pruebas automáticas: R20 a R26 en
`docs/uat/test_valio.py`.
