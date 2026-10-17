/**
 * Pedir explicaciones: el escrito de acceso a información pública (Ley
 * 19/2013, art. 17), la reclamación si no contestan (art. 24) y los avisos de
 * plazo. Todo se prepara en el dispositivo: ¿VALIÓ? nunca envía nada.
 */
import type { Obra } from "./obras";
import { euros } from "./formato";

export const PREGUNTAS = {
  estado: "Estado actual de ejecución de la obra y fecha prevista o real de finalización.",
  modificados: "Modificaciones del contrato, prórrogas o ampliaciones de plazo o de precio aprobadas, con su justificación.",
  pagos: "Certificaciones de obra emitidas y facturas pagadas hasta la fecha, con sus importes.",
  recepcion: "Acta de recepción de la obra, si ya se ha recibido.",
  proyecto: "Proyecto de obra aprobado y pliegos del contrato.",
} as const;
export type Pregunta = keyof typeof PREGUNTAS;

export const ETIQUETA_PREGUNTA: Record<Pregunta, string> = {
  estado: "En qué estado está y cuándo acaba",
  modificados: "Si ha subido de precio o de plazo",
  pagos: "Cuánto se ha pagado ya",
  recepcion: "Si ya se ha recibido la obra",
  proyecto: "El proyecto y los pliegos",
};

/** Cómo se presenta. Los electrónicos ya identifican y firman: sin DNI en el texto. */
export type Canal = "registro" | "sede" | "papel" | "email";
export const electronico = (c: Canal) => c === "registro" || c === "sede";

export const CANALES: Record<Canal, { titulo: string; detalle: string }> = {
  registro: {
    titulo: "Registro Electrónico General",
    detalle: "Con Cl@ve, desde el móvil. Llega a los ayuntamientos conectados y te da justificante.",
  },
  sede: {
    titulo: "Sede electrónica del ayuntamiento",
    detalle: "Con Cl@ve o certificado, en el trámite de acceso a la información o en la instancia general.",
  },
  papel: {
    titulo: "En papel",
    detalle: "Firmado, en el registro del ayuntamiento o en una oficina de Correos.",
  },
  email: {
    titulo: "Por correo electrónico",
    detalle: "Último recurso: algunos ayuntamientos no lo aceptan como presentación válida.",
  },
};

export const URL_REGISTRO = "https://rec.redsara.es/";
export const urlBuscarSede = (organismo: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`sede electrónica ${organismo}`)}`;

const IDENTIFICACION_PAPEL = `Nombre y apellidos: [NOMBRE Y APELLIDOS]
DNI/NIE: [DNI/NIE]
Dirección de contacto: [CORREO ELECTRÓNICO O DIRECCIÓN POSTAL]
Fecha y firma:`;

const IDENTIFICACION_ELECTRONICA =
  "Me identifico y firmo al presentarla por registro electrónico. Pido que las notificaciones se hagan por medios electrónicos.";

const PIE =
  "Borrador preparado con ¿VALIÓ?: revísalo antes de presentarlo. ¿VALIÓ? nunca envía nada automáticamente.";

function datosContrato(obra: Obra): string {
  const adj = obra.adjudicacion;
  const exp = adj?.numExpediente ? ` (expediente ${adj.numExpediente})` : "";
  const detalle = adj
    ? `, adjudicado a ${adj.adjudicataria}${adj.cif ? ` (${adj.cif})` : ""} por ${euros(adj.importeSinIva)} sin IVA${
        adj.fechaAcuerdo && adj.fechaAcuerdo !== "No consta" ? ` el ${adj.fechaAcuerdo}` : ""
      }`
    : "";
  return `«${obra.nombre}»${exp}${detalle}, según ${obra.fuente.nombre} (${obra.fuente.url})`;
}

export function solicitud(obra: Obra, preguntas: Pregunta[], otra: string, canal: Canal): string {
  const lista = [...preguntas.map((p) => PREGUNTAS[p]), ...(otra.trim() ? [otra.trim()] : [])];
  const numeradas = (lista.length ? lista : [PREGUNTAS.estado]).map((t, i) => `${i + 1}. ${t}`).join("\n");
  return `A: ${obra.organismo}
