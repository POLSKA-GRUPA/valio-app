import { test } from "node:test";
import assert from "node:assert/strict";
import { tipoDe, CATEGORIAS } from "../tipo-obra.mjs";

/**
 * Tests del clasificador de tipos de obra (scripts/tipo-obra.mjs).
 * Ejecutar: node --test scripts/tests/
 *
 * Reglas del encargo:
 *  - CPV principal (el primero del array) manda; los secundarios se ignoran.
 *  - Lo específico gana a lo genérico (prefijo más largo).
 *  - CPV genérico o desconocido → heurística por título (la de siempre) → urbanismo.
 */

const neutro = "Obras de acondicionamiento"; // título sin pista para la heurística

test("la heurística por título se mantiene intacta (las 7 categorías)", () => {
  assert.equal(tipoDe("Nueva comisaría de policía local"), "seguridad");
  assert.equal(tipoDe("Renovación de la red de abastecimiento de agua"), "medio ambiente");
  assert.equal(tipoDe("Cubierta de pista de pádel"), "deporte");
  assert.equal(tipoDe("Reforma del colegio público"), "educacion");
  assert.equal(tipoDe("Restauración de la iglesia de San Jaime"), "patrimonio");
  assert.equal(tipoDe("Jardinería en zona verde"), "parques");
  assert.equal(tipoDe("Asfaltado de la Avinguda d'Alacant"), "urbanismo");
});

test("'parque de bomberos' sigue siendo seguridad, no parques (lookahead heredado)", () => {
  assert.equal(tipoDe("Ampliación del parque de bomberos"), "seguridad");
});

test("sin CPV (vacío, null o undefined) cae a la heurística por título", () => {
  assert.equal(tipoDe("Piscina municipal", []), "deporte");
  assert.equal(tipoDe("Piscina municipal", null), "deporte");
  assert.equal(tipoDe("Piscina municipal", undefined), "deporte");
  assert.equal(tipoDe(neutro, []), "urbanismo");
});

test("CPV desconocido cae a la heurística por título", () => {
  assert.equal(tipoDe("Piscina municipal", ["99999999"]), "deporte");
  assert.equal(tipoDe(neutro, ["99999999"]), "urbanismo");
});

test("CPV genérico cae a la heurística por título (no clasifica por división)", () => {
  // 45000000 «Trabajos de construcción»: demasiado amplio para decidir.
  assert.equal(tipoDe("Piscina municipal", ["45000000"]), "deporte");
  assert.equal(tipoDe(neutro, ["45000000"]), "urbanismo");
  assert.equal(tipoDe(neutro, ["45200000"]), "urbanismo");
  // 45230000 mezcla tuberías de agua (medio ambiente) con líneas eléctricas y
  // de comunicación (urbanismo): el genérico no decide.
  assert.equal(tipoDe(neutro, ["45230000"]), "urbanismo");
  assert.equal(tipoDe("Nueva depuradora", ["45230000"]), "medio ambiente");
});

test("código de 8 dígitos y con dígito de control dan lo mismo", () => {
  assert.equal(tipoDe(neutro, ["45112730"]), tipoDe(neutro, ["45112730-1"]));
  assert.equal(tipoDe(neutro, [" 45112730 - 1 "]), tipoDe(neutro, ["45112730"]));
  assert.equal(tipoDe(neutro, ["45112730-1"]), "urbanismo"); // paisajismo en carreteras
});

test("el CPV específico gana al título contradictorio", () => {
  // El título dice paisajismo (heurística → parques); el CPV oficial dice que
  // es paisajismo EN CARRETERA: urbanismo.
  assert.equal(tipoDe("Paisajismo y ajardinamiento en la N-340", ["45112730"]), "urbanismo");
  assert.equal(tipoDe("Ajardinamiento del entorno del aeropuerto", ["45112740"]), "urbanismo");
  assert.equal(tipoDe("Paisajismo del cementerio municipal", ["45112714"]), "urbanismo");
  // Al revés: el título no dice nada de cultura y el CPV sí (museo → patrimonio).
  assert.equal(tipoDe(neutro, ["45212313"]), "patrimonio");
});

test("falsos amigos del título corregidos por CPV específico", () => {
  // «calle Biblioteca» / «Callejero Colegio»: el título engaña (la heurística
  // heredada diría educacion), el CPV vial (45233252 pavimentación de calles)
  // manda: urbanismo.
  assert.equal(tipoDe("Peatonalización de la calle Biblioteca", ["45233252"]), "urbanismo");
  // «puerto DEPORTIVO» no es una instalación deportiva: 45242200 es un puerto
  // de yates (ingeniería civil) y la heurística por título sola se equivoca.
  assert.equal(tipoDe("Ampliación del puerto deportivo", []), "deporte"); // límite heredado
  assert.equal(tipoDe("Ampliación del puerto deportivo", ["45242200"]), "urbanismo");
});

