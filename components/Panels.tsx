"use client";

import { useStore } from "@/lib/store";

export function Info() {
  const { municipio, obras, cambiarMunicipio, esPiloto } = useStore();
  return (
    <div className="panel">
      <h2 className="panel-title display">¿VALIÓ?</h2>
      <p className="panel-intro">Lo que costó. Lo que consiguió. Tú decides.</p>
      <div style={{ display: "grid", gap: 12 }}>
        {esPiloto ? (
          <div className="info-note">
            Piloto real de {municipio}: {obras.length} obras con datos oficiales de la Plataforma de
            Contratación del Sector Público (PLACE), recogidas con el método P0 del repo valio-datos y pendientes de
            verificación independiente (cada ficha muestra su estado). El estado
            de ejecución no aparece en la fuente consultada: se muestra como dato faltante.
          </div>
        ) : (
          <div className="info-note">
            {municipio}: {obras.length} obras adjudicadas con actividad publicada desde enero de 2024 (la adjudicación
            puede ser anterior), cargadas automáticamente de la Plataforma de
            Contratación del Sector Público (PLACE). Son datos oficiales tal cual los publica la fuente, sin revisar
            a mano: cada ficha lo indica y enlaza al anuncio oficial. El estado de ejecución no aparece en la
            fuente: se muestra como dato faltante.
          </div>
        )}
        <div className="info-block">
          <h3>Tu municipio: {municipio}</h3>
          <p>Solo ves las obras de tu municipio. Si te has equivocado o te mudas, puedes cambiarlo.</p>
          <p>
            <button type="button" className="btn" onClick={cambiarMunicipio}>
              Cambiar de municipio
            </button>
          </p>
        </div>
        <div className="info-block">
          <h3>Cómo funciona</h3>
          <p>
            Deslizas: derecha valió, izquierda no valió, arriba pides explicaciones, abajo si no puedes valorarlo.
            Cada dato debe poder responder quién lo dijo, cuándo y dónde.
          </p>
        </div>
        <div className="info-block">
          <h3>Pedir explicaciones</h3>
          <p>La app redacta el borrador; una persona lo revisa y lo envía. Nunca se envía nada automáticamente.</p>
        </div>
        <div className="info-block">
          <h3>Privacidad</h3>
          <p>
            Sin cuentas, sin rastreo y sin pedir tu ubicación. Tus votos y tus respuestas se suman de forma
            anónima al recuento de cada obra. Solo se guardan contadores, nunca quién votó. Para frenar votos en
            masa se guarda durante 24 horas una huella cifrada de la conexión, que no permite saber tu IP y cambia
            cada día. Tu municipio y si ya viste el tutorial se quedan en tu dispositivo.
          </p>
        </div>
        <div className="info-block">
          <h3>Proyecto</h3>
          <p>
            ¿VALIÓ? es un proyecto cívico. Cada ficha enlaza a su fuente oficial para que puedas comprobarla.
          </p>
        </div>
      </div>
    </div>
  );
}
