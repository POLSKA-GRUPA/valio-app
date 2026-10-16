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
const ATRIBUCION_PNOA = "PNOA CC-BY 4.0 scne.es";

/** Serie anual del ICV (cubre toda la Comunitat; el IGN no tiene 2022-2023 en Alicante). */
const ICV = [
  ["2023", "2023CVAL0025"],
  ["2022", "2022CVAL0025"],
  ["2021", "2021CVAL0025"],
  ["2020", "2020CVAL0025"],
  ["2019", "2019CVAL0025"],
  ["2018", "2018CVAL0025"],
  ["2017", "2017CVAL0025"],
] as const;
const icvTeselas = (id: string) =>
  `https://terramapas.icv.gva.es/0202_${id}_3857/wmts/1.0.0/01_8bits_01_RGB_05_PNG/default/GMEPSG3857/{z}/{y}/{x}.png`;
const atribucionIcv = (anyo: string) =>
  `Ortofoto ${anyo} CC BY 4.0 © Institut Cartogràfic Valencià, Generalitat`;

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
    import("maplibre-gl").then(({ Map: MapaGL, NavigationControl, AttributionControl, setWorkerUrl }) => {
      if (!vivo || !contenedor.current) return;
      // Servido por scripts/copiar-worker-mapa.mjs (webpack no empaqueta el worker).
      setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const zona = circulo(u.lat, u.lon, u.radioM);
      const lons = zona.geometry.coordinates[0].map((p) => p[0]);
      const lats = zona.geometry.coordinates[0].map((p) => p[1]);
      const m = new MapaGL({
        container: contenedor.current,
        // Encuadra el anillo entero: en una obra de zona grande, un zoom fijo
        // dejaría la obra fuera de la vista.
        bounds: [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        fitBoundsOptions: { padding: 32, maxZoom: 18 },
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
              attribution: ATRIBUCION_PNOA,
            },
            obra: { type: "geojson", data: zona },
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

  // Cambio de año: una única capa raster del ICV visible, por debajo del anillo.
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const aplicar = () => {
      for (const [anyo] of ICV) {
        const id = `icv-${anyo}`;
        if (m.getLayer(id)) m.removeLayer(id);
        if (m.getSource(id)) m.removeSource(id);
      }
      const elegido = ICV.find(([anyo]) => anyo === capa);
      if (!elegido) return;
      const id = `icv-${elegido[0]}`;
      m.addSource(id, {
        type: "raster",
        tiles: [icvTeselas(elegido[1])],
        tileSize: 256,
        maxzoom: 19,
        attribution: atribucionIcv(elegido[0]),
      });
      m.addLayer({ id, type: "raster", source: id }, "obra-borde");
    };
    if (m.isStyleLoaded()) aplicar();
    else m.once("load", aplicar);
  }, [capa]);

  return (
    <div className="aerea-mapa-caja">
      <label className="aerea-etiqueta">
        Foto del año{" "}
        <select value={capa} onChange={(e) => setCapa(e.target.value)}>
          <option value={ACTUAL}>Más reciente del IGN (guardada: {fechaVuelo(v.ahora.fecha)})</option>
          {ICV.map(([anyo]) => (
            <option key={anyo} value={anyo}>
              {anyo} (ICV)
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
          Algunas teselas no han cargado. Prueba otro año o vuelve a intentarlo más tarde.
        </p>
      )}
    </div>
  );
}
