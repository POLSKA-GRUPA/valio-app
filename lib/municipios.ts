import { OBRAS, type Obra } from "./obras";

export interface Municipio {
  nombre: string;
  provincia: string;
  numObras: number;
}

/**
 * Municipios que salen de los datos, no de una lista a mano: si mañana
 * valio-datos trae obras de otro municipio, aparece solo en «¿Dónde vives?».
 */
export const MUNICIPIOS: Municipio[] = Array.from(
  OBRAS.reduce((mapa, obra) => {
    const actual = mapa.get(obra.municipio);
    if (actual) actual.numObras += 1;
    else mapa.set(obra.municipio, { nombre: obra.municipio, provincia: obra.provincia, numObras: 1 });
    return mapa;
  }, new Map<string, Municipio>()).values(),
).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

export function existeMunicipio(nombre: string): boolean {
  return MUNICIPIOS.some((m) => m.nombre === nombre);
}

export function obrasDe(municipio: string | null): Obra[] {
  return municipio ? OBRAS.filter((o) => o.municipio === municipio) : [];
}
