/**
 * ⚠️ ARCHIVO GENERADO — no editar a mano.
 * Regenerar con: node scripts/generar-obras.mjs
 * Fuente: valio-datos (obras-piloto.csv + ubicaciones.csv + fichas OBRA-XX.md) · 2026-10-18
 * Cada dato es rastreable hasta su ficha; nada inventado.
 */

/** OFICIAL_AUTOMATICO: cargado de PLACE sin revisión manual (carga nacional). */
export type EstadoDato = "NO_VERIFICADO" | "EVIDENCIADO" | "CONTRADICHO" | "DESACTUALIZADO" | "OFICIAL_AUTOMATICO";

export type Categoria = "deporte" | "educacion" | "medio ambiente" | "parques" | "patrimonio" | "seguridad" | "urbanismo";

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  "deporte": "Deporte",
  "educacion": "Educación",
  "medio ambiente": "Medio ambiente",
  "parques": "Parques",
  "patrimonio": "Patrimonio",
  "seguridad": "Seguridad",
  "urbanismo": "Urbanismo"
};

export const ESTADO_LABEL: Record<EstadoDato, string> = {
  NO_VERIFICADO: "No verificado",
  EVIDENCIADO: "Evidenciado",
  CONTRADICHO: "Contradicho",
  DESACTUALIZADO: "Desactualizado",
  OFICIAL_AUTOMATICO: "Dato oficial, sin revisar a mano",
};

export interface Adjudicacion {
  adjudicataria: string;
  cif: string | null;
  fechaAcuerdo: string;
  fechaPublicacion: string | null;
  importeSinIva: number;
  importeConIva: number | null;
  plazo: string;
  numExpediente: string | null;
}

export type Precision = "punto" | "instalacion" | "zona" | "tramo";

/** Dónde está la obra. Solo existe si un documento público la sitúa. */
export interface UbicacionPrecisa {
  precision: Precision;
  lat: number;
  lon: number;
  radioM: number;
  visibleAire: "si" | "parcial" | "no";
  referenciaCatastral: string | null;
  fuente: { tipo: string; url: string; fechaConsulta: string };
  evidencia: string;
  estado: "propuesta" | "verificada";
}

/** Los documentos no permiten situarla con precisión: se dice y no se pinta nada. */
export interface SinUbicacion {
  precision: "municipio" | "sin_ubicacion";
  /** Por qué no se puede situar, en una frase para el vecino. */
  motivo: string;
}

/**
 * Situada por una máquina a partir del título (CartoCiudad), sin revisar a mano.
 * Es aproximada: no vale como «ubicación precisa» ni para la vista aérea.
 */
export interface UbicacionAproximada {
  precision: "aproximada";
  lat: number;
  lon: number;
  /** «calle»: un punto de la vía que nombra el título; «lugar»: el sitio con nombre (colegio, parque…). */
  nivel: "calle" | "lugar";
  /** De dónde salió el punto: el título de la obra o el lugar de ejecución del anuncio. */
  origen?: "titulo" | "ejecucion";
  /** Cómo se ha situado, en una frase para el vecino. */
  motivo: string;
  fuente: { tipo: "cartociudad"; url: string; fechaConsulta: string };
}

export type Ubicacion = UbicacionPrecisa | UbicacionAproximada | SinUbicacion;

export function tienePunto(u: Ubicacion | null): u is UbicacionPrecisa {
  return u != null && u.precision !== "municipio" && u.precision !== "sin_ubicacion" && u.precision !== "aproximada";
}

export function esAproximada(u: Ubicacion | null): u is UbicacionAproximada {
  return u != null && u.precision === "aproximada";
}

export interface Obra {
  id: string;
  nombre: string;
  categoria: Categoria;
  municipio: string;
  provincia: string;
  organismo: string;
  anyo: number;
  estadoDato: EstadoDato;
  estadoEjecucion: "faltante";
  /** Presupuesto de licitación; null si la fuente no lo publica. */
  importeLicitacion: number | null;
  ivaLicitacionIncluido: boolean;
  adjudicacion: Adjudicacion | null;
  ubicacion: Ubicacion | null;
  costePorHabitante: number;
  fuente: { nombre: string; url: string; fechaConsulta: string };
  /** Limitación del dato que el vecino debe ver (p. ej. contrato con lotes). */
  aviso?: string;
}

