#!/usr/bin/env node
/**
 * generar-nacional.mjs — Lleva la carga nacional de valio-datos a la app.
 *
 * QUÉ HACE
 *   1. Lee `datos/nacional/indice.json` y `datos/nacional/municipios/<ine>.json`
 *      de valio-datos (dato oficial automático de PLACE).
 *   2. Se queda con las obras ADJUDICADAS de verdad y con importe adjudicado
 *      conocido: VALIO pregunta si valió lo que ya se contrató.
 *   3. Escribe `public/datos/provincias/<cp>.json` (las obras de cada
 *      municipio de esa provincia, sin los textos que se repiten; la app baja
 *      solo la provincia del municipio elegido), `public/datos/municipios.json`
 *      (los 8.000 y pico municipios de España para el buscador, también los
 *      que aún no tienen obras) y `lib/ids-nacionales.ts` (solo servidor).
 *   Teulada no se toca: sus obras son las del piloto verificado (lib/obras.ts).
 *   NO editar a mano lo generado: regenerar.
 *
 * USO
 *   node scripts/generar-nacional.mjs [../valio-datos]
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ_APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ_DATOS = resolve(process.argv[2] ?? "../valio-datos");
const DIR_NACIONAL = resolve(RAIZ_DATOS, "datos/nacional");
const SALIDA_JSON = resolve(RAIZ_APP, "public/datos/provincias");
const SALIDA_INDICE = resolve(RAIZ_APP, "public/datos/municipios.json");
const PADRON = resolve(RAIZ_DATOS, "datos/referencia/municipios.csv");
// Solo lo importa el servidor (recuento): no entra en lo que descarga el navegador.
const SALIDA_IDS = resolve(RAIZ_APP, "lib/ids-nacionales.ts");
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

/**
 * La obra sin lo que se repite en todas (municipio, provincia, estado, fuente,
 * ubicación, coste por vecino): la app lo repone al cargar (lib/municipios.ts).
 */
function aObra(ine, o) {
  const fecha = o.fechaAdjudicacion || o.fechaPublicacion || o.actualizado;
  return {
    id: idObra(ine, o),
    nombre: o.objeto,
    categoria: tipoDe(o.objeto),
    organismo: o.organo,
    anyo: Number(fecha.slice(0, 4)),
    // Cada importe es el suyo: si PLACE no da el presupuesto, «no consta».
    importeLicitacion: o.importeLicitacionSinIva ?? null,
    adjudicacion: {
      adjudicataria: o.adjudicatario || "No consta en la fuente",
      cif: o.adjudicatarioCif || null,
      fechaAcuerdo: fechaEs(o.fechaAdjudicacion) || "No consta",
      fechaPublicacion: o.fechaPublicacion ? fechaEs(o.fechaPublicacion) : null,
      importeSinIva: o.importeAdjudicadoSinIva,
      importeConIva: o.importeAdjudicadoConIva,
      plazo: plazoEs(o.plazo) || "No consta",
      numExpediente: o.expediente || null,
    },
    ...(/lotes|varios adjudicatarios/.test(o.notas || "") ? { aviso: true } : {}),
    url: o.urlOficial,
  };
}

/** CSV sencillo del padrón de valio-datos (sin comillas con comas dentro salvo nombres). */
function leerPadron(ruta) {
  const [cabecera, ...filas] = readFileSync(ruta, "utf8").trim().split("\n");
  const campos = cabecera.split(",");
  return filas.map((linea) => {
    const valores = [];
    let actual = "";
    let comillas = false;
    for (const c of linea) {
      if (c === '"') comillas = !comillas;
      else if (c === "," && !comillas) {
        valores.push(actual);
        actual = "";
      } else actual += c;
    }
    valores.push(actual);
    return Object.fromEntries(campos.map((k, i) => [k, valores[i] ?? ""]));
  });
}

// --- lectura y validación ---------------------------------------------------

const rutaIndice = resolve(DIR_NACIONAL, "indice.json");
if (!existsSync(rutaIndice)) fallar(`no existe ${rutaIndice}`);
if (!existsSync(PADRON)) fallar(`no existe ${PADRON}`);
const indice = JSON.parse(readFileSync(rutaIndice, "utf8"));
const padron = leerPadron(PADRON);
// Teulada: el número de obras es el del piloto (lib/obras.ts), que se cuenta aquí.
const obrasPiloto = (readFileSync(resolve(RAIZ_APP, "lib/obras.ts"), "utf8").match(/"municipio": "Teulada"/g) ?? []).length;

const provincias = new Map(); // cp → { ine → municipio con sus obras }
const numObras = new Map([["03128", obrasPiloto]]);
const idsPublicados = []; // solo de municipios que se publican
const generados = [];
let sinObras = 0;

