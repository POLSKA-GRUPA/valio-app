# Prueba con TalkBack — issue #37 (municipio, tipos y orden)


**Versión probada (rellenar antes de empezar):**

| Campo | Valor |
|---|---|
| Dispositivo | Pixel 7a |
| Android | 16 |
| Navegadores y versiones | Chrome 155 · Brave 1.97.59 |
| TalkBack | 17.0|
| App | https://valio-app.vercel.app el 22/10/2026 |

## 1. «¿Dónde vives?»

| # | Haz esto | TalkBack debería decir | Resultado |
|---|---|---|---|
| 1.1 | Abre la app | «¿Dónde vives?, encabezado» | Pasa |
| 1.2 | Desliza a la derecha | El texto «Busca tu municipio de entre toda España…» |Pasa|
| 1.3 | Desliza a la derecha y por cada ciudad en el foco| «Teulada, Alicante · 21 obras, botón» (o la ciudad que se indique en la selección)|Pasa|
| 1.4 | Toca dos veces | Se abre el tutorial y lee su título |Pasa|

## 2. Chips de orden

| # | Haz esto | TalkBack debería decir | Resultado |
|---|---|---|---|
| 2.1 | Cierra el tutorial y ve al primer chip | «Más recientes, botón de selección, marcado, 1 de 2» | Pasa|
| 2.2 | Ve a «Mayor importe» y toca dos veces | «Ordenadas por mayor importe» | Pasa |
| 2.3 | Comprueba la carta de arriba | Es la de más importe (asfaltado, 177.686 €) |Pasa|

## 3. Chips de tipo

| # | Haz esto | TalkBack debería decir | Resultado |
|---|---|---|---|
| 3.1 | Ve a «Todas» | «Todas, botón de activación, activado» | Pasa |
| 3.2 | Ve a «Deporte» y toca dos veces | «3 obras pendientes: Deporte» | Pasa |
| 3.3 | Toca dos veces «Educación» | «4 obras pendientes: Deporte, Educación» | Pasa |
| 3.4 | Toca dos veces «Todas» | « 21 obras pendientes: todos los tipos» | Pasa|

## 4. Filtro agotado

| # | Haz esto | TalkBack debería decir | Resultado |
|---|---|---|---|
| 4.1 | Marca solo «Educación» y vota la carta | «Voto registrado…» y luego «Nada pendiente de este tipo» | Fallo #1 |
| 4.2 | Ve a «Ver todas» y toca dos veces | Vuelve el mazo con todas y lee el contenido de la tarjeta | Pasa |

## 5. Cambiar de municipio

| # | Haz esto | TalkBack debería decir | Resultado |
|---|---|---|---|
| 5.1 | Pestaña Info → «Cambiar de municipio» | «¿Dónde vives?, encabezado 2» | Pasa |


## Resultado

|Fallo #n| Nota|
|-|-|
|Fallo #1| Talkback no dice "Nada pendiente de este tipo" tras votar la ultima tarjeta, se debe llevar el foco a el encabezado con el texto.

