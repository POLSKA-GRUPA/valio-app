/**
 * lugar-del-titulo.mjs — Saca del título de una obra el lugar que nombra.
 *
 * Lo comparten scripts/geocodificar.mjs (que pregunta a CartoCiudad) y
 * scripts/generar-nacional.mjs (que vuelve a calcular la misma consulta para
 * encontrar su resultado en la caché). Si cambian las reglas, cambia la
 * consulta, cambia su hash y la caché vieja simplemente deja de usarse.
 *
 * Es conservador a propósito: mejor no situar una obra que situarla mal.
 * Solo reconoce un lugar cuando el título lo nombra con su tipo delante
 * («calle Ceres», «CEIP La Florida», «Cementerio municipal»…).
 */

import { createHash } from "node:crypto";

/** Versión de las reglas: entra en el hash de la consulta. */
export const VERSION_REGLAS = 2;

/** «&#243;» → «ó», «&amp;» → «&»: algunos títulos de PLACE vienen así. */
export function decodificar(texto) {
  return texto
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

/** Sin acentos, en minúsculas, solo letras y números separados por un espacio. */
export function plano(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

/** Palabras que no distinguen un lugar de otro (artículos y preposiciones, castellano y valenciano/catalán). */
const VACIAS = new Set(
  "de del la las el els los les l d y i e a al en dels sa ses es s o na".split(" "),
);

/** Abreviaturas frecuentes dentro del nombre, antes de cortar por los puntos. */
const ABREVIATURAS = [
  [/\bntra\.?\s*sra\.?/gi, "Nuestra Señora"],
  [/\bdr\.(?=\s)/gi, "Doctor"],
  [/\bdra\.(?=\s)/gi, "Doctora"],
  [/\bsta\.(?=\s)/gi, "Santa"],
  [/\bsto\.(?=\s)/gi, "Santo"],
  [/\bsr\.(?=\s)/gi, "Señor"],
  [/\bsra\.(?=\s)/gi, "Señora"],
  [/\bgral\.(?=\s)/gi, "General"],
  [/\bpte\.(?=\s)/gi, "Presidente"],
  [/\bprof\.(?=\s)/gi, "Profesor"],
  // Nombres con « y » dentro: que el corte por « y » no los parta.
  [/\b(ram[oó]n|ortega|pi|gil)\s+y\s+(cajal|gasset|margall|carrasco)\b/gi, "$1·y·$2"],
  [/\bc\.\s?e\.\s?i\.\s?p\.?/gi, "CEIP"],
  [/\bc\.\s?p\.(?=\s)/gi, "CP"],
];

/**
 * Tipos de lugar. `nivel`: «calle» si es una vía, «lugar» si es un sitio con
 * nombre. `familia`: lo que debe decir CartoCiudad para darlo por el mismo
 * tipo (en tip_via o en el propio nombre). `sinNombre`: vale sin nombre propio.
 */
export const TIPOS = {
  calle: { nivel: "calle", consulta: "calle", familia: /^(calle|carrer|rua|ruela|kalea)$/ },
  avenida: { nivel: "calle", consulta: "avenida", familia: /^(avenida|avinguda|avda|etorbidea)$/ },
  plaza: { nivel: "calle", consulta: "plaza", familia: /^(plaza|placa|praza|plazuela|placeta)$/ },
  paseo: { nivel: "calle", consulta: "paseo", familia: /^(paseo|passeig|pasealekua)$/ },
  camino: { nivel: "calle", consulta: "camino", familia: /^(camino|cami|camin|bidea)$/ },
  carretera: { nivel: "calle", consulta: "carretera", familia: /^(carretera|ctra)$/ },
  colegio: { nivel: "lugar", consulta: "ceip", familia: /\b(ceip|cp|colegio|col legi|escuela|escola|centro docente|educacion infantil y primaria)\b/ },
  polideportivo: { nivel: "lugar", consulta: "polideportivo", familia: /\b(polideportivo|poliesportiu|pabellon|pavello|instalacion deportiva|deportiv)/ },
  cementerio: { nivel: "lugar", consulta: "cementerio", familia: /\b(cementerio|cementiri|cemiterio)\b/, sinNombre: true },
  poligono: { nivel: "lugar", consulta: "poligono industrial", familia: /\b(poligono|poligon|zona industrial|area industrial|parque empresarial)\b/ },
  parque: { nivel: "lugar", consulta: "parque", familia: /\b(parque|parc|jardin|jardi|zona verde)\b/ },
  barrio: { nivel: "lugar", consulta: "barrio", familia: /\b(barrio|barri|urbanizacion|urbanitzacio|poblacion|nucleo|entidad)\b/ },
  urbanizacion: { nivel: "lugar", consulta: "urbanizacion", familia: /\b(urbanizacion|urbanitzacio|barrio|barri|poblacion|nucleo|entidad)\b/ },
};

/**
 * Cómo se escribe cada tipo en los títulos. El orden importa: lo más largo
 * primero. «C/» y abreviaturas con punto van sin \b final.
 */
const DISPARADORES = [
  ["calle", /(?:^|[\s(«"“,;:])(?:calle|carrer|r[uú]a)\s+/i],
  ["calle", /(?:^|[\s(«"“,;:])c\s?\/\.?\s*/i],
  ["avenida", /(?:^|[\s(«"“,;:])(?:avenida|avinguda|avda\.?|avgda\.?|avd\.|av\.)\s*/i],
  ["plaza", /(?:^|[\s(«"“,;:])(?:plaza|pla[çc]a|praza|pza\.?|pl\.)\s+/i],
  ["paseo", /(?:^|[\s(«"“,;:])(?:paseo|passeig|p[º°]|p\.[º°])\s*/i],
  ["camino", /(?:^|[\s(«"“,;:])(?:camino|cam[ií])\s+/i],
  ["carretera", /(?:^|[\s(«"“,;:])(?:carretera|ctra\.?)\s+/i],
  ["colegio", /(?:^|[\s(«"“,;:])(?:ceip|c\.?p\.?|colegio(?:\s+p[uú]blico)?|col·legi(?:\s+p[uú]blic)?)\s+/i],
  ["polideportivo", /(?:^|[\s(«"“,;:])(?:polideportivo|poliesportiu)(?:\s+municipal)?\s*/i],
  ["cementerio", /(?:^|[\s(«"“,;:])(?:cementerio|cementiri)\s*/i],
  ["poligono", /(?:^|[\s(«"“,;:])(?:pol[ií]gono|pol[ií]gon)(?:\s+industrial)?\s+/i],
  ["parque", /(?:^|[\s(«"“,;:])(?:parque|parc)\s+/i],
  ["barrio", /(?:^|[\s(«"“,;:])(?:barrio|barri)\s+/i],
  ["urbanizacion", /(?:^|[\s(«"“,;:])(?:urbanizaci[oó]n|urbanitzaci[oó]|urb\.)\s*/i],
];

/** Dónde acaba el nombre del lugar. */
const CORTES = [
  /[,;:()"«»“”\[\]/|]/,
  /\.(?:\s|$)/,
  /\s[-–—]\s/,
  /\s(?:y|e|i|entre|hasta|desde|hacia|fins|cap|con|amb|para|per|por|junto|frente|esquina|cruce|confluencia|tramo|tram|fase|lote|sito|sita|tras|esq\.?|distrito|barrio|ubicaci[oó]n|incluid[oa]s?|situad[oa]|ubicad[oa]|s\/n|sn|n[º°o]\.?|n[uú]m\.?|n[uú]mero|n\.[º°])(?=\s|$)/i,
  /\s(?:en|a)\s+(?:el|la|los|las|l'|els|les)\s/i,
  /\s(?:del?|en)\s+(?:este|nuestro|dicho|el|aquest)?\s*(?:municipio|t[eé]rmino|t\.?\s?m\.?|casco|n[uú]cleo|terme|poble|localidad|ciudad)\b/i,
  /\s(?:de|del|en)\s+(?:la\s+)?(?:localidad|poblaci[oó]n|pedan[ií]a)\b/i,
  /(?:^|\s)\d/,
  /\sn\s?[º°.]{1,2}\s?\d/i,
];

/** Nombres que no son un nombre propio: el título habla del tipo, no de un sitio. */
const GENERICOS = new Set(
  (
    "municipal publico publica principal nuevo nueva existente actual mismo misma dicho dicha " +
    "infantil infantiles juegos juego bomberos movil contadores vehiculos maquinaria " +
    "rural rurales vecinal vecinales agricola agricolas forestal forestales local locales " +
    "urbano urbana urbanos urbanas acceso accesos interior exterior tierra asfaltado " +
    "industrial empresarial deportivo deportiva solar viejo vieja zona area sector parcela"
  ).split(" "),
);

/** En una vía solo son genéricas las que describen el camino, no las que lo nombran. */
const GENERICOS_VIA = new Set(
  (
    "municipal publico publica existente actual mismo misma dicho dicha acceso accesos interior exterior " +
    "rural rurales vecinal vecinales agricola agricolas forestal forestales tierra asfaltado servicio"
  ).split(" "),
);

/** Palabras del propio tipo: no cuentan como nombre. */
const PALABRAS_TIPO = new Set(
  (
    "calle carrer rua avenida avinguda avda plaza placa praza paseo passeig camino cami carretera ctra " +
    "ceip cp colegio col legi publico publica polideportivo poliesportiu municipal cementerio cementiri " +
    "poligono poligon industrial parque parc barrio barri urbanizacion urbanitzacio urb"
  ).split(" "),
);

/** Palabras con peso de un nombre: sin vacías ni palabras de tipo. */
export function fichas(texto) {
  return plano(texto)
    .split(" ")
    .filter((p) => p && !VACIAS.has(p) && !PALABRAS_TIPO.has(p));
}

/** Variantes del nombre del municipio para quitarlo del final («… de Benidorm»). */
function nombresMunicipio(municipio) {
  const partes = municipio.split("/").map((p) => p.trim());
  const out = new Set();
  for (const p of partes) {
    out.add(p);
    const m = p.match(/^(.*),\s*(el|la|los|las|l'|els|les|o|a|os|as|es|sa|ses)$/i);
    if (m) out.add(`${m[2]}${m[2].endsWith("'") ? "" : " "}${m[1]}`).add(m[1]);
  }
  return [...out].map(plano).filter(Boolean);
}

/**
 * El primer lugar que nombra el título, o null.
 * Devuelve { tipo, nivel, nombre, consulta }: `consulta` es lo que se pregunta
 * a CartoCiudad (ya en minúsculas y sin acentos).
 */
export function lugarDelTitulo(titulo, municipio) {
  // Un salto de línea separa frases («…Vallecas\nUbicación: Calle…»).
  let texto = decodificar(titulo).replace(/\s*\n\s*/g, ". ").replace(/\s+/g, " ");
  for (const [re, sust] of ABREVIATURAS) texto = texto.replace(re, sust);
  const letras = texto.replace(/[^\p{L}]/gu, "");
  const todoMayusculas = letras.length > 0 && letras.replace(/[^\p{Lu}]/gu, "").length / letras.length > 0.8;

  // Todos los disparadores, por orden de aparición: vale el primero que dé un lugar.
  const vistos = [];
  for (const [tipo, re] of DISPARADORES) {
    for (const m of texto.matchAll(new RegExp(re.source, "gi"))) {
      vistos.push({ tipo, indice: m.index, fin: m.index + m[0].length });
    }
  }
  vistos.sort((a, b) => a.indice - b.indice || b.fin - a.fin);
  for (const [i, v] of vistos.entries()) {
    const lugar = leer(texto, v.tipo, v.fin, municipio, todoMayusculas);
    if (!lugar) continue;
    // «Cementerio» sin nombre solo si la obra va de él: que sea lo primero que
    // nombra el título y no una referencia («camino del…», «zona antiguo…»).
    if (!lugar.nombre) {
      const antes = plano(texto.slice(Math.max(0, v.indice - 30), v.indice + 1));
      if (i > 0 || /\b(zona|junto|frente|cerca|antiguo|viejo|camino|caminos|calle|calles|travesia|carretera|acceso|cami|carrer|carrers|avenida|avenidas|plaza|plazas)( (al|del|de|a|el|la|los|las))*$/.test(antes)) continue;
    }
    return lugar;
  }
  return null;
}

/** Tipos en los que el nombre tiene que parecer un nombre propio (mayúscula). */
const EXIGE_MAYUSCULA = new Set(["camino", "parque", "barrio", "urbanizacion", "poligono", "polideportivo", "colegio"]);
const ARTICULO_INICIAL = /^(?:(?:de|del|dels|de la|de los|de las|la|el|els|los|las|les)\s+|(?:d|l)['’]\s*)/i;

/** Intenta leer un lugar a partir de un disparador concreto. */
function leer(texto, tipo, fin, municipio, todoMayusculas) {
  const def = TIPOS[tipo];
  const resto = texto.slice(fin);
  // «urbanización de la calle…», «urbanización del sector…»: ahí es la obra, no un sitio.
  if (tipo === "urbanizacion" && /^(?:de|del|d['’]|dels|i|y)\b/i.test(resto)) return null;
  // Nombre: desde el disparador hasta el primer corte; sin artículo inicial.
  let corte = resto.length;
  for (const re of CORTES) {
    const m = re.exec(resto);
    if (m && m.index < corte) corte = m.index;
  }
  let nombre = resto.slice(0, corte).trim();
  for (let i = 0; i < 2; i++) nombre = nombre.replace(ARTICULO_INICIAL, "").trim();
  // «parque infantil», «camino de titularidad municipal»: sin mayúscula no es un nombre propio.
  if (EXIGE_MAYUSCULA.has(tipo) && !todoMayusculas && nombre && !/^[\p{Lu}\d]/u.test(nombre)) return null;

  // Fuera el municipio al final («Parque del Moralet de Benidorm»).
  let nombrePlano = plano(nombre);
  for (const nm of nombresMunicipio(municipio)) {
    for (const prep of ["de ", "del ", "d ", "en ", ""]) {
      const cola = ` ${prep}${nm}`;
      if (nombrePlano.endsWith(cola)) nombrePlano = nombrePlano.slice(0, -cola.length).trim();
    }
    if (nombrePlano === nm) nombrePlano = "";
  }

  const todas = fichas(nombrePlano);
  // En una vía casi todo es nombre («calle Nueva», «calle Mayor»); en un
  // sitio, «parque infantil» o «polideportivo municipal» no dicen cuál.
  const genericos = def.nivel === "calle" ? GENERICOS_VIA : GENERICOS;
  // «Nuevo», «Vieja»… en mayúscula dentro del nombre son parte de él («Polígono
  // Industrial Nuevo Tollo»), no un adjetivo de relleno.
  const propias = new Set(
    todoMayusculas ? [] : [...nombre.matchAll(/\b(Nuev[oa]|Viej[oa])\b/gu)].map((m) => plano(m[1])),
  );
  const nombreFichas =
    def.nivel === "calle" ? todas : todas.filter((p) => !genericos.has(p) || (propias.has(p) && todas.length > 1));

  if (def.sinNombre && nombreFichas.length === 0) {
    // «Cementerio municipal»: vale si en el municipio hay uno solo (lo decide geocodificar).
    return { tipo, nivel: def.nivel, nombre: "", consulta: def.consulta };
  }
  if (nombreFichas.length === 0 || nombreFichas.every((p) => genericos.has(p))) return null;
  if (nombreFichas.length > 5) return null; // un nombre tan largo es una frase, no un sitio
  // «Carretera CV-84» es una carretera entera: no hay punto honesto.
  if (tipo === "carretera" && /^[a-z]{1,3} ?\d/.test(nombrePlano)) return null;
  if (nombreFichas.every((p) => /^\d+$/.test(p) || p.length < 3)) return null;

  const consulta = `${def.consulta} ${nombreFichas.join(" ")}`;
  // Número de portal justo detrás del nombre («C/ Cervantes, 28», «calle Ilusión nº32»):
  // con él, CartoCiudad da el portal y no hace falta el punto medio de la calle.
  // Nunca «2ª fase», «12 viviendas», años ni rangos raros: solo 1-3 cifras sueltas.
  const portal =
    def.nivel === "calle" && tipo !== "carretera" && tipo !== "camino"
      ? resto
          .slice(corte)
          .match(/^\s*,?\s*(?:(?:n\s?[º°o.]{1,2}|n[uú]m(?:ero)?\.?)\s*)?(\d{1,3})(?![\d.,ªº°]|\s*(?:viviendas|vivendes|m\b|m2|ml|metros|%|€|plazas|nichos|unidades|a[ñn]os|d[ií]as|meses))/i)?.[1]
      : undefined;
  if (portal && Number(portal) > 0) {
    return { tipo, nivel: def.nivel, nombre: nombreFichas.join(" "), consulta: `${consulta} ${Number(portal)}`, consultaVia: consulta, portal: Number(portal) };
  }
  return { tipo, nivel: def.nivel, nombre: nombreFichas.join(" "), consulta };
}

/** Clave de una obra en la caché: id + hash corto de la consulta y las reglas. */
export function claveObra(id, ine, consulta) {
  const h = createHash("sha256").update(`${VERSION_REGLAS}|${ine}|${consulta}`).digest("hex").slice(0, 10);
  return `${id}|${h}`;
}
