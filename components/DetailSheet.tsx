"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { CATEGORIA_LABEL, ESTADO_LABEL, POBLACION, type Obra } from "@/lib/obras";
import { costeVecino, euros } from "@/lib/formato";
import { useDialog } from "@/lib/useDialog";
import { SenalVecinal } from "./SenalVecinal";
import { SeccionAerea } from "./VistaAerea";

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
          <div className="sheet-titulo">
            <p className="card-kicker">
              {CATEGORIA_LABEL[obra.categoria]} · {obra.municipio} · {obra.anyo}
            </p>
            <h2 className="display">{obra.nombre}</h2>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar ficha">
            <X size={22} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
        <div className="sheet-body">
          {/* ISSUE-39: listas resumen (clave → valor) en lugar de «capas»
              numeradas. Cada sección lleva un título corto para navegar. */}
          <section className="ficha-seccion" aria-labelledby="ficha-obra">
            <h3 id="ficha-obra">La obra</h3>
            <dl className="resumen">
              <div>
                <dt>Administración</dt>
                <dd>{obra.organismo}</dd>
              </div>
              <div>
                <dt>Municipio</dt>
                <dd>
                  {obra.municipio} ({obra.provincia})
                </dd>
              </div>
              <div>
                <dt>Tipo de obra</dt>
                <dd>{CATEGORIA_LABEL[obra.categoria]}</dd>
              </div>
              <div>
                <dt>Año</dt>
                <dd>{obra.anyo}</dd>
              </div>
            </dl>
          </section>

          <section className="ficha-seccion" aria-labelledby="ficha-contrato">
            <h3 id="ficha-contrato">Lo que dicen los documentos</h3>
            <dl className="resumen">
              <div>
                <dt>Presupuesto de licitación</dt>
                <dd className="num">
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
                    <dd className="num">
                      {euros(adjudicacion.importeSinIva)} sin IVA
                      {adjudicacion.importeConIva != null
                        ? ` (${euros(adjudicacion.importeConIva)} con IVA)`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Fecha del acuerdo</dt>
                    <dd className="num">
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
                <dt>Estado de ejecución</dt>
                <dd>Faltante: no localizado en la fuente oficial</dd>
              </div>
            </dl>
          </section>

          <section className="ficha-seccion" aria-labelledby="ficha-vecino">
            <h3 id="ficha-vecino">Lo que cuesta a cada vecino</h3>
            <p className="ficha-cifra num">≈ {costeVecino(obra.costePorHabitante)}</p>
            <p className="ficha-nota">
              Calculado sobre la{" "}
              <a href={POBLACION.fuenteUrl} target="_blank" rel="noreferrer">
                población INE a {POBLACION.referencia}: {POBLACION.habitantes.toLocaleString("es-ES")} hab.
              </a>{" "}
              ({POBLACION.fuenteNombre})
            </p>
          </section>

          <section className="ficha-seccion" aria-labelledby="ficha-evidencia">
            <h3 id="ficha-evidencia">Evidencia</h3>
            <dl className="resumen">
              <div>
                <dt>Nivel de evidencia</dt>
                <dd>
                  <span className={`tag tag-${obra.estadoDato}`}>{ESTADO_LABEL[obra.estadoDato]}</span>
                </dd>
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
              <div>
                <dt>Ficha de origen</dt>
                <dd>{obra.id} en el repositorio valio-datos (método P0)</dd>
              </div>
            </dl>
          </section>

          <SeccionAerea obra={obra} />

          {/* Dato alegado por vecinos: después de la evidencia oficial, para que
              la fuente (PLACE) nunca parezca respaldar lo que dicen los vecinos. */}
          <SenalVecinal obra={obra} />

          <button type="button" className="btn btn-primary" onClick={onClaim}>
            Pedir explicaciones
          </button>
        </div>
      </motion.div>
    </>
  );
}
