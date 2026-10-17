"use client";

import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowDown, ArrowUp, Check, SlidersHorizontal, Undo2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIA_LABEL, ESTADO_LABEL, VOTO_LABEL, type Obra, type Voto } from "@/lib/obras";
import { useStore } from "@/lib/store";
import { useDialog } from "@/lib/useDialog";
import { costeVecino, eurosCompactos } from "@/lib/formato";
import { DetailSheet } from "./DetailSheet";
import { ClaimDraft } from "./ClaimDraft";
import { FotoTarjeta, vistaDe } from "./VistaAerea";
import { FiltroTipos } from "./FiltroTipos";
import { OrdenObras } from "./OrdenObras";
import { IconoTipo, slugTipo } from "./TipoObra";
import { importeDe, ORDEN_LABEL, ordenar } from "@/lib/orden";
import { REDISENO_LUMA } from "@/lib/flags";

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
 * Arriba la obra; en medio su foto aérea oficial si un documento público la
 * sitúa (vista aérea, tras flag); abajo la cifra protagonista y una única
 * etiqueta: el nivel de evidencia de la obra.
 */
function tipoImporteDe(obra: Obra): string {
  return obra.adjudicacion
    ? "Importe adjudicado, sin IVA"
    : `Presupuesto de licitación, ${obra.ivaLicitacionIncluido ? "con IVA" : "sin IVA"}`;
}

/**
 * Rediseño Luma: el póster es la cifra. Si la obra tiene vista aérea (flag
 * propio), la foto ocupa el póster tal cual sale de FotoTarjeta, con su
 * fecha, su licencia y su veredicto; si no, el importe es la imagen.
 * `--len` ajusta el cuerpo de la cifra a su número de caracteres (luma.css).
 */
function ContenidoLuma({ obra, onFicha }: { obra: Obra; onFicha?: () => void }) {
  const cifra = eurosCompactos(importeDe(obra));
  const conFoto = vistaDe(obra) != null;
  return (
    <div className="card-body">
      <div className={`poster${conFoto ? " poster-foto" : ""}`} data-cat={slugTipo(obra.categoria)}>
        {!conFoto && <IconoTipo categoria={obra.categoria} size={240} className="poster-marca" />}
        <p className="poster-tipo">
          <IconoTipo categoria={obra.categoria} size={16} />
          {CATEGORIA_LABEL[obra.categoria]}
        </p>
        {conFoto && <FotoTarjeta obra={obra} />}
        <div className="card-cifra">
          <p className="card-cifra-tipo">{tipoImporteDe(obra)}</p>
          <p className="card-cifra-valor num" style={{ "--len": cifra.length } as React.CSSProperties}>
            {cifra}
          </p>
          <p className="card-cifra-vecino num">≈ {costeVecino(obra.costePorHabitante)}</p>
        </div>
      </div>
      <div className="card-info">
        <h2 className="card-nombre display">{obra.nombre}</h2>
        <div className="card-pie">
          <span className="card-kicker">
            {obra.municipio} · {obra.anyo}
          </span>
          <span className={`tag tag-${obra.estadoDato}`}>{ESTADO_LABEL[obra.estadoDato]}</span>
        </div>
        {onFicha && (
          <button type="button" className="card-ficha-link" onClick={onFicha}>
            Ver ficha y evidencia
          </button>
        )}
      </div>
    </div>
  );
}

