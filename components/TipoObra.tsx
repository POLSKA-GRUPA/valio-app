import {
  Construction,
  GraduationCap,
  Landmark,
  Leaf,
  ShieldCheck,
  Trees,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { Categoria } from "@/lib/obras";

/**
 * Rediseño Luma: cada tipo de obra tiene icono y tono de póster. Los tonos
 * son índigo, azul, violeta, ciruela, pizarra y petróleo: verde, rojo y
 * ámbar quedan solo para el voto (luma.css, `[data-cat]`).
 */
export const ICONO_TIPO: Record<Categoria, LucideIcon> = {
  urbanismo: Construction,
  deporte: Trophy,
  parques: Trees,
  patrimonio: Landmark,
  seguridad: ShieldCheck,
  "medio ambiente": Leaf,
  educacion: GraduationCap,
};

/** "medio ambiente" → "medio-ambiente", para usarlo en `data-cat`. */
export const slugTipo = (c: Categoria) => c.replace(/\s+/g, "-");

export function IconoTipo({ categoria, size = 20, className }: { categoria: Categoria; size?: number; className?: string }) {
  const Icono = ICONO_TIPO[categoria];
  return <Icono size={size} className={className} aria-hidden="true" />;
}
