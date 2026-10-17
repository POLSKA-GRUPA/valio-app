/**
 * ⚠️ ARCHIVO GENERADO — no editar a mano.
 * Regenerar con: node scripts/hornear-vista-aerea.mjs
 * Fotos aéreas oficiales de cada obra, con la fecha de vuelo que da el propio
 * servicio en el punto. Generado: 2026-10-17
 */

export type Veredicto = "posterior" | "durante" | "anterior" | "indeterminado" | "sin_fechas";

export interface FotoAerea {
  src: string;
  /** AAAA-MM del vuelo en el punto (IGN) o AAAA (ICV, ver ventana). */
  fecha: string;
  /** Ventana del vuelo de toda la Comunitat (ICV): [inicio, fin] AAAA-MM-DD. */
  ventana: [string, string] | null;
  fuente: string;
  capa: string;
  resolucionM: number | null;
  atribucion: string;
  /** Petición WMS original, para poder reproducir la imagen. */
  origen: string;
}

export interface VistaAerea {
  /** [latMin, lonMin, latMax, lonMax] del encuadre. */
  caja: [number, number, number, number];
  metrosAncho: number;
  ahora: FotoAerea;
  antes: FotoAerea | null;
  adjudicacion: string | null;
  finPrevisto: string | null;
  veredicto: Veredicto;
}

/** Día en que se consultaron los servicios del IGN y del ICV por última vez. */
export const REVISADO = "2026-10-17";

