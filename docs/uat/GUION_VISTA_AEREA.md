# Guion UAT — Vista aérea (una página)

Spec: `docs/specs/vista-aerea.md`. Tiempo: unos 15 minutos. Un móvil y un
ordenador. Anota versión (hash del commit) y resultado de cada paso.

Si pruebas en local:

```bash
NEXT_PUBLIC_VISTA_AEREA=1 npm run dev
```

Si pruebas en la preview de Vercel, el flag ya está activo.

| # | Haz esto | Debe pasar | OK / Falla |
|---|---|---|---|
| A1 | Abre la app en el móvil y elige Teulada. Mira la primera tarjeta que tenga foto | Foto aérea con un anillo amarillo sobre la obra y una pastilla con la fecha del vuelo («jun 2024 · IGN»); debajo, una línea que dice qué permite comprobar la foto | |
| A2 | Desliza 5 tarjetas seguidas, en las cuatro direcciones | El gesto va igual que sin foto; la tarjeta siguiente ya tiene su foto cargada, sin hueco gris | |
| A3 | Busca una obra adjudicada después de junio de 2024 | La línea dice «Foto anterior a la obra: aún no sirve para comprobarla»; nada sugiere que la obra no se hizo | |
| A4 | Abre «Ver ficha y evidencia» de una obra con foto anterior y posterior. Mueve el comparador con el dedo; luego, en el ordenador, con Tab y las flechas | La foto pasa de un año al otro; el lector de pantalla (VoiceOver/TalkBack) anuncia los dos años | |
| A5 | En la ficha, pulsa «Explorar en el mapa» y cambia de año | Mapa con la foto del IGN, el anillo en el mismo sitio y el año elegido; se puede hacer zoom | |
| A6 | Elige 5 obras al azar. Abre el enlace «la fuente» de la ubicación y su pliego | El lugar que dice el documento coincide con el anillo de la foto. Anota cualquier obra que no cuadre | |
| A7 | Busca una obra sin ubicación (p. ej. un asfaltado de varias calles) | No hay foto ni anillo; la ficha explica que los documentos no la sitúan | |
| A8 | Abre «Ver a pie de calle» y luego «Ver el satélite de Google (sin fecha)» | Street View se abre en el sitio de la obra (si Google tiene imágenes ahí); el satélite de Google se abre centrado en la obra, en modo satélite | |
| A9 | Abre la app de producción mientras el flag esté apagado | Se ve igual que antes de esta función: ninguna foto ni sección «Desde el aire» | |

Terminado = A1–A9 en verde con la misma versión. Un fallo en A3 o A6 bloquea
la activación en producción: es información que podría engañar a los vecinos.