Asunto: Solicitud de acceso a información pública sobre una obra

Al amparo del artículo 17 de la Ley 19/2013, de 9 de diciembre, de transparencia, acceso a la información pública y buen gobierno, solicito la siguiente información sobre el contrato ${datosContrato(obra)}:

${numeradas}
${obra.aviso ? `\nNota: ${obra.aviso}\n` : ""}
Modalidad de acceso: copia en formato electrónico.

${electronico(canal) ? IDENTIFICACION_ELECTRONICA : IDENTIFICACION_PAPEL}

${PIE}`;
}

/** Comunidades cuyas reclamaciones resuelve el Consejo de Transparencia estatal por convenio. */
const CONVENIO_CTBG = /asturias|balears|cantabria|extremadura|rioja|ceuta|melilla/i;
export const URL_CTBG = "https://www.consejodetransparencia.es/";
export const URL_ORGANOS_AUTONOMICOS = "https://www.consejodetransparencia.es/mas-info/mas-informacion";

export function dondeReclamar(ccaa: string): { nombre: string; url: string } {
  if (CONVENIO_CTBG.test(ccaa)) return { nombre: "Consejo de Transparencia y Buen Gobierno", url: URL_CTBG };
  return {
    nombre: ccaa ? `el órgano de transparencia de ${ccaa}` : "el órgano de transparencia de tu comunidad",
    url: URL_ORGANOS_AUTONOMICOS,
  };
}

export type Respuesta = "silencio" | "denegada";

export function reclamacion(obra: Obra, presentada: string, motivo: Respuesta, canal: Canal, ccaa: string): string {
  const exp = obra.adjudicacion?.numExpediente ? ` (expediente ${obra.adjudicacion.numExpediente})` : "";
  const hechos =
    motivo === "silencio"
      ? "Ha pasado el plazo máximo de un mes del artículo 20.1 de la Ley 19/2013 sin que se me haya notificado resolución ni ampliación del plazo, por lo que la solicitud se entiende desestimada (artículo 20.4)."
      : "La respuesta recibida deniega total o parcialmente el acceso a la información pedida.";
  return `A: ${dondeReclamar(ccaa).nombre.replace(/^el /, "El ")}
Asunto: Reclamación en materia de acceso a información pública

El ${fechaEs(presentada)} presenté ante ${obra.organismo} una solicitud de acceso a información pública sobre la obra «${obra.nombre}»${exp}. ${hechos}

Al amparo del artículo 24 de la Ley 19/2013, presento esta reclamación y pido que se reconozca mi derecho a acceder a la información solicitada.

Adjunto el justificante de presentación de la solicitud${motivo === "denegada" ? " y la respuesta recibida" : ""}.

${electronico(canal) ? IDENTIFICACION_ELECTRONICA : IDENTIFICACION_PAPEL}

