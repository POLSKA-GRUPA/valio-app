"use client";

import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { CATEGORIA_LABEL, ESTADO_LABEL, OBRAS, VOTO_LABEL, type Obra, type Voto } from "@/lib/obras";
import { useStore } from "@/lib/store";
import { useDialog } from "@/lib/useDialog";
import { costeVecino, eurosCompactos } from "@/lib/formato";
import { DetailSheet } from "./DetailSheet";
import { MatchScreen } from "./MatchScreen";
import { ClaimDraft } from "./ClaimDraft";

const UMBRAL_X = 110;
const UMBRAL_Y = 130;

function destinoDe(voto: Voto): { x: number; y: number } {
  switch (voto) {
    case "valio":
      return { x: 460, y: 0 };
    case "no_valio":
      return { x: -460, y: 0 };
    case "explica":
      return { x: 0, y: -640 };
    case "no_puedo":
      return { x: 0, y: 640 };
  }
}

/**
 * Contenido de la tarjeta (ISSUE-39): solo datos, sin arte decorativo.
 * Arriba la obra; abajo la cifra protagonista (no hay ubicación en los datos,
 * así que no hay mapa) y una única etiqueta: el nivel de evidencia.
 */
function ContenidoTarjeta({ obra, onFicha }: { obra: Obra; onFicha?: () => void }) {
  // Importe protagonista: el de adjudicación si consta; si no, el de licitación.
  const importe = obra.adjudicacion?.importeSinIva ?? obra.importeLicitacion;
  const tipoImporte = obra.adjudicacion ? "Importe adjudicado, sin IVA" : "Presupuesto de licitación, sin IVA";
  return (
    <div className="card-body">
      <p className="card-kicker">
        {CATEGORIA_LABEL[obra.categoria]} · {obra.municipio} · {obra.anyo}
      </p>
      <h2 className="card-nombre display">{obra.nombre}</h2>
      <div className="card-cifra">
        <p className="card-cifra-tipo">{tipoImporte}</p>
        <p className="card-cifra-valor num">{eurosCompactos(importe)}</p>
        <p className="card-cifra-vecino num">≈ {costeVecino(obra.costePorHabitante)}</p>
      </div>
      <div className="card-pie">
        <span className="tag tag-NO_VERIFICADO">{ESTADO_LABEL.NO_VERIFICADO}</span>
        {onFicha && (
          <button type="button" className="card-ficha-link" onClick={onFicha}>
            Ver ficha y evidencia
          </button>
        )}
      </div>
    </div>
  );
}

function Sello({ voto }: { voto: Voto }) {
  if (voto === "valio") return <span className="stamp stamp-valio display">VALIÓ</span>;
  if (voto === "no_valio") return <span className="stamp stamp-novalio display">NO VALIÓ</span>;
  if (voto === "explica") return <span className="stamp stamp-explica display">PIDO EXPLICACIONES</span>;
  return <span className="stamp stamp-nose display">¿?</span>;
}

