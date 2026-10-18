#!/usr/bin/env python3
"""
test_actualizar_semanal.py — Tests del runner de la pasada semanal.

Todo con librería estándar: se mockea `run_cmd` (subprocess) y se trabaja en
directorios temporales. Ningún test toca los repos reales ni usa red.

Uso:  python3 scripts/test_actualizar_semanal.py
"""

from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

RUTA_MODULO = Path(__file__).resolve().parent / "actualizar-semanal.py"
spec = importlib.util.spec_from_file_location("actualizar_semanal", RUTA_MODULO)
asem = importlib.util.module_from_spec(spec)
sys.modules["actualizar_semanal"] = asem  # dataclass lo necesita en py3.14
spec.loader.exec_module(asem)


def pid_muerto() -> int:
    """Un pid del que seguro ya no corre nada (hijo que terminó)."""
    hijo = subprocess.Popen([sys.executable, "-c", ""])
    hijo.wait()
    return hijo.pid


class FakeCmd:
    """run_cmd de mentira: graba todo lo pedido y guiona respuestas de git/pasada."""

    def __init__(self):
        self.cmds: list[tuple[list[str], Path]] = []
        self.status = ""                      # git status --porcelain
        self.rama = "semanal/previa"
        self.cabeza = "cccccccccccccccccccc"
        self.objetivo = "aaaaaaaaaaaaaaaaaaaa"
        self.rc_descargar = 0

    def __call__(self, argv, cwd, log=None, titulo=None):
        argv = [str(a) for a in argv]
        self.cmds.append((argv, Path(str(cwd))))
        if argv[:2] == ["git", "clone"]:
            destino = Path(argv[-1])
            destino.mkdir(parents=True, exist_ok=True)
            if destino.name == "valio-app":   # el tsc que comprueba cmd_ejecutar
                tsc = destino / "node_modules" / ".bin" / "tsc"
                tsc.parent.mkdir(parents=True, exist_ok=True)
                tsc.touch()
            return 0, ""
        if argv[1:4] == ["rev-parse", "--verify", "--quiet"]:
            return 1, ""                      # la rama no existe todavía
        if argv == ["git", "status", "--porcelain"]:
            return 0, self.status
        if argv == ["git", "rev-parse", "--abbrev-ref", "HEAD"]:
            return 0, self.rama
        if argv == ["git", "rev-parse", "FETCH_HEAD"]:
            return 0, self.objetivo
        if argv == ["git", "rev-parse", "HEAD"]:
            return 0, self.cabeza
        if "--short" in argv:
            return 0, "abc1234"
        i_pasada = next((i for i, a in enumerate(argv) if a.endswith("pasada.py")), None)
        if i_pasada is not None:
            sub = argv[i_pasada + 1]
            if sub == "descargar":
                return self.rc_descargar, "descargando https://lugar/ejemplo.zip\n"
            if sub == "repartir":
                return 0, ("e_202512.zip: 10 entradas\n\nResumen de la pasada\n"
                           "  sin_municipio: 3\n  sin municipio, por plataforma:\n    643: 2\n")
            if sub == "publicar":
                # a partir de aquí el árbol de staging queda sucio (hay resultado)
                self.status = " M datos/nacional/indice.json\n"
                return 0, ("03014 Alicante: 10 entradas → 5 expedientes (1 anulados) → 4 obras\n"
                           "03015 Elche: 8 entradas → 4 expedientes (0 anulados) → 3 obras\n")
        return 0, "ok"

    def argvs(self) -> list[list[str]]:
        return [argv for argv, _ in self.cmds]

    def hay(self, sub: str) -> bool:
        return any(sub in argv for argv in self.argvs())


