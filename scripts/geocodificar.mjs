#!/usr/bin/env node
/**
 * geocodificar.mjs — Sitúa en el mapa las obras nacionales cuyo título nombra
 * un lugar, con CartoCiudad (geocodificador oficial del IGN/CNIG).
 *
 * QUÉ HACE
 *   1. Lee public/datos/provincias/<cp>.json (lo que escribe generar-nacional).
 *   2. Saca del título el lugar que nombra («calle Ceres», «CEIP La Florida»…)
 *      con scripts/lugar-del-titulo.mjs. Si no nombra ninguno, no se toca.
 *   3. Pregunta a CartoCiudad /candidates restringido a ese municipio
 *      (municipio_filter con el nombre que usa CartoCiudad, resuelto por INE)
 *      y se queda solo con una calle, portal, topónimo o punto de interés:
 *        - del municipio correcto (muniCode = INE de la obra, siempre),
 *        - del mismo tipo (una «avenida» no vale por una «plaza»),
 *        - con el mismo nombre (palabra a palabra, sin acentos ni artículos),
 *        - sin ambigüedad (dos sitios distintos y lejanos con ese nombre: fuera),
 *        - y, si es una calle, no demasiado larga (su punto medio no diría nada).
 *      Nunca usa el centroide del municipio ni de un núcleo con su mismo nombre.
 *   4. Guarda el resultado por obra en datos-geo/geocodificado.json y las
 *      respuestas crudas de la API en datos-geo/respuestas.json: si se cambian
 *      las reglas, se recalcula sin volver a preguntar. Reanudable.
 *
 * Datos: CartoCiudad, © Instituto Geográfico Nacional (CNIG), CC BY 4.0
 * (Orden FOM/2807/2015). Atribución en la app: «CartoCiudad CC BY 4.0 scne.es».
 *
 * USO
 *   node scripts/geocodificar.mjs [--provincias 28,03] [--sin-red]
 *   --sin-red: solo recalcula con las respuestas ya guardadas (no llama a la API).
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { claveObra, fichas, lugarDelTitulo, plano, TIPOS, VERSION_REGLAS } from "./lugar-del-titulo.mjs";

const RAIZ_APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_PROVINCIAS = resolve(RAIZ_APP, "public/datos/provincias");
const DIR_GEO = resolve(RAIZ_APP, "datos-geo");
const SALIDA = resolve(DIR_GEO, "geocodificado.json");
const RESPUESTAS = resolve(DIR_GEO, "respuestas.json");

const API = "https://www.cartociudad.es/geocoder/api/geocoder";
const AGENTE = "valio-app-geocodificador/1.0 (obras publicas; contacto: POLSKA-GRUPA/valio-app)";
const EN_PARALELO = 3; // ≤ 4 peticiones a la vez
const PAUSA_MS = 250; // entre peticiones de cada hilo
const REINTENTOS = 6;
const MAX_CALLE_M = 1000; // calle más larga que esto (sin portal): su punto no sitúa la obra
const MAX_DISPERSION_M = 300; // varios candidatos válidos: solo si están todos juntos
const HOY = new Date().toISOString().slice(0, 10);

function fallar(mensaje) {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const SIN_RED = args.includes("--sin-red");
const iProv = args.indexOf("--provincias");
const SOLO = iProv >= 0 ? new Set(args[iProv + 1].split(",")) : null;

// --- caché ---------------------------------------------------------------

function leerJson(ruta, vacio) {
  return existsSync(ruta) ? JSON.parse(readFileSync(ruta, "utf8")) : vacio;
}

/** Escribe a un temporal y lo renombra: un corte a medias no deja un JSON roto. */
function escribirJson(ruta, datos) {
  const tmp = `${ruta}.tmp`;
  writeFileSync(tmp, JSON.stringify(datos) + "\n");
  renameSync(tmp, ruta);
}

mkdirSync(DIR_GEO, { recursive: true });
const salida = leerJson(SALIDA, { obras: {} });
// respuestas.candidatos["ine|consulta"] = filas recortadas · respuestas.find["tipo|id"] = punto y longitud
const respuestas = leerJson(RESPUESTAS, { municipios: {}, candidatos: {}, find: {} });

function guardar() {
  salida.generado = new Date().toISOString();
  salida.versionReglas = VERSION_REGLAS;
  salida.fuente = "CartoCiudad (IGN/CNIG), CC BY 4.0 — https://www.cartociudad.es/geocoder/api/geocoder/";
  escribirJson(SALIDA, salida);
  escribirJson(RESPUESTAS, respuestas);
}

// --- red -------------------------------------------------------------------

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let llamadas = 0;

