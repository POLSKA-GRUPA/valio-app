"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapaML } from "maplibre-gl";
import type { UbicacionPrecisa } from "@/lib/obras";
import type { VistaAerea } from "@/lib/aerea";
import { fechaVuelo } from "./VistaAerea";

/**
 * Mapa interactivo con teselas EN VIVO del IGN: cuando el IGN publica un vuelo
 * nuevo, este mapa lo enseña sin tocar la app. Las fotos de la tarjeta son las
 * horneadas (con fecha comprobada); aquí la capa «actual» es la del servicio.
 */
const PNOA_ACTUAL =
  "https://www.ign.es/wmts/pnoa-ma?request=GetTile&service=WMTS&VERSION=1.0.0&Layer=OI.OrthoimageCoverage&Style=default&Format=image/jpeg&TileMatrixSet=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}";
const pnoaHistorico = (anyo: number) =>
  `https://www.ign.es/wms/pnoa-historico?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=PNOA${anyo}&STYLES=&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/jpeg`;

const ANYOS = Array.from({ length: 2024 - 2004 + 1 }, (_, i) => 2024 - i);
const ACTUAL = "actual";

/** Círculo de radio en metros como polígono (MapLibre no dibuja círculos en metros). */
function circulo(lat: number, lon: number, radioM: number) {
  const puntos: [number, number][] = [];
  const mLat = 111_320;
  const mLon = 111_320 * Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    puntos.push([lon + (Math.cos(a) * radioM) / mLon, lat + (Math.sin(a) * radioM) / mLat]);
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [puntos] },
  };
}

export function MapaAereo({ u, v }: { u: UbicacionPrecisa; v: VistaAerea }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaML | null>(null);
  const [capa, setCapa] = useState<string>(ACTUAL);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    import("maplibre-gl").then(({ Map: MapaGL, NavigationControl, AttributionControl }) => {
      if (!vivo || !contenedor.current) return;
      const m = new MapaGL({
        container: contenedor.current,
        center: [u.lon, u.lat],
        zoom: 17,
        maxZoom: 19.5,
        attributionControl: false,
        style: {
          version: 8,
          sources: {
            [ACTUAL]: {
              type: "raster",
              tiles: [PNOA_ACTUAL],
              tileSize: 256,
              maxzoom: 19,
              attribution: v.ahora.atribucion,
            },
            obra: { type: "geojson", data: circulo(u.lat, u.lon, u.radioM) },
          },
          layers: [
            { id: ACTUAL, type: "raster", source: ACTUAL },
            {
              id: "obra-borde",
              type: "line",
              source: "obra",
              paint: { "line-color": "#0b0c0c", "line-width": 5 },
            },
            {
              id: "obra-trazo",
              type: "line",
              source: "obra",
              paint: { "line-color": "#f8d648", "line-width": 3 },
            },
          ],
        },
      });
      m.addControl(new NavigationControl({ showCompass: false }), "top-right");
      m.addControl(new AttributionControl({ compact: true }));
      m.on("error", () => setError(true));
      mapa.current = m;
    });
    return () => {
      vivo = false;
      mapa.current?.remove();
      mapa.current = null;
    };
  }, [u, v]);

  // Cambio de año: una única capa raster visible, por debajo del anillo.
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const aplicar = () => {
      for (const anyo of ANYOS) {
        const id = `pnoa-${anyo}`;
        if (m.getLayer(id)) m.removeLayer(id);
        if (m.getSource(id)) m.removeSource(id);
      }
      if (capa === ACTUAL) return;
      const id = `pnoa-${capa}`;
      m.addSource(id, {
        type: "raster",
        tiles: [pnoaHistorico(Number(capa))],
        tileSize: 256,
        attribution: v.ahora.atribucion,
      });
      m.addLayer({ id, type: "raster", source: id }, "obra-borde");
    };
    if (m.isStyleLoaded()) aplicar();
    else m.once("load", aplicar);
  }, [capa, v]);

  return (
    <div className="aerea-mapa-caja">
      <label className="aerea-etiqueta">
        Foto del año{" "}
        <select value={capa} onChange={(e) => setCapa(e.target.value)}>
          <option value={ACTUAL}>Más reciente del IGN (guardada: {fechaVuelo(v.ahora.fecha)})</option>
          {ANYOS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <div
        ref={contenedor}
        className="aerea-mapa"
        role="region"
        aria-label="Mapa aéreo interactivo de la obra. Los enlaces de arriba ofrecen la misma ubicación sin mapa."
      />
      {error && (
        <p className="aerea-nota">
          Algunas teselas del IGN no han cargado. Puede que ese año no se voló esta zona.
        </p>
      )}
    </div>
  );
}
