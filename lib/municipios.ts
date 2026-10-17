import { OBRAS, POBLACION, type Adjudicacion, type Categoria, type Obra } from "./obras";

export interface PoblacionMunicipio {
  municipio: string;
  habitantes: number;
  referencia: string;
  fuenteNombre: string;
  fuenteUrl: string;
}

/** Lo que se sabe de un municipio sin descargar sus obras (y lo que se guarda en el dispositivo). */
export interface Municipio {
  /** Código INE: único, a diferencia del nombre (hay nombres repetidos entre provincias). */
  ine: string;
  nombre: string;
  provincia: string;
  ccaa: string;
  /** -1 si no se sabe (municipio guardado por una versión anterior). */
  numObras: number;
}

/** Teulada: piloto con sus obras en el código (lib/obras.ts). */
export const INE_PILOTO = "03128";
export const esPilotoIne = (ine: string) => ine === INE_PILOTO;

// --- buscador ----------------------------------------------------------------

type FilaIndice = [string, string, string, string, number];
let indice: Promise<Municipio[]> | null = null;

/** Los 8.000 y pico municipios de España (public/datos/municipios.json), una sola descarga. */
export function cargarIndice(): Promise<Municipio[]> {
  indice ??= fetch("/datos/municipios.json")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((d: { municipios: FilaIndice[] }) =>
      d.municipios.map(([ine, nombre, provincia, ccaa, numObras]) => ({ ine, nombre, provincia, ccaa, numObras })),
    )
    .catch((e) => {
      indice = null; // que el siguiente intento vuelva a probar
      throw e;
    });
  return indice;
}

/** «València» → «valencia»: para buscar sin acentos ni mayúsculas. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Primero los que empiezan por lo buscado; después, los que tienen más obras. */
export function buscar(municipios: Municipio[], texto: string, maximo = 30): Municipio[] {
  const q = normalizar(texto);
  if (!q) return [];
  return municipios
    .map((m) => ({ m, n: normalizar(m.nombre) }))
    .filter(({ n }) => n.includes(q) || n.split("/").some((parte) => parte.trim().startsWith(q)))
    .sort((a, b) => Number(b.n.startsWith(q)) - Number(a.n.startsWith(q)) || b.m.numObras - a.m.numObras)
    .slice(0, maximo)
    .map(({ m }) => m);
}

/** Valida lo guardado en el dispositivo: nunca confiamos en el almacenamiento. */
export function sanearMunicipio(raw: unknown): Municipio | null {
  if (!raw || typeof raw !== "object") return null;
  const { ine, nombre, provincia, ccaa, numObras } = raw as Record<string, unknown>;
  if (typeof ine !== "string" || !/^\d{5}$/.test(ine) || typeof nombre !== "string" || !nombre) return null;
  return {
    ine,
    nombre,
    provincia: typeof provincia === "string" ? provincia : "",
    ccaa: typeof ccaa === "string" ? ccaa : "",
    numObras: typeof numObras === "number" ? numObras : -1,
  };
}

/** Los municipios que ya se podían elegir antes de abrir toda España (se guardaba el nombre). */
const ANTIGUOS: Record<string, Municipio> = {
  Teulada: { ine: "03128", nombre: "Teulada", provincia: "Alicante/Alacant", ccaa: "Comunitat Valenciana", numObras: -1 },
  Benissa: { ine: "03041", nombre: "Benissa", provincia: "Alicante/Alacant", ccaa: "Comunitat Valenciana", numObras: -1 },
  "Alicante/Alacant": { ine: "03014", nombre: "Alicante/Alacant", provincia: "Alicante/Alacant", ccaa: "Comunitat Valenciana", numObras: -1 },
  València: { ine: "46250", nombre: "València", provincia: "Valencia/València", ccaa: "Comunitat Valenciana", numObras: -1 },
  Madrid: { ine: "28079", nombre: "Madrid", provincia: "Madrid", ccaa: "Comunidad de Madrid", numObras: -1 },
};
ANTIGUOS["Alacant/Alicante"] = ANTIGUOS["Alicante/Alacant"];
ANTIGUOS["Valencia"] = ANTIGUOS["València"];
export const municipioAntiguo = (nombre: string): Municipio | null => ANTIGUOS[nombre] ?? null;

