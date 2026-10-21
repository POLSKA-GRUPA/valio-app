/**
 * tipo-obra.mjs — Tipo de obra para los chips del mazo: por CPV principal si
 * el código es específico, y si no por las palabras del objeto (heurística).
 *
 * Es una ayuda para filtrar, no un dato oficial: lo que manda es el objeto.
 *
 * PROCEDENCIA DE LAS REGLAS CPV
 *   Reglamento CPV, Anexo I (vocabulario principal), versión 2008 vigente:
 *   DO L 74 de 15.3.2008. Verificación con el PDF oficial español:
 *   https://www.hacienda.gob.es/dgpatrimonio/junta%20consultiva/reglamento%20cpv/cpv%20principal.pdf
 *   (volcado a texto en /tmp/valio-continuacion/cpv.txt). Solo la división 45
 *   (trabajos de construcción) tiene reglas: el resto (suministros, servicios)
 *   cae a la heurística por título.
 *
 * CÓMO DECIDE (en orden)
 *   1. Se mira SOLO el CPV principal (el primero del array). Los secundarios
 *      se ignoran: un mismo contrato los acumula y engañan (una obra vial con
 *      CPV secundario de jardinería sigue siendo una obra vial).
 *   2. Gana la regla con el prefijo MÁS LARGO que empiece por el código: lo
 *      específico primero. Así 451127 (paisajismo → parques) no se come a
 *      45112730 (paisajismo en carreteras → urbanismo) ni a 45112714
 *      (cementerios → urbanismo).
 *   3. Código genérico (45000000, 45230000…), desconocido, ausente o de otra
 *      división: no decide y cae a la heurística por título; si el título
 *      tampoco dice nada, «urbanismo».
 *
 * Las 7 categorías son las de siempre (los chips del piloto): no se añaden ni
 * se quitan, y este módulo no tiene dependencias.
 */

/** Las 7 categorías del mazo, en el orden heredado. */
export const CATEGORIAS = ["seguridad", "medio ambiente", "deporte", "educacion", "patrimonio", "parques", "urbanismo"];

/**
 * Heurística por palabras del objeto. EXACTA a la que vivía en
 * generar-nacional.mjs: mismo orden (lo más específico primero), mismos
 * patrones. No retocarla aquí sin regenerar y revisar: cambia categorías de
 * obras ya publicadas.
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

/** Heurística heredada: «urbanismo» si el título no dice nada. */
export function tipoPorTitulo(objeto) {
  for (const [tipo, patron] of REGLAS_TIPO) if (patron.test(objeto)) return tipo;
  return "urbanismo";
}

/**
 * Reglas por prefijo del CPV principal (división 45 del Reglamento CPV).
 * La descripción entre paréntesis resume el enunciado oficial del código.
 * Gana el prefijo más largo (ver cabecera), así que las excepciones
 * específicas (45112714, 45112730…) se escriben tal cual y pisan al padre.
 */