/** GET a la API con reintentos (429, 5xx, red, cuerpo no JSON). Lanza si no hay manera. */
async function pedir(ruta, parametros) {
  if (SIN_RED) throw new Error("sin red");
  const url = new URL(`${API}/${ruta}`);
  for (const [k, v] of Object.entries(parametros)) url.searchParams.set(k, v);
  let espera = 2000;
  for (let intento = 1; intento <= REINTENTOS; intento++) {
    try {
      llamadas += 1;
      const r = await fetch(url, { headers: { "User-Agent": AGENTE, Accept: "application/json" } });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { definitivo: true });
      const texto = await r.text();
      await esperar(PAUSA_MS);
      return texto.trim() ? JSON.parse(texto) : null;
    } catch (error) {
      if (error.definitivo || intento === REINTENTOS) throw error;
      await esperar(espera);
      espera = Math.min(espera * 2, 60000);
    }
  }
}

/** Una fila de /candidates sin lo que no hace falta (nunca la geometría). */
const recortar = (c) => ({
  id: String(c.id),
  type: c.type,
  muniCode: c.muniCode,
  muni: c.muni,
  address: c.address,
  tip_via: c.tip_via,
  poblacion: c.poblacion,
  lat: c.lat,
  lng: c.lng,
});

/** Diagonal en metros de la caja que envuelve una geometría WKT. */
function extensionM(wkt) {
  const nums = (wkt || "").match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 4) return 0;
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number(nums[i]);
    const y = Number(nums[i + 1]);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return distanciaM(minY, minX, maxY, maxX);
}