// --- obras -------------------------------------------------------------------

/** Obra tal como va en public/datos/provincias: sin lo que se repite en todas. */
interface ObraCompacta {
  id: string;
  nombre: string;
  categoria: Categoria;
  organismo: string;
  anyo: number;
  importeLicitacion: number | null;
  adjudicacion: Adjudicacion;
  aviso?: true;
  url: string;
}

interface MunicipioProvincia {
  nombre: string;
  provincia: string;
  poblacion: PoblacionMunicipio;
  obras: ObraCompacta[];
}

interface Provincia {
  fechaConsulta: string;
  municipios: Record<string, MunicipioProvincia>;
}

const AVISO_LOTES =
  "Contrato con lotes o varios adjudicatarios: el importe y la empresa son solo los del primer resultado publicado.";

const provincias = new Map<string, Promise<Provincia | null>>();

/** Una provincia, una sola descarga por visita. null si no tiene ningún municipio con obras. */
function cargarProvincia(cp: string): Promise<Provincia | null> {
  let p = provincias.get(cp);
  if (!p) {
    p = fetch(`/datos/provincias/${cp}.json`).then((r) => {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<Provincia>;
    });
    // Solo se recuerda una provincia descargada bien: un fallo o un 404 se reintentan.
    p.then((d) => d ?? provincias.delete(cp)).catch(() => provincias.delete(cp));
    provincias.set(cp, p);
  }
  return p;
}

function completar(m: MunicipioProvincia, fechaConsulta: string): Obra[] {
  return m.obras.map((o) => ({
    id: o.id,
    nombre: o.nombre,
    categoria: o.categoria,
    municipio: m.nombre,
    provincia: m.provincia,
    organismo: o.organismo,
    anyo: o.anyo,
    estadoDato: "OFICIAL_AUTOMATICO",
    estadoEjecucion: "faltante",
    importeLicitacion: o.importeLicitacion,
    ivaLicitacionIncluido: false,
    adjudicacion: o.adjudicacion,
    ubicacion: {
      precision: "municipio",
      motivo: "es un dato cargado automáticamente de la Plataforma de Contratación y aún nadie lo ha situado en el mapa",
    },
    costePorHabitante: Math.round((o.adjudicacion.importeSinIva / m.poblacion.habitantes) * 100) / 100,
    ...(o.aviso ? { aviso: AVISO_LOTES } : {}),
    fuente: { nombre: "Plataforma de Contratación del Sector Público (PLACE)", url: o.url, fechaConsulta },
  }));
}

export interface ObrasMunicipio {
  obras: Obra[];
  poblacion: PoblacionMunicipio | null;
}

/** Obras de un municipio: del código si es el piloto; de su provincia si no. */
export async function cargarObras(m: Municipio): Promise<ObrasMunicipio> {
  if (esPilotoIne(m.ine)) return { obras: OBRAS.filter((o) => o.municipio === "Teulada"), poblacion: POBLACION };
  const provincia = await cargarProvincia(m.ine.slice(0, 2));
  const datos = provincia?.municipios[m.ine];
  if (datos) return { obras: completar(datos, provincia.fechaConsulta), poblacion: datos.poblacion };
  // El buscador dice que tiene obras (o no se sabe) y no llegan: es un fallo de descarga, no «sin obras».
  if (m.numObras !== 0) throw new Error(`Faltan las obras de ${m.nombre}`);
  return { obras: [], poblacion: null };
}

/** Comunidades que publican buena parte de sus contratos en su propia plataforma (aún sin cargar, #33). */
const PLATAFORMA_PROPIA = /catalu|pa[ií]s vasco|navarra|galicia|andaluc|madrid|rioja|canarias|extremadura/i;
export const tienePlataformaPropia = (ccaa: string) => PLATAFORMA_PROPIA.test(ccaa);
