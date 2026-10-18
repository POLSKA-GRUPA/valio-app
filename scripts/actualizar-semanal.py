#!/usr/bin/env python3
"""
actualizar-semanal.py — Pasada semanal de PLACE en staging aislado.

QUÉ HACE
  --plan (por defecto)   Muestra el plan y los comandos exactos. No toca nada
                         ni usa red: cero efectos secundarios.
  --inicializar          Bootstrap, UNA vez: clona app y datos a staging y
                         copia la caché nacional COMPLETA (~7 GB, ficheros
                         independientes, sin hardlinks ni symlinks) para que
                         la pasada semanal no pierda el histórico. Sin red.
  --ejecutar             Pasada completa SOLO en staging: descargar los dos
                         meses vivos, repartir --conservar-zip, publicar
                         --todos, tests de datos (unit + PII) y build de la
                         app. Deja commits LOCALES en ramas semanal/<fecha>
                         de staging para revisión humana.

QUÉ NUNCA HACE
  - No escribe en ~/valio-datos ni en el worktree principal de la app: de
    ahí solo se lee (clone y copia de caché).
  - No hay push, PR, merge ni reset --hard: el resultado de cada semana se
    conserva en ramas semanal/* de staging hasta que una persona lo revise.
  - No publica en producción, no activa timers, no toca .github/.
  - No geocodifica online: solo --geocodificar-sin-red con la caché local.
  - Sin credenciales: los logs solo guardan comandos y salidas (nunca env).

CÓDIGOS DE SALIDA
  0 OK · 2 uso incorrecto · 3 lock ocupado · 4 staging sucio o ya existe
  5 falta bootstrap/baseline · 6 un paso fallió · 7 staging divergió (diffs
  ajenos) · 8 disco insuficiente · 9 no existe el repo de origen

SOLO librería estándar de Python. Vive en valio-app (rama
feat/actualizacion-semanal); la documentación de uso y UAT está en
docs/uat/ACTUALIZACION_SEMANAL.md.
"""

from __future__ import annotations

import argparse
import dataclasses
import datetime as dt
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

GB = 1024 * 1024 * 1024
MINIMO_DISCO_EJECUTAR = 3 * GB     # descargas + crecimientos de caché
MINIMO_DISCO_INICIALIZAR = 12 * GB  # copia de caché (~6,4G) + ZIPs + clones
NODO = "node"
GIT_AUTOR = ("valio-semanal (staging)", "semanal@localhost")
PATRON_MES = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
LINEA_PUBLICAR = re.compile(
    r"^(\d{5}) (.+): (\d+) entradas → (\d+) expedientes \((\d+) anulados\) → (\d+) obras"
)


# --- Fallos con código de salida propio --------------------------------------

class Fallo(Exception):
    """Fallo esperado: el mensaje se muestra y el código gobierna la salida."""

    def __init__(self, mensaje: str, codigo: int = 1):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.codigo = codigo


class LockOcupado(Fallo):
    def __init__(self, mensaje: str):
        super().__init__(mensaje, codigo=3)


class StagingSucio(Fallo):
    def __init__(self, mensaje: str):
        super().__init__(mensaje, codigo=4)


class FaltaBootstrap(Fallo):
    def __init__(self, mensaje: str):
        super().__init__(mensaje, codigo=5)


class PasoFallido(Fallo):
    def __init__(self, paso: str, rc: int, detalle: str):
        super().__init__(
            f"el paso «{paso}» falló con código {rc}"
            + (f": {detalle.strip().splitlines()[-1][:300]}" if detalle.strip() else ""),
            codigo=6,
        )


class Divergencia(Fallo):
    def __init__(self, mensaje: str):
        super().__init__(mensaje, codigo=7)


class DiscoInsuficiente(Fallo):
    def __init__(self, mensaje: str):
        super().__init__(mensaje, codigo=8)


class OrigenInexistente(Fallo):
    def __init__(self, mensaje: str):
        super().__init__(mensaje, codigo=9)


# --- Configuración ------------------------------------------------------------