const REGLAS_CPV = [
  // — deporte: instalaciones y explanación de campos -------------------------
  ["452122", "deporte"],        // 45212200 construcción de instalaciones deportivas (piscinas, polideportivos…)
  ["4511272", "deporte"],       // 45112720 paisajismo en zonas deportivas y recreativas (golf 45112721, equitación 45112722)
  ["452361", "deporte"],        // 45236100 explanación para instalaciones deportivas
  ["452421", "deporte"],        // 45242100 instalaciones para deportes acuáticos
  ["45234220", "deporte"],      // telesquí
  ["45234230", "deporte"],      // telesilla
  // — educacion: edificios docentes y bibliotecas ----------------------------
  ["452140", "educacion"],      // 45214000 edificios de enseñanza e investigación
  ["452141", "educacion"],      // jardín de infancia
  ["452142", "educacion"],      // edificios escolares (primaria, secundaria…)
  ["452143", "educacion"],      // formación profesional y técnica
  ["452144", "educacion"],      // edificios universitarios
  ["452145", "educacion"],      // enseñanza postescolar
  ["452146", "educacion"],      // edificios de investigación
  ["452147", "educacion"],      // colegios mayores
  ["452148", "educacion"],      // edificios con instalaciones para formación
  ["4521233", "educacion"],     // 45212330 bibliotecas (45212331 multimedia)
  // — patrimonio: equipamiento cultural e histórico ---------------------------
  ["452123", "patrimonio"],     // 45212300 edificios culturales (museos, galerías, teatros, auditorios…)
  ["4521235", "patrimonio"],    // 45212350 edificios de interés histórico o artístico (palacios, castillos…)
  ["4521236", "patrimonio"],    // 45212360 edificios religiosos (iglesias)
  ["45112450", "patrimonio"],   // excavación en yacimientos arqueológicos
  ["454541", "patrimonio"],     // 45454100 trabajos de restauración
  // — seguridad: orden público, emergencia, incendios, tráfico ----------------
  ["452161", "seguridad"],      // 45216100 edificios de orden público (comisarías, tribunales) y emergencia (bomberos, salvamento)
  ["452223", "seguridad"],      // 45222300 ingeniería para instalaciones de seguridad
  ["453121", "seguridad"],      // 45312100 sistemas de alarma contra incendios
  ["453122", "seguridad"],      // 45312200 sistemas de alarma antirrobo
  ["4531621", "seguridad"],     // 45316210 control del tráfico (semáforos 45316212, señales luminosas, balizamiento)
  ["45343", "seguridad"],       // 45343000 dispositivos de protección contra incendios
  // — medio ambiente: agua, residuos, costas, energías limpias ----------------
  ["452221", "medio ambiente"], // 45222100 plantas de tratamiento de residuos (45222110 vertederos)
  ["4521327", "medio ambiente"],// 45213270 plantas de reciclado
  ["4521328", "medio ambiente"],// 45213280 instalaciones de compostaje
  ["452313", "medio ambiente"], // 45231300 tuberías para agua y aguas residuales
  ["452321", "medio ambiente"], // 45232100 obras auxiliares para tuberías de agua (regadío, pluviales, bombeo…)
  ["452324", "medio ambiente"], // 45232400 alcantarillado y saneamiento (depuradoras, desagües, transferencia de residuos)
  ["452520", "medio ambiente"], // 45252000 plantas depuradoras y de tratamiento de aguas
  ["452523", "medio ambiente"], // 45252300 plantas de incineración de residuos
  ["452591", "medio ambiente"], // 45259100 mantenimiento de planta depuradora de aguas residuales
  ["452592", "medio ambiente"], // 45259200 mantenimiento de planta de depuración
  ["452430", "medio ambiente"], // 45243000 defensa costera
  ["452431", "medio ambiente"], // 45243100 protección de acantilados
  ["452432", "medio ambiente"], // 45243200 rompeolas
  ["452433", "medio ambiente"], // 45243300 malecones
  ["452434", "medio ambiente"], // 45243400 consolidación de playas
  ["4524350", "medio ambiente"], // 45243500 defensas marítimas (no su hijo 45243510 terraplenado)
  ["452450", "medio ambiente"], // 45245000 dragado y bombeo para depuradoras
  ["452460", "medio ambiente"], // 45246000 regulación de caudales, riberas, inundaciones
  ["452470", "medio ambiente"], // 45247000 represas, canales, acequias y acueductos
  ["453320", "medio ambiente"], // 45332000 instalación sanitaria y tuberías de desagüe (cañerías de agua)
  ["45261215", "medio ambiente"], // revestimiento de cubiertas con placas solares
  ["45251160", "medio ambiente"], // instalaciones eólicas
  ["45262640", "medio ambiente"], // mejoramiento del medio ambiente
  ["45262660", "medio ambiente"], // retirada de amianto
  ["4511234", "medio ambiente"], // 45112340 descontaminación de suelos
  // — parques: zonas verdes, jardines y juego infantil -------------------------
  ["451127", "parques"],        // 45112700 paisajismo (zonas verdes 4511271x); las excepciones below pisan
  ["45112723", "parques"],      // paisajismo en parques infantiles (pisa a «deporte» 4511272)
  ["452362", "parques"],        // 45236200 explanación de instalaciones recreativas (jardines, parques, zoo)
  ["454513", "parques"],        // 45451300 jardines interiores
  // — urbanismo: vialidad, edificación e infraestructuras ----------------------
  // Excepciones específicas de la familia 451127 (paisajismo): no son zonas verdes.
  ["45112714", "urbanismo"],    // paisajismo en cementerios
  ["45112730", "urbanismo"],    // paisajismo en carreteras y autopistas
  ["45112740", "urbanismo"],    // paisajismo en aeropuertos
  ["45233", "urbanismo"],       // 45233000 autopistas, carreteras y pavimentación (obras viales, asfaltado, aceras)
  ["45234", "urbanismo"],       // 45234000 vías férreas y transporte por cable (salvo telesquí/telesilla)
  ["45235", "urbanismo"],       // 45235000 aeródromos y pistas
  ["452133", "urbanismo"],      // 45213300 edificios relacionados con el transporte
  ["452154", "urbanismo"],      // 45215400 cementerios (edificación)
  ["452363", "urbanismo"],      // 45236300 explanación de cementerios (pisa a «parques» 45236)
  ["4523214", "urbanismo"],     // 45232140 redes de calefacción urbana (pisa a «medio ambiente» 452321)
  ["452422", "urbanismo"],      // 45242200 puertos deportivos y para yates (no son instalaciones deportivas)
];

/** El CPV principal del array, normalizado a 8 dígitos: null si no sirve. */
function cpvPrincipal(cpv) {
  const primero = Array.isArray(cpv) ? cpv[0] : cpv;
  if (typeof primero !== "string") return null;
  const codigo = primero.replace(/\s+/g, "").split("-")[0]; // «45112730-1» → «45112730»
  return /^\d{8}$/.test(codigo) ? codigo : null;
}

/** Tipo por CPV principal: la regla con el prefijo más largo gana; null si no decide. */
export function tipoPorCpv(cpv) {
  const codigo = cpvPrincipal(cpv);
  if (!codigo) return null;
  // Estos hijos no describen el destino: el pavimento puede ser el patio
  // de un colegio o una pista deportiva. No heredan «vialidad» del padre.
  if (["45233200", "45233250", "45233251", "45233222", "45233228"].includes(codigo)) return null;
  let mejor = null;
  for (const [prefijo, tipo] of REGLAS_CPV) {
    if (codigo.startsWith(prefijo) && (!mejor || prefijo.length > mejor[0].length)) mejor = [prefijo, tipo];
  }
  return mejor ? mejor[1] : null;
}

/**
 * Tipo de obra: primero el CPV principal (si es específico), luego el título.
 * `cpv` es el array de códigos de la licitación (el primero es el principal);
 * acepta también un código suelto o nada.
 */
export function tipoDe(objeto, cpv) {
  return tipoPorCpv(cpv) ?? tipoPorTitulo(objeto);
}
