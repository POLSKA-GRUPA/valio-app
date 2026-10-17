/**
 * Interruptores de funciones nuevas. Se leen en build (NEXT_PUBLIC_*): Vercel
 * los fija por entorno, así una función puede estar en preview y no en
 * producción hasta que Kenyi la apruebe.
 */
export const VISTA_AEREA = process.env.NEXT_PUBLIC_VISTA_AEREA === "1";

/**
 * Rediseño con la gramática de Luma iOS (docs/rediseno-luma en la rama
 * docs/propuesta-rediseno-luma). Apagado, la app es idéntica a la de antes.
 */
export const REDISENO_LUMA = process.env.NEXT_PUBLIC_REDISENO_LUMA === "1";
