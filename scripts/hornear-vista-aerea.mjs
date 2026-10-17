#!/usr/bin/env node
/**
 * hornear-vista-aerea.mjs — Descarga y guarda la foto aérea oficial de cada obra.
 *
 * Se ejecuta en local (nunca en el build de Vercel): las imágenes y su
 * manifiesto se versionan, así la app no depende de que el servicio del IGN
 * esté arriba y la tarjeta carga al instante.
 *
 * Para cada obra con ubicación precisa (lib/obras.ts, generado desde
 * valio-datos):
 *   1. «ahora»: la ortofoto oficial más reciente del punto, con la fecha de
 *      vuelo que da el propio servicio en ese punto.
 *   2. «antes»: el vuelo más reciente ANTERIOR a la adjudicación con cobertura
 *      real en el punto (se descartan las imágenes en blanco).
 *   3. Compara la fecha de vuelo con la de la obra y decide el texto honesto.
 *
 * Salida: public/aerea/OBRA-XX-{ahora,antes}.webp y lib/aerea.ts.
 *
 * Uso:
 *   node scripts/hornear-vista-aerea.mjs            # todas las obras
 *   node scripts/hornear-vista-aerea.mjs --comprobar # solo mira si hay vuelos nuevos (sale 3 si los hay)
 */

import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_IMG = resolve(RAIZ, "public/aerea");
const SALIDA = resolve(RAIZ, "lib/aerea.ts");
const SOLO_COMPROBAR = process.argv.includes("--comprobar");

// Píxeles de la imagen guardada (3:2, el doble del hueco de la tarjeta en un
// móvil de 375 px para que se vea nítida en pantallas retina).
const ANCHO = 720;
const ALTO = 480;
// Lado mínimo del encuadre en metros: por debajo, la obra se ve sin contexto.
const LADO_MIN_M = 180;

/**
 * Atribución exigida por la licencia (CC BY 4.0, scne.es e ICV). Las imágenes
 * guardadas son recortes, así que van precedidas de «Obra derivada de».
 */
const atribucionPnoa = (anyo) => `Obra derivada de PNOA ${anyo} CC-BY 4.0 scne.es`;
const atribucionIcv = (anyo) =>
  `Obra derivada de Ortofoto ${anyo} CC BY 4.0 © Institut Cartogràfic Valencià, Generalitat`;

/** Foto «ahora»: PNOA máxima actualidad, con fecha de vuelo en el punto. */
const ACTUAL = {
  fuente: "PNOA (IGN)",
  wms: "https://www.ign.es/wms-inspire/pnoa-ma",
  capa: "OI.OrthoimageCoverage",
  capaFecha: "OI.MosaicElement",
};

/**
 * Fotos «antes»: serie anual del ICV, que cubre toda la Comunitat (el IGN no
 * tiene 2022 ni 2023 en Alicante). El ICV publica la ventana del vuelo de toda
 * la Comunitat, no el día en el punto: solo se usa un año cuyo vuelo TERMINÓ
 * antes de la adjudicación. Fechas: metadatos spaicv0202_* del ICV.
 */
const HISTORICO_ICV = [
  ["2024CVAL0025", "2024-05-29", "2024-08-24"],
  ["2023CVAL0025", "2023-04-16", "2023-08-06"],
  ["2022CVAL0025", "2022-05-08", "2022-06-11"],
  ["2021CVAL0025", "2021-05-13", "2021-08-15"],
  ["2020CVAL0025", "2020-05-02", "2020-05-31"],
  ["2019CVAL0025", "2019-05-14", "2019-06-30"],
  ["2018CVAL0025", "2018-06-13", "2018-08-24"],
  ["2017CVAL0025", "2017-06-08", "2017-08-23"],
].map(([id, inicio, fin]) => ({
  anyo: id.slice(0, 4),
  wms: `https://terramapas.icv.gva.es/0202_${id}`,
  capa: `${id}_RGB`,
  inicio,
  fin,
}));

