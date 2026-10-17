"use client";

import { useEffect, useState } from "react";
import { useStore } from "./store";
import type { RecuentoObra } from "./recuento";

export type EstadoRecuento = { estado: "cargando" } | { estado: "sin_servicio" } | { estado: "ok"; datos: RecuentoObra };

/**
 * Recuento colectivo de una obra. Se vuelve a pedir cuando este dispositivo
 * acaba de enviar un cambio, para que el vecino vea su voto sumado.
 */
export function useRecuento(obraId: string): EstadoRecuento {
  const { versionRecuento } = useStore();
  const [estado, setEstado] = useState<EstadoRecuento>({ estado: "cargando" });

  useEffect(() => {
    let vivo = true;
    fetch(`/api/recuento?obras=${encodeURIComponent(obraId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { recuento: Record<string, RecuentoObra> }) => {
        const datos = d.recuento?.[obraId];
        if (vivo) setEstado(datos ? { estado: "ok", datos } : { estado: "sin_servicio" });
      })
      .catch(() => vivo && setEstado({ estado: "sin_servicio" }));
    return () => {
      vivo = false;
    };
  }, [obraId, versionRecuento]);

  return estado;
}