@dataclasses.dataclass
class Config:
    raiz: Path                      # repo de la app donde vive este script
    repo_datos: Path                # worktree local de valio-datos (solo lectura)
    ref_app: str = "main"
    ref_datos: str = "main"
    geo: bool = False               # --geocodificar-sin-red
    respuestas_geo: Path | None = None
    meses: tuple[str, str] | None = None  # override para pruebas/reproducibilidad

    @property
    def cache(self) -> Path:
        return self.raiz / ".cache" / "semanal"

    @property
    def staging(self) -> Path:
        return self.cache / "staging"

    @property
    def app(self) -> Path:
        return self.staging / "valio-app"

    @property
    def datos(self) -> Path:
        return self.staging / "valio-datos"

    @property
    def logs(self) -> Path:
        return self.cache / "log"

    @property
    def informes(self) -> Path:
        return self.cache / "informes"

    @property
    def marker(self) -> Path:
        return self.cache / "BOOTSTRAP.json"

    @property
    def lock(self) -> Path:
        return self.cache / "lock"


def construir(argv: list[str] | None = None) -> tuple[Config, str]:
    p = argparse.ArgumentParser(
        prog="actualizar-semanal.py",
        description="Pasada semanal de PLACE en staging aislado (ver docs/uat/ACTUALIZACION_SEMANAL.md)",
    )
    modo = p.add_mutually_exclusive_group()
    modo.add_argument("--plan", action="store_true", help="solo muestra el plan (por defecto)")
    modo.add_argument("--inicializar", action="store_true",
                      help="bootstrap: clona staging y copia la caché completa (~7 GB)")
    modo.add_argument("--ejecutar", action="store_true", help="pasada semanal completa en staging")
    p.add_argument("--repo-datos", default="~/valio-datos",
                   help="worktree local de valio-datos (solo lectura; por defecto ~/valio-datos)")
    p.add_argument("--ref-app", default="main", help="ref de la app a usar en staging (default main)")
    p.add_argument("--ref-datos", default="main", help="ref de datos a usar en staging (default main)")
    p.add_argument("--geocodificar-sin-red", action="store_true",
                   help="recalcula la geocodificación con la caché local (nunca online)")
    p.add_argument("--respuestas-geo", default=None,
                   help="ruta a datos-geo/respuestas.json de la app principal si no está en este worktree")
    p.add_argument("--meses", nargs=2, metavar=("AAAA-MM", "AAAA-MM"),
                   help="fuerza los dos meses (solo depuración; por defecto se calculan)")
    args = p.parse_args(argv)

    if args.meses and not all(PATRON_MES.match(m) for m in args.meses):
        raise Fallo("los meses deben tener formato AAAA-MM", codigo=2)

    cfg = Config(
        raiz=Path(__file__).resolve().parents[1],
        repo_datos=Path(args.repo_datos).expanduser(),
        ref_app=args.ref_app,
        ref_datos=args.ref_datos,
        geo=args.geocodificar_sin_red,
        respuestas_geo=Path(args.respuestas_geo).expanduser() if args.respuestas_geo else None,
        meses=tuple(args.meses) if args.meses else None,  # type: ignore[assignment]
    )
    elegido = "inicializar" if args.inicializar else "ejecutar" if args.ejecutar else "plan"
    return cfg, elegido


# --- Meses vivos (enero y bisiestos bien: aritmética de fechas, no de meses) --

def meses_vivos(hoy: dt.date | None = None) -> tuple[str, str]:
    """(mes anterior, mes en curso): los dos que PLACE sigue retocando."""
    hoy = hoy or dt.date.today()
    anterior = (hoy.replace(day=1) - dt.timedelta(days=1)).strftime("%Y-%m")
    return anterior, hoy.strftime("%Y-%m")


# --- Lock excluyente portable (solo stdlib) -----------------------------------