test("los CPV secundarios no clasifican (solo el principal)", () => {
  // Obra vial con CPV secundario de museo: sigue siendo urbanismo.
  assert.equal(tipoDe(neutro, ["45233140", "45212312"]), "urbanismo");
  // Principal genérico + secundario de depuradora: el genérico no decide y el
  // secundario NO vale: cae al título.
  assert.equal(tipoDe(neutro, ["45230000", "45232420"]), "urbanismo");
  assert.equal(tipoDe("Ampliación de la depuradora", ["45230000", "45232420"]), "medio ambiente");
});

test("no todo 451127 es parque: la familia de paisajismo se reparte", () => {
  assert.equal(tipoDe(neutro, ["45112711"]), "parques"); // paisajismo en parques
  assert.equal(tipoDe(neutro, ["45112712"]), "parques"); // paisajismo en jardines
  assert.equal(tipoDe(neutro, ["45112713"]), "parques"); // jardines de terraza
  assert.equal(tipoDe(neutro, ["45112723"]), "parques"); // parques infantiles
  assert.equal(tipoDe(neutro, ["45112720"]), "deporte"); // zonas deportivas
  assert.equal(tipoDe(neutro, ["45112721"]), "deporte"); // campos de golf
  assert.equal(tipoDe(neutro, ["45112714"]), "urbanismo"); // cementerios
  assert.equal(tipoDe(neutro, ["45112730"]), "urbanismo"); // carreteras y autopistas
  assert.equal(tipoDe(neutro, ["45112740"]), "urbanismo"); // aeropuertos
});

test("no todo 4523 es medio ambiente: solo el agua y el alcantarillado", () => {
  assert.equal(tipoDe(neutro, ["45231300"]), "medio ambiente"); // tuberías de agua
  assert.equal(tipoDe(neutro, ["45232400"]), "medio ambiente"); // alcantarillado
  assert.equal(tipoDe(neutro, ["45232100"]), "medio ambiente"); // tuberías de agua
  assert.equal(tipoDe(neutro, ["45231600"]), "urbanismo"); // líneas de comunicación
  assert.equal(tipoDe(neutro, ["45232300"]), "urbanismo"); // líneas telefónicas
  assert.equal(tipoDe(neutro, ["45231400"]), "urbanismo"); // líneas eléctricas
  assert.equal(tipoDe(neutro, ["45231220"]), "urbanismo"); // gasoducto
  // Excepción dentro de las tuberías de agua: la calefacción urbana no es agua.
  assert.equal(tipoDe(neutro, ["45232140"]), "urbanismo"); // redes de calefacción urbana
});

test("edificios docentes y bibliotecas → educacion", () => {
  assert.equal(tipoDe(neutro, ["45214000"]), "educacion"); // enseñanza e investigación
  assert.equal(tipoDe(neutro, ["45214200"]), "educacion"); // edificios escolares
  assert.equal(tipoDe(neutro, ["45214400"]), "educacion"); // universitarios
  assert.equal(tipoDe(neutro, ["45212330"]), "educacion"); // bibliotecas
  assert.equal(tipoDe(neutro, ["45212331"]), "educacion"); // bibliotecas multimedia
});

test("equipamiento cultural → patrimonio", () => {
  assert.equal(tipoDe(neutro, ["45212313"]), "patrimonio"); // museos
  assert.equal(tipoDe(neutro, ["45212314"]), "patrimonio"); // monumentos históricos
  assert.equal(tipoDe(neutro, ["45212322"]), "patrimonio"); // teatros
  assert.equal(tipoDe(neutro, ["45212353"]), "patrimonio"); // palacios
  assert.equal(tipoDe(neutro, ["45212354"]), "patrimonio"); // castillos
  assert.equal(tipoDe(neutro, ["45212360"]), "patrimonio"); // edificios religiosos
  assert.equal(tipoDe(neutro, ["45112450"]), "patrimonio"); // yacimientos arqueológicos
  assert.equal(tipoDe(neutro, ["45454100"]), "patrimonio"); // trabajos de restauración
});

test("instalaciones deportivas → deporte", () => {
  assert.equal(tipoDe(neutro, ["45212200"]), "deporte");
  assert.equal(tipoDe(neutro, ["45212212"]), "deporte"); // piscinas
  assert.equal(tipoDe(neutro, ["45212225"]), "deporte"); // polideportivos
  assert.equal(tipoDe(neutro, ["45212290"]), "deporte"); // mantenimiento de instalaciones deportivas
  assert.equal(tipoDe(neutro, ["45236100"]), "deporte"); // explanación de campos de deporte
});

