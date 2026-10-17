"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarPlus, Copy, Download, ExternalLink, FileText } from "lucide-react";
import type { Obra } from "@/lib/obras";
import { useStore } from "@/lib/store";
import { useDialog } from "@/lib/useDialog";
import { useHojaArrastrable } from "@/lib/useHoja";
import {
  CANALES,
  ETIQUETA_PREGUNTA,
  PREGUNTAS,
  URL_REGISTRO,
  calendario,
  dondeReclamar,
  fechaEs,
  guardarSeguimiento,
  hoyIso,
  leerSeguimiento,
  reclamacion,
  solicitud,
  sumarMeses,
  urlBuscarSede,
  type Canal,
  type Pregunta,
  type Respuesta,
  type Seguimiento,
} from "@/lib/solicitud";

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
    // Contexto no seguro (http en la red local): textarea temporal.
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function descargar(nombre: string, texto: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copiar con confirmación visible y anunciada. */
function BotonCopiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-primary claim-copiar"
      onClick={async () => {
        if (await copiarTexto(texto)) {
          setCopiado(true);
          window.setTimeout(() => setCopiado(false), 2500);
        }
      }}
    >
      <Copy size={18} aria-hidden="true" />
      {copiado ? "¡Copiado!" : etiqueta}
    </button>
  );
}

/**
 * Pedir explicaciones: el vecino elige qué quiere saber y cómo lo presentará,
 * y la app le prepara el escrito (editable), le dice dónde presentarlo, le
 * pone avisos de plazo en su calendario y, si no contestan, la reclamación.
 * Copiar o descargar no envía nada; lo único que se guarda (en el dispositivo)
 * es la fecha en que lo presentó.
 */
