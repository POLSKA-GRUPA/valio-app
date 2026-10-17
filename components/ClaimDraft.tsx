"use client";

import { useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { ChevronRight, FileText } from "lucide-react";
import type { Obra } from "@/lib/obras";
import { euros } from "@/lib/formato";
import { useDialog } from "@/lib/useDialog";
import { useHojaArrastrable } from "@/lib/useHoja";
import { REDISENO_LUMA } from "@/lib/flags";

const ANCHO_POMO = 58;

/**
 * Rediseño Luma: «Desliza para copiar». Es un botón de verdad: Enter,
 * Espacio, un toque o la activación de un lector de pantalla copian igual;
 * deslizar es el gesto táctil. Copiar no envía nada.
 */
function DeslizarCopiar({ copiado, onCopiar }: { copiado: boolean; onCopiar: () => void }) {
  const pistaRef = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const max = useRef(0);
  const inicio = useRef<number | null>(null);
  const ignorarClick = useRef(false);
  const relleno = useTransform(x, (v) => (max.current ? Math.min(1, (v + ANCHO_POMO) / (max.current + ANCHO_POMO)) : 0));

  const volver = () => animate(x, 0, { type: "spring", damping: 26, stiffness: 300 });

  const soltar = (cancelado: boolean) => {
    if (inicio.current == null) return;
    inicio.current = null;
    const recorrido = x.get();
    // Tras un arrastre el navegador emite un clic que no debe copiar otra vez.
    // Un pointercancel no emite clic: no se marca, o se perdería la siguiente copia.
    ignorarClick.current = !cancelado && recorrido > 4;
    if (!cancelado && recorrido > max.current * 0.85) {
      animate(x, max.current, { duration: 0.12 });
      onCopiar();
      window.setTimeout(volver, 1200);
    } else {
      volver();
    }
  };

  return (
    <button
      ref={pistaRef}
      type="button"
      className={`deslizar${copiado ? " hecho" : ""}`}
      aria-label={copiado ? "¡Copiado!" : "Desliza para copiar borrador"}
      onPointerDown={(e) => {
        const pista = pistaRef.current;
        if (!pista) return;
        max.current = pista.clientWidth - ANCHO_POMO - 8;
        inicio.current = e.clientX - x.get();
        pista.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (inicio.current == null) return;
        x.set(Math.max(0, Math.min(max.current, e.clientX - inicio.current)));
      }}
      onPointerUp={() => soltar(false)}
      onPointerCancel={() => soltar(true)}
      onClick={() => {
        if (ignorarClick.current) {
          ignorarClick.current = false;
          return;
        }
        onCopiar();
      }}
    >
      <motion.span className="deslizar-relleno" style={{ scaleX: relleno }} aria-hidden="true" />
      <span className="deslizar-texto" aria-hidden="true">
        {copiado ? "¡Copiado!" : "Desliza para copiar borrador"}
      </span>
      <motion.span className="deslizar-pomo" style={{ x }} aria-hidden="true">
        <ChevronRight size={22} strokeWidth={2.6} />
      </motion.span>
    </button>
  );
}

function borrador(obra: Obra): string {
  const adj = obra.adjudicacion;
  return `A la atención del organismo competente (${obra.organismo}):

Por medio de la app ¿VALIÓ?, solicito explicaciones sobre «${obra.nombre}»${
    adj?.numExpediente ? ` (expediente ${adj.numExpediente})` : ""
  }.

Datos oficiales que constan (${obra.fuente.nombre}, consultada el ${obra.fuente.fechaConsulta}):
- Presupuesto de licitación: ${euros(obra.importeLicitacion)} (IVA ${
    obra.ivaLicitacionIncluido ? "incluido" : "no incluido"
  }).
${
    adj
      ? `- Adjudicataria: ${adj.adjudicataria}${adj.cif ? ` (${adj.cif})` : ""}.
- Importe de adjudicación: ${euros(adj.importeSinIva)} sin IVA.
- Fecha del acuerdo de adjudicación: ${adj.fechaAcuerdo}; plazo de ejecución: ${adj.plazo}.
`
      : "- No he podido localizar la adjudicación en la fuente pública consultada.\n"
  }- Estado de ejecución: no localizado en las fuentes públicas consultadas.

Solicitud:
1. Informe del estado actual de ejecución y justificación de desviaciones de coste o plazo.
2. Documentación contractual aplicable y fechas clave.
3. Previsión de finalización o corrección.

Quedo a la espera de respuesta por los canales oficiales.

Atentamente,
[NOMBRE Y APELLIDOS]
[DNI/NIE]
[DIRECCIÓN DE CONTACTO]

Nota: este borrador lo ha generado la aplicación y debe revisarlo y enviarlo una persona.
¿VALIÓ? nunca envía nada automáticamente.`;
}

export function ClaimDraft({ obra, onClose }: { obra: Obra; onClose: () => void }) {
  const dialogRef = useDialog(onClose);
  const { arrastre, asa } = useHojaArrastrable(onClose);
  const inicial = useMemo(() => borrador(obra), [obra]);
  const [texto, setTexto] = useState(inicial);
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      if (navigator.clipboard) {
        // Contexto seguro (https o localhost): API moderna.
        await navigator.clipboard.writeText(texto);
      } else {
        // Contexto no seguro (p. ej. la demo por http en la red local):
        // navigator.clipboard no existe. Plan B clásico: textarea temporal.
        const area = document.createElement("textarea");
        area.value = texto;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        area.setSelectionRange(0, texto.length);
        const ok = document.execCommand("copy");
        document.body.removeChild(area);
        if (!ok) throw new Error("execCommand('copy') falló");
      }
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <>
      <motion.div
        className="sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Borrador de solicitud de explicaciones"
        className="sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        {...arrastre}
      >
        {REDISENO_LUMA && <div className="asa" aria-hidden="true" {...asa} />}
        <div className="sheet-head" {...asa}>
          {REDISENO_LUMA && (
            <span className="ico-tile" aria-hidden="true">
              <FileText size={24} />
            </span>
          )}
          <h2 className="display">Tu borrador</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar borrador">
            ✕
          </button>
        </div>
        <div className="sheet-body">
          <div className="info-note">
            La app redacta; tú revisas y envías. En la demo no hay destinatario real: cuando exista organismo
            identificado con canal verificado, este paso te llevará al formulario oficial o a tu correo.
          </div>
          <label className="sr-only" htmlFor="claim-texto">
            Texto del borrador
          </label>
          <textarea
            id="claim-texto"
            className="claim-textarea"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          {REDISENO_LUMA ? (
            <div className="claim-actions">
              <DeslizarCopiar copiado={copiado} onCopiar={copiar} />
              <p className="claim-hitl">Copiar no envía nada. Lo envías tú, cuando lo hayas revisado.</p>
              <button type="button" className="btn" onClick={onClose}>
                Cerrar
              </button>
            </div>
          ) : (
            <div className="claim-actions">
              <button type="button" className="btn btn-primary" onClick={copiar}>
                {copiado ? "¡Copiado!" : "Copiar borrador"}
              </button>
              <button type="button" className="btn" onClick={onClose}>
                Cerrar
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
