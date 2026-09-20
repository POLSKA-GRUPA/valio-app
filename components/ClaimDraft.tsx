"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Obra } from "@/lib/obras";
import { useDialog } from "@/lib/useDialog";

function borrador(obra: Obra): string {
  return `A la atención del organismo competente (Ayuntamiento de ${obra.municipio}):

Por medio del formulario de ¿VALIÓ? (demo), solicito explicaciones sobre «${obra.nombre}».

Datos que motivan la solicitud (de demostración, pendientes de verificación):
- Coste declarado: ${obra.importe}.
- Plazo: ${obra.plazos}.
- Promesa oficial: ${obra.promesa}.

Solicitud:
1. Informe del estado actual y justificación de desviaciones de coste o plazo.
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
  const inicial = useMemo(() => borrador(obra), [obra]);
  const [texto, setTexto] = useState(inicial);
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
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
      >
        <div className="sheet-head">
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
          <div className="claim-actions">
            <button type="button" className="btn btn-primary" onClick={copiar}>
              {copiado ? "¡Copiado!" : "Copiar borrador"}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
