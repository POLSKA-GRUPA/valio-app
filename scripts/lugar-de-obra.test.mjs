/**
 * lugar-de-obra.test.mjs — Tests del extractor de lugar de ejecución.
 *
 * Puros, sin red: fuentes sintéticas. Ejecutar con:
 *   node --test scripts/lugar-de-obra.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { claveObra, lugarDelTitulo } from "./lugar-del-titulo.mjs";
import {
  claveEjecucion,
  conComaDelPortal,
  elegirUbicacion,
  esResultadoValido,
  lugarDeEjecucion,
  municipioEquivale,
  opcionesDeObra,
  paisEspanol,
} from "./lugar-de-obra.mjs";

const EJECUCION = (direccion, municipio = "Teulada", pais = "España") => ({ direccion, municipio, pais });

// --- país -------------------------------------------------------------------

test("país extranjero: sin opción de ejecución", () => {
  assert.equal(paisEspanol("Polonia"), false);
  assert.equal(paisEspanol("PL"), false);
  assert.equal(paisEspanol("Deutschland"), false);
  assert.equal(lugarDeEjecucion(EJECUCION("Calle Mayor 12", "Teulada", "Polonia"), "Teulada"), null);
});

test("país vacío o España: vale (documentado: PLACE publica contratos españoles)", () => {
  assert.equal(paisEspanol(""), true);
  assert.equal(paisEspanol(undefined), true);
  assert.equal(paisEspanol("España"), true);
  assert.equal(paisEspanol("ES"), true);
  assert.equal(paisEspanol("Reino de España"), true);
  const sinPais = lugarDeEjecucion({ direccion: "Calle Mayor 12", municipio: "Teulada" }, "Teulada");
  assert.ok(sinPais, "sin país explícito debe extraer la dirección");
});

// --- municipio (CityName) -----------------------------------------------------

test("municipio del anuncio distinto del de la obra: sin opción", () => {
  assert.equal(municipioEquivale("Benidorm", "Teulada"), false);
  assert.equal(lugarDeEjecucion(EJECUCION("Calle Mayor 12", "Benidorm"), "Teulada"), null);
});

test("municipio invertido y bilingüe: equivalen", () => {
  assert.equal(municipioEquivale("Les Alqueries", "Alqueries, les"), true);
  assert.equal(municipioEquivale("Alqueries, les", "Les Alqueries"), true);
  assert.equal(municipioEquivale("Alicante", "Alacant/Alicante"), true);
  assert.equal(municipioEquivale("Alacant", "Alacant/Alicante"), true);
  assert.equal(municipioEquivale("València", "Valencia/València"), true);
  assert.ok(lugarDeEjecucion(EJECUCION("Calle Mayor 12", "Alicante"), "Alacant/Alicante"));
});

test("municipio ausente o vacío: sin opción (no se puede confirmar la equivalencia)", () => {
  assert.equal(municipioEquivale("", "Teulada"), false);
  assert.equal(lugarDeEjecucion(EJECUCION("Calle Mayor 12", ""), "Teulada"), null);
  assert.equal(lugarDeEjecucion({ direccion: "Calle Mayor 12" }, "Teulada"), null);
});

// --- dirección ---------------------------------------------------------------

test("dirección incompleta (solo el tipo, sin nombre): sin opción", () => {
  assert.equal(lugarDeEjecucion(EJECUCION("Calle"), "Teulada"), null);
  assert.equal(lugarDeEjecucion(EJECUCION("C/"), "Teulada"), null);
  assert.equal(lugarDeEjecucion(EJECUCION("avda."), "Teulada"), null);
});

test("dirección genérica: sin opción (las que describen, no las que nombran)", () => {
  assert.equal(lugarDeEjecucion(EJECUCION("Calle Municipal"), "Teulada"), null);
  assert.equal(lugarDeEjecucion(EJECUCION("Calle Acceso"), "Teulada"), null);
  // Ojo: «Calle Principal» SÍ vale a propósito: «Principal» nombra la vía en
  // muchísimos municipios (misma regla que para los títulos).
});

test("dirección múltiple: sin opción (aunque cada una sea válida)", () => {
  assert.equal(lugarDeEjecucion(EJECUCION("Calle Mayor y Calle Menor"), "Teulada"), null);
  assert.equal(lugarDeEjecucion(EJECUCION("Calle Mayor con Avenida del Mar"), "Teulada"), null);
});

test("dirección sin tipo de vía delante: sin opción", () => {
  assert.equal(lugarDeEjecucion(EJECUCION("Rehabilitación en Calle Mayor 12"), "Teulada"), null);
  assert.equal(lugarDeEjecucion(EJECUCION("Polígono 5, parcela 12"), "Teulada"), null);
});

test("dirección válida: lugar con tipo, nombre y consulta en minúsculas", () => {
  const l = lugarDeEjecucion(EJECUCION("C/ Padre Esplá, 18"), "Teulada");
  assert.deepEqual(l, { tipo: "calle", nivel: "calle", nombre: "padre espla", consulta: "calle padre espla 18", consultaVia: "calle padre espla", portal: 18 });
});

// --- portal ------------------------------------------------------------------

test("portal pegado al nombre: se extrae («calle Mayor 12» → portal 12)", () => {
  const l = lugarDeEjecucion(EJECUCION("calle Mayor 12"), "Teulada");
  assert.equal(l.portal, 12);
  assert.equal(l.consulta, "calle mayor 12");
  assert.equal(l.consultaVia, "calle mayor");
});

test("conComaDelPortal: conservador, solo si acaba en número", () => {
  assert.equal(conComaDelPortal("calle Mayor 12"), "calle Mayor, 12");
  assert.equal(conComaDelPortal("Calle Mayor, 12"), "Calle Mayor, 12");
  assert.equal(conComaDelPortal("Calle Mayor"), "Calle Mayor");
  assert.equal(conComaDelPortal("Calle Mayor 12 3ºB"), "Calle Mayor 12 3ºB");
  assert.equal(conComaDelPortal("Calle 12 de Octubre"), "Calle 12 de Octubre");
});

// --- claves ------------------------------------------------------------------

test("claves distintas por fuente: título y ejecución nunca comparten clave", () => {
  const a = claveObra("03128-abc", "03128", "calle mayor 12");
  const b = claveEjecucion("03128-abc", "03128", "calle mayor 12");
  assert.notEqual(a, b);
  assert.equal(b, claveEjecucion("03128-abc", "03128", "calle mayor 12"), "estable entre llamadas");
  assert.notEqual(claveEjecucion("03128-abc", "03128", "calle mayor 12"), claveEjecucion("03128-abc", "03128", "calle menor 12"));
});

test("la clave de título se preserva: la caché de 13.590 entradas sigue sirviendo", () => {
  const obra = { id: "03128-abc", nombre: "Reforma de la calle Ceres", lugarEjecucion: EJECUCION("Calle Mayor 12") };
  const [titulo] = opcionesDeObra("03128", obra, "Teulada");
  const esperada = claveObra("03128-abc", "03128", lugarDelTitulo(obra.nombre, "Teulada").consulta);
  assert.equal(titulo.origen, "titulo");
  assert.equal(titulo.clave, esperada);
});

// --- opciones ----------------------------------------------------------------

test("opcionesDeObra: título primero, ejecución de fallback detrás", () => {
  const ambas = opcionesDeObra("03128", { id: "x1", nombre: "Reforma de la calle Ceres", lugarEjecucion: EJECUCION("Calle Mayor 12") }, "Teulada");
  assert.deepEqual(ambas.map((o) => o.origen), ["titulo", "ejecucion"]);

  const soloTitulo = opcionesDeObra("03128", { id: "x2", nombre: "Reforma de la calle Ceres" }, "Teulada");
  assert.deepEqual(soloTitulo.map((o) => o.origen), ["titulo"]);

  const soloEjecucion = opcionesDeObra("03128", { id: "x3", nombre: "Suministro de material escolar", lugarEjecucion: EJECUCION("Calle Mayor 12") }, "Teulada");
  assert.deepEqual(soloEjecucion.map((o) => o.origen), ["ejecucion"]);

  const ninguna = opcionesDeObra("03128", { id: "x4", nombre: "Servicio de limpieza viaria", lugarEjecucion: EJECUCION("Calle Mayor y Calle Menor") }, "Teulada");
  assert.deepEqual(ninguna, []);
});

// --- selección (fallback y conflicto) ----------------------------------------

const PUNTO = (lat, lon, extra = {}) => ({ lat, lon, precision: "calle", consulta: "calle mayor", ...extra });
// 0,005° de longitud a 38,5° ≈ 435 m; 0,001° ≈ 87 m.
const CERCA = PUNTO(38.5, -0.1);
const LEJOS = PUNTO(38.5, -0.095);

test("esResultadoValido: sinResultado, coordenadas no finitas o nivel raro no valen", () => {
  assert.equal(esResultadoValido(CERCA), true);
  assert.equal(esResultadoValido({ sinResultado: true, motivo: "x" }), false);
  assert.equal(esResultadoValido(PUNTO(NaN, -0.1)), false);
  assert.equal(esResultadoValido(PUNTO(38.5, -0.1, { precision: "municipio" })), false);
  assert.equal(esResultadoValido(null), false);
});

test("salto de fallback: título sin resolver → punto del anuncio (origen ejecucion)", () => {
  const r = elegirUbicacion({ sinResultado: true, motivo: "ningún candidato" }, CERCA);
  assert.equal(r.origen, "ejecucion");
  assert.equal(r.lat, 38.5);
  const sinNada = elegirUbicacion(null, CERCA);
  assert.equal(sinNada.origen, "ejecucion");
});

test("título resuelto manda; anuncio resuelto cerca no lo desbanca", () => {
  const r = elegirUbicacion(CERCA, PUNTO(38.5, -0.1 + 0.001));
  assert.equal(r.origen, "titulo");
  const soloTitulo = elegirUbicacion(CERCA, null);
  assert.equal(soloTitulo.origen, "titulo");
});

test("conflicto: ambos resueltos a más de 300 m → no se sitúa (null)", () => {
  assert.equal(elegirUbicacion(CERCA, LEJOS), null);
  assert.equal(elegirUbicacion(LEJOS, CERCA), null);
});

test("ninguno resuelto → null", () => {
  assert.equal(elegirUbicacion(null, null), null);
  assert.equal(elegirUbicacion({ sinResultado: true, motivo: "x" }, { sinResultado: true, motivo: "y" }), null);
});

test("ejecución exige dirección completa: no listas, rangos, sufijos o colas", () => {
  for (const direccion of ["Calle Mayor y Menor", "Calle Mayor 12 y 40", "Calle Mayor 12-40", "Calle Mayor 12/40", "Calle Mayor 12B", "Calle Mayor, 12B", "Calle Mayor nº 12B", "Calle Mayor 12 bis", "Calle Mayor, 12 bis", "Calle Mayor 12, Teulada", "Calle Mayor, 12, 3ºB", "Calle Mayor, s/n"]) {
    assert.equal(lugarDeEjecucion(EJECUCION(direccion), "Teulada"), null, direccion);
  }
});

test("ejecución mantiene portal simple y nombres compuestos conocidos", () => {
  for (const direccion of ["Calle Mayor 12", "Calle Mayor, 12", "Calle Mayor nº 12", "Calle Ramón y Cajal 12"]) {
    assert.equal(lugarDeEjecucion(EJECUCION(direccion), "Teulada")?.portal, 12, direccion);
  }
});

test("municipio del anuncio no puede contener otra localidad", () => {
  assert.equal(municipioEquivale("Teulada/Benissa", "Teulada"), false);
  assert.equal(lugarDeEjecucion(EJECUCION("Calle Mayor 12", "Teulada/Benissa"), "Teulada"), null);
  assert.equal(municipioEquivale("Alacant/Alicante", "Alicante/Alacant"), true);
  assert.equal(municipioEquivale("Alicante/Benissa", "Alicante/Alacant"), false);
});

test("ejecución no admite ningún separador o terminador que truncaría el nombre", () => {
  for (const cola of [" - Menor", ". Menor", ": Menor", " «Menor»", " para Menor", " por Menor", " cap Menor", " incluida Menor", " situada Menor", " ubicada Menor"]) {
    const direccion = `Calle Mayor${cola}`;
    assert.equal(lugarDeEjecucion(EJECUCION(direccion), "Teulada"), null, direccion);
  }
});

test("ejecución fuera del municipio invalida también un título homónimo", () => {
  const obra = { id: "prueba", nombre: "Reforma de la calle Mayor" };
  assert.equal(opcionesDeObra("03128", obra, "Teulada").length, 1);
  for (const l of [EJECUCION("Calle Mayor 12", "Benissa", "ES"), EJECUCION("Calle Mayor 12", "Teulada/Benissa", "ES"), EJECUCION("Calle Mayor 12", "Teulada", "PL")]) {
    assert.deepEqual(opcionesDeObra("03128", { ...obra, lugarEjecucion: l }, "Teulada"), []);
  }
  assert.equal(opcionesDeObra("03128", { ...obra, lugarEjecucion: EJECUCION("Calle Mayor 12", "Teulada", "ES") }, "Teulada").length, 2);
});
