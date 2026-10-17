import { NextResponse, type NextRequest } from "next/server";
import { aplicar, dentroDelLimite, disponible, huella, leer, validarCambio } from "@/lib/recuentoServidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Como mucho, el mazo entero de un municipio grande por petición. */
const MAX_POR_PETICION = 200;

function ipDe(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "sin-ip";
}

const noDisponible = () => NextResponse.json({ error: "recuento no disponible" }, { status: 503 });

/** GET /api/recuento?obras=id1,id2 → contadores por obra. */
export async function GET(req: NextRequest) {
  if (!disponible()) return noDisponible();
  const ids = (req.nextUrl.searchParams.get("obras") ?? "").split(",").filter(Boolean).slice(0, MAX_POR_PETICION);
  try {
    const recuento = await leer(ids);
    return NextResponse.json(
      { recuento },
      { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" } },
    );
  } catch {
    return noDisponible();
  }
}

/** POST /api/recuento {cambios:[{obra,tipo,valor,anterior}]} → aplica los válidos. */
export async function POST(req: NextRequest) {
  if (!disponible()) return noDisponible();
  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "cuerpo no válido" }, { status: 400 });
  }
  const crudos = (cuerpo as { cambios?: unknown })?.cambios;
  if (!Array.isArray(crudos) || crudos.length === 0 || crudos.length > MAX_POR_PETICION) {
    return NextResponse.json({ error: "cambios no válidos" }, { status: 400 });
  }
  const cambios = crudos.map(validarCambio);
  if (cambios.some((c) => c === null)) return NextResponse.json({ error: "cambio no válido" }, { status: 400 });
  try {
    if (!(await dentroDelLimite(huella(ipDe(req)), cambios.length))) {
      return NextResponse.json({ error: "demasiados cambios hoy" }, { status: 429 });
    }
    await aplicar(cambios as NonNullable<(typeof cambios)[number]>[]);
    return NextResponse.json({ aplicados: cambios.length });
  } catch {
    return noDisponible();
  }
}
