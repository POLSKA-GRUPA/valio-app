#!/usr/bin/env node
/**
 * comprobar-datos-personales.mjs — Falla si el repo publica un DNI, NIE o
 * NIF de persona física (K/L/M). El repo es público: de una adjudicataria
 * persona física se muestra el nombre que da la fuente oficial, nunca su
 * documento. Los CIF de sociedades (letra de entidad) sí se permiten.
 *
 * Uso: node scripts/comprobar-datos-personales.mjs   (lo ejecuta la CI)
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// DNI (8 dígitos + letra), NIE (X/Y/Z + 7 dígitos + letra) y NIF K/L/M.
const DOCUMENTO_PERSONA = /\b(\d{8}[A-Z]|[XYZKLM]\d{7}[A-Z])\b/g;
const EXTENSIONES = /\.(ts|tsx|js|mjs|json|md|py|csv|txt|html)$/;
const IGNORAR = new Set(["package-lock.json"]);

const archivos = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter((f) => EXTENSIONES.test(f) && !IGNORAR.has(f));

const hallazgos = [];
for (const archivo of archivos) {
  readFileSync(archivo, "utf8")
    .split("\n")
    .forEach((linea, i) => {
      for (const m of linea.matchAll(DOCUMENTO_PERSONA)) {
        hallazgos.push(`${archivo}:${i + 1}: ${m[1].slice(0, 3)}…`);
      }
    });
}

if (hallazgos.length) {
  console.error("Documento de persona física en el repo público:");
  for (const h of hallazgos) console.error(`  ${h}`);
  process.exit(1);
}
console.log(`Sin documentos de persona física (${archivos.length} archivos).`);