function ContenidoTarjeta({ obra, onFicha }: { obra: Obra; onFicha?: () => void }) {
  if (REDISENO_LUMA) return <ContenidoLuma obra={obra} onFicha={onFicha} />;
  // Importe protagonista: el mismo que usa el orden por importe (#37).
  const importe = importeDe(obra);
  const tipoImporte = tipoImporteDe(obra);
  return (
    <div className="card-body">
      <p className="card-kicker">
        {CATEGORIA_LABEL[obra.categoria]} · {obra.municipio} · {obra.anyo}
      </p>
      <h2 className="card-nombre display">{obra.nombre}</h2>
      <FotoTarjeta obra={obra} />
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
      {/* Rediseño Luma: el borde del lado hacia el que arrastras se enciende
          con el color de ese voto. Solo se anima la opacidad. */}
      {REDISENO_LUMA && (
        <>
          <motion.span className="brillo brillo-valio" style={{ opacity: opValio }} aria-hidden="true" />
          <motion.span className="brillo brillo-novalio" style={{ opacity: opNo }} aria-hidden="true" />
          <motion.span className="brillo brillo-explica" style={{ opacity: opExplica }} aria-hidden="true" />
          <motion.span className="brillo brillo-nose" style={{ opacity: opNose }} aria-hidden="true" />
        </>
      )}
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

const GESTOS: { voto: Voto; Icono: typeof Check; donde: string; que: string }[] = [
  { voto: "valio", Icono: Check, donde: "A la derecha", que: "Valió" },
  { voto: "no_valio", Icono: X, donde: "A la izquierda", que: "No valió" },
  { voto: "explica", Icono: ArrowUp, donde: "Arriba", que: "Pido explicaciones" },
  { voto: "no_puedo", Icono: ArrowDown, donde: "Abajo", que: "No puedo valorarlo" },
];

function TutorialLuma({ onCerrar }: { onCerrar: () => void }) {
  const dialogRef = useDialog(onCerrar);
  return (
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      className="tutorial"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-titulo"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      // Salida corta: mientras se desvanece sigue encima del mazo y taparía el primer gesto.
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      <span className="ico-tile" aria-hidden="true">
        <Check size={24} />
      </span>
      <h2 id="tutorial-titulo" className="display">
        Desliza y decide
      </h2>
      <p className="tutorial-lead">¿Valió lo que costó? Cada tarjeta es una obra pagada con dinero público.</p>
      <ul className="gestos">
        {GESTOS.map(({ voto, Icono, donde, que }) => (
          <li key={voto} className="gesto" data-voto={voto}>
            <Icono size={20} strokeWidth={2.5} aria-hidden="true" />
            <span>
              {que}
              <small>{donde}</small>
            </span>
          </li>
        ))}
      </ul>
      <p className="tutorial-nota">También puedes usar los botones de abajo o las flechas del teclado.</p>
      <button type="button" className="btn btn-primary" onClick={onCerrar}>
        Entendido, a votar
      </button>
    </motion.div>
  );
}

// REDISENO_LUMA es fijo en cada build: elegir componente aquí no cambia el
// orden de los hooks.
const Tutorial = REDISENO_LUMA ? TutorialLuma : TutorialClasico;

function TutorialClasico({ onCerrar }: { onCerrar: () => void }) {
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

/**
 * Rediseño Luma: orden y filtro en un menú anclado a un botón redondo, en
 * lugar de la fila de chips que se cortaba a 390 px. Dentro van los mismos
 * OrdenObras y FiltroTipos, con sus roles y sus anuncios.
 */
function MenuFiltros() {
  const { orden, tipos } = useStore();
  const [abierto, setAbierto] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    menuRef.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus();
    const cerrar = (devolverFoco: boolean) => {
      setAbierto(false);
      if (devolverFoco) botonRef.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      cerrar(true);
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !botonRef.current?.contains(t)) cerrar(false);
    };
    // Salir del menú con Tab también lo cierra: no queda abierto a la espalda.
    const onFocus = (e: FocusEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !botonRef.current?.contains(t)) setAbierto(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("focusin", onFocus);
    };
  }, [abierto]);

  const tiposTexto = tipos.length === 0 ? "Todos los tipos" : tipos.map((t) => CATEGORIA_LABEL[t]).join(", ");

  return (
    <div className="barra-mazo">
      <p className="barra-resumen">
        {ORDEN_LABEL[orden]} · {tiposTexto}
      </p>
      <button
        ref={botonRef}
        type="button"
        className="boton-redondo"
        aria-label="Ordenar y filtrar"
        aria-expanded={abierto}
        aria-controls="menu-filtros"
        onClick={() => setAbierto((a) => !a)}
      >
        <SlidersHorizontal size={20} aria-hidden="true" />
      </button>
      <div
        id="menu-filtros"
        ref={menuRef}
        className="filtros-barra menu-filtros"
        role="group"
        aria-label="Ordenar y filtrar"
        hidden={!abierto}
      >
        <p className="menu-titulo">Ordenar</p>
        <OrdenObras />
        <p className="menu-titulo">Tipo de obra</p>
        <FiltroTipos />
      </div>
    </div>
  );
}