test("seguridad por CPV", () => {
  assert.equal(tipoDe(neutro, ["45216111"]), "seguridad"); // comisarías de policía
  assert.equal(tipoDe(neutro, ["45216121"]), "seguridad"); // cuarteles de bomberos
  assert.equal(tipoDe(neutro, ["45316212"]), "seguridad"); // semáforos
  assert.equal(tipoDe(neutro, ["45312200"]), "seguridad"); // alarmas antirrobo
  assert.equal(tipoDe(neutro, ["45343000"]), "seguridad"); // protección contra incendios
});

test("medio ambiente por CPV", () => {
  assert.equal(tipoDe(neutro, ["45222100"]), "medio ambiente"); // plantas de residuos
  assert.equal(tipoDe(neutro, ["45222110"]), "medio ambiente"); // vertederos
  assert.equal(tipoDe(neutro, ["45232420"]), "medio ambiente"); // depuradoras
  assert.equal(tipoDe(neutro, ["45252000"]), "medio ambiente"); // plantas depuradoras
  assert.equal(tipoDe(neutro, ["45243400"]), "medio ambiente"); // consolidación de playas
  assert.equal(tipoDe(neutro, ["45247000"]), "medio ambiente"); // presas, canales, acequias
  assert.equal(tipoDe(neutro, ["45112340"]), "medio ambiente"); // descontaminación de suelos
  // 45243510 «obras de terraplenado» vive bajo «defensas marítimas» pero no es
  // obra costera por sí solo: cae al título.
  assert.equal(tipoDe(neutro, ["45243510"]), "urbanismo");
  assert.equal(tipoDe("Regeneración de playa", ["45243510"]), "medio ambiente");
});

test("conservación y mantenimiento genéricos caen al título", () => {
  // 45259000 «Reparación y mantenimiento de instalaciones»: genérico, no decide.
  assert.equal(tipoDe("Mantenimiento de instalaciones municipales", ["45259000"]), "urbanismo");
  // Si el título sí dice algo, el título manda en el fallback.
  assert.equal(tipoDe("Mantenimiento de piscina municipal", ["45259000"]), "deporte");
});

test("vialidad y grandes infraestructuras → urbanismo", () => {
  assert.equal(tipoDe(neutro, ["45233140"]), "urbanismo"); // obras viales
  assert.equal(tipoDe(neutro, ["45233222"]), "urbanismo"); // pavimentación y asfaltado
  assert.equal(tipoDe(neutro, ["45233252"]), "urbanismo"); // pavimentación de calles
  assert.equal(tipoDe(neutro, ["45234100"]), "urbanismo"); // ferrocarril
  assert.equal(tipoDe(neutro, ["45235100"]), "urbanismo"); // aeropuertos
  assert.equal(tipoDe(neutro, ["45213300"]), "urbanismo"); // edificios de transporte
  assert.equal(tipoDe(neutro, ["45215400"]), "urbanismo"); // cementerios (edificación)
  assert.equal(tipoDe(neutro, ["45236300"]), "urbanismo"); // explanación de cementerios
});

test("el resultado siempre es una de las 7 categorías", () => {
  for (const cpv of [null, [], ["45000000"], ["45212200"], ["99999999"], ["45233140-2"], ["abc"], [""]]) {
    assert.ok(CATEGORIAS.includes(tipoDe(neutro, cpv)), `cpv=${JSON.stringify(cpv)}`);
  }
});

test("pavimentos genéricos conservan el destino del título", () => {
  for (const codigo of ["45233200", "45233250", "45233251", "45233222", "45233228"]) {
    assert.equal(tipoDe("Mejora de accesibilidad en el patio del Colegio", [codigo]), "educacion");
    assert.equal(tipoDe("Renovación de pista deportiva", [codigo]), "deporte");
  }
  assert.equal(tipoDe("Pavimentación calle del Colegio", ["45233252"]), "urbanismo");
});

test("ocio genérico no borra parques infantiles ni rocódromos deportivos", () => {
  assert.equal(tipoDe("Instalación de juegos infantiles en el parque Huerto Peluca", ["45212100", "37535200"]), "parques");
  assert.equal(tipoDe("Rehabilitación de Parques Infantiles", ["45212140", "45112723"]), "parques");
  assert.equal(tipoDe("Rocódromo en Ciudad deportiva", ["45212100"]), "deporte");
});
