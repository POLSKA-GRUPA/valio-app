#!/usr/bin/env node
/**
 * MapLibre 6 carga sus teselas en un Web Worker (módulo ES) que importa
 * `./maplibre-gl-shared.mjs`. webpack no lo empaqueta, así que se sirven los dos
 * ficheros tal cual desde public/maplibre/ (misma versión que node_modules).
 * Se ejecuta antes de `dev` y de `build`; la carpeta no se versiona.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(raiz, "node_modules/maplibre-gl/dist");
const destino = resolve(raiz, "public/maplibre");
mkdirSync(destino, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(resolve(dist, f), resolve(destino, f));
}
console.log("✓ worker de MapLibre en public/maplibre/");
