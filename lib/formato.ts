// Formato de cifras para la UI (es-ES). Importado por Deck, DetailSheet y Panels.
// El detalle exacto (decimales completos) se muestra en la ficha; la tarjeta
// usa el formato compacto.

const fEUR0 = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const fEUR2 = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 38244 → "38.244 €" (tarjeta y cifras protagonistas). */
export function eurosCompactos(n: number): string {
  return fEUR0.format(n);
}

/** 38244.5 → "38.244,50 €" (ficha, importes exactos). */
export function euros(n: number): string {
  return fEUR2.format(n);
}

/** 2.96 → "2,96 € por vecino" (coste por habitante redondeado a céntimos). */
export function costeVecino(n: number): string {
  return `${fEUR2.format(n)} por vecino`;
}
