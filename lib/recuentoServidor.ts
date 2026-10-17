import { createHash } from "node:crypto";
import { OBRAS } from "./obras";
import { recuentoVacio, valoresDe, type Cambio, type RecuentoObra } from "./recuento";

/**
 * Almacén del recuento. En producción, Redis por REST (Upstash, región
 * Fráncfort). Sin credenciales y fuera de producción, memoria del proceso:
 * sirve para desarrollo y para la UAT local.
 *
 * Claves:
 *   r:<obra>        hash con v:<voto> y s:<señal> → contador
 *   l:<huella>      cambios de esa huella hoy (caduca a las 24 h)
 * La huella es sha256(sal + día + IP): no se guarda la IP y la sal cambia
 * cada día, así que no se puede seguir a nadie de un día a otro.
 */

const URL_REDIS = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const TOKEN_REDIS = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const SAL = process.env.RECUENTO_SAL ?? TOKEN_REDIS ?? "desarrollo";

/** Cambios por huella y día. Un vecino que vota todo el mazo y rectifica no llega. */
export const LIMITE_DIARIO = 300;

const IDS = new Set(OBRAS.map((o) => o.id));

export const disponible = () =>
  Boolean(URL_REDIS && TOKEN_REDIS) || process.env.NODE_ENV !== "production" || process.env.RECUENTO_MEMORIA === "1";

type Comando = (string | number)[];

const memoria = new Map<string, Map<string, number>>();

async function redis(comandos: Comando[]): Promise<unknown[]> {
  if (!URL_REDIS || !TOKEN_REDIS) return comandos.map(enMemoria);
  const res = await fetch(`${URL_REDIS}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN_REDIS}` },
    body: JSON.stringify(comandos),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const datos = (await res.json()) as { result?: unknown; error?: string }[];
  return datos.map((d) => {
    if (d.error) throw new Error(d.error);
    return d.result;
  });
}

/** Lo justo de Redis para desarrollo: HINCRBY, HSET, HGETALL, INCR y EXPIRE. */
function enMemoria([op, clave, ...args]: Comando): unknown {
  const h = memoria.get(String(clave)) ?? new Map<string, number>();
  memoria.set(String(clave), h);
  switch (String(op).toUpperCase()) {
    case "HINCRBY": {
      const n = (h.get(String(args[0])) ?? 0) + Number(args[1]);
      h.set(String(args[0]), n);
      return n;
    }
    case "HSET":
      h.set(String(args[0]), Number(args[1]));
      return 1;
    case "HGETALL":
      return [...h.entries()].flatMap(([k, v]) => [k, String(v)]);
    case "INCR": {
      const n = (h.get("") ?? 0) + 1;
      h.set("", n);
      return n;
    }
    default:
      return 1;
  }
}

export function huella(ip: string): string {
  const dia = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${SAL}|${dia}|${ip}`).digest("hex").slice(0, 32);
}

/** null si el cambio no es válido. */
export function validarCambio(raw: unknown): Cambio | null {
  if (!raw || typeof raw !== "object") return null;
  const { obra, tipo, valor, anterior } = raw as Record<string, unknown>;
  if (typeof obra !== "string" || !IDS.has(obra)) return null;
  if (tipo !== "voto" && tipo !== "senal") return null;
  const validos = valoresDe(tipo);
  const ok = (v: unknown) => v === null || (typeof v === "string" && validos.includes(v));
  if (!ok(valor) || !ok(anterior) || valor === anterior) return null;
  return { obra, tipo, valor: valor as string | null, anterior: anterior as string | null };
}

/** Cuenta cuántos cambios lleva hoy esta huella; true si aún puede. */
export async function dentroDelLimite(h: string, cuantos: number): Promise<boolean> {
  const clave = `l:${h}`;
  const comandos: Comando[] = [];
  for (let i = 0; i < cuantos; i++) comandos.push(["INCR", clave]);
  comandos.push(["EXPIRE", clave, 86400]);
  const r = await redis(comandos);
  return Number(r[cuantos - 1]) <= LIMITE_DIARIO;
}

const campo = (c: Cambio, v: string) => `${c.tipo === "voto" ? "v" : "s"}:${v}`;

export async function aplicar(cambios: Cambio[]): Promise<void> {
  const comandos: Comando[] = [];
  for (const c of cambios) {
    if (c.anterior) comandos.push(["HINCRBY", `r:${c.obra}`, campo(c, c.anterior), -1]);
    if (c.valor) comandos.push(["HINCRBY", `r:${c.obra}`, campo(c, c.valor), 1]);
  }
  const r = await redis(comandos);
  // Un contador no baja de cero (un cliente con datos viejos podría restar
  // lo que ya no estaba): se corrige en el sitio.
  const arreglos: Comando[] = [];
  r.forEach((n, i) => {
    if (Number(n) < 0) arreglos.push(["HSET", String(comandos[i][1]), String(comandos[i][2]), 0]);
  });
  if (arreglos.length) await redis(arreglos);
}

export async function leer(ids: string[]): Promise<Record<string, RecuentoObra>> {
  const validos = ids.filter((id) => IDS.has(id));
  const r = await redis(validos.map((id) => ["HGETALL", `r:${id}`]));
  const out: Record<string, RecuentoObra> = {};
  validos.forEach((id, i) => {
    const rec = recuentoVacio();
    const plano = (r[i] as string[] | null) ?? [];
    for (let k = 0; k < plano.length; k += 2) {
      const [tipo, valor] = plano[k].split(":");
      const n = Math.max(0, Number(plano[k + 1]) || 0);
      if (tipo === "v" && valor in rec.votos) rec.votos[valor as keyof RecuentoObra["votos"]] = n;
      if (tipo === "s" && valor in rec.senales) rec.senales[valor as keyof RecuentoObra["senales"]] = n;
    }
    out[id] = rec;
  });
  return out;
}