const ICONO_VOTO: Record<Voto, typeof Check> = {
  valio: Check,
  no_valio: X,
  explica: ArrowUp,
  no_puedo: ArrowDown,
};

/** Etiqueta corta de cada botón de voto (el nombre accesible es VOTO_LABEL). */
const VOTO_CORTO: Record<Voto, string> = {
  valio: "Valió",
  no_valio: "No valió",
  explica: "Explica",
  no_puedo: "No sé",
};

/** Resumen al terminar: cuántas obras de este municipio llevan cada voto. */
function Recuento({ obras, votos }: { obras: Obra[]; votos: Record<string, Voto> }) {
  const orden: Voto[] = ["valio", "no_valio", "explica", "no_puedo"];
  return (
    <ul className="recuento" aria-label="Tus votos">
      {orden.map((v) => {
        const n = obras.filter((o) => votos[o.id] === v).length;
        return (
          <li key={v} data-voto={v}>
            <b className="num">{n}</b>
            <small>{VOTO_CORTO[v]}</small>
          </li>
        );
      })}
    </ul>
  );
}

export function Deck() {
  const {
    votos,
    votar,
    quitarVoto,
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
  // Rediseño Luma: el aviso dice qué votaste y permite deshacerlo.
  const [ultimo, setUltimo] = useState<{ obra: Obra; voto: Voto } | null>(null);
  // Al deshacer en pleno vuelo, las cartas se vuelven a montar en su sitio.
  const [reinicio, setReinicio] = useState(0);
  // Con el foco en «Deshacer» el aviso no se va: desmontarlo tiraría el foco.
  const [avisoEnFoco, setAvisoEnFoco] = useState(false);
  const zonaRef = useRef<HTMLDivElement>(null);

  const decidir = useCallback(
    (obra: Obra, voto: Voto) => {
      votar(obra.id, voto);
      setVuelo({ id: obra.id, voto });
      setAnuncio(`Voto registrado: ${VOTO_LABEL[voto]}. ${obra.nombre}`);
      setAvisoGuardado((n) => n + 1);
      if (REDISENO_LUMA) {
        setUltimo({ obra, voto });
        // Vibración corta donde exista (Android); en iOS no hace nada.
        try {
          navigator.vibrate?.(12);
        } catch {
          // sin vibración
        }
      }
      // Gesto arriba, botón ↑ o flecha ↑: además del voto, abre el borrador.
      if (voto === "explica") setClaimObra(obra);
    },
    [votar],
  );

  const deshacer = useCallback(() => {
    if (!ultimo) return;
    quitarVoto(ultimo.obra.id);
    setVuelo(null);
    setReinicio((n) => n + 1);
    // Deshacer «Pido explicaciones» cierra también su borrador.
    setClaimObra((c) => (c && c.id === ultimo.obra.id ? null : c));
    setAnuncio(`Voto deshecho. ${ultimo.obra.nombre}`);
    setUltimo(null);
    setAvisoGuardado(0);
    setAvisoEnFoco(false);
    // El botón desaparece con el aviso: el foco vuelve al mazo, no al body.
    zonaRef.current?.focus();
  }, [ultimo, quitarVoto]);

  useEffect(() => {
    if (!avisoGuardado) return;
    // Rediseño: el plazo para deshacer no corre con el foco en el aviso ni con
    // el borrador abierto (su trampa de foco no deja llegar al aviso con Tab;
    // al cerrarlo, el plazo empieza de nuevo).
    if (REDISENO_LUMA && (avisoEnFoco || claimObra)) return;
    // Con «Deshacer» hace falta algo más de tiempo para reaccionar.
    const t = window.setTimeout(
      () => {
        setAvisoGuardado(0);
        setUltimo(null);
      },
      REDISENO_LUMA ? 4000 : 2500,
    );
    return () => window.clearTimeout(t);
  }, [avisoGuardado, avisoEnFoco, claimObra]);

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
      {/* Rediseño Luma: el tipo de la carta de arriba tiñe toda la pantalla.
          Capas fijas, solo cambia su opacidad. */}
      {REDISENO_LUMA && (
        <div className="ambiente" aria-hidden="true">
          {Array.from(new Set(obras.map((o) => o.categoria))).map((c) => (
            <span key={c} data-cat={slugTipo(c)} className={pendientes[0]?.categoria === c ? "on" : undefined} />
          ))}
        </div>
      )}
      {/* Con el tutorial abierto no hay chips: el tutorial es modal. */}
      {tutorialVisto && !terminado && (REDISENO_LUMA ? <MenuFiltros /> : <BarraFiltros />)}
      <div
        ref={zonaRef}
        tabIndex={REDISENO_LUMA ? -1 : undefined}
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
            {REDISENO_LUMA && <Recuento obras={obras} votos={votos} />}
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
            key={`${obra.id}:${reinicio}`}
            data-pos={i}
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
        {!REDISENO_LUMA && avisoGuardado > 0 && (
          <p className="voto-guardado" aria-hidden="true">
            Tu voto se ha guardado en este dispositivo
          </p>
        )}
        {/* Rediseño Luma: aviso en píldora arriba, del color del voto. El texto
            va oculto al lector (ya lo anuncia la región live); «Deshacer» no. */}
        {REDISENO_LUMA && avisoGuardado > 0 && ultimo && (
          <div
            className="voto-guardado"
            data-voto={ultimo.voto}
            onFocus={() => setAvisoEnFoco(true)}
            onBlur={() => setAvisoEnFoco(false)}
          >
            <span className="voto-guardado-texto" aria-hidden="true">
              {(() => {
                const Icono = ICONO_VOTO[ultimo.voto];
                return <Icono size={18} strokeWidth={2.6} />;
              })()}
              {VOTO_LABEL[ultimo.voto]} · guardado
            </span>
            <button type="button" onClick={deshacer} aria-label={`Deshacer el voto de ${ultimo.obra.nombre}`}>
              <Undo2 size={15} strokeWidth={2.4} aria-hidden="true" />
              Deshacer
            </button>
          </div>
        )}
      </div>

      {!vacio && (
      <div className="action-row">
        <button type="button" className="action-btn action-nose" aria-label={REDISENO_LUMA ? "No sé, no puedo valorarlo" : "No puedo valorarlo"} disabled={!pendientes[0] || Boolean(vuelo)} onClick={() => decidir(pendientes[0], "no_puedo")}>
          <ArrowDown size={24} strokeWidth={2.5} aria-hidden="true" />
          {REDISENO_LUMA && <span className="action-label">{VOTO_CORTO.no_puedo}</span>}
        </button>
        <button type="button" className="action-btn action-novalio big" aria-label="No valió" disabled={!pendientes[0] || Boolean(vuelo)} onClick={() => decidir(pendientes[0], "no_valio")}>
          <X size={30} strokeWidth={2.5} aria-hidden="true" />
          {REDISENO_LUMA && <span className="action-label">{VOTO_CORTO.no_valio}</span>}
        </button>
        <button type="button" className="action-btn action-valio big" aria-label="Valió" disabled={!pendientes[0] || Boolean(vuelo)} onClick={() => decidir(pendientes[0], "valio")}>
          <Check size={30} strokeWidth={2.5} aria-hidden="true" />
          {REDISENO_LUMA && <span className="action-label">{VOTO_CORTO.valio}</span>}
        </button>
        <button type="button" className="action-btn action-explica" aria-label="Pido explicaciones" disabled={!pendientes[0] || Boolean(vuelo)} onClick={() => decidir(pendientes[0], "explica")}>
          <ArrowUp size={24} strokeWidth={2.5} aria-hidden="true" />
          {REDISENO_LUMA && <span className="action-label">{VOTO_CORTO.explica}</span>}
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
