/**
 * Señal vecinal «¿Está terminada?» (ISSUE-43).
 *
 * Es un dato ALEGADO (dossier §7.1-B y §7.2): lo dice un vecino, no una fuente
 * oficial. Va siempre separado de «Los documentos dicen» y nunca lo sustituye.
 * Solo respuestas cerradas: nada de texto libre, fotos ni ubicación (§8.4).
 */

export type Senal = "terminada" | "en_obras" | "no_hecha" | "no_lo_se";

export const SENAL_LABEL: Record<Senal, string> = {
  terminada: "Sí, terminada",
  en_obras: "En obras",
  no_hecha: "No se ha hecho",
  no_lo_se: "No lo sé",
};

export const SENALES: readonly Senal[] = ["terminada", "en_obras", "no_hecha", "no_lo_se"];

/** Respuesta de este dispositivo por id de obra. */
export type Senales = Record<string, Senal>;
