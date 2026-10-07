"use client";

import { CATEGORIA_LABEL, VOTO_LABEL, type Votos } from "@/lib/obras";
import { useStore } from "@/lib/store";

export function Results() {
  const { votos, reset, listo, obras } = useStore();
  if (!listo) return <div className="panel" aria-busy="true" />;

  const votadas = obras.filter((o) => votos[o.id]);

  if (votadas.length === 0) {
    return (
      <div className="panel">
        <h2 className="panel-title display">Resultados</h2>
        <p className="panel-intro">Aún no has votado ninguna tarjeta. Tus votos se guardan solo en este dispositivo.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 className="panel-title display">Tus {votadas.length} votos</h2>
      <p className="panel-intro">
        Recuento local de tus votos en este dispositivo. Todavía no se envían a ningún sitio.
      </p>
      <div className="results-list">
        {votadas.map((obra) => {
          const voto = votos[obra.id] as keyof typeof VOTO_LABEL;
          return (
            <div key={obra.id} className="result-item">
              <span className="nombre display">{obra.nombre}</span>
              <span className="card-meta">
                {CATEGORIA_LABEL[obra.categoria]} · {obra.anyo}
              </span>
              <span className={`result-voto voto-${voto}`}>{VOTO_LABEL[voto]}</span>
            </div>
          );
        })}
      </div>
      <p style={{ marginTop: 16 }}>
        <button type="button" className="btn" onClick={reset}>
          Borrar mis votos
        </button>
      </p>
    </div>
  );
}

export function CabreoMap({ votos }: { votos: Votos }) {
  const { obras } = useStore();
  const conteo = obras.map((obra) => {
    const cabreo = (votos[obra.id] === "no_valio" ? 1 : 0) + (votos[obra.id] === "explica" ? 1 : 0);
    return { obra, cabreo };
  }).sort((a, b) => b.cabreo - a.cabreo);

  return (
    <div className="panel">
      <h2 className="panel-title display">Mapa del cabreo</h2>
      <p className="panel-intro">
        Recuento local por lista. El mapa territorial real se construye con datos verificados y metodología
        publicada.
      </p>
      <div className="cabreo-list">
        {conteo.map(({ obra, cabreo }) => (
          <div key={obra.id} className="cabreo-item">
            <div>
              <div className="nombre display">{obra.nombre}</div>
              <div className="municipio">{obra.municipio}</div>
            </div>
            <div className="barra" role="img" aria-label={`Nivel de cabreo ${cabreo} de 2`}>
              <span style={{ width: `${(cabreo / 2) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Info() {
  const { municipio, obras, cambiarMunicipio } = useStore();
  return (
    <div className="panel">
      <h2 className="panel-title display">¿VALIÓ?</h2>
      <p className="panel-intro">Lo que costó. Lo que consiguió. Tú decides.</p>
      <div style={{ display: "grid", gap: 12 }}>
        <div className="info-note">
          Piloto real de {municipio}: {obras.length} obras con datos oficiales de la Plataforma de
          Contratación del Sector Público (PLACE), verificadas con el método P0 del repo valio-datos. El estado
          de ejecución no lo publica el ayuntamiento: se muestra como dato faltante.
        </div>
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
          <h3>Match ciudadano</h3>
          <p>
            No es afinidad entre personas: es un estado colectivo del caso que exige participación suficiente,
            evidencia documental, pregunta concreta, organismo identificable y ausencia de bloqueos.
          </p>
        </div>
        <div className="info-block">
          <h3>Pedir explicaciones</h3>
          <p>La app redacta el borrador; una persona lo revisa y lo envía. Nunca se envía nada automáticamente.</p>
        </div>
        <div className="info-block">
          <h3>Privacidad</h3>
          <p>
            Tus votos, tu municipio y si ya viste el tutorial se guardan solo en tu dispositivo (localStorage). Sin
            cuentas, sin rastreo y sin pedir tu ubicación.
          </p>
        </div>
        <div className="info-block">
          <h3>Proyecto</h3>
          <p>
            ¿VALIÓ? es un proyecto cívico de PGK. Documentación: dossier maestro y PRD en el repo valio-datos.
          </p>
        </div>
      </div>
    </div>
  );
}
