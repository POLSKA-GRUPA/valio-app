"use client";

import { motion } from "framer-motion";
import { CATEGORIA_LABEL, ESTADO_LABEL, POBLACION, type Obra } from "@/lib/obras";
import { costeVecino, euros } from "@/lib/formato";
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
  const adjudicacion = obra.adjudicacion;
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
            <dl>
              <div>
                <dt>Administración</dt>
                <dd>{obra.organismo}</dd>
              </div>
              <div>
                <dt>Ámbito</dt>
                <dd>
                  {obra.municipio} ({obra.provincia}) · {CATEGORIA_LABEL[obra.categoria]}
                </dd>
              </div>
              <div>
                <dt>Año</dt>
                <dd>{obra.anyo}</dd>
              </div>
            </dl>
          </section>

          <section className="capa">
            <h3>Capa 2 · Los documentos dicen</h3>
            <dl>
              <div>
                <dt>Presupuesto de licitación</dt>
                <dd>
                  {euros(obra.importeLicitacion)} · IVA{" "}
                  {obra.ivaLicitacionIncluido ? "incluido" : "no incluido"}
                </dd>
              </div>
              {adjudicacion ? (
                <>
                  <div>
                    <dt>Adjudicataria</dt>
                    <dd>
                      {adjudicacion.adjudicataria}
                      {adjudicacion.cif ? ` · ${adjudicacion.cif}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Importe de adjudicación</dt>
                    <dd>
                      {euros(adjudicacion.importeSinIva)} sin IVA
                      {adjudicacion.importeConIva != null
                        ? ` (${euros(adjudicacion.importeConIva)} con IVA)`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Fecha del acuerdo</dt>
                    <dd>
                      {adjudicacion.fechaAcuerdo}
                      {adjudicacion.fechaPublicacion
                        ? ` · anuncio publicado el ${adjudicacion.fechaPublicacion.replaceAll("-", "/")}`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Plazo de ejecución</dt>
                    <dd>{adjudicacion.plazo}</dd>
                  </div>
                  {adjudicacion.numExpediente && (
                    <div>
                      <dt>Expediente</dt>
                      <dd>{adjudicacion.numExpediente}</dd>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <dt>Adjudicación</dt>
                  <dd>No consta: expediente no accesible en la fuente consultada</dd>
                </div>
              )}
              <div>
                <dt>Coste por vecino</dt>
                <dd>
                  ≈ {costeVecino(obra.costePorHabitante)} ·{" "}
                  <a href={POBLACION.fuenteUrl} target="_blank" rel="noreferrer">
                    población INE a {POBLACION.referencia}: {POBLACION.habitantes.toLocaleString("es-ES")} hab.
                  </a>{" "}
                  ({POBLACION.fuenteNombre})
                </dd>
              </div>
              <div>
                <dt>Estado de ejecución</dt>
                <dd>Faltante: no localizado en la fuente oficial</dd>
              </div>
            </dl>
          </section>

          <section className="capa">
            <h3>Capa 3 · Evidencia</h3>
            <dl>
              <div>
                <dt>Estado del dato</dt>
                <dd>{ESTADO_LABEL.NO_VERIFICADO} · {obra.id}</dd>
              </div>
              <div>
                <dt>Fuente</dt>
                <dd>
                  <a href={obra.fuente.url} target="_blank" rel="noreferrer">
                    {obra.fuente.nombre}
                  </a>{" "}
                  · consulta: {obra.fuente.fechaConsulta}
                </dd>
              </div>
            </dl>
            <p style={{ margin: 0, fontSize: 13 }}>
              Cada dato es rastreable hasta la ficha {obra.id} del repositorio valio-datos (método P0).
            </p>
          </section>

          <button type="button" className="btn btn-primary" onClick={onClaim}>
            Pedir explicaciones
          </button>
        </div>
      </motion.div>
    </>
  );
}
