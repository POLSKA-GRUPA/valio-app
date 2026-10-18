"""Regresión de R20: fotos versionadas, descarga lenta y fichero roto.

Ejecutar: python3 -m unittest discover -s docs/uat -p test_fotos_locales.py -v
No accede al IGN ni escribe votos/capturas.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import time
import unittest

from playwright.sync_api import sync_playwright
from imagenes import imagen_cargada

RAIZ = Path(__file__).resolve().parents[2]


def datos_generados(archivo, marca):
    texto = (RAIZ / archivo).read_text()
    return json.JSONDecoder().raw_decode(texto, texto.index(marca) + len(marca))[0]


class FotosLocales(unittest.TestCase):
    def test_todas_las_ubicaciones_precisas_tienen_fotos_locales(self):
        obras = datos_generados("lib/obras.ts", "export const OBRAS: Obra[] = ")
        vistas = datos_generados("lib/aerea.ts", "export const VISTAS_AEREAS: Record<string, VistaAerea> = ")
        precisas = {o["id"] for o in obras if o.get("ubicacion", {}).get("precision") not in (None, "municipio", "sin_ubicacion", "aproximada")}
        self.assertTrue(precisas)
        self.assertEqual(set(vistas), precisas)
        for vista in vistas.values():
            for foto in (vista["ahora"], vista.get("antes")):
                if foto:
                    self.assertTrue(foto["src"].startswith("/aerea/"))
                    fichero = RAIZ / "public" / foto["src"].lstrip("/")
                    self.assertGreater(fichero.stat().st_size, 0)
                    self.assertTrue(foto["atribucion"])


class DescargaLenta(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        class Servidor(SimpleHTTPRequestHandler):
            def do_GET(self):
                if self.path.startswith("/lenta.webp"):
                    time.sleep(0.8)
                    self.path = "/aerea/OBRA-06-ahora.webp"
                super().do_GET()

            def log_message(self, *_args):
                pass

        cls.http = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Servidor, directory=str(RAIZ / "public")))
        cls.hilo = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.hilo.start()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()
        cls.base = f"http://127.0.0.1:{cls.http.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.http.shutdown()
        cls.http.server_close()
        cls.hilo.join()

    def test_la_descarga_lenta_no_es_un_falso_fallo(self):
        page = self.browser.new_page()
        try:
            page.route("https://www.ign.es/**", lambda ruta: ruta.abort())
            page.set_content(f'<img src="{self.base}/lenta.webp">', wait_until="domcontentloaded")
            foto = page.locator("img")
            self.assertFalse(foto.evaluate("img => img.complete && img.naturalWidth > 0"))
            self.assertTrue(imagen_cargada(page, foto))
        finally:
            page.close()

    def test_una_imagen_inexistente_sigue_fallando(self):
        page = self.browser.new_page()
        try:
            page.set_content(f'<img src="{self.base}/no-existe.webp">')
            self.assertFalse(imagen_cargada(page, page.locator("img"), timeout=400))
        finally:
            page.close()