export function ClaimDraft({ obra, onClose }: { obra: Obra; onClose: () => void }) {
  const dialogRef = useDialog(onClose);
  const { arrastre, asa } = useHojaArrastrable(onClose);
  const { ficha } = useStore();
  const ccaa = ficha?.ccaa ?? "";

  const [preguntas, setPreguntas] = useState<Pregunta[]>(["estado", "modificados"]);
  const [otra, setOtra] = useState("");
  const [canal, setCanal] = useState<Canal>("registro");
  const generado = useMemo(() => solicitud(obra, preguntas, otra, canal), [obra, preguntas, otra, canal]);
  // Si el vecino retoca el texto a mano, no se le pisa al cambiar opciones.
  const [editado, setEditado] = useState<string | null>(null);
  const texto = editado ?? generado;

  const [seguimiento, setSeguimiento] = useState<Seguimiento | null>(null);
  const [fecha, setFecha] = useState(hoyIso());
  const [respuesta, setRespuesta] = useState<Respuesta | "si" | null>(null);
  useEffect(() => setSeguimiento(leerSeguimiento(obra.id)), [obra.id]);

  const alternar = (p: Pregunta) =>
    setPreguntas((actual) => (actual.includes(p) ? actual.filter((x) => x !== p) : [...actual, p]));

  const presentar = () => {
    const s = { presentada: fecha, canal };
    guardarSeguimiento(obra.id, s);
    setSeguimiento(s);
  };
  const donde = dondeReclamar(ccaa);
  const textoReclamacion =
    seguimiento && (respuesta === "silencio" || respuesta === "denegada")
      ? reclamacion(obra, seguimiento.presentada, respuesta, seguimiento.canal, ccaa)
      : null;

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
        aria-label="Pedir explicaciones"
        className="sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        {...arrastre}
      >
        <div className="asa" aria-hidden="true" {...asa} />
        <div className="sheet-head" {...asa}>
          <span className="ico-tile" aria-hidden="true">
            <FileText size={24} />
          </span>
          <h2 className="display">Pedir explicaciones</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Cerrar borrador">
            ✕
          </button>
        </div>
        <div className="sheet-body claim">
          <p className="info-note">
            Tienes derecho a pedir esta información y deben contestarte en un mes. Te preparamos el escrito para{" "}
            <b>{obra.organismo}</b>, que es quien contrató la obra. Tú lo revisas y lo presentas: copiar no envía nada.
          </p>

          {seguimiento ? (
            <section className="claim-paso" aria-labelledby="claim-seguimiento">
              <h3 id="claim-seguimiento">Lo presentaste el {fechaEs(seguimiento.presentada)}</h3>
              <p className="claim-ayuda">
                Tienen hasta el {fechaEs(sumarMeses(seguimiento.presentada, 1))} aprox. para contestar. Si no lo hacen,
                puedes reclamar hasta el {fechaEs(sumarMeses(seguimiento.presentada, 2))} aprox. (el plazo exacto cuenta
                desde tu justificante).
              </p>
              <fieldset className="claim-opciones">
                <legend>¿Te han contestado?</legend>
                {(
                  [
                    ["si", "Sí, con la información"],
                    ["denegada", "Me lo han denegado"],
                    ["silencio", "No me han contestado"],
                  ] as const
                ).map(([valor, etiqueta]) => (
                  <label key={valor} className="claim-chip">
                    <input
                      type="radio"
                      name="claim-respuesta"
                      checked={respuesta === valor}
                      onChange={() => setRespuesta(valor)}
                    />
                    {etiqueta}
                  </label>
                ))}
              </fieldset>
              {respuesta === "si" && (
                <p className="claim-ayuda">
                  ¡Bien! Si la respuesta dice algo sobre la obra que no cuadra con lo que ves, puedes volver a votarla.
                </p>
              )}
              {textoReclamacion && (
                <>
                  <p className="claim-ayuda">
                    Puedes reclamar ante <b>{donde.nombre}</b>.{" "}
                    <a href={donde.url} target="_blank" rel="noopener noreferrer">
                      Dónde presentarla <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  </p>
                  <label className="sr-only" htmlFor="claim-reclamacion">
                    Texto de la reclamación
                  </label>
                  <textarea id="claim-reclamacion" className="claim-textarea" readOnly value={textoReclamacion} />
                  <div className="claim-acciones">
                    <BotonCopiar texto={textoReclamacion} etiqueta="Copiar reclamación" />
                  </div>
                </>
              )}
              <button
                type="button"
                className="btn claim-secundario"
                onClick={() => {
                  guardarSeguimiento(obra.id, null);
                  setSeguimiento(null);
                  setRespuesta(null);
                }}
              >
                Preparar otra solicitud
              </button>
            </section>
          ) : (
            <>
              <fieldset className="claim-paso claim-opciones">
                <legend>1. ¿Qué quieres saber?</legend>
                {(Object.keys(PREGUNTAS) as Pregunta[]).map((p) => (
                  <label key={p} className="claim-chip">
                    <input type="checkbox" checked={preguntas.includes(p)} onChange={() => alternar(p)} />
                    {ETIQUETA_PREGUNTA[p]}
                  </label>
                ))}
                <label className="claim-otra">
                  <span>Otra pregunta (opcional)</span>
                  <input type="text" value={otra} onChange={(e) => setOtra(e.target.value)} maxLength={300} />
                </label>
              </fieldset>

              <fieldset className="claim-paso claim-canales">
                <legend>2. ¿Cómo lo vas a presentar?</legend>
                {(Object.keys(CANALES) as Canal[]).map((c) => (
                  <label key={c} className={`claim-canal${canal === c ? " activo" : ""}`}>
                    <input type="radio" name="claim-canal" checked={canal === c} onChange={() => setCanal(c)} />
                    <span>
                      <b>
                        {CANALES[c].titulo}
                        {c === "registro" ? " · recomendado" : ""}
                      </b>
                      <small>{CANALES[c].detalle}</small>
                    </span>
                  </label>
                ))}
              </fieldset>

              <section className="claim-paso" aria-labelledby="claim-texto-titulo">
                <h3 id="claim-texto-titulo">3. Tu escrito</h3>
                {editado !== null && (
                  <p className="claim-ayuda">
                    Lo has retocado a mano.{" "}
                    <button type="button" className="btn-texto" onClick={() => setEditado(null)}>
                      Volver al texto generado
                    </button>
                  </p>
                )}
                <label className="sr-only" htmlFor="claim-texto">
                  Texto del borrador
                </label>
                <textarea
                  id="claim-texto"
                  className="claim-textarea"
                  value={texto}
                  onChange={(e) => setEditado(e.target.value)}
                />
                <div className="claim-acciones">
                  <BotonCopiar texto={texto} etiqueta="Copiar borrador" />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => descargar(`solicitud-${obra.id}.txt`, texto, "text/plain;charset=utf-8")}
                  >
                    <Download size={18} aria-hidden="true" />
                    Descargar
                  </button>
                  {canal === "registro" && (
                    <a className="btn" href={URL_REGISTRO} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={18} aria-hidden="true" />
                      Abrir el Registro
                    </a>
                  )}
                  {canal === "sede" && (
                    <a className="btn" href={urlBuscarSede(obra.organismo)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={18} aria-hidden="true" />
                      Buscar su sede
                    </a>
                  )}
                </div>
                {canal === "registro" && (
                  <p className="claim-ayuda">
                    En el Registro, elige como destino a {obra.organismo}. Si no aparece, preséntalo en su sede
                    electrónica.
                  </p>
                )}
              </section>

              <section className="claim-paso" aria-labelledby="claim-presentado">
                <h3 id="claim-presentado">4. ¿Ya lo has presentado?</h3>
                <p className="claim-ayuda">
                  Apunta la fecha del justificante y te avisamos en tu calendario cuando toque mirar si contestaron. Solo
                  se guarda en este dispositivo.
                </p>
                <div className="claim-fecha">
                  <label htmlFor="claim-fecha">Fecha</label>
                  <input
                    id="claim-fecha"
                    type="date"
                    value={fecha}
                    max={hoyIso()}
                    onChange={(e) => setFecha(e.target.value || hoyIso())}
                  />
                </div>
                <div className="claim-acciones">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      presentar();
                      descargar(`valio-avisos-${obra.id}.ics`, calendario(obra, fecha), "text/calendar;charset=utf-8");
                    }}
                  >
                    <CalendarPlus size={18} aria-hidden="true" />
                    Ya lo presenté: avisarme
                  </button>
                </div>
              </section>
            </>
          )}
          <button type="button" className="btn claim-cerrar" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </motion.div>
    </>
  );
}
