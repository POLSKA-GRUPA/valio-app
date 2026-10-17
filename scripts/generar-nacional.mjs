#!/usr/bin/env node
/**
 * generar-nacional.mjs — Lleva la carga nacional de valio-datos a la app.
 *
 * QUÉ HACE
 *   1. Lee `datos/nacional/indice.json` y `datos/nacional/municipios/<ine>.json`
 *      de valio-datos (dato oficial automático de PLACE).
 *   2. Se queda con las obras ADJUDICADAS (estado ADJ/RES o con importe
 *      adjudicado): VALIO pregunta si valió lo que ya se contrató.
 *   3. Escribe `public/datos/municipios/<ine>.json` (lo baja la app solo al
 *      elegir ese municipio) y `lib/municipios-nacionales.ts` (índice, pequeño).
 *   Teulada no se toca: sus obras son las del piloto verificado (lib/obras.ts).
 *   NO editar a mano lo generado: regenerar.
 *
 * USO
 *   node scripts/generar-nacional.mjs [../valio-datos]
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ_APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ_DATOS = resolve(process.argv[2] ?? "../valio-datos");
const DIR_NACIONAL = resolve(RAIZ_DATOS, "datos/nacional");
const SALIDA_JSON = resolve(RAIZ_APP, "public/datos/municipios");
const SALIDA_TS = resolve(RAIZ_APP, "lib/municipios-nacionales.ts");
const PILOTO = new Set(["03128"]); // Teulada: piloto verificado a mano

function fallar(mensaje) {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

/**
 * Tipo de obra para los chips del mazo, por palabras del objeto. Es una
 * ayuda para filtrar, no un dato oficial: lo que manda es el objeto.
 * El orden importa: lo más específico primero.
 */
const REGLAS_TIPO = [
  ["seguridad", /polic[ií]a|bomberos|sem[aá]foro|seguridad|emergencia|videovigilancia|protecci[oó]n civil/i],
  ["medio ambiente", /residuo|depurad|saneamiento|alcantarill|abastecimiento|agua|contador|pluvial|colector|playa|litoral|medio ambiente|ecopar|vertedero|energ[ií]a|fotovolt/i],
  ["deporte", /deport|polideport|piscina|pistas? (?:deportiv|de p[aá]del|de tenis|de atletismo|multideport)|campo de f[uú]tbol|estadio|gimnas|front[oó]n|skate|p[aá]del/i],
  ["educacion", /colegio|escuela|\bc\.?\s?e\.?\s?i\.?\s?p\b|\bi\.e\.s\b|\bies\b|instituto|educa|guarder|escoleta|biblioteca|aulari/i],
  ["patrimonio", /patrimonio|iglesia|ermita|castillo|muralla|museo|teatro|hist[oó]ric|restauraci[oó]n|monumento|palacio/i],
  // «parque» sin «de bomberos/contadores/vehículos/maquinaria»: esos no son zonas verdes.
  ["parques", /parque(?! de (?:bomberos|contadores|veh[ií]culos|maquinaria|m[oó]vil))|jard[ií]n|zona verde|arbolado|juegos infantiles|[aá]rea de juego/i],
]

function tipoDe(objeto) {
  for (const [tipo, patron] of REGLAS_TIPO) if (patron.test(objeto)) return tipo;
  return "urbanismo";
}

/** «2026-05-12» → «12/05/2026». */
const fechaEs = (iso) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");

/** «4 MON» → «4 Mes(es)» (como el piloto); el resto, tal cual. */
function plazoEs(plazo) {
  const m = (plazo || "").match(/^(\d+)\s*(MON|DAY|ANN|WEE)$/);
  if (!m) return plazo || "";
  return `${m[1]} ${{ MON: "Mes(es)", DAY: "Día(s)", ANN: "Año(s)", WEE: "Semana(s)" }[m[2]]}`;
}

/** Id estable de la obra: no cambia aunque PLACE actualice sus datos. */
function idObra(ine, o) {
  // idOrgano (ID de plataforma, DIR3…) no cambia aunque PLACE corrija el nombre.
  const h = createHash("sha256").update(`${o.idOrgano || o.organo}|${o.expediente}`).digest("hex").slice(0, 12);
  return `${ine}-${h}`;
}

/**
 * Solo lo que de verdad se adjudicó: resultado «adjudicado», o sin resultado
 * publicado pero con adjudicatario o importe adjudicado. RES («resuelta») por
 * sí solo no basta: también lo son las desiertas y las desistidas.
 */
const adjudicada = (o) =>
  o.resultado === "adjudicado" ||
  (o.resultado === "" && (Boolean(o.adjudicatario) || o.importeAdjudicadoSinIva != null));