function WorkCard({
  obra,
  indice,
  total,
  onDecide,
  onFicha,
  vuelo,
  onVueloCompleto,
}: {
  obra: Obra;
  indice: number;
  total: number;
  onDecide: (voto: Voto) => void;
  onFicha: () => void;
  vuelo: { id: string; voto: Voto } | null;
  onVueloCompleto: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-14, 14]);
  const opValio = useTransform(x, [30, UMBRAL_X], [0, 1]);
  const opNo = useTransform(x, [-30, -UMBRAL_X], [0, 1]);
  const opExplica = useTransform(y, [-40, -UMBRAL_Y], [0, 1]);
  const opNose = useTransform(y, [40, UMBRAL_Y], [0, 1]);

  const volando = vuelo && vuelo.id === obra.id ? vuelo : null;
  const destino = volando ? destinoDe(volando.voto) : null;

  return (
    <motion.article
      className="card-frame"
      style={{ x, y, rotate }}
      role="group"
      aria-label={`Tarjeta ${indice} de ${total}: ${obra.nombre}`}
      drag={!volando}
      dragElastic={0.6}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      animate={destino ? { x: destino.x, y: destino.y } : undefined}
      transition={destino ? { type: "spring", damping: 26, stiffness: 320 } : undefined}
      onAnimationComplete={() => {
        if (destino) onVueloCompleto();
      }}
      onDragEnd={(_, info) => {
        if (info.offset.x > UMBRAL_X) onDecide("valio");
        else if (info.offset.x < -UMBRAL_X) onDecide("no_valio");
        else if (info.offset.y < -UMBRAL_Y) onDecide("explica");
        else if (info.offset.y > UMBRAL_Y) onDecide("no_puedo");
      }}
    >
      <ContenidoTarjeta obra={obra} onFicha={onFicha} />
      <motion.span style={{ opacity: opValio }} aria-hidden="true">
        <Sello voto="valio" />
      </motion.span>
      <motion.span style={{ opacity: opNo }} aria-hidden="true">
        <Sello voto="no_valio" />
      </motion.span>
      <motion.span style={{ opacity: opExplica }} aria-hidden="true">
        <Sello voto="explica" />
      </motion.span>
      <motion.span style={{ opacity: opNose }} aria-hidden="true">
        <Sello voto="no_puedo" />
      </motion.span>
    </motion.article>
  );
}

function CardPreview({ obra }: { obra: Obra }) {
  return (
    <div className="card-frame" aria-hidden="true" style={{ pointerEvents: "none" }}>
      <ContenidoTarjeta obra={obra} />
    </div>
  );
}

function Tutorial({ onCerrar }: { onCerrar: () => void }) {
  const dialogRef = useDialog(onCerrar);
  return (
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      className="tutorial"
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial: desliza y decide"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <h2 className="display">Desliza y decide</h2>
      <ol>
        <li className="gesto">
          <span className="flecha" aria-hidden="true">→</span> Derecha: valió
        </li>
        <li className="gesto">
          <span className="flecha" aria-hidden="true">←</span> Izquierda: no valió
        </li>
        <li className="gesto">
          <span className="flecha" aria-hidden="true">↑</span> Arriba: pido explicaciones
        </li>
        <li className="gesto">
          <span className="flecha" aria-hidden="true">↓</span> Abajo: no puedo valorarlo
        </li>
      </ol>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
        También puedes usar los botones de abajo o las flechas del teclado.
      </p>
      <button type="button" className="btn btn-primary" onClick={onCerrar}>
        Entendido, a votar
      </button>
    </motion.div>
  );
}