export const VISTAS_AEREAS: Record<string, VistaAerea> = {
  "OBRA-06": {
    "caja": [
      38.722979,
      0.078792,
      38.735555,
      0.102974
    ],
    "metrosAncho": 2100,
    "ahora": {
      "src": "/aerea/OBRA-06-ahora.webp",
      "fecha": "2024-06",
      "ventana": null,
      "fuente": "PNOA (IGN)",
      "capa": "OI.OrthoimageCoverage",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de PNOA 2024 CC-BY 4.0 scne.es",
      "origen": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG%3A4326&BBOX=38.722979%2C0.078792%2C38.735555%2C0.102974&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "antes": null,
    "adjudicacion": "2024-12-05",
    "finPrevisto": "2025-01-04",
    "veredicto": "anterior"
  },
  "OBRA-07": {
    "caja": [
      38.723877,
      0.080519,
      38.734657,
      0.101247
    ],
    "metrosAncho": 1800,
    "ahora": {
      "src": "/aerea/OBRA-07-ahora.webp",
      "fecha": "2024-06",
      "ventana": null,
      "fuente": "PNOA (IGN)",
      "capa": "OI.OrthoimageCoverage",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de PNOA 2024 CC-BY 4.0 scne.es",
      "origen": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG%3A4326&BBOX=38.723877%2C0.080519%2C38.734657%2C0.101247&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "antes": null,
    "adjudicacion": "2024-11-21",
    "finPrevisto": "2024-12-06",
    "veredicto": "anterior"
  },
  "OBRA-08": {
    "caja": [
      38.683033,
      0.12058,
      38.688423,
      0.130938
    ],
    "metrosAncho": 900,
    "ahora": {
      "src": "/aerea/OBRA-08-ahora.webp",
      "fecha": "2024-06",
      "ventana": null,
      "fuente": "PNOA (IGN)",
      "capa": "OI.OrthoimageCoverage",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de PNOA 2024 CC-BY 4.0 scne.es",
      "origen": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG%3A4326&BBOX=38.683033%2C0.12058%2C38.688423%2C0.130938&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "antes": null,
    "adjudicacion": "2024-11-21",
    "finPrevisto": "2025-01-21",
    "veredicto": "anterior"
  },
  "OBRA-09": {
    "caja": [
      38.730843,
      0.100548,
      38.732639,
      0.104002
    ],
    "metrosAncho": 300,
    "ahora": {
      "src": "/aerea/OBRA-09-ahora.webp",
      "fecha": "2024-06",
      "ventana": null,
      "fuente": "PNOA (IGN)",
      "capa": "OI.OrthoimageCoverage",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de PNOA 2024 CC-BY 4.0 scne.es",
      "origen": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG%3A4326&BBOX=38.730843%2C0.100548%2C38.732639%2C0.104002&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "antes": null,
    "adjudicacion": "2024-11-07",
    "finPrevisto": "2025-01-07",
    "veredicto": "anterior"
  },
  "OBRA-10": {
    "caja": [
      38.722979,
      0.078792,
      38.735555,
      0.102974
    ],
    "metrosAncho": 2100,
    "ahora": {
      "src": "/aerea/OBRA-10-ahora.webp",
      "fecha": "2024-06",
      "ventana": null,
      "fuente": "PNOA (IGN)",
      "capa": "OI.OrthoimageCoverage",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de PNOA 2024 CC-BY 4.0 scne.es",
      "origen": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG%3A4326&BBOX=38.722979%2C0.078792%2C38.735555%2C0.102974&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "antes": null,
    "adjudicacion": "2024-10-07",
    "finPrevisto": "2024-11-07",
    "veredicto": "anterior"
  },
  "OBRA-12": {
    "caja": [
      38.726846,
      0.106987,
      38.72972,
      0.112515
    ],
    "metrosAncho": 480,
    "ahora": {
      "src": "/aerea/OBRA-12-ahora.webp",
      "fecha": "2024-06",
      "ventana": null,
      "fuente": "PNOA (IGN)",
      "capa": "OI.OrthoimageCoverage",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de PNOA 2024 CC-BY 4.0 scne.es",
      "origen": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG%3A4326&BBOX=38.726846%2C0.106987%2C38.72972%2C0.112515&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "antes": null,
    "adjudicacion": "2024-08-14",
    "finPrevisto": "2024-10-14",
    "veredicto": "anterior"
  },
  "OBRA-13": {
    "caja": [
      38.726794,
      0.1002,
      38.731106,
      0.10849
    ],
    "metrosAncho": 720,
    "ahora": {
      "src": "/aerea/OBRA-13-ahora.webp",
      "fecha": "2024-06",
      "ventana": null,
      "fuente": "PNOA (IGN)",
      "capa": "OI.OrthoimageCoverage",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de PNOA 2024 CC-BY 4.0 scne.es",
      "origen": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG%3A4326&BBOX=38.726794%2C0.1002%2C38.731106%2C0.10849&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "antes": {
      "src": "/aerea/OBRA-13-antes.webp",
      "fecha": "2023",
      "ventana": [
        "2023-04-16",
        "2023-08-06"
      ],
      "fuente": "Ortofoto ICV",
      "capa": "2023CVAL0025_RGB",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de Ortofoto 2023 CC BY 4.0 © Institut Cartogràfic Valencià, Generalitat",
      "origen": "https://terramapas.icv.gva.es/0202_2023CVAL0025?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=2023CVAL0025_RGB&STYLES=&CRS=EPSG%3A4326&BBOX=38.726794%2C0.1002%2C38.731106%2C0.10849&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "adjudicacion": "2024-06-20",
    "finPrevisto": "2024-08-20",
    "veredicto": "indeterminado"
  },
  "OBRA-16": {
    "caja": [
      38.71739,
      0.083634,
      38.737152,
      0.121634
    ],
    "metrosAncho": 3300,
    "ahora": {
      "src": "/aerea/OBRA-16-ahora.webp",
      "fecha": "2024-06",
      "ventana": null,
      "fuente": "PNOA (IGN)",
      "capa": "OI.OrthoimageCoverage",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de PNOA 2024 CC-BY 4.0 scne.es",
      "origen": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG%3A4326&BBOX=38.71739%2C0.083634%2C38.737152%2C0.121634&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "antes": {
      "src": "/aerea/OBRA-16-antes.webp",
      "fecha": "2023",
      "ventana": [
        "2023-04-16",
        "2023-08-06"
      ],
      "fuente": "Ortofoto ICV",
      "capa": "2023CVAL0025_RGB",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de Ortofoto 2023 CC BY 4.0 © Institut Cartogràfic Valencià, Generalitat",
      "origen": "https://terramapas.icv.gva.es/0202_2023CVAL0025?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=2023CVAL0025_RGB&STYLES=&CRS=EPSG%3A4326&BBOX=38.71739%2C0.083634%2C38.737152%2C0.121634&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "adjudicacion": "2024-04-25",
    "finPrevisto": "2024-05-25",
    "veredicto": "posterior"
  },
  "OBRA-17": {
    "caja": [
      38.727431,
      0.10269,
      38.729227,
      0.106144
    ],
    "metrosAncho": 300,
    "ahora": {
      "src": "/aerea/OBRA-17-ahora.webp",
      "fecha": "2024-06",
      "ventana": null,
      "fuente": "PNOA (IGN)",
      "capa": "OI.OrthoimageCoverage",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de PNOA 2024 CC-BY 4.0 scne.es",
      "origen": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG%3A4326&BBOX=38.727431%2C0.10269%2C38.729227%2C0.106144&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "antes": {
      "src": "/aerea/OBRA-17-antes.webp",
      "fecha": "2023",
      "ventana": [
        "2023-04-16",
        "2023-08-06"
      ],
      "fuente": "Ortofoto ICV",
      "capa": "2023CVAL0025_RGB",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de Ortofoto 2023 CC BY 4.0 © Institut Cartogràfic Valencià, Generalitat",
      "origen": "https://terramapas.icv.gva.es/0202_2023CVAL0025?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=2023CVAL0025_RGB&STYLES=&CRS=EPSG%3A4326&BBOX=38.727431%2C0.10269%2C38.729227%2C0.106144&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "adjudicacion": "2024-03-27",
    "finPrevisto": "2024-03-29",
    "veredicto": "posterior"
  },
  "OBRA-18": {
    "caja": [
      38.679102,
      0.116208,
      38.683414,
      0.124494
    ],
    "metrosAncho": 720,
    "ahora": {
      "src": "/aerea/OBRA-18-ahora.webp",
      "fecha": "2024-06",
      "ventana": null,
      "fuente": "PNOA (IGN)",
      "capa": "OI.OrthoimageCoverage",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de PNOA 2024 CC-BY 4.0 scne.es",
      "origen": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG%3A4326&BBOX=38.679102%2C0.116208%2C38.683414%2C0.124494&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "antes": {
      "src": "/aerea/OBRA-18-antes.webp",
      "fecha": "2023",
      "ventana": [
        "2023-04-16",
        "2023-08-06"
      ],
      "fuente": "Ortofoto ICV",
      "capa": "2023CVAL0025_RGB",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de Ortofoto 2023 CC BY 4.0 © Institut Cartogràfic Valencià, Generalitat",
      "origen": "https://terramapas.icv.gva.es/0202_2023CVAL0025?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=2023CVAL0025_RGB&STYLES=&CRS=EPSG%3A4326&BBOX=38.679102%2C0.116208%2C38.683414%2C0.124494&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "adjudicacion": "2024-03-21",
    "finPrevisto": "2024-04-11",
    "veredicto": "posterior"
  },
  "OBRA-20": {
    "caja": [
      38.681236,
      0.117128,
      38.69022,
      0.13439
    ],
    "metrosAncho": 1500,
    "ahora": {
      "src": "/aerea/OBRA-20-ahora.webp",
      "fecha": "2024-06",
      "ventana": null,
      "fuente": "PNOA (IGN)",
      "capa": "OI.OrthoimageCoverage",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de PNOA 2024 CC-BY 4.0 scne.es",
      "origen": "https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG%3A4326&BBOX=38.681236%2C0.117128%2C38.69022%2C0.13439&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "antes": {
      "src": "/aerea/OBRA-20-antes.webp",
      "fecha": "2023",
      "ventana": [
        "2023-04-16",
        "2023-08-06"
      ],
      "fuente": "Ortofoto ICV",
      "capa": "2023CVAL0025_RGB",
      "resolucionM": 0.25,
      "atribucion": "Obra derivada de Ortofoto 2023 CC BY 4.0 © Institut Cartogràfic Valencià, Generalitat",
      "origen": "https://terramapas.icv.gva.es/0202_2023CVAL0025?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=2023CVAL0025_RGB&STYLES=&CRS=EPSG%3A4326&BBOX=38.681236%2C0.117128%2C38.69022%2C0.13439&WIDTH=720&HEIGHT=480&FORMAT=image%2Fjpeg"
    },
    "adjudicacion": "2023-11-21",
    "finPrevisto": "2023-12-21",
    "veredicto": "posterior"
  }
};
