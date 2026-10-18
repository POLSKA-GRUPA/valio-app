"use client";

import dynamic from "next/dynamic";
import { useId, useState } from "react";
import { esAproximada, tienePunto, type Obra, type UbicacionPrecisa } from "@/lib/obras";
import type { UbicacionAproximadaConOrigen } from "@/lib/municipios";
import { REVISADO, VISTAS_AEREAS, type FotoAerea, type VistaAerea } from "@/lib/aerea";

// El mapa interactivo pesa (MapLibre): solo se descarga si el vecino lo pide.
const MapaAereo = dynamic(() => import("./MapaAereo").then((m) => m.MapaAereo), {
  ssr: false,
  loading: () => <p className="aerea-nota">Cargando el mapa…</p>,
});

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2024-06" → "jun 2024"; "2012" → "2012". */
export function fechaVuelo(fecha: string): string {
  const m = fecha.match(/^(\d{4})-(\d{2})$/);
  return m ? `${MESES[Number(m[2]) - 1]} ${m[1]}` : fecha;
}

/** "2024-11-21" → "21/11/2024". */
const fechaEs = (iso: string) => iso.split("-").reverse().join("/");

/**
 * Lo que permite decir la foto. Dos ideas separadas: cuándo es la foto respecto
 * a la obra y si lo que se hizo se distingue desde el aire. Nunca da la obra
 * por hecha ni sugiere que no se hizo.
 */
export function textoVeredicto(
  v: VistaAerea,
  visibleAire: UbicacionPrecisa["visibleAire"],
  corto = false,
): string {
  const fecha = fechaVuelo(v.ahora.fecha);
  if (corto) {
    const base: Record<VistaAerea["veredicto"], string> = {
      posterior: "Foto posterior al plazo previsto",
      durante: "Foto dentro del plazo previsto",
      anterior: `Así estaba en ${fecha}, antes de la obra`,
      indeterminado: "No se sabe si la foto es de antes o de después",
      sin_fechas: `Foto de ${fecha}`,
    };
    return visibleAire === "no" ? `${base[v.veredicto]} · lo contratado no se ve desde el aire` : base[v.veredicto];
  }
  const cuando: Record<VistaAerea["veredicto"], string> = {
    posterior: `Foto de ${fecha}, posterior al plazo de la obra`,
    durante: `Foto de ${fecha}, tomada durante el plazo de la obra`,
    anterior: `Así estaba el sitio en ${fecha}, antes de la obra. No consta foto oficial posterior (revisado el ${fechaEs(REVISADO)})`,
    indeterminado: `Foto de ${fecha}: no se puede saber si es anterior o posterior a la obra`,
    sin_fechas: `Foto de ${fecha}. Sin fecha de adjudicación para compararla`,
  };
  const ver =
    visibleAire === "no"
      ? "Lo contratado no se distingue desde el aire"
      : v.veredicto === "posterior"
        ? visibleAire === "parcial"
          ? "Sirve en parte para comprobarla"
          : "Sirve para comprobarla"
        : null;
  return ver ? `${cuando[v.veredicto]}. ${ver}.` : `${cuando[v.veredicto]}.`;
}

const PRECISION_TEXTO: Record<UbicacionPrecisa["precision"], string> = {
  punto: "punto exacto",
  instalacion: "la instalación",
  zona: "la zona de la obra",
  tramo: "el tramo de la obra",
};

/** Licencia en una línea para la pastilla de la foto (texto completo en la ficha). */
const licenciaCorta = (f: FotoAerea) => (f.fuente.startsWith("PNOA") ? "PNOA CC-BY 4.0 scne.es" : "ICV CC BY 4.0");

/** Vuelo con su ventana si el servicio no da la fecha en el punto (ICV). */
const vueloLargo = (f: FotoAerea) =>
  `Vuelo de ${fechaVuelo(f.fecha)}` +
  (f.ventana ? ` (entre el ${fechaEs(f.ventana[0])} y el ${fechaEs(f.ventana[1])})` : "");

/** Verde solo si la foto de verdad sirve para comprobar algo visible. */
const claseVeredicto = (v: VistaAerea, visibleAire: UbicacionPrecisa["visibleAire"]) =>
  `aerea-veredicto aerea-${visibleAire === "no" ? "no-visible" : v.veredicto}`;

/** Vista aérea de la obra si hay foto horneada. */
export function vistaDe(obra: Obra): { u: UbicacionPrecisa; v: VistaAerea } | null {
  if (!tienePunto(obra.ubicacion)) return null;
  const v = VISTAS_AEREAS[obra.id];
  return v ? { u: obra.ubicacion, v } : null;
}

/**
 * Anillo sobre la obra. El SVG usa el mismo viewBox que la imagen y el mismo
 * recorte («slice» = object-fit: cover), así el anillo cae siempre en su sitio.
 */