function distanciaM(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const x = (lon2 - lon1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
  const y = (lat2 - lat1) * rad;
  return Math.round(Math.sqrt(x * x + y * y) * 6371000);
}

/** Nombre del municipio tal como lo escribe CartoCiudad (para municipio_filter), por INE. */
async function nombreCartociudad(ine, nombre) {
  if (ine in respuestas.municipios) return respuestas.municipios[ine];
  const variantes = new Set();
  for (const parte of nombre.split("/").map((p) => p.trim())) {
    const m = parte.match(/^(.*),\s*(.+)$/); // «Vall de Gallinera, la» → «la Vall de Gallinera»
    variantes.add(m ? `${m[2]}${m[2].endsWith("'") ? "" : " "}${m[1]}` : parte);
    if (m) variantes.add(m[1]);
  }
  for (const q of variantes) {
    const filas = await pedir("candidates", {
      q,
      limit: "15",
      no_process: "callejero,portal,toponimo,ngbe,expendeduria,punto_recarga_electrica,carretera,poblacion,provincia,comunidad autonoma",
    });
    const hallado = (filas ?? []).find((c) => /^municipio$/i.test(c.type) && c.muniCode === ine);
    if (hallado) {
      respuestas.municipios[ine] = hallado.muni;
      return hallado.muni;
    }
  }
  respuestas.municipios[ine] = null; // CartoCiudad no lo conoce por ese nombre: no se sitúa nada
  return null;
}

async function candidatos(ine, muniCarto, consulta) {
  const clave = `${ine}|${consulta}`;
  if (!(clave in respuestas.candidatos)) {
    const filas = await pedir("candidates", {
      q: consulta,
      municipio_filter: muniCarto,
      limit: "10",
      no_process: "municipio,provincia,comunidad autonoma,expendeduria,punto_recarga_electrica",
    });
    respuestas.candidatos[clave] = { fecha: HOY, filas: (filas ?? []).map(recortar) };
  }
  return respuestas.candidatos[clave].filas;
}

/** Punto (y longitud si es una calle) de un candidato concreto, con /find. */
async function punto(c) {
  const clave = `${c.type}|${c.id}`;
  if (!(clave in respuestas.find)) {
    const d = await pedir("find", { id: c.id, type: c.type });
    respuestas.find[clave] = d
      ? { lat: d.lat, lng: d.lng, muniCode: d.muniCode, address: d.address, extensionM: extensionM(d.geom), state: d.state }
      : null;
  }
  return respuestas.find[clave];
}

// --- reglas de aceptación ---------------------------------------------------

/** Nombre del candidato sin el tipo de vía, la población ni el municipio. */
function nombreCandidato(c) {
  let n = (c.address || "").split(/,| \(/)[0];
  if (c.type === "callejero" || c.type === "portal") {
    const via = plano(c.tip_via || "");
    if (via && plano(n).startsWith(`${via} `)) n = plano(n).slice(via.length + 1);
  }
  return n;
}

/**
 * Mismo nombre: todas las palabras del título están en el candidato y, como
 * mucho, el candidato tiene una de más (solo si el título da dos o más).
 */
function mismoNombre(pedido, ofrecido) {
  const p = new Set(pedido);
  const o = new Set(ofrecido);
  if (![...p].every((x) => o.has(x))) return false;
  const sobran = [...o].filter((x) => !p.has(x)).length;
  return sobran === 0 || (sobran === 1 && p.size >= 2);
}

function aceptable(lugar, c, ine, muniCarto) {
  if (c.muniCode !== ine) return false;
  const def = TIPOS[lugar.tipo];
  const nombre = nombreCandidato(c);
  if (def.nivel === "calle") {
    if (c.type !== "callejero" && c.type !== "portal") return false;
    if (!def.familia.test(plano(c.tip_via || ""))) return false;
    return mismoNombre(fichas(lugar.nombre), fichas(nombre));
  }
  // Sitios: topónimo/ngbe (punto de interés); núcleo solo para barrios y urbanizaciones.
  const esNucleo = c.type === "poblacion";
  if (!["toponimo", "ngbe"].includes(c.type) && !(esNucleo && ["barrio", "urbanizacion"].includes(lugar.tipo))) return false;
  if (esNucleo && plano(c.poblacion || nombre) === plano(muniCarto)) return false; // eso es el pueblo entero
  const texto = plano(`${nombre} ${c.tip_via || ""}`);
  if (!def.familia.test(texto) && !esNucleo) return false;
  if (def.sinNombre && !lugar.nombre) return true;
  // Del nombre del candidato fuera el municipio («Cementerio Municipal de Calp»).
  const sinMunicipio = fichas(nombre).filter((x) => !fichas(muniCarto).includes(x) && x !== "municipal");
  return mismoNombre(fichas(lugar.nombre), sinMunicipio);
}

/** Resuelve una obra. Devuelve el registro para la caché, o null si falla la red. */
async function resolver(ine, nombreMunicipio, lugar) {
  const muniCarto = await nombreCartociudad(ine, nombreMunicipio);
  if (!muniCarto) return { sinResultado: true, consulta: lugar.consulta, motivo: "municipio desconocido en CartoCiudad" };
  // Con número de portal: primero el portal exacto (punto en la fachada).
  if (lugar.portal) {
    const conNumero = await candidatos(ine, muniCarto, lugar.consulta);
    const portales = conNumero.filter((c) => {
      if (c.type !== "portal" || c.muniCode !== ine || !c.lat || !c.lng) return false;
      if (!TIPOS[lugar.tipo].familia.test(plano(c.tip_via || ""))) return false;
      const m = plano(nombreCandidato(c)).match(/^(.*) (\d+)(?: [a-z])?$/);
      return Boolean(m) && Number(m[2]) === lugar.portal && mismoNombre(fichas(lugar.nombre), fichas(m[1]));
    });
    const lejos = portales.some((c) => distanciaM(c.lat, c.lng, portales[0].lat, portales[0].lng) > MAX_DISPERSION_M);
    if (portales.length && !lejos) {
      const [c] = portales;
      return {
        lat: Math.round(c.lat * 1e6) / 1e6,
        lon: Math.round(c.lng * 1e6) / 1e6,
        precision: "calle",
        consulta: lugar.consulta,
        tipoCartociudad: "portal",
        direccion: c.address,
        fecha: respuestas.candidatos[`${ine}|${lugar.consulta}`]?.fecha ?? HOY,
      };
    }
  }
  const consulta = lugar.consultaVia ?? lugar.consulta;
  const filas = await candidatos(ine, muniCarto, consulta);
  const validos = filas.filter((c) => aceptable(lugar, c, ine, muniCarto));
  if (!validos.length) {
    const motivo = filas.length ? "ningún candidato del mismo tipo y nombre en el municipio" : "CartoCiudad no devuelve nada";
    return { sinResultado: true, consulta: lugar.consulta, motivo };
  }
  const puntos = [];
  for (const c of validos.slice(0, 4)) {
    let p = { lat: c.lat, lng: c.lng, muniCode: c.muniCode, address: c.address, extensionM: 0 };
    if (!c.lat || !c.lng || c.type === "callejero") p = await punto(c);
    if (!p || !p.lat || !p.lng || p.muniCode !== ine) continue;
    puntos.push({ c, p });
  }
  if (!puntos.length) return { sinResultado: true, consulta: lugar.consulta, motivo: "sin coordenadas en CartoCiudad" };
  const [primero] = puntos;
  const lejos = puntos.some(({ p }) => distanciaM(p.lat, p.lng, primero.p.lat, primero.p.lng) > MAX_DISPERSION_M);
  if (lejos) return { sinResultado: true, consulta: lugar.consulta, motivo: `ambiguo: ${puntos.length} sitios distintos con ese nombre` };
  if (primero.p.extensionM > MAX_CALLE_M) {
    return { sinResultado: true, consulta: lugar.consulta, motivo: `vía demasiado larga (${primero.p.extensionM} m)` };
  }
  return {
    lat: Math.round(primero.p.lat * 1e6) / 1e6,
    lon: Math.round(primero.p.lng * 1e6) / 1e6,
    precision: lugar.nivel,
    consulta: lugar.consulta,
    tipoCartociudad: primero.c.type,
    direccion: primero.c.address,
    ...(primero.p.extensionM ? { extensionM: primero.p.extensionM } : {}),
    fecha: respuestas.candidatos[`${ine}|${consulta}`]?.fecha ?? HOY,
  };
}

// --- recorrido ---------------------------------------------------------------

const cps = readdirSync(DIR_PROVINCIAS)
  .filter((f) => /^\d{2}\.json$/.test(f))
  .map((f) => f.slice(0, 2))
  .filter((cp) => !SOLO || SOLO.has(cp))
  .sort();
if (!cps.length) fallar(`no hay provincias en ${DIR_PROVINCIAS}`);

const tareas = [];
let total = 0;
for (const cp of cps) {
  const doc = JSON.parse(readFileSync(resolve(DIR_PROVINCIAS, `${cp}.json`), "utf8"));
  for (const [ine, m] of Object.entries(doc.municipios)) {
    for (const o of m.obras) {
      total += 1;
      const lugar = lugarDelTitulo(o.nombre, m.nombre);
      if (lugar) tareas.push({ cp, ine, municipio: m.nombre, id: o.id, lugar, clave: claveObra(o.id, ine, lugar.consulta) });
    }
  }
}
// Regla 13: si no sale ningún lugar, el primer sospechoso es el extractor.
if (total > 1000 && tareas.length < total * 0.1) fallar(`solo ${tareas.length} de ${total} títulos con lugar: revisa lugar-del-titulo.mjs`);
console.log(`${cps.length} provincias · ${total} obras · ${tareas.length} con un lugar en el título`);

let hechas = 0;
let fallos = 0;
let desdeGuardado = 0;
const inicio = Date.now();

async function hilo(cola) {
  for (;;) {
    const t = cola.shift();
    if (!t) return;
    try {
      // Siempre se recalcula con las respuestas guardadas: así cuentan los cambios de reglas.
      const r = await resolver(t.ine, t.municipio, t.lugar);
      salida.obras[t.clave] = r;
    } catch (error) {
      // Un fallo de red no es «sin resultado»: no se guarda y se reintenta en la próxima pasada.
      if (!SIN_RED) {
        fallos += 1;
        if (fallos <= 20) console.error(`  ! ${t.id} «${t.lugar.consulta}»: ${error.message}`);
      }
    }
    hechas += 1;
    desdeGuardado += 1;
    if (desdeGuardado >= 300) {
      desdeGuardado = 0;
      guardar();
      const min = ((Date.now() - inicio) / 60000).toFixed(1);
      console.log(`  … ${hechas}/${tareas.length} (${llamadas} llamadas, ${fallos} fallos de red, ${min} min)`);
    }
  }
}

process.on("SIGINT", () => {
  guardar();
  console.log("\ninterrumpido: guardado lo hecho; se reanuda al volver a lanzarlo");
  process.exit(130);
});

const cola = [...tareas];
await Promise.all(Array.from({ length: EN_PARALELO }, () => hilo(cola)));

// Fuera de la salida lo que ya no corresponde a ningún título actual (reglas viejas).
const vigentes = new Set(tareas.map((t) => t.clave));
if (!SOLO) for (const k of Object.keys(salida.obras)) if (!vigentes.has(k)) delete salida.obras[k];
guardar();

const deEstas = tareas.map((t) => salida.obras[t.clave]).filter(Boolean);
const situadas = deEstas.filter((r) => !r.sinResultado);
const porMotivo = {};
for (const r of deEstas) if (r.sinResultado) porMotivo[r.motivo.replace(/\d+/g, "N")] = (porMotivo[r.motivo.replace(/\d+/g, "N")] ?? 0) + 1;
console.log(
  `✓ ${situadas.length} situadas de ${tareas.length} con lugar (${((situadas.length / tareas.length) * 100).toFixed(1)} %) ` +
    `y ${((situadas.length / total) * 100).toFixed(1)} % de las ${total} obras · ` +
    `${situadas.filter((r) => r.precision === "calle").length} en calle, ${situadas.filter((r) => r.precision === "lugar").length} en lugar · ` +
    `${llamadas} llamadas · ${fallos} fallos de red`,
);
console.log("  sin resultado:", porMotivo);
// Hash de lo publicado: para comprobar que generar-nacional lee la misma versión.
console.log(`  huella ${createHash("sha256").update(JSON.stringify(salida.obras)).digest("hex").slice(0, 12)}`);
