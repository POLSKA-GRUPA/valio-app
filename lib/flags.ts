/**
 * Interruptores de funciones nuevas. Se leen en build (NEXT_PUBLIC_*): Vercel
 * los fija por entorno, así una función puede estar en preview y no en
 * producción hasta que Kenyi la apruebe.
 */
export const VISTA_AEREA = process.env.NEXT_PUBLIC_VISTA_AEREA === "1";
