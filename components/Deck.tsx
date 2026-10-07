"use client";

import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { CATEGORIA_LABEL, VOTO_LABEL, type Categoria, type Obra, type Voto } from "@/lib/obras";
import { useStore } from "@/lib/store";
import { useDialog } from "@/lib/useDialog";
import { costeVecino, eurosCompactos } from "@/lib/formato";
import { DetailSheet } from "./DetailSheet";
import { MatchScreen } from "./MatchScreen";
import { ClaimDraft } from "./ClaimDraft";
import { FiltroTipos } from "./FiltroTipos";

const UMBRAL_X = 110;
const UMBRAL_Y = 130;

// Color de tarjeta por categoría: codifica el tipo de gasto (dato), no decoración.
const CATEGORIA_COLOR: Record<Categoria, string> = {
  urbanismo: "#2F6BFF",
  deporte: "#0E9F6E",
  parques: "#059669",
  educacion: "#E11D48",
  seguridad: "#7C3AED",
  patrimonio: "#B45309",
  "medio ambiente": "#65A30D",
};

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
  const c = CATEGORIA_COLOR[obra.categoria];
  // Importe protagonista: el de adjudicación si consta; si no, el de licitación.
  const importe = obra.adjudicacion?.importeSinIva ?? obra.importeLicitacion;
  const tipoImporte = obra.adjudicacion ? "Adjudicado · sin IVA" : "Licitación · sin IVA";
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
        <text x="18" y="72" fontFamily="var(--font-display)" fontSize="64" fill="#fffdf7" opacity="0.9">
          {String(indice).padStart(2, "0")}
        </text>
      </svg>
      <div className="art-top">
        <span className="chip chip-cat">{CATEGORIA_LABEL[obra.categoria]}</span>
        <span className="art-top-right">
          <span className="chip estado-faltante">Ejecución: dato faltante</span>
        </span>
      </div>
      <p className="art-cost display">{eurosCompactos(importe)}</p>
      <p className="art-tipo-importe">{tipoImporte} · ≈ {costeVecino(obra.costePorHabitante)}</p>
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
          <span>
            {obra.municipio} · {obra.anyo}
          </span>
          <span>{obra.adjudicacion?.plazo ?? "plazo sin dato"}</span>
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
  const { votos, votar, reset, marcarTutorialVisto, tutorialVisto, listo, municipio, obras, tipos, verTodosLosTipos } =
    useStore();
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

  const sinVotar = listo ? obras.filter((o) => !votos[o.id]) : [];
  const pendientes = tipos.length === 0 ? sinVotar : sinVotar.filter((o) => tipos.includes(o.categoria));

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

  // El filtro deja el mazo vacío, pero quedan obras de otros tipos.
  if (pendientes.length === 0 && sinVotar.length > 0 && !vuelo) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <FiltroTipos />
        <div className="deck-zone" aria-label="Sin obras de este tipo">
          <div className="empty-deck">
            <h2 className="display">Nada pendiente de este tipo</h2>
            <p>
              Te quedan {sinVotar.length} {sinVotar.length === 1 ? "obra" : "obras"} de otros tipos en {municipio}.
            </p>
            <button type="button" className="btn btn-primary" onClick={verTodosLosTipos}>
              Ver todas
            </button>
          </div>
        </div>
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
              Has recorrido las {obras.length} obras del piloto de {municipio}. Tus votos se
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

  const volando = vuelo ? obras.find((o) => o.id === vuelo.id) ?? null : null;
  const visibles = volando ? [volando, ...pendientes.slice(0, 2)] : pendientes.slice(0, 3);
  const restantes = pendientes.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Con el tutorial abierto no hay chips: el tutorial es modal. */}
      {tutorialVisto && <FiltroTipos />}
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
                indice={obras.findIndex((o) => o.id === obra.id) + 1}
                total={obras.length}
                vuelo={vuelo}
                onVueloCompleto={onVueloCompleto}
                onDecide={(voto) => decidir(obra, voto)}
                onFicha={() => setFichaObra(obra)}
              />
            ) : (
              <CardPreview obra={obra} indice={obras.findIndex((o) => o.id === obra.id) + 1} />
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
