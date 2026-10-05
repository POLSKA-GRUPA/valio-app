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

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ_APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ_DATOS = resolve(process.argv[2] ?? "../valio-datos");
const CSV = resolve(RAIZ_DATOS, "datos/obras-piloto.csv");
const DIR_FICHAS = resolve(RAIZ_DATOS, "datos/obras");
const SALIDA = resolve(RAIZ_APP, "lib/obras.ts");

/**
 * Población de Teulada — fuente oficial INE (Nomenclátor, base Censo Continuo).
 * Consultada y verificada el 05/10/2026; el enlace es público y clicable.
 * El dossier (§4.2) exige explicar el denominador: la UI debe mostrar
 * cifra + fecha + enlace siempre que muestre el coste por habitante.
 */
const POBLACION = {
  municipio: "Teulada",
  habitantes: 12932,
  referencia: "1 de enero de 2025",
  fuenteNombre: "INE — Nomenclátor (Censo Continuo)",
  fuenteUrl:
    "https://www.ine.es/nomen2/tabla.do?accion=busquedaRapida&nombrePoblacion=Teulada&desagregacionRapida=S&aniosRapida=2025",
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
const filas = csv.slice(1).map((f) => Object.fromEntries(f.map((v, i) => [cabecera[i], v])));
if (filas.length !== 21) fallar(`esperaba 21 obras, hay ${filas.length}`);

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
  let url = (fila.fuente_url ?? "").trim() || null;
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;

  if (!nombre) fallar(`OBRA ${id}: falta el nombre oficial en la ficha`);
  if (!organismo) fallar(`OBRA ${id}: falta el organismo en la ficha`);
  if (!Number.isFinite(anyo) || anyo < 2000) fallar(`OBRA ${id}: año raro (${anyo})`);
  if (licitacion == null || licitacion <= 0) fallar(`OBRA ${id}: importe de licitación inválido`);
  if (!licitacionNota.toLowerCase().includes("iva"))
    fallar(`OBRA ${id}: la ficha no dice si el importe lleva IVA`);
  if (!url) fallar(`OBRA ${id}: sin fuente_url en el CSV`);
  if (!fechaConsulta) fallar(`OBRA ${id}: sin fecha de consulta en la ficha`);

  // adjudicación (filas nuevas; OBRA-01 lleva «No consta»)
  const adjudicatariaFila = campoFicha(ficha, "Adjudicataria");
  let adjudicacion = null;
  if (adjudicatariaFila && !/no consta/i.test(adjudicatariaFila)) {
    const notaCif = notaFicha(ficha, "Adjudicataria") ?? "";
    const cif = notaCif.match(/([A-Z]\d{8}|\d{8}[A-Z])/)?.[1] ?? null;
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
    estadoEjecucion: "faltante", // no localizado en fuente oficial (dossier §7.2)
    importeLicitacion: licitacion,
    ivaLicitacionIncluido: /incluido/i.test(licitacionNota) && !/no incluido/i.test(licitacionNota),
    adjudicacion,
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
 * Fuente: valio-datos (obras-piloto.csv + fichas OBRA-XX.md) · ${fechaGeneracion}
 * Cada dato es rastreable hasta su ficha; nada inventado.
 */
`;

const cuerpo = `
export type EstadoDato = "NO_VERIFICADO" | "EVIDENCIADO" | "CONTRADICHO" | "DESACTUALIZADO";

export type Categoria = ${categorias.map((c) => `"${c}"`).join(" | ")};

export const CATEGORIA_LABEL: Record<Categoria, string> = ${JSON.stringify(labels, null, 2)};

export const ESTADO_LABEL: Record<EstadoDato, string> = {
  NO_VERIFICADO: "No verificado",
  EVIDENCIADO: "Evidenciado",
  CONTRADICHO: "Contradicho",
  DESACTUALIZADO: "Desactualizado",
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

export interface Obra {
  id: string;
  nombre: string;
  categoria: Categoria;
  municipio: string;
  provincia: string;
  organismo: string;
  anyo: number;
  estadoEjecucion: "faltante";
  importeLicitacion: number;
  ivaLicitacionIncluido: boolean;
  adjudicacion: Adjudicacion | null;
  costePorHabitante: number;
  fuente: { nombre: string; url: string; fechaConsulta: string };
}

/** Denominador del coste por habitante (dossier §4.2: siempre explicado). */
export const POBLACION = ${JSON.stringify(POBLACION, null, 2)} as const;

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
