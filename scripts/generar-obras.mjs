#!/usr/bin/env node
/**
 * generar-obras.mjs — Genera lib/obras.ts desde valio-datos (CSV + fichas).
 *
 * QUÉ HACE
 *   1. Lee `obras-piloto.csv` y las fichas `OBRA-XX.md` del repo valio-datos.
 *   2. Valida que cada dato imprescindible esté (regla: nada a medias).
 *   3. Calcula el coste por habitante (población INE documentada abajo).
 *   4. Escribe `lib/obras.ts` completo. NO editar a mano: regenerar.
 *
 * USO
 *   node scripts/generar-obras.mjs
 *   node scripts/generar-obras.mjs ../otro/valio-datos   (ruta alternativa)
 *
 * El repo hermano por defecto es ../valio-datos respecto a este repo.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ_APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ_DATOS = resolve(process.argv[2] ?? "../valio-datos");
const CSV = resolve(RAIZ_DATOS, "datos/obras-piloto.csv");
const DIR_FICHAS = resolve(RAIZ_DATOS, "datos/obras");
const CSV_UBICACIONES = resolve(RAIZ_DATOS, "datos/ubicaciones.csv");
const SALIDA = resolve(RAIZ_APP, "lib/obras.ts");

/**
 * Población de Teulada — cifra oficial del padrón (INE, tabla 29005), la
 * misma serie que el resto de municipios (valio-datos/datos/referencia/
 * municipios.csv). Antes se usaba el Nomenclátor (12.932); se unifica con
 * la cifra oficial el 17/10/2026.
 * El dossier (§4.2) exige explicar el denominador: la UI debe mostrar
 * cifra + fecha + enlace siempre que muestre el coste por habitante.
 */
const POBLACION = {
  municipio: "Teulada",
  habitantes: 12912,
  referencia: "01/01/2025",
  fuenteNombre: "INE — Cifras oficiales del padrón (tabla 29005)",
  fuenteUrl: "https://www.ine.es/jaxiT3/Tabla.htm?t=29005",
};

// --- utilidades -------------------------------------------------------------

function fallar(mensaje) {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

/** CSV minimal con comillas dobles y comas dentro de campos. */
function parsearCsv(texto) {
  const filas = [];
  let campo = "";
  let fila = [];
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        entreComillas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n") {
      fila.push(campo.trim());
      campo = "";
      if (fila.some((f) => f !== "")) filas.push(fila);
      fila = [];
    } else if (c !== "\r") {
      campo += c;
    }
  }
  fila.push(campo.trim());
  if (fila.some((f) => f !== "")) filas.push(fila);
  return filas;
}

