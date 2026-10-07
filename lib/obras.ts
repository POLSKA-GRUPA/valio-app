/**
 * ⚠️ ARCHIVO GENERADO — no editar a mano.
 * Regenerar con: node scripts/generar-obras.mjs
 * Fuente: valio-datos (obras-piloto.csv + fichas OBRA-XX.md) · 2026-10-05
 * Cada dato es rastreable hasta su ficha; nada inventado.
 */

export type EstadoDato = "NO_VERIFICADO" | "EVIDENCIADO" | "CONTRADICHO" | "DESACTUALIZADO";

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

export interface Obra {
  id: string;
  nombre: string;
  categoria: Categoria;
  municipio: string;
  provincia: string;
  organismo: string;
  anyo: number;
  estadoEjecucion: "faltante";
  importeLicitacion: number;
  ivaLicitacionIncluido: boolean;
  adjudicacion: Adjudicacion | null;
  costePorHabitante: number;
  fuente: { nombre: string; url: string; fechaConsulta: string };
}

/** Denominador del coste por habitante (dossier §4.2: siempre explicado). */
export const POBLACION = {
  "municipio": "Teulada",
  "habitantes": 12932,
  "referencia": "1 de enero de 2025",
  "fuenteNombre": "INE — Nomenclátor (Censo Continuo)",
  "fuenteUrl": "https://www.ine.es/nomen2/tabla.do?accion=busquedaRapida&nombrePoblacion=Teulada&desagregacionRapida=S&aniosRapida=2025"
} as const;

export const OBRAS: Obra[] = [
  {
    "id": "OBRA-01",
    "nombre": "Obras de asfaltado e inversiones para mejora de calles municipales",
    "categoria": "urbanismo",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2026,
    "estadoEjecucion": "faltante",
    "importeLicitacion": 177685.95,
    "ivaLicitacionIncluido": false,
    "adjudicacion": null,
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/portal/plataforma/buscadores/detalle/!ut/p/z1/lY9LU4NAEIR_Sw5c2ckCqx4J71QwKC6EvVCbBK21WBZ5-PslCVeJzq2nuvubQQwdEGv4t_jgg1ANryddMFKa3t5x_BDDY2q4gHcupSS8SIzyq8EyHDPbZglJowAgCn13R9cWBJggtpAPrDkPv4wNf8svGNhyfY7YMgLPhqUX70GK6ciH0s68Fzt6MmC_eZ0Q2yR-SwK8BjBReuk4KamLo9Tf-anq9VZ1Q10NehZ5eeSiQoPPvtXgOPZfY3XmGviqk2PNO6E2806fHPdY5B-sczXwuq40iLlo3Ju4MlpJ6QFEImX5HNur1Q_v7O01/#Z7_AVEQAI930OBRD02JPMTPG21004",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 13.74
  },
  {
    "id": "OBRA-02",
    "nombre": "Reconstrucción parcial del muro y valla de cerramiento del Campo de Fútbol.",
    "categoria": "deporte",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Alcaldia del Ayuntamiento de Teulada",
    "anyo": 2026,
    "estadoEjecucion": "faltante",
    "importeLicitacion": 4300,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "JOSE JAVIER BISQUERT IVARS",
      "cif": "52783313S",
      "fechaAcuerdo": "12/05/2026",
      "fechaPublicacion": "12-05-2026",
      "importeSinIva": 4300,
      "importeConIva": 5203,
      "plazo": "3 Mes(es)",
      "numExpediente": "5122/2026"
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
    "estadoEjecucion": "faltante",
    "importeLicitacion": 27995,
    "ivaLicitacionIncluido": false,
    "adjudicacion": {
      "adjudicataria": "JOSE JAVIER BISQUERT IVARS",
      "cif": "52783313S",
      "fechaAcuerdo": "21/11/2024",
      "fechaPublicacion": "22-11-2024",
      "importeSinIva": 27995,
      "importeConIva": 33873.95,
      "plazo": "1 Año(s)",
      "numExpediente": "11488/2024"
    },
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/portal/plataforma/buscadores/detalle/!ut/p/z1/hY9LD4IwEIR_kem2lAJHHqUUQUAeSi-ExMSQ8DDG8Psthqu6t8l-MzuLFLoiNffrcO9fwzL3o9atYh3lme-HEQG7NAIgSVDXLNokQQ26_EOUXsOXcUH71QcxDZ82cZOzUgoAGYVBUmMTBGE78COj1R2szm144UrHgMw76w5xnla5IBiAoXpenpP-p9yyhhtfR9RiajOgwDDe_UKAxJ4Aio-nAFhu8ZgX1Xbin_8xhY48tFOXVu4bCNQvNA!!/dz/d5/L2dBISEvZ0FBIS9nQSEh/",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 2.16
  },
  {
    "id": "OBRA-05",
    "nombre": "Tancament perimetral de l’excavació del poblat ibèric a l’àrea arqueològica del cap d’Or i protecció de les estructures del poblat de la punta de Moraira.",
    "categoria": "patrimonio",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
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
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=zQxIqrT8RiKLAncw3qdZkA%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 2.86
  },
  {
    "id": "OBRA-08",
    "nombre": "Obras de reparación y mejora de camino peatonal en la zona verde de platgetes.",
    "categoria": "urbanismo",
    "municipio": "Teulada",
    "provincia": "Alicante",
    "organismo": "Ayuntamiento de Teulada",
    "anyo": 2024,
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
    "fuente": {
      "nombre": "Plataforma de Contratación del Sector Público (PLACE)",
      "url": "https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=4%2Fpkb6LMt%2BwkJPJS%2BPS9vg%3D%3D",
      "fechaConsulta": "05/10/2026"
    },
    "costePorHabitante": 2.55
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
