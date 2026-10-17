"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { CATEGORIA_LABEL, ESTADO_LABEL, POBLACION as POBLACION_PILOTO, type Obra } from "@/lib/obras";
import { useStore } from "@/lib/store";
import { costeVecino, euros, eurosCompactos } from "@/lib/formato";
import { useDialog } from "@/lib/useDialog";
import { useHojaArrastrable } from "@/lib/useHoja";
import { importeDe } from "@/lib/orden";
import { SenalVecinal } from "./SenalVecinal";
import { RecuentoVecinos } from "./RecuentoVecinos";
import { SeccionAerea } from "./VistaAerea";
import { IconoTipo, slugTipo } from "./TipoObra";

/** La ficha abre con el mismo póster de cifra que la tarjeta. */
function PosterFicha({ obra }: { obra: Obra }) {
  const cifra = eurosCompactos(importeDe(obra));
  return (
    <div className="poster poster-ficha" data-cat={slugTipo(obra.categoria)} aria-hidden="true">
      <IconoTipo categoria={obra.categoria} size={200} className="poster-marca" />
      <p className="poster-tipo">
        <IconoTipo categoria={obra.categoria} size={16} />
        {CATEGORIA_LABEL[obra.categoria]}
      </p>
      <div className="card-cifra">
        <p className="card-cifra-tipo">
          {obra.adjudicacion
            ? "Importe adjudicado, sin IVA"
            : `Presupuesto de licitación, ${obra.ivaLicitacionIncluido ? "con IVA" : "sin IVA"}`}
        </p>
        <p className="card-cifra-valor num" style={{ "--len": cifra.length } as React.CSSProperties}>
          {cifra}
        </p>
        <p className="card-cifra-vecino num">≈ {costeVecino(obra.costePorHabitante)}</p>
        {obra.aviso && <p className="card-cifra-aviso">Solo el primer lote o adjudicatario</p>}
      </div>
    </div>
  );
}

/** «105 Día(s)» → «105 días»; «1 Mes(es)» → «1 mes». Lo demás, tal cual. */
function plazoLegible(plazo: string): string {
  const m = plazo.match(/^(\d+)\s+(Día|Mes|Año|Semana)\(e?s\)$/);
  if (!m) return plazo;
  const n = Number(m[1]);
  const [uno, varios] = { Día: ["día", "días"], Mes: ["mes", "meses"], Año: ["año", "años"], Semana: ["semana", "semanas"] }[
    m[2] as "Día" | "Mes" | "Año" | "Semana"
  ];
  return `${n} ${n === 1 ? uno : varios}`;
}

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
  const { arrastre, asa } = useHojaArrastrable(onClose);
  const adjudicacion = obra.adjudicacion;
  // Denominador del municipio de ESTA obra (cada municipio tiene el suyo).
  const POBLACION = useStore().poblacion ?? POBLACION_PILOTO;
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
        {...arrastre}
      >
        <div className="asa" aria-hidden="true" {...asa} />
        <div className="sheet-head" {...asa}>
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
          <PosterFicha obra={obra} />
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
            </dl>
          </section>

          <section className="ficha-seccion" aria-labelledby="ficha-contrato">
            <h3 id="ficha-contrato">Lo que dicen los documentos</h3>
            <dl className="resumen">
              <div>
                <dt>Presupuesto de licitación</dt>
                <dd className="num">
                  {obra.importeLicitacion == null
                    ? "No consta en la fuente"
                    : `${euros(obra.importeLicitacion)} · IVA ${obra.ivaLicitacionIncluido ? "incluido" : "no incluido"}`}
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
                    <dd>{plazoLegible(adjudicacion.plazo)}</dd>
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
                <dd>No consta en la fuente oficial. Si sabes cómo va, cuéntalo más abajo.</dd>
              </div>
            </dl>
          </section>

          <section className="ficha-seccion" aria-labelledby="ficha-vecino">
            <h3 id="ficha-vecino">Lo que cuesta a cada vecino</h3>
            <p className="ficha-cifra num">≈ {costeVecino(obra.costePorHabitante)}</p>
            {obra.aviso && <p className="ficha-nota ficha-aviso">{obra.aviso}</p>}
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
                <dd>
                  {obra.estadoDato === "OFICIAL_AUTOMATICO"
                    ? "Carga nacional automática de valio-datos (sin revisión manual)"
                    : `${obra.id} en el repositorio valio-datos (método P0)`}
                </dd>
              </div>
            </dl>
          </section>

          <SeccionAerea obra={obra} />

          {/* Dato alegado por vecinos: después de la evidencia oficial, para que
              la fuente (PLACE) nunca parezca respaldar lo que dicen los vecinos. */}
          <RecuentoVecinos obra={obra} />
          <SenalVecinal obra={obra} />

          <button type="button" className="btn btn-primary" onClick={onClaim}>
            Pedir explicaciones
          </button>
        </div>
      </motion.div>
    </>
  );
}