for (const entrada of indice) {
  if (PILOTO.has(entrada.ine)) continue;
  if (!/^\d{5}$/.test(entrada.ine)) fallar(`INE raro: ${entrada.ine}`);
  const doc = JSON.parse(readFileSync(resolve(DIR_NACIONAL, "municipios", `${entrada.ine}.json`), "utf8"));
  if (!(doc.poblacion?.habitantes > 0)) fallar(`${entrada.nombre}: sin población`);
  const vistos = new Set();
  const obras = [];
  for (const o of doc.obras.filter(adjudicada)) {
    const fecha = o.fechaAdjudicacion || o.fechaPublicacion || o.actualizado;
    // Sin importe adjudicado no hay cifra honesta que enseñar: fuera.
    if (!(o.importeAdjudicadoSinIva > 0)) continue;
    if (!/^\d{4}/.test(fecha || "") || !o.urlOficial?.startsWith("https://")) continue;
    const obra = aObra(entrada.ine, o);
    if (vistos.has(obra.id)) fallar(`${entrada.nombre}: id repetido ${obra.id}`);
    vistos.add(obra.id);
    obras.push(obra);
  }
  // Un municipio sin ninguna adjudicación (todo desierto) sale en el buscador con 0.
  if (!obras.length) {
    sinObras += 1;
    continue;
  }
  const cp = entrada.ine.slice(0, 2);
  if (!provincias.has(cp)) provincias.set(cp, {});
  provincias.get(cp)[entrada.ine] = {
    nombre: doc.municipio,
    provincia: doc.provincia,
    poblacion: {
      municipio: doc.municipio,
      habitantes: doc.poblacion.habitantes,
      referencia: fechaEs(doc.poblacion.referencia),
      fuenteNombre: "INE — Cifras oficiales del padrón (tabla 29005)",
      fuenteUrl: doc.poblacion.fuenteUrl,
    },
    obras,
  };
  numObras.set(entrada.ine, obras.length);
  idsPublicados.push(...vistos);
  generados.push(doc.generado);
}

// Regla 13 a escala: en la pasada de 2026-10 eran ~4.400 municipios con obras.
if (numObras.size < 3000) fallar(`solo ${numObras.size} municipios con obras: revisa valio-datos`);
for (const [ine, nombre] of [["28079", "Madrid"], ["46250", "València"], ["03014", "Alicante"]]) {
  if (!numObras.get(ine)) fallar(`${nombre} sin obras: revisa valio-datos`);
}
const generado = generados.sort().at(-1) ?? "";

// Buscador: todos los municipios del padrón, con o sin obras. Filas compactas:
// [ine, nombre, provincia, comunidad, nº de obras].
const filasIndice = padron
  .filter((m) => /^\d{5}$/.test(m.ine))
  .map((m) => [m.ine, m.nombre, m.provincia, m.ccaa, numObras.get(m.ine) ?? 0])
  .sort((a, b) => a[1].localeCompare(b[1], "es"));
if (filasIndice.length < 8000) fallar(`padrón con solo ${filasIndice.length} municipios`);

// Todo validado: carpeta, índice e ids nuevos se escriben aparte y se activan
// juntos; si algo falla a medias se restaura lo anterior.
const NUEVA = `${SALIDA_JSON}.nueva`;
rmSync(NUEVA, { recursive: true, force: true });
mkdirSync(NUEVA, { recursive: true });
let bytes = 0;
for (const [cp, municipios] of provincias) {
  const texto = JSON.stringify({ generado, fechaConsulta: fechaEs(generado), municipios }) + "\n";
  bytes += texto.length;
  writeFileSync(resolve(NUEVA, `${cp}.json`), texto);
}
const INDICE_NUEVO = `${SALIDA_INDICE}.nuevo`;
writeFileSync(INDICE_NUEVO, JSON.stringify({ generado, municipios: filasIndice }) + "\n");
const IDS_NUEVO = `${SALIDA_IDS}.nuevo`;
writeFileSync(
  IDS_NUEVO,
  `/**
 * ⚠️ ARCHIVO GENERADO — no editar a mano.
 * Regenerar con: node scripts/generar-nacional.mjs · ${generado}
 * Ids de las obras nacionales publicadas: el recuento solo acepta votos a estas.
 */

export const IDS_NACIONALES: readonly string[] = ${JSON.stringify(idsPublicados.sort())};
`,
);
const activar = [
  [NUEVA, SALIDA_JSON, `${SALIDA_JSON}.vieja`],
  [INDICE_NUEVO, SALIDA_INDICE, `${SALIDA_INDICE}.viejo`],
  [IDS_NUEVO, SALIDA_IDS, `${SALIDA_IDS}.viejo`],
];
for (const [, , viejo] of activar) rmSync(viejo, { recursive: true, force: true });
const habia = activar.map(([, destino]) => existsSync(destino));
const apartados = new Set();
const activados = new Set();
try {
  activar.forEach(([, destino, viejo], i) => {
    if (habia[i]) {
      renameSync(destino, viejo);
      apartados.add(i);
    }
  });
  activar.forEach(([nuevo, destino], i) => {
    renameSync(nuevo, destino);
    activados.add(i);
  });
} catch (error) {
  // Vuelta atrás de todo: fuera lo nuevo ya activado (aunque antes no hubiera
  // nada) y lo anterior a su sitio. Nunca queda una mezcla publicada.
  activar.forEach(([, destino, viejo], i) => {
    if (activados.has(i)) rmSync(destino, { recursive: true, force: true });
    if (apartados.has(i)) renameSync(viejo, destino);
  });
  fallar(`no se pudo activar la publicación nueva (se restaura la anterior): ${error.message}`);
}
for (const [, , viejo] of activar) rmSync(viejo, { recursive: true, force: true });
console.log(
  `✓ ${numObras.size} municipios con obras (${sinObras} sin adjudicaciones), ${idsPublicados.length} obras, ` +
    `${provincias.size} provincias (${(bytes / 1e6).toFixed(1)} MB) · buscador con ${filasIndice.length} municipios`,
);
