"use client";

import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { CATEGORIA_LABEL, ESTADO_LABEL, OBRAS, VOTO_LABEL, type Obra, type Voto } from "@/lib/obras";
import { useStore } from "@/lib/store";
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

function ArteObra({ obra, indice }: { obra: Obra; indice: number }) {
  const c = obra.color;
  return (
    <>
      <svg viewBox="0 0 360 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="360" height="460" fill={c} />
        <g opacity="0.35">
          {Array.from({ length: 9 }).map((_, i) => (
            <rect key={i} x={-80 + i * 56} y={-40} width="18" height="600" fill="#fffdf7" transform="rotate(18 180 230)" />
          ))}
        </g>
        <circle cx="292" cy="76" r="64" fill="#102a43" opacity="0.9" />
        <circle cx="292" cy="76" r="40" fill={c} />
        {obra.categoria === "obra" && <rect x="24" y="300" width="120" height="120" fill="#102a43" opacity="0.85" />}
        {obra.categoria === "contrato" && <path d="M60 380h180v60H60z M60 340h120v28H60z" fill="#102a43" opacity="0.85" />}
        {obra.categoria === "sanidad" && <rect x="252" y="330" width="80" height="80" fill="#102a43" opacity="0.85" />}
        {obra.categoria === "transporte" && <path d="M40 420l90-90 90 90z" fill="#102a43" opacity="0.85" />}
        {obra.categoria === "educacion" && <circle cx="80" cy="390" r="52" fill="#102a43" opacity="0.85" />}
        {obra.categoria === "servicio" && <path d="M40 440v-70a50 50 0 0 1 100 0v70z" fill="#102a43" opacity="0.85" />}
        <text x="18" y="72" fontFamily="var(--font-display)" fontSize="64" fill="#fffdf7" opacity="0.9">
          {String(indice).padStart(2, "0")}
        </text>
      </svg>
      <div className="art-top">
        <span className="chip chip-cat">{CATEGORIA_LABEL[obra.categoria]}</span>
        <span className="art-top-right">
          <span className="chip chip-demo">Demo</span>
          <span className={`chip estado-${obra.estadoDato}`}>{ESTADO_LABEL[obra.estadoDato]}</span>
        </span>
      </div>
      <p className="art-cost display">{obra.importe}</p>
    </>
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
      <div className="card-art">
        <ArteObra obra={obra} indice={indice} />
      </div>
      <div className="card-body">
        <h2 className="card-nombre display">{obra.nombre}</h2>
        <div className="card-meta">
          <span>{obra.municipio}</span>
          <span>{obra.plazos}</span>
        </div>
        <button type="button" className="card-ficha-link" onClick={onFicha}>
          Ver ficha y evidencia
        </button>
      </div>
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

function CardPreview({ obra, indice }: { obra: Obra; indice: number }) {
  return (
    <div className="card-frame" aria-hidden="true" style={{ pointerEvents: "none" }}>
      <div className="card-art">
        <ArteObra obra={obra} indice={indice} />
      </div>
      <div className="card-body">
        <h2 className="card-nombre display">{obra.nombre}</h2>
      </div>
    </div>
  );
}

export function Deck() {
  const { votos, votar, marcarTutorialVisto, tutorialVisto, listo } = useStore();
  const [vuelo, setVuelo] = useState<{ id: string; voto: Voto } | null>(null);
  const [matchObra, setMatchObra] = useState<Obra | null>(null);
  const [fichaObra, setFichaObra] = useState<Obra | null>(null);
  const [claimObra, setClaimObra] = useState<Obra | null>(null);

  const decidir = useCallback(
    (obra: Obra, voto: Voto) => {
      votar(obra.id, voto);
      if (voto === "no_valio") setMatchObra(obra);
      setVuelo({ id: obra.id, voto });
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
              Este es el resultado de la demo. Con datos reales, tus votos alimentan el mapa del cabreo y los pases de
              explicaciones.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
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
          {tutorialVisto ? null : (
            <motion.div
              key="tutorial"
              className="tutorial"
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
              <button type="button" className="btn btn-primary" onClick={marcarTutorialVisto}>
                Entendido, a votar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {visibles.map((obra, i) => (
          <div
            key={obra.id}
            className="stack-slot"
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
              <CardPreview obra={obra} indice={OBRAS.findIndex((o) => o.id === obra.id) + 1} />
            )}
          </div>
        ))}

        {volando && vuelo && (
          <div className="sr-only" role="status">
            {`Voto registrado: ${VOTO_LABEL[vuelo.voto]}`}
          </div>
        )}
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