// --- utilidades -------------------------------------------------------------

function fallar(mensaje) {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

async function pedir(url, intentos = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    } catch (e) {
      if (i >= intentos) throw new Error(`${url}: ${e.message}`);
      await new Promise((ok) => setTimeout(ok, 1500 * i));
    }
  }
}

/** Encuadre con píxeles cuadrados en metros, centrado en la obra. */
function encuadre(lat, lon, radioM) {
  const ladoX = Math.max(LADO_MIN_M, radioM * 2 * 3);
  const ladoY = (ladoX * ALTO) / ANCHO;
  const mLat = 111_320;
  const mLon = 111_320 * Math.cos((lat * Math.PI) / 180);
  return {
    latMin: lat - ladoY / 2 / mLat,
    latMax: lat + ladoY / 2 / mLat,
    lonMin: lon - ladoX / 2 / mLon,
    lonMax: lon + ladoX / 2 / mLon,
    metrosAncho: Math.round(ladoX),
  };
}

const redondea = (n) => Math.round(n * 1e6) / 1e6;

/** WMS 1.3.0 con EPSG:4326: el eje va lat,lon. */
function bboxWms(c) {
  return [c.latMin, c.lonMin, c.latMax, c.lonMax].map(redondea).join(",");
}

function urlMapa(wms, capa, c) {
  const q = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    LAYERS: capa,
    STYLES: "",
    CRS: "EPSG:4326",
    BBOX: bboxWms(c),
    WIDTH: String(ANCHO),
    HEIGHT: String(ALTO),
    FORMAT: "image/jpeg",
  });
  return `${wms}?${q}`;
}

/** Fecha (AAAA-MM) del vuelo en el centro del encuadre, según el servicio. */
async function fechaVuelo(wms, capa, c) {
  const q = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetFeatureInfo",
    LAYERS: capa,
    QUERY_LAYERS: capa,
    STYLES: "",
    CRS: "EPSG:4326",
    BBOX: bboxWms(c),
    WIDTH: String(ANCHO),
    HEIGHT: String(ALTO),
    I: String(ANCHO / 2),
    J: String(ALTO / 2),
    INFO_FORMAT: "text/html",
  });
  // Sin etiquetas: el HTML lleva atributos con cifras entre «Fecha» y el valor.
  const html = (await (await pedir(`${wms}?${q}`)).text()).replace(/<[^>]*>/g, " ");
  const m = html.match(/Fecha[^0-9]*(\d{4})-(\d{2})/i);
  const res = html.match(/Resoluci[^0-9]*([\d.,]+)/i);
  return m
    ? { fecha: `${m[1]}-${m[2]}`, resolucionM: res ? Number(res[1].replace(",", ".")) : null }
    : null;
}

/** Descarga, descarta imágenes vacías y devuelve el webp listo para guardar. */
async function imagen(url) {
  const bruto = Buffer.from(await (await pedir(url)).arrayBuffer());
  const img = sharp(bruto);
  const { channels } = await img.stats();
  // Sin cobertura, el WMS devuelve 200 con un lienzo uniforme (blanco o negro).
  const variacion = Math.max(...channels.slice(0, 3).map((c) => c.stdev));
  if (variacion < 6) return null;
  return img.webp({ quality: 72 }).toBuffer();
}

// --- fechas de la obra ----------------------------------------------------------

/** "21/11/2024" → Date (UTC). */
function fechaEs(texto) {
  const m = texto?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : null;
}

/**
 * Suma el plazo de PLACE («2 Mes(es)», «15 Día(s)», «1 Año(s)»). En meses y
 * años, si el día no existe en el mes de destino se toma el último día del mes
 * (31/01 + 1 mes = 29/02), no el desbordamiento de JavaScript (02/03).
 */
