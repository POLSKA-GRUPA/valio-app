export type EstadoDato = "NO_VERIFICADO" | "EVIDENCIADO" | "CONTRADICHO" | "DESACTUALIZADO";

export type Categoria = "obra" | "contrato" | "servicio" | "sanidad" | "transporte" | "educacion";

export interface Obra {
  id: string;
  demo: true;
  nombre: string;
  categoria: Categoria;
  municipio: string;
  resumen: string;
  importe: string;
  plazos: string;
  promesa: string;
  estadoDato: EstadoDato;
  fuente: { nombre: string; url?: string; fecha?: string } | null;
  senales: string[];
  color: string;
}

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  obra: "Obra pública",
  contrato: "Contrato",
  servicio: "Servicio",
  sanidad: "Sanidad",
  transporte: "Transporte",
  educacion: "Educación",
};

export const ESTADO_LABEL: Record<EstadoDato, string> = {
  NO_VERIFICADO: "No verificado",
  EVIDENCIADO: "Evidenciado",
  CONTRADICHO: "Contradicho",
  DESACTUALIZADO: "Desactualizado",
};

/**
 * Tarjetas de DEMOSTRACIÓN. Ninguna cifra es real: cada tarjeta está marcada
 * como DEMO en la interfaz. La verificación de obras reales es el gate P0 del
 * PRD y vive en el repo valio-datos con su plantilla y fuente oficial.
 */
export const OBRAS: Obra[] = [
  {
    id: "DEMO-01",
    demo: true,
    nombre: "Rehabilitación de la plaza mayor (ejemplo)",
    categoria: "obra",
    municipio: "Tu ciudad (demo)",
    resumen:
      "Tarjeta de ejemplo para probar la mecánica de voto. En producción, cada dato vendrá de una fuente oficial verificada con el método P0.",
    importe: "128.400 € (ejemplo)",
    plazos: "8 meses (ejemplo)",
    promesa: "Plaza peatonal con bancos nuevos y talla de árboles.",
    estadoDato: "NO_VERIFICADO",
    fuente: null,
    senales: [
      "Participación suficiente",
      "Evidencia documental mínima",
      "Pregunta o anomalía concreta",
      "Organismo competente identificable",
      "Sin bloqueos de moderación",
    ],
    color: "#2F6BFF",
  },
  {
    id: "DEMO-02",
    demo: true,
    nombre: "Contrato de limpieza de colectores (ejemplo)",
    categoria: "contrato",
    municipio: "Tu ciudad (demo)",
    resumen:
      "Ejemplo de contrato con una anomalía típica: prorrogas acumuladas sobre el importe inicial. Los importes son ficticios.",
    importe: "86.000 € + prórrogas (ejemplo)",
    plazos: "2 años + 2 prórrogas (ejemplo)",
    promesa: "Limpieza integral con revisión semestral.",
    estadoDato: "CONTRADICHO",
    fuente: null,
    senales: [
      "Participación suficiente",
      "Evidencia documental mínima",
      "Pregunta o anomalía concreta",
      "Organismo competente identificable",
      "Sin bloqueos de moderación",
    ],
    color: "#8B5CF6",
  },
  {
    id: "DEMO-03",
    demo: true,
    nombre: "Nuevo consultorio de barrio (ejemplo)",
    categoria: "sanidad",
    municipio: "Tu ciudad (demo)",
    resumen:
      "Ejemplo de servicio sanitario anunciado que aún no abre. Ideal para probar el gesto de arriba: pedir explicaciones.",
    importe: "310.000 € (ejemplo)",
    plazos: "Anunciado hace 2 años (ejemplo)",
    promesa: "Apertura en el primer trimestre.",
    estadoDato: "DESACTUALIZADO",
    fuente: null,
    senales: [
      "Participación suficiente",
      "Evidencia documental mínima",
      "Pregunta o anomalía concreta",
      "Organismo competente identificable",
      "Sin bloqueos de moderación",
    ],
    color: "#0E9F6E",
  },
  {
    id: "DEMO-04",
    demo: true,
    nombre: "Carril bici al polígono (ejemplo)",
    categoria: "transporte",
    municipio: "Tu ciudad (demo)",
    resumen:
      "Ejemplo de obra inconclusa con tramos a medias. Muestra cómo se vería un dato evidenciado con fuente.",
    importe: "540.000 € (ejemplo)",
    plazos: "14 meses, 20 meses después sigue abierto (ejemplo)",
    promesa: "Conexión ciclista segura en un año.",
    estadoDato: "EVIDENCIADO",
    fuente: {
      nombre: "Portal de transparencia municipal (ejemplo de etiqueta)",
      fecha: "2026-01-15",
    },
    senales: [
      "Participación suficiente",
      "Evidencia documental mínima",
      "Pregunta o anomalía concreta",
      "Organismo competente identificable",
      "Sin bloqueos de moderación",
    ],
    color: "#F59E0B",
  },
  {
    id: "DEMO-05",
    demo: true,
    nombre: "Digitalización del colegio público (ejemplo)",
    categoria: "educacion",
    municipio: "Tu ciudad (demo)",
    resumen:
      "Ejemplo de compra de equipos que tardó en llegar a las aulas. Los tres gestos verticales también cuentan.",
    importe: "74.500 € (ejemplo)",
    plazos: "6 meses (ejemplo)",
    promesa: "Una pantalla por aula y tabletas de préstamo.",
    estadoDato: "NO_VERIFICADO",
    fuente: null,
    senales: [
      "Participación suficiente",
      "Evidencia documental mínima",
      "Pregunta o anomalía concreta",
      "Organismo competente identificable",
      "Sin bloqueos de moderación",
    ],
    color: "#E11D48",
  },
  {
    id: "DEMO-06",
    demo: true,
    nombre: "Gradas del polideportivo (ejemplo)",
    categoria: "obra",
    municipio: "Tu ciudad (demo)",
    resumen:
      "Ejemplo de obra bien recibida: no todo va a cabrear. Votar a la derecha también es información útil.",
    importe: "96.000 € (ejemplo)",
    plazos: "5 meses (ejemplo)",
    promesa: "Gradas cubiertas para 400 personas.",
    estadoDato: "NO_VERIFICADO",
    fuente: null,
    senales: [
      "Participación suficiente",
      "Evidencia documental mínima",
      "Pregunta o anomalía concreta",
      "Organismo competente identificable",
      "Sin bloqueos de moderación",
    ],
    color: "#2563EB",
  },
  {
    id: "DEMO-07",
    demo: true,
    nombre: "Semáforos inteligentes (ejemplo)",
    categoria: "servicio",
    municipio: "Tu ciudad (demo)",
    resumen:
      "Ejemplo de contrato de mantenimiento con coste anual recurrente. Sirve para ver el detalle de señales del match.",
    importe: "48.000 € al año (ejemplo)",
    plazos: "Renovable anualmente (ejemplo)",
    promesa: "Menos atascos en la avenida principal.",
    estadoDato: "NO_VERIFICADO",
    fuente: null,
    senales: [
      "Participación suficiente",
      "Evidencia documental mínima",
      "Pregunta o anomalía concreta",
      "Organismo competente identificable",
      "Sin bloqueos de moderación",
    ],
    color: "#7C3AED",
  },
  {
    id: "DEMO-08",
    demo: true,
    nombre: "Parque infantil del paseo (ejemplo)",
    categoria: "obra",
    municipio: "Tu ciudad (demo)",
    resumen:
      "Última tarjeta de la demo: al terminar verás tu resumen de votos y qué puedes hacer con ellos.",
    importe: "52.300 € (ejemplo)",
    plazos: "3 meses (ejemplo)",
    promesa: "Juego inclusivo y sombra para el verano.",
    estadoDato: "NO_VERIFICADO",
    fuente: null,
    senales: [
      "Participación suficiente",
      "Evidencia documental mínima",
      "Pregunta o anomalía concreta",
      "Organismo competente identificable",
      "Sin bloqueos de moderación",
    ],
    color: "#059669",
  },
];

export type Voto = "valio" | "no_valio" | "explica" | "no_puedo";

export const VOTO_LABEL: Record<Voto, string> = {
  valio: "Valió",
  no_valio: "No valió",
  explica: "Pido explicaciones",
  no_puedo: "No puedo valorarlo",
};

export type Votos = Record<string, Voto>;
