"use client";

import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { CATEGORIA_LABEL, ESTADO_LABEL, OBRAS, VOTO_LABEL, type Obra, type Voto, type Votos } from "@/lib/obras";
import { useStore } from "@/lib/store";
import { DetailSheet } from "./DetailSheet";
import { MatchScreen } from "./MatchScreen";
import { ClaimDraft } from "./ClaimDraft";

const UMBRAL_X = 110;
const UMBRAL_Y = 130;

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
  salida,
}: {
  obra: Obra;
  indice: number;
  total: number;
  onDecide: (voto: Voto) => void;
  onFicha: () => void;
  salida: Voto | null;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-14, 14]);
  const opValio = useTransform(x, [30, UMBRAL_X], [0, 1]);
  const opNo = useTransform(x, [-30, -UMBRAL_X], [0, 1]);
  const opExplica = useTransform(y, [-40, -UMBRAL_Y], [0, 1]);
  const opNose = useTransform(y, [40, UMBRAL_Y], [0, 1]);

  const salir = (voto: Voto) => {
    const fx = voto === "valio" ? 420 : voto === "no_valio" ? -420 : 0;
    const fy = voto === "explica" ? -560 : voto === "no_puedo" ? 560 : 0;
    onDecide(voto);
    x.set(fx);
    y.set(fy);
  };

  return (
    <motion.article
      className="card-frame"
      style={{ x, y, rotate }}
      role="group"
      aria-label={`Tarjeta ${indice} de ${total}: ${obra.nombre}`}
      drag
      dragElastic={0.6}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > UMBRAL_X) salir("valio");
        else if (info.offset.x < -UMBRAL_X) salir("no_valio");
        else if (info.offset.y < -UMBRAL_Y) salir("explica");
        else if (info.offset.y > UMBRAL_Y) salir("no_puedo");
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
      {salida && (
        <div className="sr-only" role="status">
          {`Voto registrado: ${VOTO_LABEL[salida]}`}
        </div>
      )}
    </motion.article>
  );
}

export function Deck({ activo }: { activo: boolean }) {
  const { votos, votar, marcarTutorialVisto, tutorialVisto } = useStore();
  const pendientes = OBRAS.filter((o) => !votos[o.id]);
  const [salida, setSalida] = useState<Voto | null>(null);
  const [matchObra, setMatchObra] = useState<Obra | null>(null);
  const [fichaObra, setFichaObra] = useState<Obra | null>(null);
  const [claimObra, setClaimObra] = useState<Obra | null>(null);

  const decidir = useCallback(
    (obra: Obra, voto: Voto) => {
      setSalida(voto);
      votar(obra.id, voto);
      if (voto === "no_valio") setMatchObra(obra);
      window.setTimeout(() => setSalida(null), 320);
    },
    [votar],
  );

  useEffect(() => {
    if (!activo) return;
    const onKey = (e: KeyboardEvent) => {
      const top = pendientes[0];
      if (!top || fichaObra || claimObra || matchObra || salida) return;
      if (e.key === "ArrowRight") decidir(top, "valio");
      else if (e.key === "ArrowLeft") decidir(top, "no_valio");
      else if (e.key === "ArrowUp") decidir(top, "explica");
      else if (e.key === "ArrowDown") decidir(top, "no_puedo");
      else if (e.key === "Enter") setFichaObra(top);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activo, pendientes, decidir, fichaObra, claimObra, matchObra, salida]);

  if (pendientes.length === 0) {
    return (
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
    );
  }

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

      <AnimatePresence>
        {pendientes.slice(0, 3).map((obra, i) => (
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
                indice={OBRAS.length - restantes + 1}
                total={OBRAS.length}
                salida={salida}
                onDecide={(voto) => decidir(obra, voto)}
                onFicha={() => setFichaObra(obra)}
              />
            ) : (
              <CardPreview obra={obra} indice={OBRAS.length - restantes + 1 + i} />
            )}
          </div>
        ))}
      </AnimatePresence>

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

      <div className="action-row">
        <button type="button" className="action-btn action-nose" aria-label="No puedo valorarlo" onClick={() => decidir(pendientes[0], "no_puedo")}>
          ↓
        </button>
        <button type="button" className="action-btn action-novalio big" aria-label="No valió" onClick={() => decidir(pendientes[0], "no_valio")}>
          ✕
        </button>
        <button type="button" className="action-btn action-valio big" aria-label="Valió" onClick={() => decidir(pendientes[0], "valio")}>
          ✓
        </button>
        <button type="button" className="action-btn action-explica" aria-label="Pido explicaciones" onClick={() => decidir(pendientes[0], "explica")}>
          ↑
        </button>
      </div>
    </div>
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

export type { Votos };
