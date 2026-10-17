/**
 * ⚠️ ARCHIVO GENERADO — no editar a mano.
 * Regenerar con: node scripts/generar-nacional.mjs
 * Fuente: valio-datos/datos/nacional (dato oficial automático de PLACE) · 2026-10-17
 * Las obras de cada municipio están en public/datos/municipios/<ine>.json y
 * la app solo las descarga al elegir ese municipio.
 */

export interface PoblacionMunicipio {
  municipio: string;
  habitantes: number;
  referencia: string;
  fuenteNombre: string;
  fuenteUrl: string;
}

export interface MunicipioNacional {
  ine: string;
  nombre: string;
  provincia: string;
  numObras: number;
  poblacion: PoblacionMunicipio;
}

export const MUNICIPIOS_NACIONALES: MunicipioNacional[] = [
  {
    "ine": "03014",
    "nombre": "Alacant/Alicante",
    "provincia": "Alicante/Alacant",
    "numObras": 98,
    "poblacion": {
      "municipio": "Alacant/Alicante",
      "habitantes": 366221,
      "referencia": "01/01/2025",
      "fuenteNombre": "INE — Cifras oficiales del padrón (tabla 29005)",
      "fuenteUrl": "https://www.ine.es/jaxiT3/Tabla.htm?t=29005"
    }
  },
  {
    "ine": "03041",
    "nombre": "Benissa",
    "provincia": "Alicante/Alacant",
    "numObras": 39,
    "poblacion": {
      "municipio": "Benissa",
      "habitantes": 12471,
      "referencia": "01/01/2025",
      "fuenteNombre": "INE — Cifras oficiales del padrón (tabla 29005)",
      "fuenteUrl": "https://www.ine.es/jaxiT3/Tabla.htm?t=29005"
    }
  },
  {
    "ine": "28079",
    "nombre": "Madrid",
    "provincia": "Madrid",
    "numObras": 2715,
    "poblacion": {
      "municipio": "Madrid",
      "habitantes": 3506730,
      "referencia": "01/01/2025",
      "fuenteNombre": "INE — Cifras oficiales del padrón (tabla 29005)",
      "fuenteUrl": "https://www.ine.es/jaxiT3/Tabla.htm?t=29005"
    }
  },
  {
    "ine": "46250",
    "nombre": "València",
    "provincia": "Valencia/València",
    "numObras": 486,
    "poblacion": {
      "municipio": "València",
      "habitantes": 840792,
      "referencia": "01/01/2025",
      "fuenteNombre": "INE — Cifras oficiales del padrón (tabla 29005)",
      "fuenteUrl": "https://www.ine.es/jaxiT3/Tabla.htm?t=29005"
    }
  }
];
