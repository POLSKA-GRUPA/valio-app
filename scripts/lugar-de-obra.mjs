/**
 * lugar-de-obra.mjs — El lugar de una obra: el del título o el del anuncio.
 *
 * POR QUÉ. El título nombra un sitio en muchas obras («reforma de la calle
 * Ceres»), pero en muchas otras no. El anuncio de PLACE declara además un
 * lugar de ejecución (dirección, municipio, país) que el parser de valio-datos
 * copia tal cual en la compacta: { direccion, municipio, pais }, opcional,
 * una sola ubicación por obra, del mismo snapshot que la obra (nunca se
 * mezclan versiones). Este módulo produce las opciones para situarla:
 *
 *   1. «titulo»: el lugar que nombra el título (scripts/lugar-del-titulo.mjs,
 *      exactamente como hasta ahora; su clave de caché NO cambia).
 *   2. «ejecucion»: el lugar de ejecución del anuncio, solo si pasa filtros
 *      conservadores (mejor no situar que situar mal):
 *        - país España; vacío cuenta como España (PLACE publica contratos
 *          españoles y el país extranjero viene explícito en el anuncio),
 *        - municipio (CityName) equivalente al de la obra, aunque venga
 *          invertido («Alqueries, les») o bilingüe («Alacant/Alicante»),
 *        - una sola dirección, con el tipo de vía delante («Calle Mayor 12»):
 *          fuera direcciones genéricas, incompletas o múltiples,
 *        - el número pegado al nombre se saca como portal («calle Mayor 12»
 *          se normaliza a «calle Mayor, 12», conservador).
 *
 * Nunca: centroide del municipio, dirección del órgano contratante ni un
 * código postal solo. Eso no sitúa una obra.
 *
 * La elección entre ambas la hace elegirUbicacion(): manda el título; el
 * lugar de ejecución es fallback; si ambos dan punto y distan más de
 * 300 m, conflicto: no se sitúa.
 *
 * Todo es puro y sin red: los tests (scripts/lugar-de-obra.test.mjs) usan
 * fuentes sintéticas. La caché de ejecución lleva su propia versión de
 * extractor en la clave, para no mezclar reglas viejas ni tocar las 13.590
 * entradas de título que ya hay.
 */

import { createHash } from "node:crypto";
import { ABREVIATURAS, CORTES, claveObra, decodificar, DISPARADORES, lugarDelTitulo, nombresMunicipio, plano } from "./lugar-del-titulo.mjs";

/** Versión de ESTE extractor (el de lugarEjecucion): en el hash de su clave. */
export const VERSION_EXTRACTOR_EJECUCION = 1;

/** Si título y ejecución dan puntos distintos más lejos que esto: conflicto, no se sitúa. */
export const DISTANCIA_CONFLICTO_M = 300;

/**
 * Clave de la opción «lugar de ejecución» en la caché. Lleva la versión del
 * extractor de ejecución y el origen dentro del hash: nunca coincide con una
 * clave de título (claveObra) aunque la consulta sea la misma.
 */
export function claveEjecucion(id, ine, consulta) {
  const h = createHash("sha256")
    .update(`${VERSION_EXTRACTOR_EJECUCION}|ejecucion|${ine}|${consulta}`)
    .digest("hex")
    .slice(0, 10);
  return `${id}|${h}`;
}

/**
 * Distancia en metros entre dos puntos (misma fórmula que geocodificar.mjs).
 * Aproximación local: de sobra para comparar 300 m.
 */
