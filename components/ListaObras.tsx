"use client";

import { AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { CATEGORIA_LABEL, ESTADO_LABEL, VOTO_LABEL, type Obra } from "@/lib/obras";
import { useStore } from "@/lib/store";
import { eurosCompactos } from "@/lib/formato";
import { importeDe, ordenar } from "@/lib/orden";
import { DetailSheet } from "./DetailSheet";
import { ClaimDraft } from "./ClaimDraft";
import { IconoTipo, slugTipo } from "./TipoObra";

type Vista = "pendientes" | "votadas";

/** Filas por tanda: Madrid tiene miles de obras y el móvil no las pinta todas de golpe. */
const TANDA = 60;

/** Etiqueta corta del voto en la miniatura (el texto completo va en el nombre accesible). */
const VOTO_CORTO = { valio: "Valió", no_valio: "No valió", explica: "Explica", no_puedo: "No sé" } as const;

/**
 * Rediseño Luma, pestaña Obras: las obras del municipio agrupadas por año,
 * como «Upcoming / Past» de Luma. «Por votar» y «Votadas» con el voto puesto.
 * Cada fila abre la misma ficha que el mazo.
 */
export function ListaObras() {
  const { obras, votos } = useStore();
  const [vista, setVista] = useState<Vista>("pendientes");
  const [fichaObra, setFichaObra] = useState<Obra | null>(null);
  const [claimObra, setClaimObra] = useState<Obra | null>(null);
  const [mostradas, setMostradas] = useState(TANDA);

  const lista = useMemo(
    () => ordenar(obras.filter((o) => (vista === "votadas" ? votos[o.id] : !votos[o.id])), "recientes"),
    [obras, votos, vista],
  );
  // Total por año sobre la lista entera; filas, solo las de las tandas mostradas.
  const totalPorAnyo = useMemo(() => {
    const t = new Map<number, number>();
    for (const o of lista) t.set(o.anyo, (t.get(o.anyo) ?? 0) + 1);
    return t;
  }, [lista]);
  const porAnyo = useMemo(() => {
    const grupos = new Map<number, Obra[]>();
    for (const o of lista.slice(0, mostradas)) grupos.set(o.anyo, [...(grupos.get(o.anyo) ?? []), o]);
    return Array.from(grupos.entries());
  }, [lista, mostradas]);

  const votadas = obras.filter((o) => votos[o.id]).length;

  return (
    <div className="panel lista-obras">
      <div className="segmentado" role="group" aria-label="Qué obras ver">
        <button type="button" aria-pressed={vista === "pendientes"} onClick={() => setVista("pendientes")}>
          Por votar <span className="num">{obras.length - votadas}</span>
        </button>
        <button type="button" aria-pressed={vista === "votadas"} onClick={() => setVista("votadas")}>
          Votadas <span className="num">{votadas}</span>
        </button>
      </div>

      {lista.length === 0 && (
        <p className="lista-vacia">
          {vista === "votadas" ? "Aún no has votado ninguna obra." : "Has votado todas las obras."}
        </p>
      )}

      {porAnyo.map(([anyo, grupo]) => (
        <section key={anyo} aria-labelledby={`anyo-${anyo}`}>
          <h2 id={`anyo-${anyo}`} className="lista-anyo">
            {anyo} <span>· {totalPorAnyo.get(anyo)} {totalPorAnyo.get(anyo) === 1 ? "obra" : "obras"}</span>
          </h2>
          <ul className="lista-items">
            {grupo.map((o) => {
              const voto = votos[o.id];
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    className="lista-item"
                    onClick={() => setFichaObra(o)}
                    aria-label={`${o.nombre}. ${eurosCompactos(importeDe(o))}${o.aviso ? " (solo el primer lote o adjudicatario)" : ""}. ${ESTADO_LABEL[o.estadoDato]}${
                      voto ? `. Tu voto: ${VOTO_LABEL[voto]}` : ""
                    }. Abrir ficha`}
                  >
                    <span className="miniatura" data-cat={slugTipo(o.categoria)} aria-hidden="true">
                      <IconoTipo categoria={o.categoria} size={28} />
                      {voto && (
                        <span className="miniatura-voto" data-voto={voto}>
                          {VOTO_CORTO[voto]}
                        </span>
                      )}
                    </span>
                    <span className="lista-texto" aria-hidden="true">
                      <span className="lista-nombre">{o.nombre}</span>
                      <span className="lista-meta">
                        <span className="num">
                          {eurosCompactos(importeDe(o))}
                          {o.aviso ? " · 1.er lote" : ""}
                        </span>
                        <span>{CATEGORIA_LABEL[o.categoria]}</span>
                        {/* Dato oficial automático: lo dice la ficha y la pestaña Info; en cada fila solo es ruido. */}
                        {o.estadoDato !== "OFICIAL_AUTOMATICO" && (
                          <span className={`tag tag-${o.estadoDato}`}>{ESTADO_LABEL[o.estadoDato]}</span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {lista.length > mostradas && (
        <button type="button" className="btn btn-secundario lista-mas" onClick={() => setMostradas((n) => n + TANDA)}>
          Mostrar {Math.min(TANDA, lista.length - mostradas)} más · quedan {lista.length - mostradas}
        </button>
      )}

      <AnimatePresence>
        {fichaObra && (
          <DetailSheet
            obra={fichaObra}
            onClose={() => setFichaObra(null)}
            onClaim={() => {
              setClaimObra(fichaObra);
              setFichaObra(null);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {claimObra && <ClaimDraft obra={claimObra} onClose={() => setClaimObra(null)} />}
      </AnimatePresence>
    </div>
  );
}