/** Denominador del coste por habitante (dossier §4.2: siempre explicado). */
export const POBLACION = {
  "municipio": "Teulada",
  "habitantes": 12912,
  "referencia": "01/01/2025",
  "fuenteNombre": "INE — Cifras oficiales del padrón (tabla 29005)",
  "fuenteUrl": "https://www.ine.es/jaxiT3/Tabla.htm?t=29005"
};

export const OBRAS: Obra[] = [
  {
    "id": "OBRA-01",
    "nombre": "Obras de asfaltado e inversiones para mejora de calles municipales",
    "categoria": "urbanismo",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2026,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 177685.95,
    "ivaLicitacionIncluido": false,
    "adjudicacion": null,
    "ubicacion": {
      "precision": "municipio",
      "motivo": "la obra son unas 15 actuaciones repartidas por el casco y varias urbanizaciones"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/portal/plataforma/buscadores/detalle/!ut/p/z1/lY9LU4NAEIR_Sw5c2ckCqx4J71QwKC6EvVCbBK21WBZ5-PslCVeJzq2nuvubQQwdEGv4t_jgg1ANryddMFKa3t5x_BDDY2q4gHcupSS8SIzyq8EyHDPbZglJowAgCn13R9cWBJggtpAPrDkPv4wNf8svGNhyfY7YMgLPhqUX70GK6ciH0s68Fzt6MmC_eZ0Q2yR-SwK8BjBReuk4KamLo9Tf-anq9VZ1Q10NehZ5eeSiQoPPvtXgOPZfY3XmGviqk2PNO6E2806fHPdY5B-sczXwuq40iLlo3Ju4MlpJ6QFEImX5HNur1Q_v7O01/#Z7_AVEQAI930OBRD02JPMTPG21004",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 13.76
  },
  {
    "id": "OBRA-02",
    "nombre": "Reconstrucción parcial del muro y valla de cerramiento del Campo de Fútbol.",
    "categoria": "deporte",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Alcaldia del Ayuntamiento de Teulada",
    "anyo": 2026,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 4300,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "JOSE JAVIER BISQUERT IVARS",
      "cif": null,
      "fechaAcuerdo": "12/05/2026",
      "fechaPublicacion": "12-05-2026",
      "importeSinIva": 4300,
      "importeConIva": 5203,
      "plazo": "3 Mes(es)",
      "numExpediente": "5122/2026"
    },
    "ubicacion": {
      "precision": "sin_ubicacion",
      "motivo": "el anuncio no dice cuál de los campos de fútbol de Teulada es"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=KLUBdKw8XNSqb7rCcv76BA%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 0.33
  },
  {
    "id": "OBRA-03",
    "nombre": "Obras de sustituir Acumuladores ACS Campo de Fútbol Municipal Bernardo Font Vallés",
    "categoria": "deporte",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Junta de Gobierno del Ayuntamiento de Teulada",
    "anyo": 2025,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 32833,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "INSTALACIONES TECNICLIMA S.L.",
      "cif": "B53621223",
      "fechaAcuerdo": "16/10/2025",
      "fechaPublicacion": "17-10-2025",
      "importeSinIva": 32833,
      "importeConIva": 39727.93,
      "plazo": "1 Mes(es)",
      "numExpediente": "10390/2025"
    },
    "ubicacion": {
      "precision": "sin_ubicacion",
      "motivo": "el campo que nombra el anuncio no aparece en ninguna fuente oficial y en Teulada y Moraira hay varios"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/portal/plataforma/buscadores/detalle/!ut/p/z1/hY9LD4IwEIR_kem2QIEj0FKKICAPpRdCYmJIeBhj-P0Ww1Xd22S_mZ1FCl2Rmvt1uPevYZn7UetW0c7kWRCEEQGnNBiQhNU1jTZJUIMu_xCl1_BlPNB-9UEsIzCbuMlpKQWAjEKW1NgCQegO_MhodQe78xpeeNI1IPPPukOcp1UuCAagqJ6X56T_Kbes4cbXEbXYIS61qYXx7hcCJPYFmPh4YkBzm8e8qLYT__yPKXTloZ26tPLeV0awMQ!!/dz/d5/L2dBISEvZ0FBIS9nQSEh/",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 2.54
  },
  {
    "id": "OBRA-04",
    "nombre": "Acondicionamiento del área, como área de juegos e instalación de tirolina.",
    "categoria": "parques",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Junta de Gobierno del Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 27995,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "JOSE JAVIER BISQUERT IVARS",
      "cif": null,
      "fechaAcuerdo": "21/11/2024",
      "fechaPublicacion": "22-11-2024",
      "importeSinIva": 27995,
      "importeConIva": 33873.95,
      "plazo": "1 Año(s)",
      "numExpediente": "11488/2024"
    },
    "ubicacion": {
      "precision": "sin_ubicacion",
      "motivo": "el paraje que nombra el anuncio («Pinaret de la Costa») no aparece en ninguna fuente oficial"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/portal/plataforma/buscadores/detalle/!ut/p/z1/hY9LD4IwEIR_kem2lAJHHqUUQUAeSi-ExMSQ8DDG8Psthqu6t8l-MzuLFLoiNffrcO9fwzL3o9atYh3lme-HEQG7NAIgSVDXLNokQQ26_EOUXsOXcUH71QcxDZ82cZOzUgoAGYVBUmMTBGE78COj1R2szm144UrHgMw76w5xnla5IBiAoXpenpP-p9yyhhtfR9RiajOgwDDe_UKAxJ4Aio-nAFhu8ZgX1Xbin_8xhY48tFOXVu4bCNQvNA!!/dz/d5/L2dBISEvZ0FBIS9nQSEh/",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 2.17
  },
  {
    "id": "OBRA-05",
    "nombre": "Tancament perimetral de l’excavació del poblat ibèric a l’àrea arqueològica del cap d’Or i protecció de les estructures del poblat de la punta de Moraira.",
    "categoria": "patrimonio",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 8140,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "GARDEN PROJET SLU",
      "cif": "B53185674",
      "fechaAcuerdo": "05/12/2024",
      "fechaPublicacion": "10-12-2024",
      "importeSinIva": 8140,
      "importeConIva": 9849.4,
      "plazo": "3 Mes(es)",
      "numExpediente": "7589/2024"
    },
    "ubicacion": {
      "precision": "sin_ubicacion",
      "motivo": "son dos yacimientos (cap d'Or y punta de Moraira) sin coordenada oficial"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=6%2BScbhVqN1cZDGvgaZEVxQ%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 0.63
  },
  {
    "id": "OBRA-06",
    "nombre": "Obras para la instalación de un sistema de video-vigilancia para la seguridad del polígono industrial de Teulada.",
    "categoria": "seguridad",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 19724.25,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "RAYVI ESPACIOS INTELIGENTES, S.L.",
      "cif": "B09994377",
      "fechaAcuerdo": "05/12/2024",
      "fechaPublicacion": "10-12-2024",
      "importeSinIva": 19724.25,
      "importeConIva": 23866.34,
      "plazo": "30 Día(s)",
      "numExpediente": "10743/2024"
    },
    "ubicacion": {
      "precision": "zona",
      "lat": 38.729267,
      "lon": 0.090883,
      "radioM": 350,
      "visibleAire": "no",
      "referenciaCatastral": null,
      "fuente": {
        "tipo": "cartociudad",
        "url": "https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp?limit=10&q=poligono%20industrial%20teulada",
        "fechaConsulta": "2026-10-17"
      },
      "evidencia": "Descripción del anuncio: cámaras en «Calle Els Gremis, Calle Industria, Calle Cristaler, Calle Llanterner, Avda. Europa». Las cinco calles existen en CartoCiudad (ids 31280000815/816/813/817/1949, geometría por findJsonp). Punto = topónimo IGN «Polígono Industrial de Teulada». Ortofoto PNOA: naves industriales y la retícula de esas calles. Visibilidad: cámaras de vigilancia: no se distinguen desde el aire.",
      "estado": "propuesta"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=Nc0X04PNOgVPpzdqOdhuWg%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 1.53
  },
  {
    "id": "OBRA-07",
    "nombre": "Obras de mejora viaria del polígono industrial de Teulada.",
    "categoria": "urbanismo",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 37005.5,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "VIVES DALMAU S.L.",
      "cif": "B03070505",
      "fechaAcuerdo": "21/11/2024",
      "fechaPublicacion": "22-11-2024",
      "importeSinIva": 37005.5,
      "importeConIva": 44776.65,
      "plazo": "15 Día(s)",
      "numExpediente": "10541/2024"
    },
    "ubicacion": {
      "precision": "zona",
      "lat": 38.729267,
      "lon": 0.090883,
      "radioM": 300,
      "visibleAire": "si",
      "referenciaCatastral": null,
      "fuente": {
        "tipo": "cartociudad",
        "url": "https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp?limit=10&q=poligono%20industrial%20teulada",
        "fechaConsulta": "2026-10-17"
      },
      "evidencia": "Descripción: «reasfaltado y reparaciones de pavimentos de varios viales del Polígono Industrial de Teulada: Calle els Gremis, Calle Industria, Calle Cristaler, Calle Llanterner». Geometrías de las 4 calles de CartoCiudad; ortofoto del polígono.",
      "estado": "propuesta"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=zQxIqrT8RiKLAncw3qdZkA%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 2.87
  },
  {
    "id": "OBRA-08",
    "nombre": "Obras de reparación y mejora de camino peatonal en la zona verde de platgetes.",
    "categoria": "urbanismo",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 31657,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "CANEXTEC SL",
      "cif": "B06790117",
      "fechaAcuerdo": "21/11/2024",
      "fechaPublicacion": "22-11-2024",
      "importeSinIva": 31657,
      "importeConIva": 38304.97,
      "plazo": "2 Mes(es)",
      "numExpediente": "9632/2024"
    },
    "ubicacion": {
      "precision": "zona",
      "lat": 38.685728,
      "lon": 0.125759,
      "radioM": 150,
      "visibleAire": "parcial",
      "referenciaCatastral": null,
      "fuente": {
        "tipo": "ortofoto",
        "url": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG:4326&BBOX=38.684380,0.124030,38.687076,0.127488&WIDTH=640&HEIGHT=500&FORMAT=image/jpeg",
        "fechaConsulta": "2026-10-17"
      },
      "evidencia": "Objeto: «camino peatonal en la zona verde de platgetes». Ningún documento publica el trazado. La zona verde con sendas junto a la cala de Les Platgetes se ve en la ortofoto PNOA 2024; el punto marca su centro (OpenStreetMap, parque 552861850, solo sirvió de pista para encontrarla). CartoCiudad solo nombra la «Urbanización Playetes», unos 280 m al oeste, entre chalets, por eso no se usa como punto. Catastro: sin parcela (dominio público). Visibilidad: camino peatonal bajo arbolado, visible solo en parte.",
      "estado": "propuesta"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=cmmkqvqRaDMXhk1FZxEyvw%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 2.45
  },
  {
    "id": "OBRA-09",
    "nombre": "Obras de renovación del césped de las 5 pistas de pádel completas de la Ciudad Deportiva Ricardo Benavent de Teulada.",
    "categoria": "deporte",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 32925,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "JUBO TENNIS, S.L.",
      "cif": "B53298808",
      "fechaAcuerdo": "07/11/2024",
      "fechaPublicacion": "11-12-2024",
      "importeSinIva": 32925,
      "importeConIva": 39839.25,
      "plazo": "2 Mes(es)",
      "numExpediente": "10464/2024"
    },
    "ubicacion": {
      "precision": "instalacion",
      "lat": 38.731741,
      "lon": 0.102275,
      "radioM": 50,
      "visibleAire": "si",
      "referenciaCatastral": "8111919BC4981S",
      "fuente": {
        "tipo": "ortofoto",
        "url": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG:4326&BBOX=38.7312497,0.1014689,38.7322323,0.1030811&WIDTH=640&HEIGHT=500&FORMAT=image/jpeg",
        "fechaConsulta": "2026-10-17"
      },
      "evidencia": "Ortofoto PNOA (OBRA-09.jpg): exactamente 5 pistas de pádel verdes con cerramiento (1 + 4) y 2 de tenis, en la ciudad deportiva del NO del casco, al otro lado de la calle del «Estadi Municipal Ricardo Benavente» (IGN BTN_507830). En la otra zona deportiva (Poliesportiu, 38.7284,0.1090) no se ven pistas de pádel. Catastro de la parcela: «Obras de urbanización y jardinería, suelos sin edificar».",
      "estado": "verificada"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=WbGUELIiRRp4zIRvjBVCSw%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 2.55
  },
  {
    "id": "OBRA-10",
    "nombre": "Instalación de 2 nuevas bocas contra incendios, según normativa con diámetro 80 mm, racor tipo barcelona, en arqueta a nivel suelo en vías públicas de Polígono Industrial de Teulada",
    "categoria": "seguridad",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 5965.52,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "HIDRAQUA GESTION INTEGRAL DE AGUAS DE LEVANTE SA",
      "cif": "A53223764",
      "fechaAcuerdo": "07/10/2024",
      "fechaPublicacion": "05-02-2025",
      "importeSinIva": 5965.52,
      "importeConIva": 7218.28,
      "plazo": "1 Mes(es)",
      "numExpediente": "9881/2024"
    },
    "ubicacion": {
      "precision": "zona",
      "lat": 38.729267,
      "lon": 0.090883,
      "radioM": 350,
      "visibleAire": "no",
      "referenciaCatastral": null,
      "fuente": {
        "tipo": "cartociudad",
        "url": "https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp?limit=10&q=poligono%20industrial%20teulada",
        "fechaConsulta": "2026-10-17"
      },
      "evidencia": "Descripción: «2 nuevas bocas contra incendios ... en vías públicas de Polígono Industrial de Teulada». Punto = topónimo IGN del polígono; ortofoto: polígono industrial. Visibilidad: bocas de incendio: no se distinguen desde el aire.",
      "estado": "propuesta"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=lPuI3QYNdVG9Hd5zqvq9cg%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 0.46
  },
  {
    "id": "OBRA-11",
    "nombre": "Ejecución de trabajos de silvicultura preventiva sobre la vegetación forestal previstos en el Plan Local de Prevención de Incendios Forestales (PLPIF) del municipio de Teulada (Alicante).",
    "categoria": "medio ambiente",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 6102.89,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "EXCAVACIONES Y DEBROCES MARTINEZ SL",
      "cif": "B98098304",
      "fechaAcuerdo": "19/09/2024",
      "fechaPublicacion": "29-01-2025",
      "importeSinIva": 6102.89,
      "importeConIva": 7384.5,
      "plazo": "15 Día(s)",
      "numExpediente": "8922/2024"
    },
    "ubicacion": {
      "precision": "municipio",
      "motivo": "son trabajos forestales repartidos por el término municipal"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=O%2BhHte%2FFjAGkU02jNGj1Fw%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 0.47
  },
  {
    "id": "OBRA-12",
    "nombre": "Obras de reparación y terminación de cubiertas de aulario en el CEIP San Vicente Ferrer de Teulada.",
    "categoria": "educacion",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 38244,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "CONSTRUCCIONES MALONDA 3 SL",
      "cif": "B53016358",
      "fechaAcuerdo": "14/08/2024",
      "fechaPublicacion": "16-08-2024",
      "importeSinIva": 38244,
      "importeConIva": 46275.24,
      "plazo": "2 Mes(es)",
      "numExpediente": "3998/2024"
    },
    "ubicacion": {
      "precision": "instalacion",
      "lat": 38.728283,
      "lon": 0.109751,
      "radioM": 80,
      "visibleAire": "si",
      "referenciaCatastral": "8807202BC4980N",
      "fuente": {
        "tipo": "catastro",
        "url": "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC?Provincia=&Municipio=&RC=8807202BC4980N",
        "fechaConsulta": "2026-10-17"
      },
      "evidencia": "CartoCiudad/IGN: «CEIP San Vicente Ferrer, Teulada» (BTN_3266534, tipo Centro docente). Catastro en ese punto: RC 8807202BC4980N, CL JUVENTUD 14, construcciones de uso ENSEÑANZA, año 1984. Ortofoto: edificios escolares con patio.",
      "estado": "verificada"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=g934hy%2B26hlt5r0ngvMetA%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 2.96
  },
  {
    "id": "OBRA-13",
    "nombre": "Obras de “Ejecución de un nuevo pluvial entre la calle San Vicente y la Plaza Constitución de Teulada”.",
    "categoria": "urbanismo",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 38000,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "SEPIVAL OBRAS Y SERVICIOS SL",
      "cif": "B42586008",
      "fechaAcuerdo": "20/06/2024",
      "fechaPublicacion": "28-06-2024",
      "importeSinIva": 38000,
      "importeConIva": 45980,
      "plazo": "2 Mes(es)",
      "numExpediente": "7382/2023"
    },
    "ubicacion": {
      "precision": "zona",
      "lat": 38.72895,
      "lon": 0.104345,
      "radioM": 120,
      "visibleAire": "no",
      "referenciaCatastral": null,
      "fuente": {
        "tipo": "cartociudad",
        "url": "https://www.cartociudad.es/geocoder/api/geocoder/findJsonp?id=31280000028&type=callejero&q=PLAZA+CONSTITUCION%2C+Teulada",
        "fechaConsulta": "2026-10-17"
      },
      "evidencia": "Objeto: «nuevo pluvial entre la calle San Vicente y la Plaza Constitución». Plaza Constitución: CartoCiudad id 31280000028. En el callejero de Catastro de Teulada no existe «Calle San Vicente»; la más cercana es «CL SANT VICENT FERRER», cuyo extremo NO está a unos 70 m de la plaza (geometría incluida). Ortofoto del casco antiguo. Visibilidad: conducción de pluviales enterrada.",
      "estado": "propuesta"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=xfLfPBj9%2B6bIGlsa0Wad%2Bw%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 2.94
  },
  {
    "id": "OBRA-14",
    "nombre": "Obras de reparación de infraestructuras hidráulicas de saneamiento en estaciones de bombeo de aguas residuales municipales",
    "categoria": "urbanismo",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 18201.7,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "HIDRAQUA GESTION INTEGRAL DE AGUAS DE LEVANTE SA",
      "cif": "A53223764",
      "fechaAcuerdo": "13/06/2024",
      "fechaPublicacion": "14-06-2024",
      "importeSinIva": 18201.7,
      "importeConIva": 22024.06,
      "plazo": "2 Mes(es)",
      "numExpediente": "5561/2024"
    },
    "ubicacion": {
      "precision": "sin_ubicacion",
      "motivo": "el anuncio no dice en qué estaciones de bombeo se actúa"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=mgpVrlv9hGH10HRJw8TEnQ%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 1.41
  },
  {
    "id": "OBRA-15",
    "nombre": "Obras de renovación de zonas de juegos infantiles en espacios públicos del T.M. de Teulada (Senillar y Font Santa).",
    "categoria": "parques",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 38755,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "INDUSTRIAL MOSSER 97, S.L.",
      "cif": "B30536007",
      "fechaAcuerdo": "02/05/2024",
      "fechaPublicacion": "03-05-2024",
      "importeSinIva": 38755,
      "importeConIva": 46893.55,
      "plazo": "2 Mes(es)",
      "numExpediente": "3844/2024"
    },
    "ubicacion": {
      "precision": "sin_ubicacion",
      "motivo": "son dos sitios separados unos 3 km (parque del Senillar y ermita de la Font Santa)"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=92bkmyqRP76HCIsjvJ3rhQ%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 3
  },
  {
    "id": "OBRA-16",
    "nombre": "Obras de retirada y gestión de residuos de las obras de mejora de la red de pluviales de la Avda. Mediterráneo.",
    "categoria": "urbanismo",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 39256.2,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "VIVES DALMAU S.L.",
      "cif": "B03070505",
      "fechaAcuerdo": "25/04/2024",
      "fechaPublicacion": "09-05-2024",
      "importeSinIva": 39256.2,
      "importeConIva": 47500,
      "plazo": "1 Mes(es)",
      "numExpediente": "2402/2024"
    },
    "ubicacion": {
      "precision": "tramo",
      "lat": 38.727271,
      "lon": 0.102634,
      "radioM": 550,
      "visibleAire": "no",
      "referenciaCatastral": null,
      "fuente": {
        "tipo": "cartociudad",
        "url": "https://www.cartociudad.es/geocoder/api/geocoder/findJsonp?id=31280000104&type=callejero&q=AVENIDA+MEDITERRANEO%2C+Teulada",
        "fechaConsulta": "2026-10-17"
      },
      "evidencia": "Objeto: «retirada y gestión de residuos de las obras de mejora de la red de pluviales de la Avda. Mediterráneo». Una sola Avenida Mediterráneo en Teulada (CartoCiudad id 31280000104, ~1 km por el S del casco, travesía CV-740). Ortofoto con el eje trazado. Visibilidad: retirada de residuos: no deja huella visible.",
      "estado": "propuesta"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=pwEGhw0exa1VkTabT%2FRM8A%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 3.04
  },
  {
    "id": "OBRA-17",
    "nombre": "Reposición de baldosas (edificio Ayuntamiento) en Plaza de Constitución (zona cubierta situada al lado del Retén de la Policia Local) por rotura de las mismas.",
    "categoria": "urbanismo",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 1498,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "CONSTRUCCIONES Y JARDINERIA JOSE MUÑOZ SL",
      "cif": "B53209847",
      "fechaAcuerdo": "27/03/2024",
      "fechaPublicacion": "11-06-2024",
      "importeSinIva": 1498,
      "importeConIva": 1812.58,
      "plazo": "2 Día(s)",
      "numExpediente": "3227/2024"
    },
    "ubicacion": {
      "precision": "instalacion",
      "lat": 38.728329,
      "lon": 0.104417,
      "radioM": 50,
      "visibleAire": "no",
      "referenciaCatastral": null,
      "fuente": {
        "tipo": "cartociudad",
        "url": "https://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp?limit=10&q=ajuntament%20teulada",
        "fechaConsulta": "2026-10-17"
      },
      "evidencia": "Descripción: «Reposición de baldosas (edificio Ayuntamiento) en Plaza de Constitución (zona cubierta situada al lado del Retén de la Policia Local)». IGN: «Ajuntament de Teulada» (38.728329,0.104417), a ~70 m de la Plaza Constitución (CartoCiudad id 31280000028). Ortofoto: edificio y plaza. Visibilidad: baldosas bajo una zona cubierta.",
      "estado": "propuesta"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=90w0SGXuLNMeC9GJQOEBkQ%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 0.12
  },
  {
    "id": "OBRA-18",
    "nombre": "Obras de conexión red de saneamiento entre Calle Santa Pola y bombeo del C.C. Algas.",
    "categoria": "urbanismo",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 9725.36,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "VIVES DALMAU S.L.",
      "cif": "B03070505",
      "fechaAcuerdo": "21/03/2024",
      "fechaPublicacion": "22-03-2024",
      "importeSinIva": 9725.36,
      "importeConIva": 11767.69,
      "plazo": "21 Día(s)",
      "numExpediente": "2394/2024"
    },
    "ubicacion": {
      "precision": "tramo",
      "lat": 38.681258,
      "lon": 0.120351,
      "radioM": 120,
      "visibleAire": "no",
      "referenciaCatastral": null,
      "fuente": {
        "tipo": "cartociudad",
        "url": "https://www.cartociudad.es/geocoder/api/geocoder/findJsonp?id=31280000762&type=callejero&q=CALLE+CABO+SANTA+POLA%2C+Cap+Blanc+%28Teulada%29",
        "fechaConsulta": "2026-10-17"
      },
      "evidencia": "Anuncio: «OBRA CONEXIÓN SANEAMIENTO C/ SANTA POLA-BOMBEO C.C. ALGAS». En Teulada solo existe una calle con «Santa Pola»: CL CABO SANTA POLA (callejero de Catastro y CartoCiudad id 31280000762, zona Cap Blanc/La Cometa, Moraira). Pista OSM (ODbL): local «Algas L'Andragó» en 38.681712,0.120670, a ~50 m del extremo E de la calle, junto a un bloque comercial. Punto = extremo E de la calle. Visibilidad: conexión de saneamiento enterrada.",
      "estado": "propuesta"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=bRr9yfs7Dj1t5r0ngvMetA%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 0.75
  },
  {
    "id": "OBRA-19",
    "nombre": "Contrato menor de obras de asfaltado",
    "categoria": "urbanismo",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2023,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 39300,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "VIVES DALMAU S.L.",
      "cif": "B03070505",
      "fechaAcuerdo": "21/12/2023",
      "fechaPublicacion": "22-12-2023",
      "importeSinIva": 39300,
      "importeConIva": 47553,
      "plazo": "45 Día(s)",
      "numExpediente": "11277/2023"
    },
    "ubicacion": {
      "precision": "municipio",
      "motivo": "son cuatro viales separados del término municipal"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=dMcp2HTAAkf%2B3JAijKO%2Bkg%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 3.04
  },
  {
    "id": "OBRA-20",
    "nombre": "Obras de canalización subterranea para linea de alumbrado público en zona Les Platgetes.",
    "categoria": "urbanismo",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2023,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 3474.36,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "SITELEC GLOBAL DE SERVICIOS Y OBRAS S.L.",
      "cif": "B39640263",
      "fechaAcuerdo": "21/11/2023",
      "fechaPublicacion": "18-01-2024",
      "importeSinIva": 3474.36,
      "importeConIva": 4203.98,
      "plazo": "1 Mes(es)",
      "numExpediente": "10979/2023"
    },
    "ubicacion": {
      "precision": "zona",
      "lat": 38.685728,
      "lon": 0.125759,
      "radioM": 250,
      "visibleAire": "no",
      "referenciaCatastral": null,
      "fuente": {
        "tipo": "ortofoto",
        "url": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG:4326&BBOX=38.684380,0.124030,38.687076,0.127488&WIDTH=640&HEIGHT=500&FORMAT=image/jpeg",
        "fechaConsulta": "2026-10-17"
      },
      "evidencia": "Objeto: «canalización subterránea para línea de alumbrado público en zona Les Platgetes». Ningún documento publica el trazado: se marca la zona de la cala de Les Platgetes (la misma que OBRA-08, comprobada en la ortofoto PNOA 2024) con un radio amplio. Confianza baja sobre el punto exacto. Visibilidad: canalización eléctrica enterrada.",
      "estado": "propuesta"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=ItTc8sCA5CvjHF5qKI4aaw%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 0.27
  },
  {
    "id": "OBRA-21",
    "nombre": "Obras de acondicionamiento del espacio e instalación de la tirolina.",
    "categoria": "parques",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2023,
    "estadoDato": "NO_VERIFICADO",
    "estadoEjecucion": "faltante",
    "importeLicitacion": 33027.5,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "MG PARQUES Y SERVICIOS, S.L.",
      "cif": "B42641274",
      "fechaAcuerdo": "16/11/2023",
      "fechaPublicacion": "17-11-2023",
      "importeSinIva": 33027.5,
      "importeConIva": 39963.28,
      "plazo": "6 Mes(es)",
      "numExpediente": "11022/2023"
    },
    "ubicacion": {
      "precision": "sin_ubicacion",
      "motivo": "el anuncio no dice dónde está la tirolina"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=4%2Fpkb6LMt%2BwkJPJS%2BPS9vg%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 2.56
  }
];

export type Voto = "valio" | "no_valio" | "explica" | "no_puedo";

export const VOTO_LABEL: Record<Voto, string> = {
  valio: "Valió",
  no_valio: "No valió",
  explica: "Pido explicaciones",
  no_puedo: "No puedo valorarlo",
};

export type Votos = Record<string, Voto>;