/** "38.244,00" | "38244.0" | "38.244" → number */
function numeroES(texto) {
  if (texto == null) return null;
  const limpio = String(texto).trim().replace(/[€\s]/g, "");
  if (!limpio) return null;
  // formato español: puntos de miles + coma decimal (puede venir "38244.0")
  const normalizado = limpio.includes(",")
    ? limpio.replace(/\./g, "").replace(",", ".")
    : limpio;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/** Valor de una fila de tabla markdown: "| Clave | valor |" (espacios variables). */
function campoFicha(ficha, clave) {
  const re = new RegExp(`\\|\\s*${clave}\\s*\\|([^|]*)\\|`, "i");
  const m = ficha.match(re);
  return m ? m[1].trim() : null;
}

/** Nota de la fila (tercera columna), si existe. */
function notaFicha(ficha, clave) {
  const re = new RegExp(`\\|\\s*${clave}\\s*\\|[^|]*\\|([^|]*)\\|`, "i");
  const m = ficha.match(re);
  return m ? m[1].trim() : null;
}

// --- lectura y validación ---------------------------------------------------

console.log(`Leyendo ${CSV}`);
const csv = parsearCsv(readFileSync(CSV, "utf-8"));
const cabecera = csv[0].map((c) => c.trim());
const todas = csv.slice(1).map((f) => Object.fromEntries(f.map((v, i) => [cabecera[i], v])));
// Solo municipios con población declarada: sin denominador no hay coste por
// vecino honesto. Se dice qué se omite en lugar de descartarlo en silencio.
const filas = todas.filter((f) => (f.municipio ?? "").trim() === POBLACION.municipio);
const omitidas = todas.length - filas.length;
if (omitidas) console.log(`  omitidas ${omitidas} obras de otros municipios (sin población declarada)`);
if (filas.length !== 21) fallar(`esperaba 21 obras de ${POBLACION.municipio}, hay ${filas.length}`);

// --- ubicaciones (vista aérea) -----------------------------------------------

/**
 * Término municipal oficial (CartoCiudad, IGN), guardado en valio-datos. Una
 * coordenada fuera del polígono es un error de geolocalización, no una obra:
 * el generador para antes de publicarla.
 */
const LIMITE_MUNICIPIO = resolve(RAIZ_DATOS, "datos/limites/03128-teulada.wkt");

/** Anillos de un MULTIPOLYGON WKT como listas de [lon, lat]. */
function anillosWkt(wkt) {
  return [...wkt.matchAll(/\(([^()]+)\)/g)].map((m) =>
    m[1].split(",").map((par) => par.trim().split(/\s+/).map(Number)),
  );
}

/** Regla par-impar: cuenta todos los anillos, así los huecos quedan fuera. */
function dentroDe(anillos, lon, lat) {
  let dentro = false;
  for (const anillo of anillos) {
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      const [xi, yi] = anillo[i];
      const [xj, yj] = anillo[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
  }
  return dentro;
}

const PRECISIONES = ["punto", "instalacion", "zona", "tramo", "municipio", "sin_ubicacion"];
const VISIBLE_AIRE = ["si", "parcial", "no"];
const ESTADOS_UBICACION = ["propuesta", "verificada"];
const FUENTES_TIPO = ["pliego", "plano", "catastro", "cartociudad", "ortofoto"];

const ubicaciones = new Map();
const publicadas = new Set(filas.map((f) => `OBRA-${String(f.id).trim().padStart(2, "0")}`));
if (existsSync(CSV_UBICACIONES)) {
  if (!existsSync(LIMITE_MUNICIPIO)) fallar(`falta el límite municipal ${LIMITE_MUNICIPIO}`);
  const termino = anillosWkt(readFileSync(LIMITE_MUNICIPIO, "utf-8"));
  const tabla = parsearCsv(readFileSync(CSV_UBICACIONES, "utf-8"));
  const cab = tabla[0].map((c) => c.trim());
  for (const f of tabla.slice(1)) {
    const u = Object.fromEntries(f.map((v, i) => [cab[i], (v ?? "").trim()]));
    const id = u.id;
    if (!/^OBRA-\d{2}$/.test(id)) fallar(`ubicaciones.csv: id raro (${id})`);
    // Las obras de municipios no publicados (sin población) se validan cuando entren.
    if (!publicadas.has(id)) continue;
    if (!PRECISIONES.includes(u.precision)) fallar(`${id}: precisión desconocida (${u.precision})`);
    if (!ESTADOS_UBICACION.includes(u.estado_ubicacion))
      fallar(`${id}: estado_ubicacion desconocido (${u.estado_ubicacion})`);
    const conPunto = !["municipio", "sin_ubicacion"].includes(u.precision);
    const lat = u.lat === "" ? null : Number(u.lat);
    const lon = u.lon === "" ? null : Number(u.lon);
    if (!conPunto) {
      if (lat != null || lon != null) fallar(`${id}: precisión ${u.precision} no admite coordenadas`);
      if (!u.motivo) fallar(`${id}: sin ubicación pero sin motivo para el vecino`);
      ubicaciones.set(id, { precision: u.precision, motivo: u.motivo });
      continue;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) fallar(`${id}: coordenadas inválidas`);
    if (!dentroDe(termino, lon, lat))
      fallar(`${id}: coordenadas fuera del término municipal (${lat}, ${lon})`);
    if (!/^https?:\/\//.test(u.fuente_url)) fallar(`${id}: coordenada sin fuente_url`);
    if (!FUENTES_TIPO.includes(u.fuente_tipo)) fallar(`${id}: fuente_tipo desconocido (${u.fuente_tipo})`);
    const consulta = new Date(`${u.fecha_consulta}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(u.fecha_consulta) ||
      Number.isNaN(consulta.getTime()) ||
      consulta.toISOString().slice(0, 10) !== u.fecha_consulta ||
      consulta > new Date()
    )
      fallar(`${id}: fecha_consulta inválida (${u.fecha_consulta})`);
    if (!u.evidencia) fallar(`${id}: coordenada sin evidencia`);
    if (!VISIBLE_AIRE.includes(u.visible_aire)) fallar(`${id}: visible_aire desconocido (${u.visible_aire})`);
    const radioM = Number(u.radio_m);
    if (!Number.isFinite(radioM) || radioM <= 0 || radioM > 1500) fallar(`${id}: radio_m inválido`);
    ubicaciones.set(id, {
      precision: u.precision,
      lat: Math.round(lat * 1e6) / 1e6,
      lon: Math.round(lon * 1e6) / 1e6,
      radioM,
      visibleAire: u.visible_aire,
      referenciaCatastral: u.referencia_catastral || null,
      fuente: { tipo: u.fuente_tipo, url: u.fuente_url, fechaConsulta: u.fecha_consulta },
      evidencia: u.evidencia,
      estado: u.estado_ubicacion,
    });
  }
} else {
  console.log("  sin datos/ubicaciones.csv: ninguna obra lleva ubicación");
}

const obras = [];
for (const fila of filas) {
  const id = fila.id?.trim();
  const fichaNombre = (fila.ficha_md ?? "").trim().replace(/\.(md|MD)$/, "");
  if (!id || !fichaNombre) fallar(`fila sin id o ficha_md: ${JSON.stringify(fila)}`);

  let ficha;
  try {
    ficha = readFileSync(resolve(DIR_FICHAS, `${fichaNombre}.md`), "utf-8");
  } catch {
    fallar(`no encuentro la ficha de la obra ${id} (${fichaNombre}.md)`);
  }

  const nombre = campoFicha(ficha, "Nombre oficial de la obra");
  const organismo = campoFicha(ficha, "Organismo que la ejecuta/paga");
  const anyo = Number((campoFicha(ficha, "Año de adjudicación/ejecución") ?? "").trim());
  const licitacionTexto = campoFicha(ficha, "Importe \\(tal cual la fuente\\)");
  const licitacionNota = (notaFicha(ficha, "Importe \\(tal cual la fuente\\)") ?? "").trim();
  const licitacion = numeroES(licitacionTexto);
  const fechaConsulta = campoFicha(ficha, "Fecha de consulta");
  // Estado del dato tal cual lo marca el CSV («NO VERIFICADO» → NO_VERIFICADO).
  const estadoDato = (fila.estado_dato ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  let url = (fila.fuente_url ?? "").trim() || null;
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;

  if (!nombre) fallar(`OBRA ${id}: falta el nombre oficial en la ficha`);
  if (!organismo) fallar(`OBRA ${id}: falta el organismo en la ficha`);
  if (!Number.isFinite(anyo) || anyo < 2000) fallar(`OBRA ${id}: año raro (${anyo})`);
  if (licitacion == null || licitacion <= 0) fallar(`OBRA ${id}: importe de licitación inválido`);
  if (!licitacionNota.toLowerCase().includes("iva"))
    fallar(`OBRA ${id}: la ficha no dice si el importe lleva IVA`);
  if (!url) fallar(`OBRA ${id}: sin fuente_url en el CSV`);
  if (!["NO_VERIFICADO", "EVIDENCIADO", "CONTRADICHO", "DESACTUALIZADO"].includes(estadoDato))
    fallar(`OBRA ${id}: estado_dato desconocido (${fila.estado_dato})`);
  if (!fechaConsulta) fallar(`OBRA ${id}: sin fecha de consulta en la ficha`);

  // adjudicación (filas nuevas; OBRA-01 lleva «No consta»)
  const adjudicatariaFila = campoFicha(ficha, "Adjudicataria");
  let adjudicacion = null;
  if (adjudicatariaFila && !/no consta/i.test(adjudicatariaFila)) {
    const notaCif = notaFicha(ficha, "Adjudicataria") ?? "";
    // Solo NIF de persona jurídica (letra inicial de entidad). Si la adjudicataria
    // es una persona física (DNI, NIE o NIF K/L/M) no se publica el documento:
    // el repo es público y basta con el nombre que da la fuente oficial.
    const cif = notaCif.match(/\b([ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])\b/)?.[1] ?? null;
    const fechaAcuerdo = campoFicha(ficha, "Fecha de adjudicación");
    const notaPub = notaFicha(ficha, "Fecha de adjudicación") ?? "";
    const fechaPublicacion = notaPub.match(/(\d{2}-\d{2}-\d{4})/)?.[1] ?? null;
    const importeAdjTexto = campoFicha(ficha, "Importe de adjudicación");
    const notaImporte = notaFicha(ficha, "Importe de adjudicación") ?? "";
    const importeConIvaTexto = notaImporte.match(/con IVA: ([\d.,]+)/)?.[1] ?? null;
    const plazo = campoFicha(ficha, "Plazo de ejecución");
    const numExpediente = campoFicha(ficha, "Nº de expediente");
    const importeAdj = numeroES((importeAdjTexto ?? "").replace(/€/g, ""));

    if (!adjudicatariaFila) fallar(`OBRA ${id}: fila Adjudicataria vacía`);
    if (!fechaAcuerdo || !/\d{2}\/\d{2}\/\d{4}/.test(fechaAcuerdo))
      fallar(`OBRA ${id}: falta la fecha de adjudicación`);
    if (importeAdj == null || importeAdj <= 0)
      fallar(`OBRA ${id}: importe de adjudicación inválido`);
    if (!plazo) fallar(`OBRA ${id}: falta el plazo de ejecución`);

    adjudicacion = {
      adjudicataria: adjudicatariaFila,
      cif,
      fechaAcuerdo,
      fechaPublicacion,
      importeSinIva: importeAdj,
      importeConIva: numeroES(importeConIvaTexto),
      plazo,
      numExpediente,
    };
  }

  const tipo = (fila.tipo ?? "").trim().toLowerCase();
  if (!tipo) fallar(`OBRA ${id}: sin tipo en el CSV`);

  obras.push({
    id: `OBRA-${String(id).padStart(2, "0")}`,
    nombre,
    categoria: tipo,
    municipio: fila.municipio.trim(),
    provincia: fila.provincia.trim(),
    organismo,
    anyo,
    estadoDato,
    estadoEjecucion: "faltante", // no localizado en fuente oficial (dossier §7.2)
    importeLicitacion: licitacion,
    ivaLicitacionIncluido: /incluido/i.test(licitacionNota) && !/no incluido/i.test(licitacionNota),
    adjudicacion,
    ubicacion: ubicaciones.get(`OBRA-${String(id).padStart(2, "0")}`) ?? null,
    fuente: {
      nombre: "Plataforma de Contratación del Sector Público (PLACE)",
      url,
      fechaConsulta,
    },
  });
}

// --- coste por habitante ----------------------------------------------------

for (const obra of obras) {
  const numerador = obra.adjudicacion?.importeSinIva ?? obra.importeLicitacion;
  obra.costePorHabitante = Math.round((numerador / POBLACION.habitantes) * 100) / 100;
}

// --- emisión ----------------------------------------------------------------

const categorias = [...new Set(obras.map((o) => o.categoria))].sort();
const labels = Object.fromEntries(
  categorias.map((c) => {
    const bonito = { "medio ambiente": "Medio ambiente", educacion: "Educación" }[c]
      ?? c.charAt(0).toUpperCase() + c.slice(1);
    return [c, bonito];
  })
);

const fechaGeneracion = new Date().toISOString().slice(0, 10);
const encabezado = `/**
 * ⚠️ ARCHIVO GENERADO — no editar a mano.
 * Regenerar con: node scripts/generar-obras.mjs
 * Fuente: valio-datos (obras-piloto.csv + ubicaciones.csv + fichas OBRA-XX.md) · ${fechaGeneracion}
 * Cada dato es rastreable hasta su ficha; nada inventado.
 */
`;

const cuerpo = `
/** OFICIAL_AUTOMATICO: cargado de PLACE sin revisión manual (carga nacional). */
export type EstadoDato = "NO_VERIFICADO" | "EVIDENCIADO" | "CONTRADICHO" | "DESACTUALIZADO" | "OFICIAL_AUTOMATICO";

export type Categoria = ${categorias.map((c) => `"${c}"`).join(" | ")};

export const CATEGORIA_LABEL: Record<Categoria, string> = ${JSON.stringify(labels, null, 2)};

export const ESTADO_LABEL: Record<EstadoDato, string> = {
  NO_VERIFICADO: "No verificado",
  EVIDENCIADO: "Evidenciado",
  CONTRADICHO: "Contradicho",
  DESACTUALIZADO: "Desactualizado",
  OFICIAL_AUTOMATICO: "Dato oficial, sin revisar a mano",
};

export interface Adjudicacion {
  adjudicataria: string;
  cif: string | null;
  fechaAcuerdo: string;
  fechaPublicacion: string | null;
  importeSinIva: number;
  importeConIva: number | null;
  plazo: string;
  numExpediente: string | null;
}

export type Precision = "punto" | "instalacion" | "zona" | "tramo";

/** Dónde está la obra. Solo existe si un documento público la sitúa. */
export interface UbicacionPrecisa {
  precision: Precision;
  lat: number;
  lon: number;
  radioM: number;
  visibleAire: "si" | "parcial" | "no";
  referenciaCatastral: string | null;
  fuente: { tipo: string; url: string; fechaConsulta: string };
  evidencia: string;
  estado: "propuesta" | "verificada";
}

/** Los documentos no permiten situarla con precisión: se dice y no se pinta nada. */
export interface SinUbicacion {
  precision: "municipio" | "sin_ubicacion";
  /** Por qué no se puede situar, en una frase para el vecino. */
  motivo: string;
}

export type Ubicacion = UbicacionPrecisa | SinUbicacion;

export function tienePunto(u: Ubicacion | null): u is UbicacionPrecisa {
  return u != null && u.precision !== "municipio" && u.precision !== "sin_ubicacion";
}

export interface Obra {
  id: string;
  nombre: string;
  categoria: Categoria;
  municipio: string;
  provincia: string;
  organismo: string;
  anyo: number;
  estadoDato: EstadoDato;
  estadoEjecucion: "faltante";
  /** Presupuesto de licitación; null si la fuente no lo publica. */
  importeLicitacion: number | null;
  ivaLicitacionIncluido: boolean;
  adjudicacion: Adjudicacion | null;
  ubicacion: Ubicacion | null;
  costePorHabitante: number;
  fuente: { nombre: string; url: string; fechaConsulta: string };
  /** Limitación del dato que el vecino debe ver (p. ej. contrato con lotes). */
  aviso?: string;
}

/** Denominador del coste por habitante (dossier §4.2: siempre explicado). */
export const POBLACION = ${JSON.stringify(POBLACION, null, 2)};

export const OBRAS: Obra[] = ${JSON.stringify(obras, null, 2)};

export type Voto = "valio" | "no_valio" | "explica" | "no_puedo";

export const VOTO_LABEL: Record<Voto, string> = {
  valio: "Valió",
  no_valio: "No valió",
  explica: "Pido explicaciones",
  no_puedo: "No puedo valorarlo",
};

export type Votos = Record<string, Voto>;
`;

writeFileSync(SALIDA, encabezado + cuerpo, "utf-8");
console.log(`✓ ${obras.length} obras → ${SALIDA}`);
const sinAdj = obras.filter((o) => !o.adjudicacion).map((o) => o.id);
console.log(
  `  adjudicaciones: ${obras.length - sinAdj.length}/${obras.length}` +
    (sinAdj.length ? ` (sin dato: ${sinAdj.join(", ")})` : "")
);
console.log(`  categorías: ${categorias.join(", ")}`);
console.log(
  `  coste/vecino: min ${Math.min(...obras.map((o) => o.costePorHabitante))} € · max ${Math.max(
    ...obras.map((o) => o.costePorHabitante)
  )} €`
);
