# Prueba con TalkBack — issue #37 (municipio, tipos y orden)

Lo automático está en `docs/uat/test_valio.py` (R8–R14). Esto es lo que solo
se puede comprobar con un lector de pantalla de verdad.

**Preparación:** móvil Android con TalkBack activado, Chrome, la app abierta en
una pestaña de incógnito (así empieza sin municipio guardado).

Marca cada fila con ✅ o ❌ y, si falla, apunta qué dijo TalkBack.

## 1. «¿Dónde vives?»

| # | Haz esto | TalkBack debería decir | Resultado |
|---|---|---|---|
| 1.1 | Abre la app | «¿Dónde vives?, encabezado» | |
| 1.2 | Desliza a la derecha | El texto «Elige tu municipio…» | |
| 1.3 | Desliza a la derecha | «Teulada, Alicante · 21 obras, botón» | |
| 1.4 | Toca dos veces | Se abre el tutorial y lee su título | |

## 2. Chips de orden

| # | Haz esto | TalkBack debería decir | Resultado |
|---|---|---|---|
| 2.1 | Cierra el tutorial y ve al primer chip | «Más recientes, botón de opción, marcado, 1 de 2» (o parecido) | |
| 2.2 | Ve a «Mayor importe» y toca dos veces | «Ordenadas por mayor importe» | |
| 2.3 | Comprueba la carta de arriba | Es la de más importe (asfaltado, 177.686 €) | |

## 3. Chips de tipo

| # | Haz esto | TalkBack debería decir | Resultado |
|---|---|---|---|
| 3.1 | Ve a «Todas» | «Todas, botón de activación, activado» (o parecido) | |
| 3.2 | Ve a «Deporte» y toca dos veces | «3 obras pendientes: Deporte» | |
| 3.3 | Toca dos veces «Educación» | «4 obras pendientes: Deporte, Educación» | |
| 3.4 | Toca dos veces «Todas» | «… obras pendientes: todos los tipos» | |

## 4. Filtro agotado

| # | Haz esto | TalkBack debería decir | Resultado |
|---|---|---|---|
| 4.1 | Marca solo «Educación» y vota la carta | «Voto registrado…» y luego «Nada pendiente de este tipo» | |
| 4.2 | Ve a «Ver todas» y toca dos veces | Vuelve el mazo con todas | |

## 5. Cambiar de municipio

| # | Haz esto | TalkBack debería decir | Resultado |
|---|---|---|---|
| 5.1 | Pestaña Info → «Cambiar de municipio» | «¿Dónde vives?, encabezado» | |
| 5.2 | Elige Teulada | Vuelve a la pestaña Votar | |

## Resultado

- Fecha y móvil:
- Filas en ❌:
- Captura o nota de cada ❌:
