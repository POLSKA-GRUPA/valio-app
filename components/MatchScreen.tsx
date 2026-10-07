"use client";

import { motion } from "framer-motion";
import type { Obra } from "@/lib/obras";
import { useDialog } from "@/lib/useDialog";

// Los cinco requisitos del match ciudadano (dossier §4.4): son condiciones del
// estado del caso, no datos por obra.
const REQUISITOS = [
  "Participación suficiente",
  "Evidencia documental mínima",
  "Pregunta o anomalía concreta",
  "Organismo competente identificable",
  "Sin bloqueos de moderación",
];

export function MatchScreen({
  obra,
  onClose,
  onClaim,
}: {
  obra: Obra;
  onClose: () => void;
  onClaim: () => void;
}) {
  const dialogRef = useDialog(onClose);
  return (
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      className="match-screen"
      role="alertdialog"
      aria-modal="true"
      aria-label="Match ciudadano"
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", damping: 22, stiffness: 260 }}
    >
      <h2 className="display">¡MATCH CIUDADANO!</h2>
      <p>
        Tu <strong>no valió</strong> se suma a la señal colectiva sobre «{obra.nombre}». En la demo, los cinco
        requisitos se cumplen de ejemplo; en producción se calibran y se publican.
      </p>
      <div className="match-checklist">
        {REQUISITOS.map((s) => (
          <span key={s}>✓ {s}</span>
        ))}
      </div>
      <div className="match-actions">
        <button type="button" className="btn btn-primary" onClick={onClaim}>
          Pedir explicaciones
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Seguir votando
        </button>
      </div>
    </motion.div>
  );
}