export function distanciaM(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const x = (lon2 - lon1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
  const y = (lat2 - lat1) * rad;
  return Math.round(Math.sqrt(x * x + y * y) * 6371000);
}

/**
 * País España. Vacío o ausente cuenta como España: PLACE publica contratos
 * españoles y el país extranjero (obras de servicios fuera, embajadas…)
 * viene explícito en el anuncio. Cualquier otro país: no se sitúa por el
 * anuncio.
 */
export function paisEspanol(pais) {
  if (pais == null) return true;
  if (typeof pais !== "string") return false;
  return new Set(["", "es", "espana", "espanya", "espagna", "reino de espana", "kingdom of spain", "spain"]).has(plano(pais));
}

/**
 * ¿El CityName del anuncio es el municipio de la obra? Compara variantes
 * normalizadas (sin acentos ni mayúsculas): invertidas («Alqueries, les» =
 * «Les Alqueries») y bilingües («Alacant/Alicante»). Si el anuncio nombra
 * OTRO municipio, fuera: la geocodificación va restringida al INE de la obra.
 */
export function municipioEquivale(ciudad, municipio) {
  if (typeof ciudad !== "string" || !ciudad.trim() || typeof municipio !== "string") return false;
  const deLaObra = new Set(nombresMunicipio(municipio));
  return ciudad.split("/").every((parte) => parte.trim() && nombresMunicipio(parte).some((v) => deLaObra.has(v)));
}

/**
 * «calle Mayor 12» → «calle Mayor, 12». Conservador: solo cuando la
 * dirección ACABA en un número de 1-3 cifras pegado al nombre. Si ya hay
 * coma, si detrás viene algo más («12 3ºB», «12 de Octubre») o no acaba en
 * número, se devuelve tal cual.
 */
export function conComaDelPortal(direccion) {
  const t = decodificar(String(direccion ?? ""))
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Solo si lo que hay antes del número es una letra: si ya hay coma (o
  // cualquier otro signo) delante del número, se devuelve tal cual.
  return t.replace(/^(.+?\p{L})\s+(\d{1,3})$/u, "$1, $2");
}

/** Dónde empieza cada tipo de lugar en un texto (índices de los disparadores). */
function indicesDisparadores(texto) {
  const indices = [];
  for (const [, re] of DISPARADORES) {
    for (const m of texto.matchAll(new RegExp(re.source, "gi"))) indices.push(m.index);
  }
  return indices;
}

/**
 * El lugar de ejecución del anuncio, o null si no pasa los filtros.
 * `lugarEjecucion`: { direccion, municipio, pais } (pais opcional). Devuelve
 * lo mismo que lugarDelTitulo: { tipo, nivel, nombre, consulta, portal? } —
 * así scripts/geocodificar.mjs lo resuelve con las mismas reglas de siempre
 * (INE, tipo, nombre, ambigüedad, vía de más de 1 km…).
 */
export function lugarDeEjecucion(lugarEjecucion, municipio) {
  if (!lugarEjecucion || typeof lugarEjecucion !== "object") return null;
  const { direccion, municipio: ciudad, pais } = lugarEjecucion;
  if (!paisEspanol(pais)) return null;
  if (!municipioEquivale(ciudad, municipio)) return null;
  const texto = decodificar(String(direccion ?? "")).replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
  if (!texto) return null;
  // Una sola dirección, con el tipo delante: «Calle Mayor 12» sí;
  // «Rehabilitación en calle Mayor» o «Calle A y Calle B» no.
  const indices = indicesDisparadores(texto);
  if (indices.length !== 1 || indices[0] !== 0) return null;
  // El lector de títulos corta frases, listas y sufijos: una dirección de
  // ejecución no puede convertirse silenciosamente en sólo su primer tramo.
  const portalFinal = texto.match(/(?:,\s*|\s+)(?:(?:n\s*[º°o.]|n[úu]m(?:ero)?\.?)\s*)?(\d{1,3})$/i);
  if (/\d/.test(texto)) {
    // Sólo soportamos un portal simple al final: ni rangos, ni 12B/bis,
    // ni piso/ciudad/código postal que el lector pudiera cortar.
    if (!portalFinal || /[\d,]/.test(texto.slice(0, portalFinal.index))) return null;
  } else if (texto.includes(",")) return null;
  const disparador = DISPARADORES.map(([, re]) => re.exec(texto)).find((m) => m?.index === 0);
  let nombreCompleto = texto.slice(disparador[0].length, portalFinal?.index ?? texto.length).trim();
  for (const [re, sustitucion] of ABREVIATURAS) nombreCompleto = nombreCompleto.replace(re, sustitucion);
  // La MISMA lista y normalización que usa el lector: no mantener otra
  // blacklist que pueda olvidar un separador y truncar una dirección nueva.
  if (CORTES.some((re) => re.test(nombreCompleto))) return null;
  // Reutiliza la lectura del título: nombre hasta el corte y portal detrás.
  const lugar = lugarDelTitulo(texto, municipio);
  if (!lugar || !lugar.nombre) return null; // genérica o incompleta: nada honesto que llevar
  if (portalFinal && lugar.portal !== Number(portalFinal[1])) return null;
  return lugar;
}

/**
 * Opciones para situar una obra, en orden de preferencia:
 *   [{ origen: "titulo", lugar, clave }, { origen: "ejecucion", lugar, clave }]
 * Cada opción lleva su clave de caché (la de título es la de siempre; la de
 * ejecución lleva versión de extractor y origen). `obra`: { id, nombre,
 * lugarEjecucion? } tal como va en la compacta; `municipio`: el de la obra.
 */
export function opcionesDeObra(ine, obra, municipio) {
  const opciones = [];
  if (obra?.excluirPuntoAutomatico === true) return opciones;
  const anuncio = obra?.lugarEjecucion;
  // El INE de la obra identifica al órgano. Si el anuncio dice otro lugar,
  // ni siquiera un título homónimo permite situarla en el municipio del órgano.
  if (anuncio && typeof anuncio === "object" && (
    (typeof anuncio.municipio === "string" && anuncio.municipio.trim() && !municipioEquivale(anuncio.municipio, municipio)) ||
    (typeof anuncio.pais === "string" && anuncio.pais.trim() && !paisEspanol(anuncio.pais))
  )) return opciones;
  const titulo = lugarDelTitulo(obra?.nombre ?? "", municipio);
  if (titulo) opciones.push({ origen: "titulo", lugar: titulo, clave: claveObra(obra.id, ine, titulo.consulta) });
  const ejecucion = lugarDeEjecucion(obra?.lugarEjecucion, municipio);
  if (ejecucion) opciones.push({ origen: "ejecucion", lugar: ejecucion, clave: claveEjecucion(obra.id, ine, ejecucion.consulta) });
  return opciones;
}

/**
 * ¿Un resultado de la caché sirve como punto? Sin «sinResultado», con
 * coordenadas finitas y nivel conocido («calle» o «lugar»).
 */
export function esResultadoValido(r) {
  return Boolean(
    r &&
      !r.sinResultado &&
      Number.isFinite(r.lat) &&
      Number.isFinite(r.lon) &&
      (r.precision === "calle" || r.precision === "lugar"),
  );
}

/**
 * Elige el punto de una obra entre el del título y el del lugar de ejecución:
 *   - manda el título; el de ejecución es fallback si el título no resolvió;
 *   - ambos resueltos y a más de 300 m: conflicto → null (no se sitúa);
 *   - ambos resueltos y cerca: el del título (primera opción);
 *   - ninguno: null.
 * Devuelve el registro de la caché elegido con su origen («titulo» |
 * «ejecucion»). Pura: la validación del geo va en esResultadoValido.
 */
export function elegirUbicacion(rTitulo, rEjecucion) {
  const t = esResultadoValido(rTitulo) ? rTitulo : null;
  const e = esResultadoValido(rEjecucion) ? rEjecucion : null;
  if (t && e && distanciaM(t.lat, t.lon, e.lat, e.lon) > DISTANCIA_CONFLICTO_M) return null;
  const elegido = t ?? e;
  return elegido ? { ...elegido, origen: t ? "titulo" : "ejecucion" } : null;
}
