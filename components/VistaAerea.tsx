"use client";

import dynamic from "next/dynamic";
import { useId, useState } from "react";
import { tienePunto, type Obra, type UbicacionPrecisa } from "@/lib/obras";
import { VISTAS_AEREAS, type FotoAerea, type VistaAerea } from "@/lib/aerea";
import { VISTA_AEREA } from "@/lib/flags";

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
 * Lo que permite decir la foto. Nunca sugiere que la obra no se hizo: si la
 * foto es anterior, es el estado previo del sitio y así se presenta.
 */
export function textoVeredicto(v: VistaAerea): string {
  const fecha = fechaVuelo(v.ahora.fecha);
  switch (v.veredicto) {
    case "posterior":
      return `Foto de ${fecha}, posterior al plazo: sirve para comprobar la obra`;
    case "durante":
      return `Foto de ${fecha}, tomada durante el plazo de la obra`;
    case "anterior":
      return `Así estaba el sitio en ${fecha}, antes de la obra. Aún no hay foto oficial posterior`;
    case "no_visible":
      return "Dónde se hizo. La obra no se distingue desde el aire";
    case "sin_fechas":
      return `Foto de ${fecha}. Sin fecha de adjudicación para compararla`;
  }
}

const PRECISION_TEXTO: Record<UbicacionPrecisa["precision"], string> = {
  punto: "punto exacto",
  instalacion: "la instalación",
  zona: "la zona de la obra",
  tramo: "el tramo de la obra",
};

/** Vista aérea de la obra si la función está activa y hay foto horneada. */
export function vistaDe(obra: Obra): { u: UbicacionPrecisa; v: VistaAerea } | null {
  if (!VISTA_AEREA || !tienePunto(obra.ubicacion)) return null;
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
          {fechaVuelo(v.ahora.fecha)} · PNOA CC-BY 4.0 scne.es
        </span>
      </div>
      <figcaption className={`aerea-veredicto aerea-${v.veredicto}`}>{textoVeredicto(v)}</figcaption>
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

function enlaces(u: UbicacionPrecisa) {
  const ll = `${u.lat},${u.lon}`;
  const lista = [
    {
      texto: "Ver a pie de calle (Street View)",
      href: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ll}`,
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
export function SeccionAerea({ obra }: { obra: Obra }) {
  const [mapa, setMapa] = useState(false);
  if (!VISTA_AEREA) return null;

  const u = obra.ubicacion;
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
      <p className={`aerea-veredicto aerea-${v.veredicto}`}>{textoVeredicto(v)}</p>
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
            Vuelo de {fechaVuelo(v.ahora.fecha)}
            {v.ahora.resolucionM ? ` · ${v.ahora.resolucionM * 100} cm por píxel` : ""}
          </dd>
        </div>
        {v.antes && (
          <div>
            <dt>Foto anterior</dt>
            <dd>
              Vuelo de {fechaVuelo(v.antes.fecha)}
              {v.antes.ventana ? ` (entre el ${fechaEs(v.antes.ventana[0])} y el ${fechaEs(v.antes.ventana[1])})` : ""}
            </dd>
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