function aObra(ine, doc, o) {
  const fecha = o.fechaAdjudicacion || o.fechaPublicacion || o.actualizado;
  const importeLicitacion = o.importeLicitacionSinIva ?? o.importeAdjudicadoSinIva;
  const numerador = o.importeAdjudicadoSinIva ?? importeLicitacion;
  return {
    id: idObra(ine, o),
    nombre: o.objeto,
    categoria: tipoDe(o.objeto),
    municipio: doc.municipio,
    provincia: doc.provincia,
    organismo: o.organo,
    anyo: Number(fecha.slice(0, 4)),
    estadoDato: "OFICIAL_AUTOMATICO",
    estadoEjecucion: "faltante",
    importeLicitacion,
    ivaLicitacionIncluido: false,
    adjudicacion: o.adjudicatario
      ? {
          adjudicataria: o.adjudicatario,
          cif: o.adjudicatarioCif || null,
          fechaAcuerdo: fechaEs(o.fechaAdjudicacion),
          fechaPublicacion: o.fechaPublicacion ? fechaEs(o.fechaPublicacion) : null,
          importeSinIva: o.importeAdjudicadoSinIva ?? importeLicitacion,
          importeConIva: o.importeAdjudicadoConIva,
          plazo: plazoEs(o.plazo),
          numExpediente: o.expediente || null,
        }
      : null,
    ubicacion: {
      precision: "municipio",
      motivo: "es un dato cargado automáticamente de la Plataforma de Contratación y aún nadie lo ha situado en el mapa",
    },
    costePorHabitante: Math.round((numerador / doc.poblacion.habitantes) * 100) / 100,
    ...(/lotes|varios adjudicatarios/.test(o.notas || "")
      ? { aviso: "Contrato con lotes o varios adjudicatarios: el importe y la empresa son solo los del primer resultado publicado." }
      : {}),
    fuente: {
      nombre: "Plataforma de Contratación del Sector Público (PLACE)",
      url: o.urlOficial,
      fechaConsulta: fechaEs(doc.generado),
    },
  };
}

// --- lectura y validación ---------------------------------------------------

const rutaIndice = resolve(DIR_NACIONAL, "indice.json");
if (!existsSync(rutaIndice)) fallar(`no existe ${rutaIndice}`);
const indice = JSON.parse(readFileSync(rutaIndice, "utf8"));

const municipios = [];
const salidas = new Map(); // se escribe todo al final, solo si todo valida

for (const entrada of indice) {
  if (PILOTO.has(entrada.ine)) continue;
  if (!/^\d{5}$/.test(entrada.ine)) fallar(`INE raro: ${entrada.ine}`);
  const doc = JSON.parse(readFileSync(resolve(DIR_NACIONAL, "municipios", `${entrada.ine}.json`), "utf8"));
  if (!(doc.poblacion?.habitantes > 0)) fallar(`${entrada.nombre}: sin población`);
  const vistos = new Set();
  const obras = [];
  for (const o of doc.obras.filter(adjudicada)) {
    const importe = o.importeAdjudicadoSinIva ?? o.importeLicitacionSinIva;
    const fecha = o.fechaAdjudicacion || o.fechaPublicacion || o.actualizado;
    if (!(importe > 0) || !/^\d{4}/.test(fecha || "") || !o.urlOficial?.startsWith("https://")) continue;
    const obra = aObra(entrada.ine, doc, o);
    if (vistos.has(obra.id)) fallar(`${entrada.nombre}: id repetido ${obra.id}`);
    vistos.add(obra.id);
    obras.push(obra);
  }
  // Regla 13: una ciudad con obras publicadas que se queda en 0 es un fallo nuestro.
  if (!obras.length && doc.obras.length) fallar(`${entrada.nombre}: 0 obras adjudicadas de ${doc.obras.length}`);
  const poblacion = {
    municipio: doc.municipio,
    habitantes: doc.poblacion.habitantes,
    referencia: fechaEs(doc.poblacion.referencia),
    fuenteNombre: "INE — Cifras oficiales del padrón (tabla 29005)",
    fuenteUrl: doc.poblacion.fuenteUrl,
  };
  salidas.set(`${entrada.ine}.json`, JSON.stringify({ ine: entrada.ine, generado: doc.generado, poblacion, obras }) + "\n");
  municipios.push({ ine: entrada.ine, nombre: doc.municipio, provincia: doc.provincia, numObras: obras.length, poblacion });
  console.log(`  ${doc.municipio}: ${obras.length} obras adjudicadas (de ${doc.obras.length})`);
}

// Todo validado: ahora sí se sustituye la publicación anterior.
rmSync(SALIDA_JSON, { recursive: true, force: true });
mkdirSync(SALIDA_JSON, { recursive: true });
for (const [nombre, texto] of salidas) writeFileSync(resolve(SALIDA_JSON, nombre), texto);
municipios.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
const generado = indice.map((m) => m.generado).sort().at(-1) ?? "";
writeFileSync(
  SALIDA_TS,
  `/**
 * ⚠️ ARCHIVO GENERADO — no editar a mano.
 * Regenerar con: node scripts/generar-nacional.mjs
 * Fuente: valio-datos/datos/nacional (dato oficial automático de PLACE) · ${generado}
 * Las obras de cada municipio están en public/datos/municipios/<ine>.json y
 * la app solo las descarga al elegir ese municipio.
 */

export interface PoblacionMunicipio {
  municipio: string;
  habitantes: number;
  referencia: string;
  fuenteNombre: string;
  fuenteUrl: string;
}

export interface MunicipioNacional {
  ine: string;
  nombre: string;
  provincia: string;
  numObras: number;
  poblacion: PoblacionMunicipio;
}

export const MUNICIPIOS_NACIONALES: MunicipioNacional[] = ${JSON.stringify(municipios, null, 2)};
`,
);
console.log(`✓ ${municipios.length} municipios → ${SALIDA_TS}`);
