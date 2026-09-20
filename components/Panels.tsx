"use client";

import { CATEGORIA_LABEL, ESTADO_LABEL, OBRAS, VOTO_LABEL, type Votos } from "@/lib/obras";
import { useStore } from "@/lib/store";

export function Results() {
  const { votos, reset, listo } = useStore();
  if (!listo) return <div className="panel" aria-busy="true" />;

  const votadas = OBRAS.filter((o) => votos[o.id]);

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
        Recuento local de la demo. En producción, el voto anónimo alimenta el mapa del cabreo y las peticiones
        colectivas.
      </p>
      <div className="results-list">
        {votadas.map((obra) => {
          const voto = votos[obra.id] as keyof typeof VOTO_LABEL;
          return (
            <div key={obra.id} className="result-item">
              <span className="nombre display">{obra.nombre}</span>
              <span className="card-meta">
                {CATEGORIA_LABEL[obra.categoria]} · {ESTADO_LABEL[obra.estadoDato]}
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
  const conteo = OBRAS.map((obra) => {
    const cabreo = (votos[obra.id] === "no_valio" ? 1 : 0) + (votos[obra.id] === "explica" ? 1 : 0);
    return { obra, cabreo };
  }).sort((a, b) => b.cabreo - a.cabreo);

  return (
    <div className="panel">
      <h2 className="panel-title display">Mapa del cabreo</h2>
      <p className="panel-intro">
        Versión demo por lista: el mapa territorial real se construye con datos verificados y metodología publicada.
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
  return (
    <div className="panel">
      <h2 className="panel-title display">¿VALIÓ?</h2>
      <p className="panel-intro">Lo que costó. Lo que consiguió. Tú decides.</p>
      <div style={{ display: "grid", gap: 12 }}>
        <div className="info-note">
          Demo interactiva. Todas las tarjetas son ejemplos marcados como DEMO: ninguna cifra es real. La verificación
          de datos reales es el gate P0 del PRD (repo valio-datos).
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
          <p>Tus votos viven solo en tu dispositivo (localStorage). Sin cuentas, sin rastreo.</p>
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
