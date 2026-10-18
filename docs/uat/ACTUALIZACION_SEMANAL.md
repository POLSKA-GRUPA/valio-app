# Actualización semanal — automatización de la carga PLACE (UAT)

> **Estado**: borrador en la rama `feat/actualizacion-semanal`. **Sin activar.**
> Hay una pregunta abierta a Kenyi (GitHub Actions vs Mac); hasta que responda,
> nada de `.github/` ni timers: el runner se lanza a mano con los comandos de aquí.

## Qué es

`scripts/actualizar-semanal.py` corre la pasada semanal de la TAREA-08 (valio-datos)
**sin tocar los árboles principales**. Todo pasa en clones staging dentro de
`.cache/semanal/staging/` (aislados, `--no-hardlinks`). Al terminar deja
**commits locales** en ramas `semanal/<fecha>` de staging, un informe y un log.

**Nunca hace**: push, PR, merge, `reset --hard`, despliegue, geocodificación
online, envíos a organismos, ni escribe en `~/valio-datos` o en la app principal
(de ahí solo se lee). No usa credenciales.

## Primera vez (bootstrap, ~10-20 min y ~7 GB)

Requisitos: `python3`, `git`, `node`+`npm`, ~12 GiB de disco libres y la caché
nacional ya repartida en `~/valio-datos` (la del becario).

```bash
python3 scripts/actualizar-semanal.py --inicializar
```

Copia la caché nacional **completa** (ficheros independientes: sin hardlinks ni
symlinks) para que la pasada semanal no pierda el histórico. Sin red.

Comprobación: `python3 scripts/actualizar-semanal.py --plan` debe decir
`bootstrap: HECHO` y existe `.cache/semanal/BOOTSTRAP.json`.

## Cada semana

```bash
python3 scripts/actualizar-semanal.py            # = --plan: solo muestra el plan
python3 scripts/actualizar-semanal.py --ejecutar
```

`--ejecutar` hace: descargar los **dos meses vivos** (enero y años bisiestos
bien: se calculan con aritmética de fechas) → `repartir --conservar-zip` →
`publicar --todos` → tests unit de datos → chequeo PII de datos y app →
`npm ci` + `generar-nacional` + `tsc --noEmit` + `next build` en staging de la
app → commit local revisable. Tarda **10-40 min** (los feeds pesan cientos de MB).

Resultado: informe en `.cache/semanal/informes/<sello>.md` (conteos, resumen
H6 `sin_municipio`, caminos) y log completo en `.cache/semanal/log/`.

Opcional: `--geocodificar-sin-red` (recalcula el geo con la caché local; nunca
llama a la API). Si `respuestas.json` no está en este worktree, añade
`--respuestas-geo ~/valio-app/datos-geo/respuestas.json`.

## Revisión humana (obligatoria: nada se publica solo)

1. Abre el informe de `.cache/semanal/informes/` y lee conteos y `sin_municipio` (H6).
2. Mira el commit de staging: los comandos exactos están al final del informe
   (incluye el diff de `indice.json` contra `main` para el H1 ciudad por ciudad).
3. Si vale, los cambios pasan a `main` cuando una persona lo decida (PR o
   cherry-pick manuales: fuera de este runner). **La URL pública de la app no se
   renueva hasta ese merge.**
4. Si no vale, descarta la rama `semanal/<fecha>` con los comandos del informe:
   el runner nunca destruye nada, esa decisión es tuya.

## Si falla (fallo con seguridad)

Cualquier error corta la corrida y deja los árboles principales intactos.
Mira el último `.cache/semanal/log/`. Códigos de salida: `0` OK · `2` uso ·
`3` ya hay otra corrida · `4` staging sucio o ya existe · `5` falta bootstrap ·
`6` un paso fallió · `7` staging divergió · `8` disco insuficiente · `9` no hay repo origen.

- **Staging sucio tras un fallo** (código 6 a medias): revísalo con
  `git -C .cache/semanal/staging/<repo> status` y, si no vale,
  `git -C … restore .` (decisión humana).
- **`repartir` con código 5** (`organos.csv` o versión de caché): no es cosa del
  semanal. Quien cambió la tabla ejecuta `repartir --rehacer` en el staging; los
  ZIPs están todos porque se conservan con `--conservar-zip`.
- **Un fallo no borra el resultado de semanas anteriores**: cada semana vive en
  su rama `semanal/<fecha>`.

## Timer launchd — SOLO plantilla, NO instalada

`scripts/plantillas/es.valio.semanal.plist` (viernes 9:30) es una plantilla con
placeholders (`__REPO__`, `__LOG__`). **No la instales sin el OK de Kenyi.**
Cuando lo dé, sería (instrucciones pendientes, no ejecutar ahora):

```bash
mkdir -p .cache/semanal/log
sed -e "s#__REPO__#$PWD#" -e "s#__LOG__#$PWD/.cache/semanal/log/launchd.log#" \
  scripts/plantillas/es.valio.semanal.plist > ~/Library/LaunchAgents/es.valio.semanal.plist
launchctl load ~/Library/LaunchAgents/es.valio.semanal.plist
```

Advertencias: si el Mac está apagado o dormido a esa hora, **no corre** (launchd
lo ejecuta al despertar, una sola vez); el `PATH` de launchd es corto (la
plantilla ya incluye Homebrew); y sigue haciendo falta la revisión humana
semanal: el timer solo prepara el resultado, no lo publica.

## Límites conocidos

- El runner vive en este repo: si mueves o borras el worktree, borra staging a
  mano y repite `--inicializar`.
- Staging sale de `main` (o de la ref explícita `--ref-app`/`--ref-datos`): lo
  que no esté mergeado a `main` no entra en la pasada.
- `npm ci` y `next build` usan red (fuentes de Google en `next/font`); un corte
  de red falla el build, no los datos.
- Los ZIPs conservados crecen ~0,5 GB/mes (permiten `repartir --rehacer` sin red).
- Tests de la app = `tsc` + `build` (aún no hay tests node automáticos); los
  Playwright de `docs/uat/` siguen siendo manuales.