function Anillo({ u, v }: { u: UbicacionPrecisa; v: VistaAerea }) {
  const r = Math.max(14, (u.radioM / v.metrosAncho) * 720);
  return (
    <svg className="aerea-anillo" viewBox="0 0 720 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle cx="360" cy="240" r={r} className="aerea-anillo-borde" />
      <circle cx="360" cy="240" r={r} className="aerea-anillo-trazo" />
    </svg>
  );
}

function textoAlt(obra: Obra, foto: FotoAerea, momento: string) {
  return `Foto aérea ${momento} de ${obra.nombre}, vuelo de ${fechaVuelo(foto.fecha)} (${foto.fuente})`;
}

/** Foto en la tarjeta: ocupa el hueco reservado entre el título y la cifra. */
export function FotoTarjeta({ obra }: { obra: Obra }) {
  const vista = vistaDe(obra);
  if (!vista) return null;
  const { u, v } = vista;
  return (
    <figure className="aerea-tarjeta">
      <div className="aerea-marco">
        <img
          src={v.ahora.src}
          alt={textoAlt(obra, v.ahora, "actual")}
          width={720}
          height={480}
          draggable={false}
          decoding="async"
          className="aerea-img"
        />
        <Anillo u={u} v={v} />
        <span className="aerea-pastilla">
          {fechaVuelo(v.ahora.fecha)} · {licenciaCorta(v.ahora)}
        </span>
      </div>
      <figcaption className={claseVeredicto(v, u.visibleAire)}>{textoVeredicto(v, u.visibleAire, true)}</figcaption>
    </figure>
  );
}

/** Comparador antes/después: dos fotos horneadas y un deslizador accesible. */
function Comparador({ obra, u, v }: { obra: Obra; u: UbicacionPrecisa; v: VistaAerea & { antes: FotoAerea } }) {
  const [pct, setPct] = useState(50);
  const id = useId();
  const antes = fechaVuelo(v.antes.fecha);
  const ahora = fechaVuelo(v.ahora.fecha);
  return (
    <div className="aerea-comparador">
      <div className="aerea-marco">
        <img src={v.ahora.src} alt={textoAlt(obra, v.ahora, "actual")} width={720} height={480} className="aerea-img" />
        <img
          src={v.antes.src}
          alt={textoAlt(obra, v.antes, "anterior")}
          width={720}
          height={480}
          className="aerea-img aerea-img-antes"
          style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
        />
        <Anillo u={u} v={v} />
        <span className="aerea-divisor" style={{ left: `${pct}%` }} aria-hidden="true" />
        <span className="aerea-pastilla aerea-pastilla-izq">{antes}</span>
        <span className="aerea-pastilla">{ahora}</span>
      </div>
      <label htmlFor={id} className="aerea-etiqueta">
        Desliza para comparar {antes} con {ahora}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        onChange={(e) => setPct(Number(e.target.value))}
        aria-valuetext={`${pct} % foto de ${antes}, resto foto de ${ahora}`}
        className="aerea-rango"
      />
    </div>
  );
}

function enlaces(u: { lat: number; lon: number; referenciaCatastral?: string | null }) {
  const ll = `${u.lat},${u.lon}`;
  const lista = [
    {
      texto: "Ver a pie de calle (Street View)",
      href: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ll}`,
    },
    {
      // Google no indica la fecha de su foto: sirve para mirar, no para el veredicto.
      texto: "Ver el satélite de Google (sin fecha)",
      href: `https://www.google.com/maps/@?api=1&map_action=map&center=${encodeURIComponent(ll)}&zoom=19&basemap=satellite`,
    },
    { texto: "Abrir en Google Maps", href: `https://www.google.com/maps/search/?api=1&query=${ll}` },
  ];
  if (u.referenciaCatastral) {
    lista.push({
      texto: `Ficha del Catastro (${u.referenciaCatastral})`,
      href: `https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCListaBienes.aspx?rc1=${u.referenciaCatastral.slice(0, 7)}&rc2=${u.referenciaCatastral.slice(7, 14)}`,
    });
  }
  return lista;
}

