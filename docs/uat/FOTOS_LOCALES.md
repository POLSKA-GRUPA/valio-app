# Fotos del piloto: prueba reproducible

Las 21 obras de Teulada **ya usaban fotos guardadas en la app**. A fecha de
esta revisión, 11 tienen ubicación precisa y 16 imágenes versionadas (11
actuales y 5 anteriores). Las otras 10 no se sitúan por inventar un punto.

R20 miraba `img.complete` inmediatamente después de pasar tarjetas. Una foto
local que aún estaba descargándose se contaba como rota. Ahora espera hasta
10 segundos; un fichero inexistente sigue fallando. No cambia la web.

## Comprobación automática

```bash
python3 -m unittest discover -s docs/uat -p test_fotos_locales.py -v
npm run build
RECUENTO_MEMORIA=1 npm run start -- --port 3110
```

En otra terminal:

```bash
VALIO_BASE=http://localhost:3110 python3 -u docs/uat/test_valio.py
```

Esperado: tres regresiones verdes (cobertura local, imagen lenta y archivo
inexistente rechazado), build verde y R20 verde. `RECUENTO_MEMORIA=1` impide
que la prueba escriba votos en un almacén compartido, aunque haya `.env.local`.

## UAT humana

| Escenario | Resultado esperado |
|---|---|
| DevTools → red lenta, pasar hasta una tarjeta con foto | La foto aparece sin consultar al IGN para esa imagen |
| Bloquear `www.ign.es`, abrir una ficha precisa de Teulada | La foto guardada sigue visible; el mapa interactivo puede no cargar |
| Obra sin ubicación precisa | No se inventa una foto ni un punto |
| Ficha nacional con ubicación aproximada | Sigue el aviso «sin revisar a mano»; su ortofoto sí depende del IGN |

La corrección de R20 no garantiza que todos los servicios externos funcionen:
las teselas del mapa y las ortofotos de ubicaciones aproximadas siguen en vivo.
