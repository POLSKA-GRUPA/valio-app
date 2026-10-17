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

/** POST /api/recuento {cambios:[{obra,tipo,valor,recibo}]} → aplica los válidos. */
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
  // Los no válidos (una obra retirada al regenerar los datos) se descartan sin
  // tumbar el lote: el cliente da el lote por tratado y no se pierden los buenos.
  const cambios = crudos.map(validarCambio).filter((c) => c !== null);
  if (cambios.length === 0) return NextResponse.json({ error: "cambio no válido" }, { status: 400 });
  try {
    if (!(await dentroDelLimite(huella(ipDe(req)), cambios.length))) {
      return NextResponse.json({ error: "demasiados cambios hoy" }, { status: 429 });
    }
    await aplicar(cambios);
    return NextResponse.json({ aplicados: cambios.length, descartados: crudos.length - cambios.length });
  } catch {
    return noDisponible();
  }
}