def _vivo(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True  # de otro usuario: mejor no tocarlo
    return True


class Lock:
    def __init__(self, ruta: Path):
        self.ruta = ruta

    def liberar(self) -> None:
        try:
            self.ruta.unlink()
        except OSError:
            pass


def adquirir_lock(ruta: Path, log) -> Lock:
    for _ in range(2):
        try:
            fd = os.open(ruta, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
        except FileExistsError:
            try:
                pid = int(json.loads(ruta.read_text(encoding="utf-8")).get("pid", 0))
            except (OSError, ValueError, json.JSONDecodeError):
                raise LockOcupado(
                    f"el lock {ruta} existe pero no se puede leer; revisa que no "
                    "haya otra pasada y quítalo a mano si estás seguro"
                )
            if pid and _vivo(pid):
                raise LockOcupado(f"ya hay otra pasada en marcha (pid {pid})")
            log(f"AVISO: lock huérfano (pid {pid} ya muerto); se retira y continúa")
            ruta.unlink(missing_ok=True)
            continue
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump({"pid": os.getpid(), "inicio": dt.datetime.now().isoformat(timespec="seconds")}, f)
        return Lock(ruta)
    raise LockOcupado(f"no se pudo conseguir el lock {ruta}")


# --- Ejecución de comandos (con log, sin secretos) ----------------------------

def run_cmd(argv: list[str], cwd: Path, log=None, titulo: str | None = None) -> tuple[int, str]:
    """Ejecuta y devuelve (código, salida). Se separó así para poder mockearlo."""
    cabecera = f"$ cd {cwd} && {shlex.join([str(a) for a in argv])}"
    if log:
        log(cabecera)
    proc = subprocess.run([str(a) for a in argv], cwd=str(cwd),
                          capture_output=True, text=True, errors="replace")
    salida = (proc.stdout or "") + (proc.stderr or "")
    if log:
        log(salida.rstrip() or "(sin salida)")
    return proc.returncode, salida


def paso(log, argv, cwd, titulo: str | None = None) -> str:
    rc, salida = run_cmd(argv, cwd=cwd, log=log, titulo=titulo)
    if rc != 0:
        raise PasoFallido(titulo or shlex.join([str(a) for a in argv]), rc, salida)
    return salida


# --- Copia de caché saneada (independiente: sin hardlinks ni symlinks) --------

def _copiar_arbol(origen: Path, destino: Path, log, stats: dict) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    for item in sorted(origen.iterdir()):
        if item.is_symlink():
            stats["saltados"].append(str(item))
            continue
        if item.name.endswith((".tmp", ".part", ".DS_Store")):
            stats["saltados"].append(str(item))
            continue
        if item.is_dir():
            _copiar_arbol(item, destino / item.name, log, stats)
        elif item.is_file():
            shutil.copy2(item, destino / item.name)  # copia de contenido: nunca hardlink
            stats["ficheros"] += 1
            stats["bytes"] += item.stat().st_size
        else:
            stats["saltados"].append(str(item))


def copiar_cache(origen_datos: Path, destino_datos: Path, log) -> dict:
    """Copia zip/ + la generación vigente + el puntero `actual`.

    Requiere un baseline completo (entradas + bajas.tsv + estado.json):
    reconstruir el histórico solo con los dos ZIP recientes NO es opción.
    """
    nacional_o = origen_datos / ".cache" / "nacional"
    puntero = nacional_o / "actual"
    if not puntero.is_file():
        raise FaltaBootstrap(
            f"no hay caché vigente en {nacional_o} (falta `actual`): no se puede "
            "arrancar sin baseline completo"
        )
    gen_id = puntero.read_text(encoding="utf-8").strip()
    gen_origen = nacional_o / "generaciones" / gen_id
    for requisito in ("estado.json", "bajas.tsv", "entradas"):
        if not (gen_origen / requisito).exists():
            raise FaltaBootstrap(
                f"la caché de origen está incompleta (falta {gen_id}/{requisito}): "
                "no se arranca con un baseline a medias"
            )

    nacional_d = destino_datos / ".cache" / "nacional"
    stats = {"ficheros": 0, "bytes": 0, "saltados": [], "generacion": gen_id}
    log(f"copiando caché {gen_id} (~7 GB, puede tardar varios minutos)…")
    _copiar_arbol(gen_origen, nacional_d / "generaciones" / gen_id, log, stats)
    (nacional_d / "actual").write_text(gen_id + "\n", encoding="utf-8")
    zip_o = nacional_o / "zip"
    if zip_o.is_dir():
        log("copiando ZIPs procesados (permiten repartir --rehacer sin red)…")
        _copiar_arbol(zip_o, nacional_d / "zip", log, stats)
    for saltado in stats["saltados"]:
        log(f"  (no copiado: {saltado})")
    log(f"caché copiada: {stats['ficheros']} ficheros, {stats['bytes'] / GB:.2f} GiB")
    return stats


# --- Staging: clones y actualización con guardas -------------------------------

def clonar(origen: Path, destino: Path, ref: str, log) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    paso(log, ["git", "clone", "--no-hardlinks", "--branch", ref, str(origen), str(destino)],
         destino.parent, titulo=f"clone {destino.name}")


def refrescar(repo: Path, origen: Path, ref: str, log) -> tuple[str, str]:
    """Lleva staging a origen/<ref> creando una rama semanal nueva.

    Guardas: se niega si el árbol está sucio (resultado anterior sin revisar)
    o si HEAD no es nuestro y además difiere del objetivo (diffs ajenos).
    Nunca reset --hard: lo anterior se conserva en su rama semanal/*.
    """
    sucio = paso(log, ["git", "status", "--porcelain"], repo, "status " + repo.name)
    if sucio.strip():
        raise StagingSucio(
            f"{repo} tiene cambios sin revisar de una corrida anterior.\n"
            f"  Revísalos:   git -C {repo} status && git -C {repo} diff\n"
            f"  Si no valen: git -C {repo} restore .   (decisión humana; el runner no borra nada)"
        )
    rama = paso(log, ["git", "rev-parse", "--abbrev-ref", "HEAD"], repo).strip()
    paso(log, ["git", "fetch", "origin", ref], repo, titulo=f"fetch {repo.name}")
    objetivo = paso(log, ["git", "rev-parse", "FETCH_HEAD"], repo).strip()
    cabeza = paso(log, ["git", "rev-parse", "HEAD"], repo).strip()
    if cabeza != objetivo and not rama.startswith("semanal/"):
        raise Divergencia(
            f"{repo} está en {rama} ({cabeza[:8]}) y el objetivo es {ref} "
            f"({objetivo[:8]}): hay diffs ajenos. Revísalo a mano; no se toca nada."
        )
    if cabeza != objetivo or not rama.startswith("semanal/"):
        nueva = f"semanal/{dt.datetime.now():%Y%m%d-%H%M%S}"
        rc, _ = run_cmd(["git", "rev-parse", "--verify", "--quiet", f"refs/heads/{nueva}"],
                        cwd=repo, log=log)
        indice = 2
        while rc == 0:  # el nombre ya existía (re-run del mismo segundo): sufijo
            nueva = f"semanal/{dt.datetime.now():%Y%m%d-%H%M%S}-{indice}"
            indice += 1
            rc, _ = run_cmd(["git", "rev-parse", "--verify", "--quiet", f"refs/heads/{nueva}"],
                            cwd=repo, log=log)
        paso(log, ["git", "checkout", "-b", nueva, objetivo], repo, titulo=f"rama {repo.name}")
        rama = nueva
    return rama, objetivo


# --- Parseadores de los resúmenes de pasada.py ---------------------------------

def resumen_repartir(salida: str) -> dict:
    """Claves del bloque «Resumen de la pasada» + sin_municipio por plataforma."""
    resumen: dict = {}
    dentro = False
    for linea in salida.splitlines():
        if linea.strip() == "Resumen de la pasada":
            dentro = True
            continue
        if not dentro:
            continue
        m = re.match(r"^  (\S+): (\d+)$", linea)
        if m:
            resumen[m.group(1)] = int(m.group(2))
            continue
        m = re.match(r"^    (\S+): (\d+)$", linea)
        if m:
            resumen.setdefault("por_plataforma", {})[m.group(1)] = int(m.group(2))
    return resumen


def resumen_publicar(salida: str) -> dict:
    """Ciudades publicadas y obras totales a partir de las líneas por ciudad."""
    ciudades, obras = 0, 0
    for linea in salida.splitlines():
        m = LINEA_PUBLICAR.match(linea)
        if m:
            ciudades += 1
            obras += int(m.group(6))
    return {"ciudades": ciudades, "obras": obras}


def resumen_descargar(salida: str) -> list[str]:
    return re.findall(r"descargando (\S+)", salida)


# --- Informe -------------------------------------------------------------------

def escribir_informe(cfg: Config, datos: dict) -> Path:
    cfg.informes.mkdir(parents=True, exist_ok=True)
    ruta = cfg.informes / f"{datos['sello']}.md"
    lineas = [
        f"# Pasada semanal {datos['sello']} — {datos['estado']}",
        "",
        f"- Modo: `--ejecutar` · meses vivos: **{datos['meses'][0]} {datos['meses'][1]}**",
        f"- Refs: app `{datos['ref_app']}` @ {datos['sha_app'][:8]} · datos `{datos['ref_datos']}` @ {datos['sha_datos'][:8]}",
        f"- Ramas staging: app `{datos['rama_app']}` · datos `{datos['rama_datos']}`",
        f"- Descargas: {len(datos['descargas'])} fichero(s)",
        f"- Repartir (resumen): {datos['resumen_repartir'] or '(no parseado: mira el log)'}",
        f"- Publicar --todos: {datos['resumen_publicar']['ciudades']} ciudades, "
        f"{datos['resumen_publicar']['obras']} obras",
        f"- Commits staging: app {datos['commit_app']} · datos {datos['commit_datos']}",
        f"- Duración: {datos['duracion']} · Log completo: `{datos['log']}`",
        "",
        "## Pendiente de revisión humana (esto NO está publicado)",
        "",
        "```bash",
        *[f"git -C {cfg.datos} show --stat {datos['commit_datos']}"
          for _ in [0] if not datos["commit_datos"].startswith("(")],
        *[f"git -C {cfg.app}  show --stat {datos['commit_app']}"
          for _ in [0] if not datos["commit_app"].startswith("(")],
        "# H1 del guion: compara numObras ciudad por ciudad contra main:",
        f"git -C {cfg.datos} diff {datos['sha_datos']}..HEAD -- datos/nacional/indice.json",
        "```",
        "",
        "Si el resultado no vale, lo descartas tú (el runner nunca destruye):",
        "",
        "```bash",
        f"git -C {cfg.datos} checkout {datos['ref_datos']} && git -C {cfg.datos} branch -D {datos['rama_datos']}",
        f"git -C {cfg.app}  checkout {datos['ref_app']}  && git -C {cfg.app}  branch -D {datos['rama_app']}",
        "```",
        "",
        "Recuerda: la URL pública de la app no se renueva con esto; los cambios",
        "solo llegan a producción cuando una persona los revisa y los mergea.",
        "",
    ]
    if datos.get("fallo"):
        lineas.insert(2, f"\n> **FALLO en**: {datos['fallo']}\n")
    ruta.write_text("\n".join(lineas), encoding="utf-8")
    return ruta


# --- Modo plan -----------------------------------------------------------------

def cmd_plan(cfg: Config) -> int:
    meses = cfg.meses or meses_vivos()
    libre = shutil.disk_usage(cfg.raiz).free
    staging_listo = cfg.marker.is_file() and (cfg.datos / ".cache" / "nacional").is_dir()
    print(f"""\
PLAN de la pasada semanal (modo --plan: no se toca nada ni se usa red)

Orígenes (solo lectura):
  app   : {cfg.raiz}  (ref {cfg.ref_app})
  datos : {cfg.repo_datos}  (ref {cfg.ref_datos})

Staging aislado (todo pasa aquí dentro):
  {cfg.staging}
  bootstrap: {'HECHO' if staging_listo else 'PENDIENTE -> correr antes --inicializar'}

Meses vivos que se descargarían: {meses[0]} {meses[1]}
Disco libre aquí: {libre / GB:.1f} GiB (mínimo para --ejecutar: {MINIMO_DISCO_EJECUTAR // GB} GiB)

Pasos de --ejecutar (todos con git clone --no-hardlinks; nunca push/merge/reset):
  1. git clone --no-hardlinks --branch {cfg.ref_app}  {cfg.raiz}       {cfg.app}
  2. git clone --no-hardlinks --branch {cfg.ref_datos} {cfg.repo_datos} {cfg.datos}
  3. guardaras de staging (árbol sucio o diffs ajenos => se detiene) y rama semanal/<fecha>
  4. {sys.executable} scripts/nacional/pasada.py descargar --meses {meses[0]} {meses[1]}
  5. {sys.executable} scripts/nacional/pasada.py repartir --conservar-zip
  6. {sys.executable} scripts/nacional/pasada.py publicar --todos
  7. {sys.executable} -m unittest discover -s tests -v   (tests unit de datos)
  8. npm ci && node scripts/generar-nacional.mjs {cfg.datos}
     {'9. geocodificar --sin-red + segunda pasada de generar-nacional (con caché)' if cfg.geo else '(geocodificación off-line NO pedida: añade --geocodificar-sin-red)'}
 10. node_modules/.bin/tsc --noEmit && npm run build   (tests de la app: build + tipos)
 11. git add -A + chequeo PII de ambos repos + commit LOCAL en staging (revisable)

Qué NO hace este script: no escribe en los árboles principales, no push, no PR,
no merge, no despliegue, no timers, no geocodificación online, sin credenciales.
Documentación completa: docs/uat/ACTUALIZACION_SEMANAL.md""")
    return 0


# --- Modo inicializar ----------------------------------------------------------

def cmd_inicializar(cfg: Config, log, ruta_log: Path | None = None) -> int:
    inicio = dt.datetime.now()
    for ruta, nombre in ((cfg.raiz, "app"), (cfg.repo_datos, "datos")):
        if not ruta.is_dir():
            raise OrigenInexistente(f"no existe el repo de {nombre}: {ruta}")
    if cfg.app.exists() or cfg.datos.exists():
        raise StagingSucio(
            f"staging ya existe ({cfg.staging}); para rehacer el bootstrap, "
            "bórralo a mano después de revisar lo que haya (el script no destruye nada)"
        )
    libre = shutil.disk_usage(cfg.raiz).free
    if libre < MINIMO_DISCO_INICIALIZAR:
        raise DiscoInsuficiente(
            f"hay {libre / GB:.1f} GiB libres y el bootstrap necesita "
            f"{MINIMO_DISCO_INICIALIZAR // GB} GiB (caché ~6,4 GiB + ZIPs + clones)"
        )
    log(f"== INICIALIZAR {inicio:%Y-%m-%d %H:%M} (sin red: clones y copias locales)")

    clonar(cfg.raiz, cfg.app, cfg.ref_app, log)
    clonar(cfg.repo_datos, cfg.datos, cfg.ref_datos, log)
    stats = copiar_cache(cfg.repo_datos, cfg.datos, log)

    if cfg.geo:
        origen_geo = cfg.respuestas_geo or (cfg.raiz / "datos-geo" / "respuestas.json")
        if origen_geo.is_file():
            destino_geo = cfg.app / "datos-geo" / "respuestas.json"
            destino_geo.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(origen_geo, destino_geo)
            log(f"copiada caché de geocodificación: {origen_geo}")
        else:
            log(f"AVISO: sin {origen_geo}; --geocodificar-sin-red se saltará")

    cfg.marker.write_text(json.dumps({
        "hecho": f"{inicio:%Y-%m-%d %H:%M}",
        "origen_datos": str(cfg.repo_datos),
        "generacion": stats["generacion"],
        "ficheros": stats["ficheros"],
        "bytes": stats["bytes"],
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"bootstrap listo en {dt.datetime.now() - inicio}; siguiente paso: --ejecutar")
    return 0


# --- Modo ejecutar --------------------------------------------------------------

def _commit_staging(repo: Path, titulo: str, fecha: str, meses, log) -> str:
    paso(log, ["git", "add", "-A"], repo, titulo=f"add {titulo}")
    estado = paso(log, ["git", "status", "--porcelain"], repo)
    if not estado.strip():
        return "(sin cambios: PLACE no publicó nada nuevo)"
    paso(log, ["git", "-c", f"user.name={GIT_AUTOR[0]}", "-c", f"user.email={GIT_AUTOR[1]}",
               "commit", "-m", f"semanal({fecha}): pasada PLACE {meses[0]} {meses[1]} — staging, sin publicar"],
         repo, titulo=f"commit {titulo}")
    return paso(log, ["git", "rev-parse", "--short", "HEAD"], repo).strip()


def cmd_ejecutar(cfg: Config, log, ruta_log: Path | None = None) -> int:
    inicio = dt.datetime.now()
    sello = f"{inicio:%Y%m%d-%H%M%S}"
    for ruta, nombre in ((cfg.raiz, "app"), (cfg.repo_datos, "datos")):
        if not ruta.is_dir():
            raise OrigenInexistente(f"no existe el repo de {nombre}: {ruta}")
    if not cfg.marker.is_file() or not (cfg.datos / ".cache" / "nacional").is_dir():
        raise FaltaBootstrap(
            "staging no tiene caché con histórico. Corre antes "
            f"`{Path(sys.argv[0]).name} --inicializar` (copia ~7 GB de la caché "
            "nacional). NO se ejecuta con la caché vacía: la pasada perdería "
            "todo el histórico y solo quedarían los dos meses recientes."
        )
    libre = shutil.disk_usage(cfg.raiz).free
    if libre < MINIMO_DISCO_EJECUTAR:
        raise DiscoInsuficiente(
            f"solo hay {libre / GB:.1f} GiB libres (mínimo {MINIMO_DISCO_EJECUTAR // GB} GiB "
            "para descargas y crecimiento de caché)"
        )
    log(f"== EJECUTAR {inicio:%Y-%m-%d %H:%M} (solo staging; árboles principales intactos)")

    # 1-2. Clones si faltan (idempotente) y guardas + rama semanal de hoy.
    if not cfg.app.exists():
        clonar(cfg.raiz, cfg.app, cfg.ref_app, log)
    if not cfg.datos.exists():
        clonar(cfg.repo_datos, cfg.datos, cfg.ref_datos, log)
    rama_app, sha_app = refrescar(cfg.app, cfg.raiz, cfg.ref_app, log)
    rama_datos, sha_datos = refrescar(cfg.datos, cfg.repo_datos, cfg.ref_datos, log)

    # 3. Meses vivos.
    meses = cfg.meses or meses_vivos()
    log(f"meses vivos: {meses[0]} {meses[1]}")

    # 4-6. Pasada de datos (descargar usa red: feeds públicos de PLACE).
    py = sys.executable
    descargas = resumen_descargar(paso(
        log, [py, "scripts/nacional/pasada.py", "descargar", "--meses", *meses],
        cfg.datos, titulo="descargar"))
    repartir_out = paso(
        log, [py, "scripts/nacional/pasada.py", "repartir", "--conservar-zip"],
        cfg.datos, titulo="repartir")
    publicar_out = paso(
        log, [py, "scripts/nacional/pasada.py", "publicar", "--todos"],
        cfg.datos, titulo="publicar --todos")
    res_rep = resumen_repartir(repartir_out)
    res_pub = resumen_publicar(publicar_out)
    if res_pub["ciudades"] == 0:
        log("AVISO (regla 13): publicar --todos no devolvió ninguna ciudad; revisa el log")

    # 7. Tests de datos (unitarios).
    paso(log, [py, "-m", "unittest", "discover", "-s", "tests", "-v"],
         cfg.datos, titulo="tests unit datos")

    # 8. App en staging: dependencias y datos generados (rutas de siempre).
    paso(log, ["npm", "ci"], cfg.app, titulo="npm ci")
    paso(log, [NODO, "scripts/generar-nacional.mjs", str(cfg.datos)],
         cfg.app, titulo="generar-nacional (1ª pasada)")
    if cfg.geo:
        origen_geo = cfg.respuestas_geo or (cfg.raiz / "datos-geo" / "respuestas.json")
        if origen_geo.is_file():
            destino_geo = cfg.app / "datos-geo" / "respuestas.json"
            destino_geo.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(origen_geo, destino_geo)
            paso(log, [NODO, "scripts/geocodificar.mjs", "--sin-red"],
                 cfg.app, titulo="geocodificar --sin-red")
            paso(log, [NODO, "scripts/generar-nacional.mjs", str(cfg.datos)],
                 cfg.app, titulo="generar-nacional (2ª pasada)")
        else:
            log(f"AVISO: sin caché de geocodificación ({origen_geo}); se salta el paso geo")
    tsc = cfg.app / "node_modules" / ".bin" / "tsc"
    if not tsc.is_file():
        raise PasoFallido("tsc", 1, "falta node_modules/.bin/tsc tras npm ci")
    paso(log, [str(tsc), "--noEmit"], cfg.app, titulo="tsc --noEmit")
    paso(log, ["npm", "run", "build"], cfg.app, titulo="npm run build")

    # 9. Commits locales tras el chequeo PII (ls-files ve el índice ya añadido).
    paso(log, ["git", "add", "-A"], cfg.datos, titulo="add datos")
    paso(log, [py, "scripts/comprobar_datos_personales.py"], cfg.datos,
         titulo="PII datos")
    paso(log, ["git", "add", "-A"], cfg.app, titulo="add app")
    paso(log, [NODO, "scripts/comprobar-datos-personales.mjs"], cfg.app,
         titulo="PII app")
    commit_datos = _commit_staging(cfg.datos, "datos", f"{inicio:%Y-%m-%d}", meses, log)
    commit_app = _commit_staging(cfg.app, "app", f"{inicio:%Y-%m-%d}", meses, log)

    informe = {
        "sello": sello, "estado": "OK (pendiente de revisión humana)",
        "meses": meses, "ref_app": cfg.ref_app, "ref_datos": cfg.ref_datos,
        "sha_app": sha_app, "sha_datos": sha_datos,
        "rama_app": rama_app, "rama_datos": rama_datos,
        "descargas": descargas, "resumen_repartir": res_rep, "resumen_publicar": res_pub,
        "commit_app": commit_app, "commit_datos": commit_datos,
        "duracion": str(dt.datetime.now() - inicio).split(".")[0],
        "log": str(ruta_log) if ruta_log else "(consola)",
        "fallo": None,
    }
    ruta = escribir_informe(cfg, informe)
    log(f"informe: {ruta}")
    log(f"resumen: {res_pub['ciudades']} ciudades, {res_pub['obras']} obras, "
        f"sin_municipio={res_rep.get('sin_municipio', '?')}")
    log("PENDIENTE: revisión humana (ver informe). Nada publicado, nada pusheado.")
    return 0


# --- Entrada --------------------------------------------------------------------

def _con_log(cfg: Config, nombre: str, funcion) -> int:
    cfg.logs.mkdir(parents=True, exist_ok=True)
    ruta_log = cfg.logs / f"{dt.datetime.now():%Y%m%d-%H%M%S}-{nombre}.log"
    with ruta_log.open("w", encoding="utf-8") as h:
        def log(mensaje: str) -> None:
            print(mensaje, flush=True)
            h.write(str(mensaje) + "\n")
            h.flush()
        try:
            with adquirir_lock(cfg.lock, log):
                return funcion(cfg, log, ruta_log)
        except Fallo as e:
            log(f"ERROR ({e.codigo}): {e.mensaje}")
            log(f"log completo: {ruta_log}")
            return e.codigo


def main(argv: list[str] | None = None) -> int:
    try:
        cfg, modo = construir(argv)
    except Fallo as e:
        print(f"ERROR ({e.codigo}): {e.mensaje}", file=sys.stderr)
        return e.codigo
    if modo == "plan":
        return cmd_plan(cfg)
    if modo == "inicializar":
        return _con_log(cfg, "inicializar", cmd_inicializar)
    return _con_log(cfg, "ejecutar", cmd_ejecutar)


if __name__ == "__main__":
    sys.exit(main())
