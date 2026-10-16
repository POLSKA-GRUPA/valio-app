"use client";

import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CATEGORIA_LABEL, ESTADO_LABEL, VOTO_LABEL, type Obra, type Voto } from "@/lib/obras";
import { useStore } from "@/lib/store";
import { useDialog } from "@/lib/useDialog";
import { costeVecino, eurosCompactos } from "@/lib/formato";
import { DetailSheet } from "./DetailSheet";
import { ClaimDraft } from "./ClaimDraft";
import { FiltroTipos } from "./FiltroTipos";
import { OrdenObras } from "./OrdenObras";
import { importeDe, ordenar } from "@/lib/orden";

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
 * así que no hay mapa) y una única etiqueta: el nivel de evidencia de la obra.
 */
function ContenidoTarjeta({ obra, onFicha }: { obra: Obra; onFicha?: () => void }) {
  // Importe protagonista: el mismo que usa el orden por importe (#37).
  const importe = importeDe(obra);
  const tipoImporte = obra.adjudicacion
    ? "Importe adjudicado, sin IVA"
    : `Presupuesto de licitación, ${obra.ivaLicitacionIncluido ? "con IVA" : "sin IVA"}`;
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
        <span className={`tag tag-${obra.estadoDato}`}>{ESTADO_LABEL[obra.estadoDato]}</span>
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

/** Orden y tipos en una sola fila con scroll lateral: el mazo conserva su alto. */
function BarraFiltros() {
  return (
    <div className="filtros-barra">
      <OrdenObras />
      <span className="filtros-separador" aria-hidden="true" />
      <FiltroTipos />
    </div>
  );
}

export function Deck() {
  const {
    votos,
    votar,
    reset,
    marcarTutorialVisto,
    tutorialVisto,
    listo,
    municipio,
    obras,
    tipos,
    verTodosLosTipos,
    orden,
  } = useStore();
  const [vuelo, setVuelo] = useState<{ id: string; voto: Voto } | null>(null);
  const [fichaObra, setFichaObra] = useState<Obra | null>(null);
  const [claimObra, setClaimObra] = useState<Obra | null>(null);
  // Texto de la región live. Lleva el nombre de la obra para que dos votos
  // iguales seguidos cambien el texto y el lector los anuncie los dos.
  const [anuncio, setAnuncio] = useState("");
  // #38: tras votar, aviso visible y sobrio (sin match: un voto no es un
  // estado colectivo). Cuenta los votos para reiniciar el temporizador.
  const [avisoGuardado, setAvisoGuardado] = useState(0);

  const decidir = useCallback(
    (obra: Obra, voto: Voto) => {
      votar(obra.id, voto);
      setVuelo({ id: obra.id, voto });
      setAnuncio(`Voto registrado: ${VOTO_LABEL[voto]}. ${obra.nombre}`);
      setAvisoGuardado((n) => n + 1);
      // Gesto arriba, botón ↑ o flecha ↑: además del voto, abre el borrador.
      if (voto === "explica") setClaimObra(obra);
    },
    [votar],
  );

  useEffect(() => {
    if (!avisoGuardado) return;
    const t = window.setTimeout(() => setAvisoGuardado(0), 2500);
    return () => window.clearTimeout(t);
  }, [avisoGuardado]);

  const onVueloCompleto = useCallback(() => setVuelo(null), []);

  const sinVotar = listo ? obras.filter((o) => !votos[o.id]) : [];
  const pendientes = ordenar(
    tipos.length === 0 ? sinVotar : sinVotar.filter((o) => tipos.includes(o.categoria)),
    orden,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!tutorialVisto || vuelo || fichaObra || claimObra) return;
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
  }, [tutorialVisto, vuelo, fichaObra, claimObra, pendientes, decidir]);

  if (!listo) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div className="deck-zone" aria-busy="true" />
      </div>
    );
  }

  // Mazo vacío (por filtro o porque no queda nada): se pinta dentro del mismo
  // árbol para que el borrador de explicaciones, el aviso y la región live
  // sigan montados tras el último voto.
  const vacio = pendientes.length === 0 && !vuelo;
  const agotadoFiltro = vacio && sinVotar.length > 0;
  const terminado = vacio && sinVotar.length === 0;

  const volando = vuelo ? obras.find((o) => o.id === vuelo.id) ?? null : null;
  const visibles = volando ? [volando, ...pendientes.slice(0, 2)] : pendientes.slice(0, 3);
  const restantes = pendientes.length;
  // Posición de cada carta dentro de lo que se está votando (municipio + filtro),
  // no en la lista de datos: con filtro u orden, «Tarjeta 2 de 5», no «19 de 21».
  const filtradas = tipos.length === 0 ? obras : obras.filter((o) => tipos.includes(o.categoria));
  const yaVotadas = filtradas.length - pendientes.length;
  const posicion = (obra: Obra) =>
    // La carta en vuelo puede no pertenecer ya al filtro (si se cambia durante
    // la animación): nunca «Tarjeta 0».
    volando && obra.id === volando.id
      ? Math.max(1, yaVotadas)
      : yaVotadas + 1 + pendientes.findIndex((o) => o.id === obra.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Con el tutorial abierto no hay chips: el tutorial es modal. */}
      {tutorialVisto && !terminado && <BarraFiltros />}
      <div
        className="deck-zone"
        aria-label={
          terminado ? "Mazo terminado" : agotadoFiltro ? "Sin obras de este tipo" : `Quedan ${restantes} tarjetas`
        }
      >
        {agotadoFiltro && (
          <div className="empty-deck">
            <h2 className="display">Nada pendiente de este tipo</h2>
            <p>
              Te quedan {sinVotar.length} {sinVotar.length === 1 ? "obra" : "obras"} de otros tipos en {municipio}.
            </p>
            <button type="button" className="btn btn-primary" onClick={verTodosLosTipos}>
              Ver todas
            </button>
          </div>
        )}
        {terminado && (
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
        )}

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
                indice={posicion(obra)}
                total={filtradas.length}
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

        {/* aria-hidden: al lector ya se lo dice la región live de arriba. */}
        {avisoGuardado > 0 && (
          <p className="voto-guardado" aria-hidden="true">
            Tu voto se ha guardado en este dispositivo
          </p>
        )}
      </div>

      {!vacio && (
      <div className="action-row">
        <button type="button" className="action-btn action-nose" aria-label="No puedo valorarlo" disabled={!pendientes[0] || Boolean(vuelo)} onClick={() => decidir(pendientes[0], "no_puedo")}>
          <ArrowDown size={24} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <button type="button" className="action-btn action-novalio big" aria-label="No valió" disabled={!pendientes[0] || Boolean(vuelo)} onClick={() => decidir(pendientes[0], "no_valio")}>
          <X size={30} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <button type="button" className="action-btn action-valio big" aria-label="Valió" disabled={!pendientes[0] || Boolean(vuelo)} onClick={() => decidir(pendientes[0], "valio")}>
          <Check size={30} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <button type="button" className="action-btn action-explica" aria-label="Pido explicaciones" disabled={!pendientes[0] || Boolean(vuelo)} onClick={() => decidir(pendientes[0], "explica")}>
          <ArrowUp size={24} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
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
