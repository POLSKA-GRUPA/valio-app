"use client";

import { motion } from "framer-motion";
import { CATEGORIA_LABEL, ESTADO_LABEL, type Obra } from "@/lib/obras";
import { useDialog } from "@/lib/useDialog";

export function DetailSheet({
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
        aria-label={`Ficha de ${obra.nombre}`}
        className="sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="sheet-head">
          <h2 className="display">{obra.nombre}</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar ficha">
            ✕
          </button>
        </div>
        <div className="sheet-body">
          <section className="capa">
            <h3>Capa 1 · Resumen</h3>
            <p style={{ margin: 0, fontWeight: 600 }}>{obra.resumen}</p>
          </section>

          <section className="capa">
            <h3>Capa 2 · Datos</h3>
            <dl>
              <div>
                <dt>Coste</dt>
                <dd>{obra.importe}</dd>
              </div>
              <div>
                <dt>Plazo</dt>
                <dd>{obra.plazos}</dd>
              </div>
              <div>
                <dt>Promesa</dt>
                <dd>{obra.promesa}</dd>
              </div>
              <div>
                <dt>Ámbito</dt>
                <dd>
                  {CATEGORIA_LABEL[obra.categoria]} · {obra.municipio}
                </dd>
              </div>
            </dl>
          </section>

          <section className="capa">
            <h3>Capa 3 · Evidencia</h3>
            <dl>
              <div>
                <dt>Estado del dato</dt>
                <dd>{ESTADO_LABEL[obra.estadoDato]}</dd>
              </div>
              <div>
                <dt>Fuente</dt>
                <dd>
                  {obra.fuente ? (
                    <>
                      {obra.fuente.nombre}
                      {obra.fuente.fecha ? ` · consulta: ${obra.fuente.fecha}` : ""}
                    </>
                  ) : (
                    "Pendiente de verificación con el método P0 (valio-datos)."
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="capa">
            <h3>Match ciudadano · 5 requisitos</h3>
            <ul className="senales">
              {obra.senales.map((s) => (
                <li key={s}>
                  <span className="ok" aria-hidden="true">
                    ✓
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </section>

          <button type="button" className="btn btn-primary" onClick={onClaim}>
            Pedir explicaciones
          </button>
        </div>
      </motion.div>
    </>
  );
}
