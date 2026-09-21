# Guía UAT manual — Semana 1

Tu trabajo de hoy: usar la demo como lo haría un ciudadano cualquiera, en tu
móvil, y apuntar TODO lo que chirríe. No arregles nada todavía: documenta.

## Preparación (5 min)

1. En tu ordenador: `npm install && npm run dev`.
2. Consigue la URL de tu red local: `npm run dev -- -H 0.0.0.0` y apunta la IP
   (algo como `http://192.168.1.XX:3000`).
3. En tu móvil, con el mismo wifi, abre esa URL. Si no carga, pregunta.

## Recorrido (15 min) — apunta cada fallo con captura

| # | Qué hacer | Qué observar |
|---|---|---|
| 1 | Primera visita | ¿Aparece el tutorial de gestos? ¿Se entiende sin ayuda? |
| 2 | Desliza a la derecha en la tarjeta 1 | ¿Sello VALIÓ? ¿Vuela la tarjeta? ¿Contador DEMO sube? |
| 3 | Desliza a la izquierda en la tarjeta 2 | ¿Sello NO VALIÓ? ¿Sale pantalla Match ciudadano? |
| 4 | En el Match, pulsa Pedir explicaciones | ¿Se abre el borrador? ¿Puedes editarlo y copiarlo? ¿Envía algo solo? (no debe) |
| 5 | Cierra y desliza ARRIBA en la tarjeta 3 | ¿Sello PIDO EXPLICACIONES? |
| 6 | Desliza ABAJO en la tarjeta 4 | ¿Sello de ¿? y tarjeta consumida? |
| 7 | Toca Ver ficha y evidencia | ¿3 capas? ¿Se ve estado del dato y fuente? |
| 8 | Pulsa Escape o cerrar y usa solo BOTONES para votar 2 tarjetas | ¿Vuelan igual que con el dedo? |
| 9 | Termina el mazo | ¿Pantalla Ya has votado todo? |
| 10 | Pestaña Resultados | ¿8 votos correctos con su etiqueta? |
| 11 | Recarga la página | ¿Persisten los votos? |
| 12 | Pestaña Cabreo e Info | ¿Listas legibles? ¿Aviso de demo claro? |
| 13 | Gira el móvil (vertical/horizontal) | ¿Algo se rompe? |
| 14 | Prueba con teclado en escritorio: flechas + Enter | ¿Vota sin ratón? |

## Informe

Copia esta tabla en `docs/uat/UAT_SEMANA1.md`, rellena la columna Resultado
(OK / FALLO #n) y, por cada fallo, abre UN issue con captura:

```markdown
## FALLO #n — título corto
- Paso: qué hacías exactamente
- Esperaba: qué debería pasar
- Pasa: qué pasa de verdad
- Captura: (pega la imagen en el issue de GitHub)
- Móvil/navegador: modelo y versión
```

Criterio de hecho de la semana: recorrido completo hecho 2 veces (2 dispositivos
si puedes) + informe subido por PR + issues abiertos por cada fallo.