class BaseConStaging(unittest.TestCase):
    """Config con staging ya aprovisionado (marker + caché + tsc de mentira)."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.raiz = Path(self.tmp.name) / "raiz"
        self.raiz.mkdir()
        self.cfg = asem.Config(raiz=self.raiz, repo_datos=Path(self.tmp.name) / "datos",
                               meses=("2025-12", "2026-01"))
        self.cfg.repo_datos.mkdir()  # existe, pero solo se lee
        # bootstrap hecho: marker + caché en staging de datos + bin/tsc en la app
        self.cfg.datos.joinpath(".cache", "nacional").mkdir(parents=True)
        self.cfg.marker.parent.mkdir(parents=True, exist_ok=True)
        self.cfg.marker.write_text("{}", encoding="utf-8")
        self.poner_app()

    def poner_app(self):
        self.cfg.app.mkdir(parents=True, exist_ok=True)
        tsc = self.cfg.app / "node_modules" / ".bin" / "tsc"
        tsc.parent.mkdir(parents=True, exist_ok=True)
        tsc.touch()

    def tearDown(self):
        self.tmp.cleanup()

    def correr(self, fake: FakeCmd) -> int:
        with mock.patch.object(asem, "run_cmd", fake):
            try:
                return asem.cmd_ejecutar(self.cfg, log=lambda m: None)
            except asem.Fallo as e:
                return e.codigo


class TestMesesVivos(unittest.TestCase):
    def test_enero_cruza_el_ano(self):
        self.assertEqual(asem.meses_vivos(__import__("datetime").date(2027, 1, 15)),
                         ("2026-12", "2027-01"))

    def test_bisiesto_y_fin_de_mes(self):
        fecha = __import__("datetime").date
        self.assertEqual(asem.meses_vivos(fecha(2024, 2, 29)), ("2024-01", "2024-02"))
        self.assertEqual(asem.meses_vivos(fecha(2024, 3, 1)), ("2024-02", "2024-03"))
        self.assertEqual(asem.meses_vivos(fecha(2026, 12, 31)), ("2026-11", "2026-12"))


class TestPlan(unittest.TestCase):
    def test_plan_no_hace_nada(self):
        with tempfile.TemporaryDirectory() as tmp:
            raiz = Path(tmp) / "raiz"
            raiz.mkdir()
            cfg = asem.Config(raiz=raiz, repo_datos=Path(tmp) / "datos")

            def explotar(*a, **k):
                raise AssertionError("el plan no debe ejecutar nada")

            with mock.patch.object(asem, "run_cmd", explotar):
                rc = asem.cmd_plan(cfg)
            self.assertEqual(rc, 0)
            self.assertFalse((raiz / ".cache").exists(), "--plan no debe crear .cache")


class TestEjecutar(BaseConStaging):
    def test_sin_bootstrap_se_niega_y_no_descarga(self):
        self.cfg.marker.unlink()
        self.cfg.datos.joinpath(".cache", "nacional").rmdir()
        fake = FakeCmd()
        rc = self.correr(fake)
        self.assertEqual(rc, 5)
        self.assertEqual(fake.cmds, [], "sin baseline no se lanza NADA (histórico protegido)")

    def test_camino_feliz_publica_todos_y_conserva_zip(self):
        fake = FakeCmd()
        rc = self.correr(fake)
        self.assertEqual(rc, 0, f"comandos: {fake.argvs()}")
        # publica --todos y reparte --conservar-zip, con los meses pedidos
        self.assertTrue(any("publicar" in a and "--todos" in a for a in fake.argvs()))
        self.assertTrue(any("repartir" in a and "--conservar-zip" in a for a in fake.argvs()))
        descargar = next(a for a in fake.argvs() if "descargar" in a)
        self.assertEqual(descargar[-2:], ["2025-12", "2026-01"])
        # commits locales de revisión en ambos staging (git -c user.name … commit)
        self.assertEqual(sum(1 for a in fake.argvs() if "commit" in a[1:]), 2)
        self.assertTrue(all("semanal(" in " ".join(a) for a in fake.argvs() if "commit" in a[1:]))

    def test_ni_push_ni_reset_y_todo_dentro_de_staging(self):
        fake = FakeCmd()
        self.correr(fake)
        for argv in fake.argvs():
            self.assertNotIn("push", argv)
            self.assertNotIn("reset", argv)
        for argv, cwd in fake.cmds:
            self.assertTrue(cwd == self.cfg.staging or self.cfg.staging in cwd.parents,
                            f"cwd fuera de staging: {cwd}")

    def test_clone_sin_hardlinks_si_falta_la_app(self):
        shutil = __import__("shutil")
        shutil.rmtree(self.cfg.app)
        fake = FakeCmd()
        rc = self.correr(fake)
        self.assertEqual(rc, 0)
        clones = [a for a in fake.argvs() if a[:2] == ["git", "clone"]]
        self.assertTrue(clones)
        self.assertIn("--no-hardlinks", clones[0])

    def test_fallo_en_descargar_corta_el_pipeline(self):
        fake = FakeCmd()
        fake.rc_descargar = 1
        rc = self.correr(fake)
        self.assertEqual(rc, 6)
        self.assertFalse(fake.hay("publicar"))
        self.assertFalse(fake.hay("repartir"))
        self.assertFalse(any("commit" in a[1:] for a in fake.argvs()))


class TestGuardasDeStaging(BaseConStaging):
    def test_staging_sucio_se_detiene_antes_de_fetch(self):
        fake = FakeCmd()
        fake.status = " M datos/nacional/indice.json\n"
        rc = self.correr(fake)
        self.assertEqual(rc, 4)
        self.assertFalse(fake.hay("fetch"))
        self.assertFalse(fake.hay("descargar"))

    def test_staging_divergido_rechaza_sin_checkout(self):
        fake = FakeCmd()
        fake.rama = "main"          # no es rama nuestra…
        fake.cabeza = "bbbb1111"    # …y además difiere del objetivo: diffs ajenos
        rc = self.correr(fake)
        self.assertEqual(rc, 7)
        self.assertFalse(any(a[1:2] == ["checkout"] for a in fake.argvs()))
        self.assertFalse(fake.hay("descargar"))


class TestLock(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.ruta = Path(self.tmp.name) / "lock"
        self.log = lambda m: None

    def tearDown(self):
        self.tmp.cleanup()

    def test_segunda_pasada_rechazada(self):
        primero = asem.adquirir_lock(self.ruta, self.log)
        with self.assertRaises(asem.LockOcupado):
            asem.adquirir_lock(self.ruta, self.log)
        primero.liberar()
        self.assertNotExists()

    def assertNotExists(self):
        self.assertFalse(self.ruta.exists())

    def test_lock_huerfano_de_pid_muerto_se_recupera(self):
        self.ruta.write_text(json.dumps({"pid": pid_muerto()}), encoding="utf-8")
        lock = asem.adquirir_lock(self.ruta, self.log)  # no debe lanzar LockOcupado
        lock.liberar()
        self.assertNotExists()


class TestCopiarCache(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.origen = base / "o"
        self.destino = base / "d"
        gen = self.origen / ".cache" / "nacional" / "generaciones" / "gen1"
        gen.joinpath("entradas").mkdir(parents=True)
        gen.joinpath("estado.json").write_text("{}", encoding="utf-8")
        gen.joinpath("bajas.tsv").write_text("x\tANULADA\ty\n", encoding="utf-8")
        gen.joinpath("entradas", "03014.jsonl").write_text("{}\n", encoding="utf-8")
        gen.joinpath("entradas", "raro.tmp").write_text("basura", encoding="utf-8")
        os.symlink("../bajas.tsv", gen.joinpath("entradas", "enlace"))
        zip_o = self.origen / ".cache" / "nacional" / "zip"
        zip_o.mkdir()
        zip_o.joinpath("a.zip").write_bytes(b"PK")
        zip_o.joinpath("b.zip.part").write_bytes(b"")
        (self.origen / ".cache" / "nacional" / "actual").write_text("gen1\n", encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def copiar(self):
        return asem.copiar_cache(self.origen, self.destino, lambda m: None)

    def test_copia_independiente_y_saneada(self):
        stats = self.copiar()
        gen_d = self.destino / ".cache" / "nacional" / "generaciones" / "gen1"
        self.assertEqual((self.destino / ".cache" / "nacional" / "actual").read_text(), "gen1\n")
        self.assertTrue(gen_d.joinpath("estado.json").is_file())
        self.assertEqual(stats["ficheros"], 4)  # estado, bajas, jsonl y a.zip
        # sin symlinks ni restos
        self.assertFalse(gen_d.joinpath("entradas", "enlace").exists())
        self.assertFalse(gen_d.joinpath("entradas", "raro.tmp").exists())
        self.assertFalse((self.destino / ".cache" / "nacional" / "zip" / "b.zip.part").exists())
        # copia de contenido: otro inodo, nunca hardlink
        origen_i = (self.origen / ".cache" / "nacional" / "generaciones" / "gen1" / "entradas" / "03014.jsonl").stat().st_ino
        destino_i = gen_d.joinpath("entradas", "03014.jsonl").stat().st_ino
        self.assertNotEqual(origen_i, destino_i)

    def test_baseline_incompleto_se_niega(self):
        (self.origen / ".cache" / "nacional" / "generaciones" / "gen1" / "bajas.tsv").unlink()
        with self.assertRaises(asem.FaltaBootstrap):
            self.copiar()


class TestParseadores(unittest.TestCase):
    def test_resumen_publicar(self):
        salida = ("03014 Alicante: 10 entradas → 5 expedientes (1 anulados) → 4 obras\n"
                  "03015 Elche: 8 entradas → 4 expedientes (0 anulados) → 3 obras\n"
                  "AVISO: otra cosa\n")
        self.assertEqual(asem.resumen_publicar(salida), {"ciudades": 2, "obras": 7})

    def test_resumen_repartir(self):
        salida = ("e.zip: 5 entradas\n\nResumen de la pasada\n  sin_municipio: 3\n"
                  "  bajas_ANULADA: 1\n  sin municipio, por plataforma:\n    643: 2\n")
        res = asem.resumen_repartir(salida)
        self.assertEqual(res["sin_municipio"], 3)
        self.assertEqual(res["por_plataforma"], {"643": 2})


if __name__ == "__main__":
    unittest.main(verbosity=2)