export function Deck() {
  const { votos, votar, reset, marcarTutorialVisto, tutorialVisto, listo } = useStore();
  const [vuelo, setVuelo] = useState<{ id: string; voto: Voto } | null>(null);
  const [matchObra, setMatchObra] = useState<Obra | null>(null);
  const [fichaObra, setFichaObra] = useState<Obra | null>(null);
  const [claimObra, setClaimObra] = useState<Obra | null>(null);
  // Texto de la región live. Lleva el nombre de la obra para que dos votos
  // iguales seguidos cambien el texto y el lector los anuncie los dos.
  const [anuncio, setAnuncio] = useState("");

  const decidir = useCallback(
    (obra: Obra, voto: Voto) => {
      votar(obra.id, voto);
      if (voto === "no_valio") setMatchObra(obra);
      setVuelo({ id: obra.id, voto });
      setAnuncio(`Voto registrado: ${VOTO_LABEL[voto]}. ${obra.nombre}`);
    },
    [votar],
  );

  const onVueloCompleto = useCallback(() => setVuelo(null), []);

  const pendientes = listo ? OBRAS.filter((o) => !votos[o.id]) : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!tutorialVisto || vuelo || matchObra || fichaObra || claimObra) return;
      const top = pendientes[0];
      if (!top) return;
      const objetivo = e.target instanceof HTMLElement ? e.target : null;
      if (objetivo && objetivo.closest("button, a, input, textarea, select, [role='tab']")) return;
      if (e.key === "Enter") {
        e.preventDefault();
        setFichaObra(top);
        return;
      }
      const mapa: Record<string, Voto> = {
        ArrowRight: "valio",
        ArrowLeft: "no_valio",
        ArrowUp: "explica",
        ArrowDown: "no_puedo",
      };
      const voto = mapa[e.key];
      if (voto) {
        e.preventDefault();
        decidir(top, voto);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tutorialVisto, vuelo, matchObra, fichaObra, claimObra, pendientes, decidir]);

  if (!listo) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div className="deck-zone" aria-busy="true" />
      </div>
    );
  }

  if (pendientes.length === 0 && !vuelo) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div className="deck-zone" aria-label="Mazo terminado">
          <div className="empty-deck">
            <h2 className="display">Ya has votado todo</h2>
            <p>
              Has recorrido las {OBRAS.length} obras del piloto de {OBRAS[0].municipio}. Tus votos se
              guardan en este dispositivo; desde cada ficha puedes pedir explicaciones al organismo.
            </p>
            <button type="button" className="btn btn-primary" onClick={reset}>
              Volver a empezar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const volando = vuelo ? OBRAS.find((o) => o.id === vuelo.id) ?? null : null;
  const visibles = volando ? [volando, ...pendientes.slice(0, 2)] : pendientes.slice(0, 3);
  const restantes = pendientes.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="deck-zone" aria-label={`Quedan ${restantes} tarjetas`}>
        <AnimatePresence>
          {tutorialVisto ? null : <Tutorial key="tutorial" onCerrar={marcarTutorialVisto} />}
        </AnimatePresence>

        {visibles.map((obra, i) => (
          <div
            key={obra.id}
            className="stack-slot"
            aria-hidden={!tutorialVisto}
            style={{
              zIndex: 10 - i,
              transform: `translateY(${i * 10}px) scale(${1 - i * 0.04})`,
              transition: "transform 0.2s ease",
              pointerEvents: i === 0 ? "auto" : "none",
            }}
          >
            {i === 0 ? (
              <WorkCard
                obra={obra}
                indice={OBRAS.findIndex((o) => o.id === obra.id) + 1}
                total={OBRAS.length}
                vuelo={vuelo}
                onVueloCompleto={onVueloCompleto}
                onDecide={(voto) => decidir(obra, voto)}
                onFicha={() => setFichaObra(obra)}
              />
            ) : (
              <CardPreview obra={obra} />
            )}
          </div>
        ))}

        {/* Siempre montada: el lector solo anuncia cambios en una región live
            que ya existía, no una que aparece con el texto ya dentro. */}
        <div className="sr-only" role="status">
          {anuncio}
        </div>
      </div>

      <div className="action-row">
        <button type="button" className="action-btn action-nose" aria-label="No puedo valorarlo" disabled={!pendientes[0] || Boolean(vuelo)} onClick={() => decidir(pendientes[0], "no_puedo")}>
          ↓
        </button>
        <button type="button" className="action-btn action-novalio big" aria-label="No valió" disabled={!pendientes[0] || Boolean(vuelo)} onClick={() => decidir(pendientes[0], "no_valio")}>
          ✕
        </button>
        <button type="button" className="action-btn action-valio big" aria-label="Valió" disabled={!pendientes[0] || Boolean(vuelo)} onClick={() => decidir(pendientes[0], "valio")}>
          ✓
        </button>
        <button type="button" className="action-btn action-explica" aria-label="Pido explicaciones" disabled={!pendientes[0] || Boolean(vuelo)} onClick={() => decidir(pendientes[0], "explica")}>
          ↑
        </button>
      </div>

      <AnimatePresence>
        {matchObra && (
          <MatchScreen
            obra={matchObra}
            onClose={() => setMatchObra(null)}
            onClaim={() => {
              setClaimObra(matchObra);
              setMatchObra(null);
            }}
          />
        )}
      </AnimatePresence>

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