function sumarPlazo(fecha, plazo) {
  const m = plazo?.match(/(\d+)\s*(D[ií]a|Mes|A[ñn]o)/i);
  if (!fecha || !m) return null;
  const n = Number(m[1]);
  const unidad = m[2].toLowerCase();
  if (unidad.startsWith("d")) {
    const d = new Date(fecha);
    d.setUTCDate(d.getUTCDate() + n);
    return d;
  }
  const meses = unidad.startsWith("m") ? n : n * 12;
  const total = fecha.getUTCMonth() + meses;
  const anyo = fecha.getUTCFullYear() + Math.floor(total / 12);
  const mes = total % 12;
  const ultimoDia = new Date(Date.UTC(anyo, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(anyo, mes, Math.min(fecha.getUTCDate(), ultimoDia)));
}

const inicioMes = (aaaamm) => new Date(`${aaaamm}-01T00:00:00Z`);
function finMes(aaaamm) {
  const d = inicioMes(aaaamm);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}
const iso = (d) => d.toISOString().slice(0, 10);

/**
 * Relación temporal entre la foto «ahora» y la obra. El servicio solo da el
 * mes del vuelo, así que se trata como un intervalo [inicio, fin) del mes y
 * solo se afirma lo que vale para cualquier día de ese mes:
 *   anterior  — el mes entero es anterior a la adjudicación;
 *   posterior — el mes entero es posterior al fin previsto;
 *   durante   — el mes entero cae entre adjudicación y fin previsto;
 *   indeterminado — cualquier solape con esos bordes, o sin fin previsto.
 * Que la obra se vea o no desde el aire va aparte (visibleAire).
 */
function veredicto(fechaFoto, adjudicacion, finPrevisto) {
  if (!adjudicacion) return "sin_fechas";
  const ini = inicioMes(fechaFoto);
  const fin = finMes(fechaFoto);
  if (fin <= adjudicacion) return "anterior";
  if (!finPrevisto) return "indeterminado";
  if (ini >= finPrevisto) return "posterior";
  if (ini >= adjudicacion && fin <= finPrevisto) return "durante";
  return "indeterminado";
}

// Autocomprobación de las reglas de fechas (barata y evita regresiones).
{
  const f = (t) => fechaEs(t);
  const casos = [
    [iso(sumarPlazo(f("31/01/2024"), "1 Mes(es)")), "2024-02-29"],
    [iso(sumarPlazo(f("21/11/2024"), "15 Día(s)")), "2024-12-06"],
    [iso(sumarPlazo(f("29/02/2024"), "1 Año(s)")), "2025-02-28"],
    [veredicto("2024-06", f("20/06/2024"), f("20/08/2024")), "indeterminado"],
    [veredicto("2024-06", f("01/07/2024"), f("01/08/2024")), "anterior"],
    [veredicto("2024-06", f("01/03/2024"), f("01/05/2024")), "posterior"],
    [veredicto("2024-06", f("01/05/2024"), f("01/08/2024")), "durante"],
    [veredicto("2024-06", f("01/05/2024"), null), "indeterminado"],
  ];
  for (const [obtenido, esperado] of casos)
    if (obtenido !== esperado) fallar(`regla de fechas rota: ${obtenido} ≠ ${esperado}`);
}

// --- lectura de obras -------------------------------------------------------

const fuenteObras = readFileSync(resolve(RAIZ, "lib/obras.ts"), "utf-8");
const bloque = fuenteObras.match(/export const OBRAS: Obra\[\] = (\[[\s\S]*?\n\]);/);
if (!bloque) fallar("no encuentro OBRAS en lib/obras.ts");
const OBRAS = JSON.parse(bloque[1]);

const conPunto = OBRAS.filter(
  (o) => o.ubicacion && !["municipio", "sin_ubicacion"].includes(o.ubicacion.precision),
);
console.log(`${conPunto.length}/${OBRAS.length} obras con ubicación precisa`);

// --- modo comprobar: ¿hay un vuelo más nuevo que el guardado? ---------------

if (SOLO_COMPROBAR) {
  let previo = {};
  try {
    const actual = readFileSync(SALIDA, "utf-8").match(/export const VISTAS_AEREAS[^=]*= (\{[\s\S]*?\n\});/);
    previo = actual ? JSON.parse(actual[1]) : {};
  } catch {
    // sin manifiesto previo: todo es nuevo
  }
  const nuevos = [];
  // ICV: ¿ha publicado un año posterior a la serie conocida que cubra el
  // punto? Sus servicios se llaman 0202_{AAAA}{ámbito}{resolución}; se prueban
  // los ámbitos de toda la Comunitat y de la provincia de Alicante.
  const ultimoIcv = Number(HISTORICO_ICV[0].anyo);
  const muestra = conPunto[0];
  if (muestra) {
    const c = encuadre(muestra.ubicacion.lat, muestra.ubicacion.lon, muestra.ubicacion.radioM);
    for (let anyo = ultimoIcv + 1; anyo <= new Date().getUTCFullYear(); anyo++) {
      for (const ambito of ["CVAL0025", "PALI0025", "CVAL0015", "PALI0015"]) {
        const id = `${anyo}${ambito}`;
        const url = urlMapa(`https://terramapas.icv.gva.es/0202_${id}`, `${id}_RGB`, c);
        const hay = await imagen(url).catch(() => null);
        if (hay) nuevos.push(`ICV ${id}: hay imagen en el punto de ${muestra.id} (añadirlo a HISTORICO_ICV y revisar)`);
      }
    }
  }
  for (const o of conPunto) {
    const c = encuadre(o.ubicacion.lat, o.ubicacion.lon, o.ubicacion.radioM);
    const v = await fechaVuelo(ACTUAL.wms, ACTUAL.capaFecha, c);
    const guardada = previo[o.id]?.ahora?.fecha;
    if (v && v.fecha !== guardada) nuevos.push(`${o.id}: ${guardada ?? "—"} → ${v.fecha}`);
  }
  if (nuevos.length) {
    console.log(`Vuelos nuevos:\n  ${nuevos.join("\n  ")}`);
    process.exit(3);
  }
  console.log("Sin vuelos nuevos.");
  process.exit(0);
}

// --- horneado ---------------------------------------------------------------

mkdirSync(DIR_IMG, { recursive: true });
const vistas = {};

for (const o of conPunto) {
  const u = o.ubicacion;
  const c = encuadre(u.lat, u.lon, u.radioM);
  const caja = [c.latMin, c.lonMin, c.latMax, c.lonMax].map(redondea);

  const vAhora = await fechaVuelo(ACTUAL.wms, ACTUAL.capaFecha, c);
  if (!vAhora) fallar(`${o.id}: el servicio no da fecha de vuelo en el punto`);
  const urlAhora = urlMapa(ACTUAL.wms, ACTUAL.capa, c);
  const webpAhora = await imagen(urlAhora);
  if (!webpAhora) fallar(`${o.id}: la ortofoto actual sale en blanco`);
  writeFileSync(resolve(DIR_IMG, `${o.id}-ahora.webp`), webpAhora);

  const adjudicacion = fechaEs(o.adjudicacion?.fechaAcuerdo);
  const finPrevisto = sumarPlazo(adjudicacion, o.adjudicacion?.plazo);

  // «antes»: solo tiene sentido si la foto «ahora» es posterior o durante la
  // obra. Si es anterior, la propia foto «ahora» ya es el estado previo.
  const juicio = veredicto(vAhora.fecha, adjudicacion, finPrevisto);
  let antes = null;
  if (adjudicacion && juicio !== "anterior" && juicio !== "sin_fechas") {
    for (const h of HISTORICO_ICV) {
      if (new Date(`${h.fin}T23:59:59Z`) >= adjudicacion) continue;
      // Tampoco el mismo vuelo que «ahora» (IGN e ICV 2024 son el mismo vuelo).
      if (h.anyo >= vAhora.fecha.slice(0, 4)) continue;
      const url = urlMapa(h.wms, h.capa, c);
      const webp = await imagen(url).catch(() => null);
      if (!webp) continue;
      writeFileSync(resolve(DIR_IMG, `${o.id}-antes.webp`), webp);
      antes = {
        src: `/aerea/${o.id}-antes.webp`,
        fecha: h.anyo,
        ventana: [h.inicio, h.fin],
        fuente: "Ortofoto ICV",
        capa: h.capa,
        resolucionM: 0.25,
        atribucion: atribucionIcv(h.anyo),
        origen: url,
      };
      break;
    }
  }

  vistas[o.id] = {
    caja,
    metrosAncho: c.metrosAncho,
    ahora: {
      src: `/aerea/${o.id}-ahora.webp`,
      fecha: vAhora.fecha,
      ventana: null,
      fuente: ACTUAL.fuente,
      capa: ACTUAL.capa,
      resolucionM: vAhora.resolucionM,
      atribucion: atribucionPnoa(vAhora.fecha.slice(0, 4)),
      origen: urlAhora,
    },
    antes,
    adjudicacion: adjudicacion ? iso(adjudicacion) : null,
    finPrevisto: finPrevisto ? iso(finPrevisto) : null,
    veredicto: juicio,
  };
  console.log(
    `  ${o.id}: ahora ${vAhora.fecha} · antes ${antes?.fecha ?? "—"} · ${vistas[o.id].veredicto}`,
  );
}

const encabezado = `/**
 * ⚠️ ARCHIVO GENERADO — no editar a mano.
 * Regenerar con: node scripts/hornear-vista-aerea.mjs
 * Fotos aéreas oficiales de cada obra, con la fecha de vuelo que da el propio
 * servicio en el punto. Generado: ${new Date().toISOString().slice(0, 10)}
 */
`;

const cuerpo = `
export type Veredicto = "posterior" | "durante" | "anterior" | "indeterminado" | "sin_fechas";

export interface FotoAerea {
  src: string;
  /** AAAA-MM del vuelo en el punto (IGN) o AAAA (ICV, ver ventana). */
  fecha: string;
  /** Ventana del vuelo de toda la Comunitat (ICV): [inicio, fin] AAAA-MM-DD. */
  ventana: [string, string] | null;
  fuente: string;
  capa: string;
  resolucionM: number | null;
  atribucion: string;
  /** Petición WMS original, para poder reproducir la imagen. */
  origen: string;
}

export interface VistaAerea {
  /** [latMin, lonMin, latMax, lonMax] del encuadre. */
  caja: [number, number, number, number];
  metrosAncho: number;
  ahora: FotoAerea;
  antes: FotoAerea | null;
  adjudicacion: string | null;
  finPrevisto: string | null;
  veredicto: Veredicto;
}

/** Día en que se consultaron los servicios del IGN y del ICV por última vez. */
export const REVISADO = "${new Date().toISOString().slice(0, 10)}";

export const VISTAS_AEREAS: Record<string, VistaAerea> = ${JSON.stringify(vistas, null, 2)};
`;

writeFileSync(SALIDA, encabezado + cuerpo, "utf-8");

// Imágenes que el manifiesto ya no usa (p. ej. un «antes» que dejó de tener
// sentido): se retiran para no publicar fotos huérfanas.
const usadas = new Set(
  Object.values(vistas).flatMap((v) => [v.ahora.src, v.antes?.src].filter(Boolean).map((s) => s.split("/").pop())),
);
for (const f of readdirSync(DIR_IMG)) {
  if (/^OBRA-\d{2}-(ahora|antes)\.webp$/.test(f) && !usadas.has(f)) {
    unlinkSync(resolve(DIR_IMG, f));
    console.log(`  retirada ${f}`);
  }
}
console.log(`✓ ${Object.keys(vistas).length} vistas → ${SALIDA}`);