${PIE}`;
}

// --- plazos y avisos ---------------------------------------------------------

/** «2026-10-17» → «17/10/2026». */
export const fechaEs = (iso: string) => iso.split("-").reverse().join("/");

export function sumarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1 + meses, d));
  // 31 de enero + 1 mes no es 3 de marzo: el último día del mes.
  if (f.getUTCDate() !== d) f.setUTCDate(0);
  return f.toISOString().slice(0, 10);
}

export function sumarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

export const hoyIso = () => {
  const h = new Date();
  return new Date(h.getTime() - h.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/** Una línea de iCalendar plegada a 75 octetos (RFC 5545 §3.1), sin partir caracteres UTF-8. */
function plegar(linea: string): string {
  const trozos: string[] = [];
  let actual = "";
  let octetos = 0;
  for (const c of linea) {
    const n = new TextEncoder().encode(c).length;
    // La primera línea admite 75 octetos; las de continuación, 74 más el espacio inicial.
    if (octetos + n > (trozos.length ? 74 : 75)) {
      trozos.push(actual);
      actual = "";
      octetos = 0;
    }
    actual += c;
    octetos += n;
  }
  trozos.push(actual);
  return trozos.join("\r\n ");
}

const textoIcs = (t: string) => t.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

/**
 * Calendario (.ics) con dos avisos de seguimiento: al mes (si no han
 * contestado, ya se puede reclamar) y a los dos meses. Ante el silencio no hay
 * plazo para reclamar; si deniegan, es un mes desde la notificación.
 */
export function calendario(obra: Obra, presentada: string): string {
  const dia = (iso: string) => iso.replace(/-/g, "");
  const obraTxt = `«${obra.nombre}» (${obra.organismo})`;
  const evento = (iso: string, titulo: string, texto: string, n: number) => [
    "BEGIN:VEVENT",
    `UID:valio-${obra.id}-${presentada}-${n}@valio`,
    `DTSTAMP:${dia(hoyIso())}T000000Z`,
    `DTSTART;VALUE=DATE:${dia(iso)}`,
    `DTEND;VALUE=DATE:${dia(sumarDias(iso, 1))}`,
    `SUMMARY:${textoIcs(titulo)}`,
    `DESCRIPTION:${textoIcs(texto)}`,
    "BEGIN:VALARM",
    "TRIGGER:PT9H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${textoIcs(titulo)}`,
    "END:VALARM",
    "END:VEVENT",
  ];
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VALIO//Pedir explicaciones//ES",
    "CALSCALE:GREGORIAN",
    ...evento(
      sumarMeses(presentada, 1),
      "¿Te han contestado? (¿VALIÓ?)",
      `Hoy se cumple aprox. un mes de tu solicitud sobre ${obraTxt}. Si no te han contestado, ya puedes reclamar: abre la obra en ¿VALIÓ? y pulsa «No me han contestado».`,
      1,
    ),
    ...evento(
      sumarMeses(presentada, 2),
      "Seguimiento de tu solicitud (¿VALIÓ?)",
      `¿Te contestaron a la solicitud sobre ${obraTxt}? Si te lo denegaron, tienes un mes desde que te lo notificaron para reclamar. Si no contestan, puedes reclamar cuando quieras.`,
      2,
    ),
    "END:VCALENDAR",
  ];
  return lineas.map(plegar).join("\r\n") + "\r\n";
}

/** true si ya ha pasado un mes desde la presentación (el plazo para resolver, art. 20.1). */
export const pasoUnMes = (presentada: string) => hoyIso() > sumarMeses(presentada, 1);

// --- lo que se recuerda (solo en el dispositivo) ------------------------------

const CLAVE = "valio.solicitudes.v1";
export interface Seguimiento {
  presentada: string;
  canal: Canal;
}

function leerTodas(): Record<string, Seguimiento> {
  try {
    const raw = window.localStorage.getItem(CLAVE);
    const d = raw ? JSON.parse(raw) : {};
    return d && typeof d === "object" && !Array.isArray(d) ? d : {};
  } catch {
    return {};
  }
}

export function leerSeguimiento(obraId: string): Seguimiento | null {
  const s = leerTodas()[obraId];
  if (!s || typeof s.presentada !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s.presentada)) return null;
  return { presentada: s.presentada, canal: s.canal in CANALES ? s.canal : "registro" };
}

export function guardarSeguimiento(obraId: string, s: Seguimiento | null) {
  try {
    const todas = leerTodas();
    if (s) todas[obraId] = s;
    else delete todas[obraId];
    window.localStorage.setItem(CLAVE, JSON.stringify(todas));
  } catch {
    // sin almacenamiento: el seguimiento dura lo que la visita
  }
}
