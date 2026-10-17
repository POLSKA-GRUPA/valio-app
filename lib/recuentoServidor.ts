import { createHash } from "node:crypto";
import { OBRAS } from "./obras";
import { IDS_NACIONALES } from "./ids-nacionales";
import { RECIBO, recuentoVacio, valoresDe, type Cambio, type RecuentoObra } from "./recuento";

/**
 * Almacén del recuento. En producción, Redis por REST (Upstash, región
 * Fráncfort). Sin credenciales y fuera de producción, memoria del proceso:
 * sirve para desarrollo y para la UAT local.
 *
 * Claves:
 *   r:<obra>        hash con v:<voto> y s:<señal> → contador
 *   c:<sha256>      lo que cuenta un recibo (sha256 de recibo|obra|tipo)
 *   l:<huella>      cambios de esa huella hoy (caduca a las 24 h)
 * La huella es sha256(sal + día + IP): no se guarda la IP, y como el día
 * entra en el hash, no se puede seguir a nadie de un día a otro. La sal es
 * secreta y fija (RECUENTO_SAL); sin ella no se calcula la huella de una IP.
 */

const URL_REDIS = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const TOKEN_REDIS = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const PRODUCCION = process.env.NODE_ENV === "production" && process.env.RECUENTO_MEMORIA !== "1";
// `||` y no `??`: una sal vacía no es una sal. En producción no hay valor por defecto.
const SAL = process.env.RECUENTO_SAL || (PRODUCCION ? "" : "desarrollo");

/** Cambios por huella y día. Un vecino que vota todo el mazo y rectifica no llega. */
export const LIMITE_DIARIO = 300;

// Piloto y carga nacional: solo se cuentan votos a obras que la app publica.
const IDS = new Set([...OBRAS.map((o) => o.id), ...IDS_NACIONALES]);

/** En producción hacen falta Redis y una sal de verdad (32+ caracteres). */
export const disponible = () => !PRODUCCION || Boolean(URL_REDIS && TOKEN_REDIS && SAL.length >= 32);

type Comando = (string | number)[];

const memoria = new Map<string, Map<string, number>>();
const recibosEnMemoria = new Map<string, string>();

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

/** Lo justo de Redis para desarrollo: HINCRBY, HSET, HGETALL, INCR, EXPIRE y el script de abajo. */
function enMemoria([op, clave, ...args]: Comando): unknown {
  // EVAL: [script, nº claves, c:<recibo>, r:<obra>, prefijo, valor]
  if (String(op).toUpperCase() === "EVAL")
    return aplicarEnMemoria(String(args[1]), String(args[2]), String(args[3]), String(args[4]));
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
  const { obra, tipo, valor, recibo } = raw as Record<string, unknown>;
  if (typeof obra !== "string" || !IDS.has(obra)) return null;
  if (tipo !== "voto" && tipo !== "senal") return null;
  if (typeof recibo !== "string" || !RECIBO.test(recibo)) return null;
  if (!(valor === null || (typeof valor === "string" && valoresDe(tipo).includes(valor)))) return null;
  return { obra, tipo, valor: valor as string | null, recibo };
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

/**
 * Deja el recibo contando `valor` (o nada), en un solo paso atómico: resta lo
 * que contaba antes, suma lo nuevo y guarda el estado del recibo. Repetirlo
 * no cambia nada, y un contador nunca baja de cero ni pisa sumas ajenas.
 * KEYS: c:<recibo>, r:<obra> · ARGV: prefijo (v|s), valor ("" = quitar).
 */
const SCRIPT = `
local antes = redis.call('GET', KEYS[1]) or ''
if antes == ARGV[2] then return 0 end
if antes ~= '' then
  local campo = ARGV[1] .. ':' .. antes
  if redis.call('HINCRBY', KEYS[2], campo, -1) < 0 then redis.call('HSET', KEYS[2], campo, 0) end
end
if ARGV[2] ~= '' then
  redis.call('HINCRBY', KEYS[2], ARGV[1] .. ':' .. ARGV[2], 1)
  redis.call('SET', KEYS[1], ARGV[2])
else
  redis.call('DEL', KEYS[1])
end
return 1`;

/** El mismo script, para el almacén en memoria (un solo hilo: ya es atómico). */
function aplicarEnMemoria(claveRecibo: string, claveObra: string, prefijo: string, valor: string): number {
  const antes = recibosEnMemoria.get(claveRecibo) ?? "";
  if (antes === valor) return 0;
  const h = memoria.get(claveObra) ?? new Map<string, number>();
  memoria.set(claveObra, h);
  if (antes) h.set(`${prefijo}:${antes}`, Math.max(0, (h.get(`${prefijo}:${antes}`) ?? 0) - 1));
  if (valor) {
    h.set(`${prefijo}:${valor}`, (h.get(`${prefijo}:${valor}`) ?? 0) + 1);
    recibosEnMemoria.set(claveRecibo, valor);
  } else recibosEnMemoria.delete(claveRecibo);
  return 1;
}

/** El recibo se guarda con hash y atado a su obra y tipo: no sirve para otra. */
const claveRecibo = (c: Cambio) =>
  `c:${createHash("sha256").update(`${c.recibo}|${c.obra}|${c.tipo}`).digest("hex").slice(0, 40)}`;

export async function aplicar(cambios: Cambio[]): Promise<void> {
  await redis(
    cambios.map((c) => ["EVAL", SCRIPT, 2, claveRecibo(c), `r:${c.obra}`, c.tipo === "voto" ? "v" : "s", c.valor ?? ""]),
  );
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