/** Sección «Desde el aire» de la ficha. */
/** Ortofoto PNOA más reciente del IGN alrededor de un punto (unos 200 m de alto), 720 × 480. */
function ortofotoIgn(lat: number, lon: number): string {
  const dLat = 0.0009;
  const dLon = (dLat * 1.5) / Math.cos((lat * Math.PI) / 180);
  const bbox = [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((n) => n.toFixed(6)).join(",");
  return `https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG%3A4326&BBOX=${encodeURIComponent(bbox)}&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg`;
}

/**
 * Obra situada por una máquina a partir de su título (CartoCiudad): se dice
 * que es aproximada, se enseña la ortofoto del IGN sin dar veredicto (no
 * comprobamos la fecha de vuelo frente a la obra) y se atribuye la fuente
 * como pide la licencia CC BY 4.0.
 */
function SeccionAproximada({ obra, u }: { obra: Obra; u: UbicacionAproximadaConOrigen }) {
  const anyo = u.fuente.fechaConsulta.slice(-4);
  const delAnuncio = u.origen === "ejecucion";
  const sitio =
    u.nivel === "calle"
      ? delAnuncio
        ? "un punto de la calle del lugar de ejecución que declara el anuncio. La obra puede estar en otro tramo de la calle."
        : "un punto de la calle que nombra el título. La obra puede estar en otro tramo de la calle."
      : delAnuncio
        ? "el lugar de ejecución que declara el anuncio."
        : "el lugar que nombra el título (colegio, parque, plaza…).";
  return (
    <section className="ficha-seccion" aria-labelledby="ficha-aerea">
      <h3 id="ficha-aerea">Desde el aire</h3>
      <p className="ficha-nota aerea-aproximada">
        Ubicación aproximada, sin revisar a mano: {sitio} Situada automáticamente con CartoCiudad (IGN).
      </p>
      <div className="aerea-marco">
        <img
          src={ortofotoIgn(u.lat, u.lon)}
          alt={`Foto aérea del IGN alrededor de ${u.nivel === "calle" ? "la calle" : "el lugar"} de «${obra.nombre}»`}
          width={720}
          height={480}
          className="aerea-img"
          loading="lazy"
        />
        <span className="aerea-punto" aria-hidden="true" />
        <span className="aerea-pastilla">Sin fecha comprobada</span>
      </div>
      <ul className="aerea-enlaces">
        {enlaces(u).map((e) => (
          <li key={e.href}>
            <a href={e.href} target="_blank" rel="noopener noreferrer">
              {e.texto}
            </a>
          </li>
        ))}
      </ul>
      <p className="aerea-atribucion">
        Ubicación: obra derivada de CartoCiudad {anyo} CC-BY 4.0 scne.es · Ortofoto: PNOA cedido por © Instituto
        Geográfico Nacional
      </p>
    </section>
  );
}

export function SeccionAerea({ obra }: { obra: Obra }) {
  const [mapa, setMapa] = useState(false);
  const u = obra.ubicacion;
  if (esAproximada(u)) return <SeccionAproximada obra={obra} u={u} />;
  if (!tienePunto(u)) {
    return (
      <section className="ficha-seccion" aria-labelledby="ficha-aerea">
        <h3 id="ficha-aerea">Desde el aire</h3>
        <p className="ficha-nota">
          Sin ubicación precisa en los documentos públicos de la obra
          {u?.motivo ? `: ${u.motivo}.` : "."}
        </p>
      </section>
    );
  }
  const v = VISTAS_AEREAS[obra.id];
  if (!v) return null;

  return (
    <section className="ficha-seccion" aria-labelledby="ficha-aerea">
      <h3 id="ficha-aerea">Desde el aire</h3>
      <p className={claseVeredicto(v, u.visibleAire)}>{textoVeredicto(v, u.visibleAire)}</p>
      {v.antes ? (
        <Comparador obra={obra} u={u} v={v as VistaAerea & { antes: FotoAerea }} />
      ) : (
        <div className="aerea-marco">
          <img src={v.ahora.src} alt={textoAlt(obra, v.ahora, "actual")} width={720} height={480} className="aerea-img" />
          <Anillo u={u} v={v} />
          <span className="aerea-pastilla">{fechaVuelo(v.ahora.fecha)}</span>
        </div>
      )}
      <dl className="resumen">
        <div>
          <dt>Foto más reciente</dt>
          <dd>
            {vueloLargo(v.ahora)}
            {v.ahora.resolucionM ? ` · ${Math.round(v.ahora.resolucionM * 100)} cm por píxel` : ""}
          </dd>
        </div>
        {v.antes && (
          <div>
            <dt>Foto anterior</dt>
            <dd>{vueloLargo(v.antes)}</dd>
          </div>
        )}
        {v.adjudicacion && (
          <div>
            <dt>Obra</dt>
            <dd>
              Adjudicada el {fechaEs(v.adjudicacion)}
              {v.finPrevisto ? `; fin previsto el ${fechaEs(v.finPrevisto)}` : ""}
            </dd>
          </div>
        )}
        <div>
          <dt>Ubicación</dt>
          <dd>
            Marca {PRECISION_TEXTO[u.precision]} según{" "}
            <a href={u.fuente.url} target="_blank" rel="noreferrer">
              la fuente
            </a>
            {u.estado === "propuesta" ? " (pendiente de verificación independiente)" : ""}
          </dd>
        </div>
      </dl>
      <ul className="aerea-enlaces">
        {enlaces(u).map((e) => (
          <li key={e.href}>
            <a href={e.href} target="_blank" rel="noreferrer">
              {e.texto}
            </a>
          </li>
        ))}
      </ul>
      {mapa ? (
        <MapaAereo u={u} v={v} />
      ) : (
        <button type="button" className="btn btn-secundario" onClick={() => setMapa(true)}>
          Explorar en el mapa
        </button>
      )}
      <p className="aerea-atribucion">
        {v.ahora.atribucion}
        {v.antes ? <><br />{v.antes.atribucion}</> : null}
        {u.fuente.tipo === "cartociudad" ? <><br />Ubicación: CartoCiudad CC BY 4.0 scne.es</> : null}
      </p>
    </section>
  );
}
