"""Prueba E2E de ¿VALIÓ? — piloto real de Teulada: gestos, botones, teclado, ficha, borrador, persistencia."""
import json
import secrets
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request

from playwright.sync_api import sync_playwright

# VALIO_BASE permite probar contra otro puerto si el 3000 está ocupado.
PESTAÑAS_ESPERADAS = ["Votar", "Obras", "Info"]
BASE = os.environ.get("VALIO_BASE", "http://localhost:3000")
# Contra producción, la UAT no puede sumar sus votos al recuento real: los POST
# a /api/recuento se interceptan y las pruebas V1-V6 solo corren en local.
LOCAL = urllib.parse.urlparse(BASE).hostname in ("localhost", "127.0.0.1")
# Carpeta de capturas portable (junto a este script); nada de rutas de un solo equipo.
SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "capturas")
os.makedirs(SHOTS, exist_ok=True)
ISSUES = []
console_errors = []

# Windows: la consola puede usar cp1252 y los checks llevan flechas (↓ ↑).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def shot(page, name):
    page.screenshot(path=f"{SHOTS}/{name}.png", full_page=False)

def check(name, cond, detail=""):
    status = "OK " if cond else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        ISSUES.append({"id": name, "detail": detail})

def _evidencia_por_nombre():
    """{nombre de obra: etiqueta de evidencia} leído de lib/obras.ts (generado)."""
    raiz = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    with open(os.path.join(raiz, "lib", "obras.ts"), encoding="utf-8") as f:
        fuente = f.read()
    marca = "export const OBRAS: Obra[] = "
    obras, _ = json.JSONDecoder().raw_decode(fuente, fuente.index(marca) + len(marca))
    bloque = fuente[fuente.index("ESTADO_LABEL"):]
    bloque = bloque[: bloque.index("};")]
    etiquetas = dict(re.findall(r'^\s+([A-Z_]+): "([^"]+)",?$', bloque, re.M))
    return {o["nombre"]: etiquetas.get(o["estadoDato"]) for o in obras}

EVIDENCIA = _evidencia_por_nombre()

def _con_punto_por_nombre():
    """{nombre de obra: True si tiene ubicación precisa} leído de lib/obras.ts."""
    raiz = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    with open(os.path.join(raiz, "lib", "obras.ts"), encoding="utf-8") as f:
        fuente = f.read()
    marca = "export const OBRAS: Obra[] = "
    obras, _ = json.JSONDecoder().raw_decode(fuente, fuente.index(marca) + len(marca))
    return {
        o["nombre"]: bool(o.get("ubicacion")) and o["ubicacion"]["precision"] not in ("municipio", "sin_ubicacion")
        for o in obras
    }

CON_PUNTO = _con_punto_por_nombre()

def _con_antes_por_nombre():
    """Nombres de obras cuya vista aérea trae foto «antes» (comparador)."""
    raiz = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    with open(os.path.join(raiz, "lib", "obras.ts"), encoding="utf-8") as f:
        fuente = f.read()
    marca = "export const OBRAS: Obra[] = "
    obras, _ = json.JSONDecoder().raw_decode(fuente, fuente.index(marca) + len(marca))
    with open(os.path.join(raiz, "lib", "aerea.ts"), encoding="utf-8") as f:
        fuente = f.read()
    marca = "export const VISTAS_AEREAS: Record<string, VistaAerea> = "
    vistas, _ = json.JSONDecoder().raw_decode(fuente, fuente.index(marca) + len(marca))
    return {o["nombre"] for o in obras if (vistas.get(o["id"]) or {}).get("antes")}

CON_ANTES = _con_antes_por_nombre()

def nombre_arriba(page):
    """Nombre de la tarjeta de arriba del mazo. A diferencia de nombre_top, no
    puede leer una tarjeta que aún vuela (está fuera del primer hueco)."""
    return page.locator(".stack-slot").first.locator(".card-nombre").inner_text()

def avanzar_hasta(page, quiere_punto, maximo=25):
    """Pasa tarjetas («No puedo valorarlo») hasta una obra con o sin ubicación."""
    for _ in range(maximo):
        esperar_sin_vuelo(page)
        if CON_PUNTO.get(nombre_arriba(page).strip()) == quiere_punto:
            return True
        page.get_by_role("button", name="No puedo valorarlo").first.click()
    esperar_sin_vuelo(page)
    return CON_PUNTO.get(nombre_arriba(page).strip()) == quiere_punto

def etiqueta_evidencia(nombre):
    return EVIDENCIA.get((nombre or "").strip())

def nombre_top(page):
    return page.locator(".card-nombre").first.inner_text()

def esperar_nombre_distinto(page, anterior, ms=4000):
    page.wait_for_function(
        "(a) => (document.querySelector('.card-nombre')?.textContent || '') !== a",
        arg=anterior,
        timeout=ms,
    )

def esperar_sin_vuelo(page, ms=4000):
    """Espera a que termine el vuelo de la tarjeta votada.

    Mientras vuela, la app desactiva los botones de voto (Deck.tsx). Antes se
    buscaba un aria-label «Voto registrado» que no existe (ese texto solo va en
    la región role=status), así que no esperaba nada: la tarjeta en vuelo seguía
    en el primer hueco y un clic podía caer en la de debajo.
    """
    page.wait_for_function(
        "() => { const b = document.querySelector('.action-btn'); return !b || !b.disabled; }",
        timeout=ms,
    )

def votar_valio_hasta_vaciar(page, maximo=60):
    """Pulsa ✓ hasta vaciar el mazo, esperando a que acabe cada vuelo
    (mientras la carta vuela, los botones están desactivados)."""
    for _ in range(maximo):
        if page.locator(".empty-deck").count():
            break
        page.get_by_role("button", name="Valió", exact=True).click()
        page.wait_for_function(
            "() => document.querySelector('.empty-deck')"
            " || !document.querySelector('.action-btn[disabled]')",
            timeout=4000,
        )
    page.wait_for_selector(".empty-deck", timeout=6000)

def abrir_filtros(page):
    """Con el rediseño, orden y filtro viven en un menú: lo abre si está cerrado."""
    boton = page.get_by_role("button", name="Ordenar y filtrar")
    if boton.get_attribute("aria-expanded") != "true":
        boton.click()
        page.wait_for_timeout(200)

def nombres_pestañas(page):
    # Cada pestaña es «icono\netiqueta»: nos quedamos con la etiqueta.
    return [t.strip().split("\n")[-1] for t in page.get_by_role("tab").all_inner_texts()]

# Desde el #37 la app empieza por «¿Dónde vives?». Los contextos que prueban
# otras cosas entran con el municipio ya recordado, como un usuario que vuelve.
MUNICIPIO_KEY = "valio.municipio.v2"
TEULADA_GUARDADA = '{"ine":"03128","nombre":"Teulada","provincia":"Alicante/Alacant","ccaa":"Comunitat Valenciana","numObras":21}'
RECORDAR_TEULADA = (
    "try { if (!localStorage.getItem('%s')) localStorage.setItem('%s', '%s'); } catch (e) {}"
    % (MUNICIPIO_KEY, MUNICIPIO_KEY, TEULADA_GUARDADA)
)

def nuevo_contexto(browser, **kw):
    contexto = browser.new_context(**kw)
    contexto.add_init_script(RECORDAR_TEULADA)
    return contexto

def _servidor_listo():
    try:
        with urllib.request.urlopen(BASE, timeout=2) as respuesta:
            return respuesta.status == 200
    except Exception:
        return False

def with_server():
    """Garantiza que hay app servida en BASE.

    Si ya hay un servidor (p. ej. `npm run dev` en otra terminal) lo reutiliza.
    Si no, arranca uno y devuelve una función `parar()` para terminarlo
    (mejor esfuerzo: en Windows puede quedar un node suelto en el 3000).
    """
    if _servidor_listo():
        print("[with_server] servidor ya en marcha: se reutiliza")
        return lambda: None

    print("[with_server] no hay servidor: arrancando npm run dev...")
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    proceso = subprocess.Popen(
        "npm run dev",
        cwd=raiz,
        shell=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for _ in range(90):
        if _servidor_listo():
            print("[with_server] servidor listo")
            break
        time.sleep(1)
    else:
        proceso.terminate()
        raise RuntimeError("with_server: el servidor no respondió en 90 s")

    def parar():
        proceso.terminate()
        time.sleep(1)
        if _servidor_listo():
            print("[with_server] ojo: puede quedar un node vivo en el puerto 3000")

    return parar

parar_servidor = with_server()

def _api(metodo, ruta, cuerpo=None, cabeceras=None):
    """(estado, json) de una llamada a la API del recuento."""
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo, headers={"Content-Type": "application/json", **(cabeceras or {})})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, {}

def _recuento(obra_id):
    estado, datos = _api("GET", f"/api/recuento?obras={urllib.parse.quote(obra_id)}")
    return datos.get("recuento", {}).get(obra_id) if estado == 200 else None

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    if not LOCAL:
        _new_context = browser.new_context

        def _sin_votos_reales(**kw):
            c = _new_context(**kw)
            c.route(
                "**/api/recuento",
                lambda route: route.fulfill(status=200, content_type="application/json", body='{"aplicados":0}')
                if route.request.method == "POST"
                else route.continue_(),
            )
            return c

        browser.new_context = _sin_votos_reales
    ctx = browser.new_context(viewport={"width": 375, "height": 812}, has_touch=True, locale="es-ES")
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    page = ctx.new_page()
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: console_errors.append(str(e)))

    page.goto(BASE, wait_until="networkidle")
    check("carga inicial", page.locator(".brand").count() == 1)

    # 0. Primera visita: «¿Dónde vives?» antes que el mazo (issue #37).
    # Esperamos: con el servidor recién arrancado, la app tarda en leer el dispositivo.
    try:
        page.wait_for_selector("#municipio-titulo", timeout=10000)
    except Exception:
        pass
    check("pregunta el municipio en la primera visita", page.get_by_role("heading", name="¿Dónde vives?").is_visible())
    page.get_by_role("searchbox", name="Busca tu municipio").fill("teulada")
    page.get_by_role("button", name="Teulada").click()
    page.wait_for_selector(".tutorial", timeout=4000)

    # 1. Tutorial
    tut = page.locator(".tutorial")
    check("tutorial visible en primera visita", tut.is_visible())
    shot(page, "01-tutorial")

    # 1b. Las flechas NO votan durante el tutorial
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(600)
    check("teclado bloqueado durante tutorial", "asfaltado" in (nombre_top(page) or "").lower())
    page.get_by_role("button", name="Entendido, a votar").click()
    page.wait_for_timeout(400)
    check("tutorial se cierra", not tut.is_visible())

    # 2. Tarjeta superior visible (OBRA-01: asfaltado de calles)
    check("tarjeta OBRA-01 visible", "asfaltado" in (nombre_top(page) or "").lower())
    # Contar antes de leer: si no hay etiqueta, FAIL limpio en vez de esperar 30 s y caerse.
    etiqueta = page.locator(".card-frame .tag")
    esperada = etiqueta_evidencia(nombre_top(page))
    leida = etiqueta.first.inner_text() if etiqueta.count() > 0 else None
    check(
        "etiqueta de evidencia en tarjeta (la de la obra)",
        esperada is not None and leida == esperada,
        f"leída={leida!r} esperada={esperada!r}",
    )
    shot(page, "02-mazo-inicial")

    # 3. Botón NO VALIÓ -> sin match (#38), solo el aviso de voto guardado
    antes = nombre_top(page)
    page.get_by_role("button", name="No valió").click()
    page.wait_for_timeout(500)
    check("sin match tras NO VALIÓ", page.locator(".match-screen").count() == 0)
    check("aviso de voto guardado", page.locator(".voto-guardado").is_visible())
    shot(page, "03-voto-guardado")
    esperar_nombre_distinto(page, antes)

    # 4. Pedir explicaciones desde la ficha
    page.get_by_role("button", name="Ver ficha y evidencia").click()
    page.wait_for_timeout(500)
    page.get_by_role("button", name="Pedir explicaciones").click()
    page.wait_for_timeout(500)
    ta = page.locator("#claim-texto")
    check("borrador HITL visible", ta.is_visible())
    check("borrador avisa que la persona envía", "nunca envía" in ta.input_value())
    ta.fill(ta.input_value().replace("[NOMBRE Y APELLIDOS]", "Kenyi Prueba"))
    page.get_by_role("button", name="Copiar borrador").click()
    page.wait_for_timeout(300)
    check("copiado confirmado", page.get_by_text("¡Copiado!").is_visible())
    shot(page, "04-borrador-explicaciones")
    page.get_by_role("button", name="Cerrar", exact=True).last.click()
    page.wait_for_selector(".sheet-backdrop", state="detached")
    page.wait_for_timeout(150)
    page.evaluate("document.activeElement && document.activeElement.blur()")

    # 5. Gesto de arrastre a la izquierda (siguiente obra)
    antes = nombre_top(page)
    card = page.locator(".stack-slot").first.locator(".card-frame")
    box = card.bounding_box()
    cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] * 0.35
    page.mouse.move(cx, cy)
    page.mouse.down()
    for i in range(1, 21):
        page.mouse.move(cx - i * 20, cy, steps=3)
        page.wait_for_timeout(16)
    page.wait_for_timeout(120)
    shot(page, "05-gesto-sello-novalio")
    page.mouse.up()
    esperar_nombre_distinto(page, antes)
    check("arrastre a la izquierda vota", True)

    # 6. Botón ↑ pido explicaciones (siguiente obra)
    antes = nombre_top(page)
    page.get_by_role("button", name="Pido explicaciones").click()
    esperar_nombre_distinto(page, antes)
    check("botón explica consume tarjeta", True)
    check("botón explica abre el borrador", page.locator("#claim-texto").is_visible())
    page.keyboard.press("Escape")
    page.wait_for_selector(".sheet-backdrop", state="detached")
    page.wait_for_timeout(150)

    # 7. Ficha con Enter (foco al cuerpo) y sus secciones (siguiente obra)
    page.evaluate("document.activeElement && document.activeElement.blur()")
    page.keyboard.press("Enter")
    page.wait_for_timeout(500)
    hoja = page.locator(".sheet")
    check("ficha se abre con Enter", hoja.is_visible())
    secciones = page.locator(".sheet .ficha-seccion").count()
    check("ficha con secciones obra/documentos/vecino/evidencia", secciones >= 4, f"secciones={secciones}")
    check("ficha con nivel de evidencia", "nivel de evidencia" in hoja.inner_text().lower())
    shot(page, "06-ficha")

    # 7b. Escape cierra la ficha
    page.keyboard.press("Escape")
    page.wait_for_selector(".sheet-backdrop", state="detached")
    page.wait_for_timeout(150)
    check("ficha se cierra con Escape", page.locator(".sheet").count() == 0)

    # 8. Botón ↓ no puedo valorarlo
    antes = nombre_top(page)
    page.get_by_role("button", name="No puedo valorarlo").click()
    esperar_nombre_distinto(page, antes)
    check("botón ↓ consume tarjeta", True)

    # 9. Votar el resto con ✓
    votar_valio_hasta_vaciar(page)
    check("mazo vacío al final", "Ya has votado todo" in page.locator(".empty-deck").inner_text())
    check("contador con 21 votos", "21/21" in page.locator(".brand-badge").inner_text())
    shot(page, "07-mazo-vacio")

    # 10-11. Cabreo y Resultados ocultas en P1 (#38): solo Votar e Info
    check("pestañas esperadas (Votar e Info; con rediseño, también Obras)", nombres_pestañas(page) == PESTAÑAS_ESPERADAS, f"{nombres_pestañas(page)}")

    # 12. Info
    page.get_by_role("tab", name="Info").click()
    page.wait_for_timeout(300)
    check("info con aviso de piloto real (PLACE)", "place" in page.locator(".panel").inner_text().lower())

    # 13. Persistencia tras recarga (el contador lee los votos guardados)
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(400)
    check("votos persisten tras recarga", "21/21" in page.locator(".brand-badge").inner_text())

    # 14. Teclado en estado limpio (otro contexto sin votos)
    ctx2 = nuevo_contexto(browser, viewport={"width": 375, "height": 812})
    p2 = ctx2.new_page()
    p2.goto(BASE, wait_until="networkidle")
    p2.get_by_role("button", name="Entendido, a votar").click()
    p2.wait_for_timeout(400)
    p2.evaluate("document.activeElement && document.activeElement.blur()")
    p2.keyboard.press("ArrowRight")
    esperar_nombre_distinto(p2, "Obras de asfaltado e inversiones para mejora de calles municipales")
    check("flecha derecha vota sin match", not p2.locator(".match-screen").is_visible())
    check("tarjeta consumida por teclado", "asfaltado" not in nombre_top(p2))
    antes2 = nombre_top(p2)
    p2.keyboard.press("ArrowUp")
    esperar_nombre_distinto(p2, antes2)
    check("flecha arriba consume tarjeta", True)

    # 15. Tamaños de pantalla
    for w, h, name in [(414, 896, "10-414"), (768, 1024, "11-768")]:
        pg = nuevo_contexto(browser, viewport={"width": w, "height": h}, locale="es-ES").new_page()
        pg.goto(BASE, wait_until="networkidle")
        pg.get_by_role("button", name="Entendido, a votar").click()
        pg.wait_for_timeout(300)
        ok_layout = pg.locator(".action-btn.big").first.bounding_box()
        visible = ok_layout and ok_layout["y"] + ok_layout["height"] <= h
        check(f"layout usable a {w}px", bool(visible))
        shot(pg, f"{name}-mazo")
        pg.close()

    # 16. REGRESIONES de los bugs de la UAT semana 1 (#11-#15).
    # Cada check debe FALLAR si se quita el fix correspondiente.

    # R1 — ISSUE-11: copiar sin contexto seguro (sin navigator.clipboard).
    ctx_r1 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r1 = ctx_r1.new_page()
    # simulamos un origen no seguro: sin API moderna de portapapeles
    p_r1.add_init_script(
        "Object.defineProperty(navigator, 'clipboard', { get: () => undefined });"
    )
    p_r1.goto(BASE, wait_until="networkidle")
    p_r1.get_by_role("button", name="Entendido, a votar").click()
    p_r1.get_by_role("button", name="Ver ficha y evidencia").click()
    p_r1.get_by_role("button", name="Pedir explicaciones").click()
    check("R1 ISSUE-11: borrador abierto", p_r1.locator("#claim-texto").is_visible())
    p_r1.get_by_role("button", name="Copiar borrador").click()
    p_r1.wait_for_timeout(400)
    check(
        "R1 ISSUE-11: copia sin navigator.clipboard (fallback)",
        p_r1.get_by_text("¡Copiado!").is_visible(),
    )
    shot(p_r1, "12-reg-issue11-copia")
    ctx_r1.close()

    # R2 — ISSUE-12: Volver a empezar rellena el mazo (recargar no basta:
    # los votos persisten en localStorage).
    ctx_r2 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r2 = ctx_r2.new_page()
    p_r2.goto(BASE, wait_until="networkidle")
    p_r2.get_by_role("button", name="Entendido, a votar").click()
    p_r2.wait_for_timeout(300)
    votar_valio_hasta_vaciar(p_r2)
    p_r2.get_by_role("button", name="Volver a empezar").click()
    p_r2.wait_for_timeout(600)
    check(
        "R2 ISSUE-12: volver a empezar rellena el mazo",
        p_r2.locator(".card-nombre").first.is_visible(),
    )
    shot(p_r2, "13-reg-issue12-volver")
    ctx_r2.close()

    # R3 — ISSUE-13: paneles ocultos fuera del layout y mazo a pantalla.
    ctx_r3 = nuevo_contexto(browser, viewport={"width": 740, "height": 360}, locale="es-ES")
    p_r3 = ctx_r3.new_page()
    p_r3.goto(BASE, wait_until="networkidle")
    check(
        "R3 ISSUE-13: panel oculto fuera del layout",
        p_r3.locator("#panel-info").is_hidden(),
    )
    caja_mazo = p_r3.locator(".deck-zone").bounding_box()
    check(
        "R3 ISSUE-13: el mazo llena la pantalla en horizontal",
        bool(caja_mazo) and caja_mazo["height"] >= 180,
        f"alto={caja_mazo and round(caja_mazo['height'])}",
    )
    shot(p_r3, "14-reg-issue13-horizontal")
    ctx_r3.close()

    # R4 — ISSUE-14: el tutorial vive dentro del mazo: si el mazo tiene alto,
    # el tutorial tiene espacio.
    ctx_r4 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r4 = ctx_r4.new_page()
    p_r4.goto(BASE, wait_until="networkidle")
    caja_tut = p_r4.locator(".tutorial").bounding_box()
    check(
        "R4 ISSUE-14: tutorial con espacio suficiente",
        bool(caja_tut) and caja_tut["height"] >= 300,
        f"alto={caja_tut and round(caja_tut['height'])}",
    )
    shot(p_r4, "15-reg-issue14-tutorial")
    ctx_r4.close()

    # R5 — ISSUE-15: el enlace a la ficha es visible y dentro de la carta.
    ctx_r5 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r5 = ctx_r5.new_page()
    p_r5.goto(BASE, wait_until="networkidle")
    p_r5.get_by_role("button", name="Entendido, a votar").click()
    p_r5.wait_for_timeout(300)
    enlace = p_r5.locator(".card-ficha-link").first
    caja_enlace = enlace.bounding_box()
    caja_carta = p_r5.locator(".card-frame").first.bounding_box()
    dentro = (
        bool(caja_enlace)
        and bool(caja_carta)
        and caja_enlace["y"] >= caja_carta["y"]
        and caja_enlace["y"] + caja_enlace["height"]
        <= caja_carta["y"] + caja_carta["height"]
    )
    check(
        "R5 ISSUE-15: enlace de ficha visible dentro de la carta",
        dentro,
        f"enlace_y={caja_enlace and round(caja_enlace['y'])} carta_alto={caja_carta and round(caja_carta['height'])}",
    )
    shot(p_r5, "16-reg-issue15-enlace")
    ctx_r5.close()

    # R6 — ISSUE-21: el tutorial es modal para lectores de pantalla: recibe el
    # foco al abrirse y la pila de cartas queda fuera del árbol de accesibilidad.
    ctx_r6 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r6 = ctx_r6.new_page()
    p_r6.goto(BASE, wait_until="networkidle")
    p_r6.wait_for_selector(".tutorial", timeout=4000)
    p_r6.wait_for_timeout(300)
    check(
        "R6 ISSUE-21: el foco está dentro del tutorial",
        p_r6.evaluate("() => !!document.activeElement?.closest('.tutorial')"),
        f"foco en: {p_r6.evaluate('() => document.activeElement?.outerHTML.slice(0, 60)')}",
    )
    check(
        "R6 ISSUE-21: la pila de cartas está oculta al lector",
        p_r6.evaluate(
            "() => { const s = [...document.querySelectorAll('.stack-slot')];"
            " return s.length > 0 && s.every((e) => e.getAttribute('aria-hidden') === 'true'); }"
        ),
    )
    shot(p_r6, "17-reg-issue21-tutorial-modal")
    ctx_r6.close()

    # R7 — ISSUE-30: el voto se anuncia al lector. La región live debe existir
    # ANTES de votar (si nace con el texto, TalkBack no la anuncia) y dos votos
    # iguales seguidos deben cambiar su texto.
    ctx_r7 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r7 = ctx_r7.new_page()
    p_r7.goto(BASE, wait_until="networkidle")
    p_r7.get_by_role("button", name="Entendido, a votar").click()
    p_r7.wait_for_timeout(300)
    estado = p_r7.locator('.deck-zone [role="status"]')
    check("R7 ISSUE-30: región live montada antes de votar", estado.count() == 1)
    valio = p_r7.get_by_role("button", name="Valió", exact=True)
    primera = nombre_top(p_r7)
    valio.click()
    p_r7.wait_for_timeout(300)
    texto_1 = estado.inner_text() if estado.count() == 1 else ""
    check(
        "R7 ISSUE-30: anuncia el primer voto",
        texto_1 == f"Voto registrado: Valió. {primera}",
        f"texto={texto_1!r}",
    )
    esperar_nombre_distinto(p_r7, primera)
    segunda = nombre_top(p_r7)
    valio.click()
    p_r7.wait_for_timeout(300)
    texto_2 = estado.inner_text() if estado.count() == 1 else ""
    check(
        "R7 ISSUE-30: anuncia un segundo voto igual",
        texto_2 == f"Voto registrado: Valió. {segunda}" and texto_2 != texto_1,
        f"texto={texto_2!r}",
    )
    shot(p_r7, "18-reg-issue30-anuncio-voto")
    ctx_r7.close()

    # R8 — ISSUE-37: «¿Dónde vives?». Contexto limpio, SIN municipio recordado.
    ctx_r8 = browser.new_context(viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r8 = ctx_r8.new_page()
    p_r8.goto(BASE, wait_until="networkidle")
    titulo = p_r8.get_by_role("heading", name="¿Dónde vives?")
    check("R8 ISSUE-37: primera pantalla pregunta el municipio", titulo.is_visible())
    check(
        "R8 ISSUE-37: sin municipio no hay mazo ni pestañas",
        p_r8.locator(".card-frame").count() == 0 and p_r8.locator(".tabbar").count() == 0,
    )
    check(
        "R8 ISSUE-37: el foco empieza en la pregunta",
        p_r8.evaluate("() => document.activeElement?.id === 'municipio-titulo'"),
    )
    shot(p_r8, "19-reg-issue37-municipio-375")
    p_r8.get_by_role("searchbox", name="Busca tu municipio").fill("teulada")
    p_r8.get_by_role("button", name="Teulada").click()
    p_r8.wait_for_selector(".tutorial", timeout=4000)
    check("R8 ISSUE-37: tras elegir sale el tutorial", p_r8.locator(".tutorial").is_visible())
    check(
        "R8 ISSUE-37: se recuerda en el dispositivo",
        p_r8.evaluate(f"() => JSON.parse(localStorage.getItem('{MUNICIPIO_KEY}') || '{{}}').ine") == "03128",
    )
    p_r8.get_by_role("button", name="Entendido, a votar").click()
    p_r8.wait_for_timeout(300)
    # El mazo trae exactamente las obras del municipio según los datos.
    esperadas = 21  # obras de Teulada en lib/obras.ts
    check(
        "R8 ISSUE-37: el mazo solo trae las obras del municipio",
        p_r8.locator(f'.deck-zone[aria-label="Quedan {esperadas} tarjetas"]').count() == 1,
        f"aria-label={p_r8.locator('.deck-zone').first.get_attribute('aria-label')!r}",
    )
    check(
        "R8 ISSUE-37: la cabecera muestra el municipio",
        "teulada" in p_r8.locator(".brand-badge").inner_text().lower(),
    )
    p_r8.reload(wait_until="networkidle")
    check(
        "R8 ISSUE-37: al volver no pregunta otra vez",
        p_r8.get_by_role("heading", name="¿Dónde vives?").count() == 0
        and p_r8.locator(".card-frame").count() > 0,
    )
    p_r8.get_by_role("tab", name="Info").click()
    p_r8.get_by_role("button", name="Cambiar de municipio").click()
    check(
        "R8 ISSUE-37: Info → Cambiar de municipio vuelve a preguntar",
        p_r8.get_by_role("heading", name="¿Dónde vives?").is_visible()
        and p_r8.evaluate(f"() => localStorage.getItem('{MUNICIPIO_KEY}')") is None,
    )
    p_r8.get_by_role("searchbox", name="Busca tu municipio").fill("teulada")
    p_r8.get_by_role("button", name="Teulada").click()
    p_r8.wait_for_timeout(300)
    check(
        "R8 ISSUE-37: tras cambiar, vuelve a la pestaña Votar",
        p_r8.get_by_role("tab", name="Votar").get_attribute("aria-selected") == "true",
    )
    ctx_r8.close()

    # R9 — ISSUE-37: un municipio guardado que no existe en los datos no vale.
    ctx_r9 = browser.new_context(viewport={"width": 375, "height": 812}, locale="es-ES")
    ctx_r9.add_init_script(f"try {{ localStorage.setItem('{MUNICIPIO_KEY}', 'Municipio inventado'); }} catch (e) {{}}")
    p_r9 = ctx_r9.new_page()
    p_r9.goto(BASE, wait_until="networkidle")
    check(
        "R9 ISSUE-37: municipio desconocido → vuelve a preguntar",
        p_r9.get_by_role("heading", name="¿Dónde vives?").is_visible(),
    )
    ctx_r9.close()

    # R10 — ISSUE-37: la pantalla cabe a 320 px sin scroll horizontal.
    ctx_r10 = browser.new_context(viewport={"width": 320, "height": 640}, locale="es-ES")
    p_r10 = ctx_r10.new_page()
    p_r10.goto(BASE, wait_until="networkidle")
    check(
        "R10 ISSUE-37: «¿Dónde vives?» sin scroll horizontal a 320 px",
        p_r10.evaluate("() => document.documentElement.scrollWidth <= 320"),
    )
    shot(p_r10, "20-reg-issue37-municipio-320")
    ctx_r10.close()

    # R11 — ISSUE-37: chips de tipo. Teulada: 21 obras, 3 de deporte,
    # 3 de parques, 1 de educación (lib/obras.ts).
    ctx_r11 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r11 = ctx_r11.new_page()
    p_r11.goto(BASE, wait_until="networkidle")
    grupo = p_r11.get_by_role("group", name="Filtrar por tipo de obra")
    check("R11 ISSUE-37: sin chips mientras el tutorial está abierto", grupo.count() == 0)
    p_r11.get_by_role("button", name="Entendido, a votar").click()
    p_r11.wait_for_timeout(300)

    def quedan(pg, n):
        return pg.locator(f'.deck-zone[aria-label="Quedan {n} tarjetas"]').count() == 1

    def chip(pg, nombre):
        abrir_filtros(pg)
        return pg.get_by_role("group", name="Filtrar por tipo de obra").get_by_role("button", name=nombre)

    abrir_filtros(p_r11)
    check("R11 ISSUE-37: chips visibles tras el tutorial", grupo.is_visible())
    check("R11 ISSUE-37: un chip por tipo con obras + «Todas»", grupo.get_by_role("button").count() == 8)
    check("R11 ISSUE-37: «Todas» marcado al empezar", chip(p_r11, "Todas").get_attribute("aria-pressed") == "true")

    chip(p_r11, "Deporte").click()
    p_r11.wait_for_timeout(300)
    check(
        "R11 ISSUE-37: «Deporte» deja 3 tarjetas",
        quedan(p_r11, 3) and chip(p_r11, "Deporte").get_attribute("aria-pressed") == "true"
        and chip(p_r11, "Todas").get_attribute("aria-pressed") == "false",
        f"aria-label={p_r11.locator('.deck-zone').first.get_attribute('aria-label')!r}",
    )
    anuncio_filtro = p_r11.locator('.filtro-tipos [role="status"]').inner_text()
    check(
        "R11 ISSUE-37: el lector anuncia cuántas quedan",
        anuncio_filtro == "3 obras pendientes: Deporte",
        f"texto={anuncio_filtro!r}",
    )
    check(
        "R11 ISSUE-37: la carta de arriba es de deporte",
        "deporte" in p_r11.locator(".stack-slot").first.inner_text().lower(),
    )

    etiqueta = p_r11.locator(".stack-slot").first.locator("[aria-label^='Tarjeta ']").first.get_attribute("aria-label") or ""
    check(
        "R11 ISSUE-37: con filtro, la carta dice su posición en el filtro (1 de 3)",
        etiqueta.startswith("Tarjeta 1 de 3"),
        f"aria-label={etiqueta!r}",
    )

    # Las flechas sobre un chip no votan (el foco está en un botón).
    chip(p_r11, "Deporte").focus()
    p_r11.keyboard.press("ArrowRight")
    p_r11.wait_for_timeout(400)
    check("R11 ISSUE-37: flecha con foco en un chip no vota", quedan(p_r11, 3))

    chip(p_r11, "Parques").click()
    p_r11.wait_for_timeout(300)
    check("R11 ISSUE-37: varios tipos a la vez (deporte + parques = 6)", quedan(p_r11, 6))

    # El filtro sobrevive a cambiar de pestaña.
    p_r11.get_by_role("tab", name="Info").click()
    p_r11.get_by_role("tab", name="Votar").click()
    p_r11.wait_for_timeout(300)
    check("R11 ISSUE-37: el filtro se mantiene al volver a Votar", quedan(p_r11, 6))

    chip(p_r11, "Todas").click()
    p_r11.wait_for_timeout(300)
    check("R11 ISSUE-37: «Todas» devuelve las 21", quedan(p_r11, 21))

    # Filtro que se queda vacío: no es «Ya has votado todo».
    chip(p_r11, "Educación").click()
    p_r11.wait_for_timeout(300)
    p_r11.get_by_role("button", name="Valió", exact=True).click()
    p_r11.wait_for_selector(".empty-deck", timeout=4000)
    vacio = p_r11.locator(".empty-deck").inner_text()
    check(
        "R11 ISSUE-37: filtro agotado avisa de que quedan otros tipos",
        "Nada pendiente de este tipo" in vacio and "Ya has votado todo" not in vacio,
        f"texto={vacio[:80]!r}",
    )
    shot(p_r11, "21-reg-issue37-filtro-vacio")
    p_r11.get_by_role("button", name="Ver todas").click()
    p_r11.wait_for_timeout(300)
    check("R11 ISSUE-37: «Ver todas» vuelve al mazo (20 sin votar)", quedan(p_r11, 20))
    ctx_r11.close()

    # R12 — ISSUE-37: chips a 320 px sin scroll horizontal de la página.
    ctx_r12 = nuevo_contexto(browser, viewport={"width": 320, "height": 640}, locale="es-ES")
    p_r12 = ctx_r12.new_page()
    p_r12.goto(BASE, wait_until="networkidle")
    p_r12.get_by_role("button", name="Entendido, a votar").click()
    p_r12.wait_for_timeout(300)
    abrir_filtros(p_r12)
    check(
        "R12 ISSUE-37: chips sin scroll horizontal de página a 320 px",
        p_r12.evaluate("() => document.documentElement.scrollWidth <= 320"),
    )
    caja_btn = p_r12.locator(".action-btn.big").first.bounding_box()
    check(
        "R12 ISSUE-37: con chips, los botones de voto caben a 320×640",
        bool(caja_btn) and caja_btn["y"] + caja_btn["height"] <= 640,
    )
    shot(p_r12, "22-reg-issue37-chips-320")
    p_r12.set_viewport_size({"width": 375, "height": 812})
    p_r12.wait_for_timeout(300)
    shot(p_r12, "23-reg-issue37-chips-375")
    ctx_r12.close()

    # R13 — ISSUE-37: chips de orden. «Más recientes» = por año (provisional);
    # «Mayor importe» = adjudicado o, si no hay, licitado. En lib/obras.ts:
    # 1.º OBRA-01 (2026, 177.686 €), luego OBRA-02 (2026) por año y OBRA-19
    # (39.300 €) por importe.
    ctx_r13 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r13 = ctx_r13.new_page()
    p_r13.goto(BASE, wait_until="networkidle")
    p_r13.get_by_role("button", name="Entendido, a votar").click()
    p_r13.wait_for_timeout(300)
    abrir_filtros(p_r13)
    orden = p_r13.get_by_role("radiogroup", name="Ordenar obras")
    recientes = orden.get_by_role("radio", name="Más recientes")
    importe = orden.get_by_role("radio", name="Mayor importe")
    check("R13 ISSUE-37: chips de orden visibles", orden.is_visible())
    check("R13 ISSUE-37: «Más recientes» marcado al empezar", recientes.get_attribute("aria-checked") == "true")

    importe.click()
    p_r13.wait_for_timeout(300)
    check(
        "R13 ISSUE-37: «Mayor importe» marcado y el otro no",
        importe.get_attribute("aria-checked") == "true" and recientes.get_attribute("aria-checked") == "false",
    )
    anuncio_orden = p_r13.locator('.filtros-barra [role="status"]').first.inner_text()
    check(
        "R13 ISSUE-37: el lector anuncia el orden",
        anuncio_orden == "Ordenadas por mayor importe",
        f"texto={anuncio_orden!r}",
    )
    primera = nombre_top(p_r13)
    p_r13.get_by_role("button", name="Valió", exact=True).click()
    esperar_nombre_distinto(p_r13, primera)
    check(
        "R13 ISSUE-37: por importe, tras OBRA-01 va OBRA-19",
        nombre_top(p_r13) == "Contrato menor de obras de asfaltado",
        f"top={nombre_top(p_r13)!r}",
    )

    # Teclado: flechas dentro del grupo cambian el orden y NO votan.
    abrir_filtros(p_r13)
    importe.focus()
    p_r13.keyboard.press("ArrowLeft")
    p_r13.wait_for_timeout(300)
    check(
        "R13 ISSUE-37: flecha cambia a «Más recientes» y lleva el foco",
        recientes.get_attribute("aria-checked") == "true"
        and p_r13.evaluate("() => document.activeElement?.textContent") == "Más recientes",
    )
    check(
        "R13 ISSUE-37: las flechas en el orden no votan",
        p_r13.locator('.deck-zone[aria-label="Quedan 20 tarjetas"]').count() == 1,
    )
    check(
        "R13 ISSUE-37: por año, tras OBRA-01 va OBRA-02",
        "reconstrucción parcial del muro" in nombre_top(p_r13).lower(),
        f"top={nombre_top(p_r13)!r}",
    )
    check(
        "R13 ISSUE-37: un solo chip de orden en el Tab (roving tabindex)",
        importe.get_attribute("tabindex") == "-1" and recientes.get_attribute("tabindex") == "0",
    )
    shot(p_r13, "24-reg-issue37-orden-375")
    ctx_r13.close()

    # R14 — ISSUE-37: accesibilidad del flujo nuevo solo con teclado, desde
    # cero (sin municipio). Sin librerías nuevas: solo Playwright.
    NOMBRE_FOCO = (
        "() => { const e = document.activeElement; if (!e || e === document.body) return '';"
        " return (e.getAttribute('aria-label') || e.textContent || '').trim(); }"
    )
    ctx_r14 = browser.new_context(viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r14 = ctx_r14.new_page()
    p_r14.goto(BASE, wait_until="networkidle")

    # «¿Dónde vives?» se elige solo con teclado: Tab al buscador, se escribe,
    # Tab al municipio (carga nacional: ya no hay un único municipio).
    p_r14.keyboard.press("Tab")
    check(
        "R14 ISSUE-37: Tab desde la pregunta llega al buscador de municipio",
        p_r14.evaluate("() => document.activeElement?.type === 'search'"),
    )
    p_r14.keyboard.type("teu")
    p_r14.keyboard.press("Tab")
    check(
        "R14 ISSUE-37: Tab desde el buscador llega al municipio",
        p_r14.evaluate(NOMBRE_FOCO).startswith("Teulada"),
        f"foco={p_r14.evaluate(NOMBRE_FOCO)!r}",
    )
    check(
        "R14 ISSUE-37: foco visible en el botón del municipio",
        p_r14.evaluate("() => getComputedStyle(document.activeElement).outlineStyle !== 'none'"),
    )
    p_r14.keyboard.press("Enter")
    p_r14.wait_for_selector(".tutorial", timeout=4000)
    p_r14.wait_for_timeout(300)
    p_r14.get_by_role("button", name="Entendido, a votar").focus()
    p_r14.keyboard.press("Enter")
    p_r14.wait_for_timeout(400)

    # Recorrido con Tab: todo lo nuevo es alcanzable, y el orden ocupa un solo Tab.
    recorrido = []
    for _ in range(40):
        p_r14.keyboard.press("Tab")
        recorrido.append(p_r14.evaluate(NOMBRE_FOCO))
    # Con el menú: el botón está en el Tab; al abrirlo con Enter el foco
    # entra en el orden y desde ahí se llega a los tipos.
    for esperado in ["Ordenar y filtrar", "Valió"]:
        check(f"R14 Luma: «{esperado}» alcanzable con Tab", esperado in recorrido, f"recorrido={recorrido[:14]}")
    p_r14.get_by_role("button", name="Ordenar y filtrar").focus()
    p_r14.keyboard.press("Enter")
    p_r14.wait_for_timeout(300)
    check(
        "R14 Luma: Enter abre el menú con el foco en el orden marcado",
        p_r14.evaluate(NOMBRE_FOCO) == "Más recientes",
        f"foco={p_r14.evaluate(NOMBRE_FOCO)!r}",
    )
    dentro = []
    for _ in range(3):
        p_r14.keyboard.press("Tab")
        dentro.append(p_r14.evaluate(NOMBRE_FOCO))
    recorrido += dentro
    check("R14 Luma: Tab en el menú llega a los tipos", dentro[:2] == ["Todas", "Deporte, 3 obras"], f"{dentro}")
    p_r14.keyboard.press("Escape")
    p_r14.wait_for_timeout(200)
    check(
        "R14 Luma: Escape cierra el menú y devuelve el foco al botón",
        p_r14.evaluate(NOMBRE_FOCO) == "Ordenar y filtrar"
        and p_r14.get_by_role("button", name="Ordenar y filtrar").get_attribute("aria-expanded") == "false",
    )
    check(
        "R14 ISSUE-37: «Mayor importe» no gasta un Tab (se llega con flechas)",
        "Mayor importe" not in recorrido,
    )
    # El orden de Tab lo marca el DOM. (El recorrido de arriba no sirve para
    # esto: al cerrar el tutorial el navegador sigue desde donde estaba él.)
    check(
        "R14 ISSUE-37: los chips van antes que el mazo en el orden de Tab",
        p_r14.evaluate(
            "() => { const c = document.querySelector('.filtros-barra');"
            " const v = document.querySelector('.action-row');"
            " return !!c && !!v && !!(c.compareDocumentPosition(v) & Node.DOCUMENT_POSITION_FOLLOWING); }"
        ),
    )

    # Un chip se activa con Espacio y se ve el foco.
    abrir_filtros(p_r14)
    chip_deporte = p_r14.get_by_role("button", name="Deporte, 3 obras")
    chip_deporte.focus()
    check(
        "R14 ISSUE-37: foco visible en los chips",
        p_r14.evaluate("() => getComputedStyle(document.activeElement).outlineStyle !== 'none'"),
    )
    p_r14.keyboard.press("Space")
    p_r14.wait_for_timeout(300)
    check("R14 ISSUE-37: Espacio activa un chip", chip_deporte.get_attribute("aria-pressed") == "true")

    # Todos los controles nuevos tienen nombre y tamaño táctil suficiente
    # (WCAG 2.5.8 pide 24 px; nosotros apuntamos a 40).
    controles = p_r14.evaluate(
        "() => [...document.querySelectorAll('.filtros-barra button')].map((b) => {"
        " const r = b.getBoundingClientRect();"
        " return { nombre: (b.getAttribute('aria-label') || b.textContent || '').trim(), alto: r.height, ancho: r.width }; })"
    )
    sin_nombre = [c for c in controles if not c["nombre"]]
    pequenos = [c["nombre"] for c in controles if c["alto"] < 40 or c["ancho"] < 40]
    check("R14 ISSUE-37: todos los chips tienen nombre accesible", controles and not sin_nombre)
    check("R14 ISSUE-37: chips de al menos 40×40 px", controles and not pequenos, f"pequeños={pequenos}")

    # Contraste AA (4,5:1) del texto de los chips, marcados y sin marcar.
    CONTRASTE = """(sel) => {
      const lum = (c) => {
        const [r, g, b] = c.match(/\\d+(\\.\\d+)?/g).slice(0, 3).map((v) => {
          const s = Number(v) / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      // Fondo real: sube por los padres hasta un fondo opaco y compone
      // encima las capas translúcidas (los tiles del rediseño son blanco al
      // 8 %): el color que se ve, no el de la primera capa.
      const fondo = (e) => {
        const capas = [];
        let base = [255, 255, 255];
        for (let n = e; n; n = n.parentElement) {
          const v = getComputedStyle(n).backgroundColor.match(/\\d+(\\.\\d+)?/g).map(Number);
          const alfa = v[3] === undefined ? 1 : v[3];
          if (alfa >= 1) { base = v.slice(0, 3); break; }
          if (alfa > 0) capas.push([v.slice(0, 3), alfa]);
        }
        const rgb = capas.reverse().reduce(
          (acc, [c, a]) => acc.map((x, i) => c[i] * a + x * (1 - a)), base);
        return `rgb(${rgb.map(Math.round).join(", ")})`;
      };
      return [...document.querySelectorAll(sel)].map((e) => {
        const [a, b] = [lum(getComputedStyle(e).color), lum(fondo(e))].sort((x, y) => y - x);
        return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100;
      });
    }"""
    ratios = p_r14.evaluate(CONTRASTE, ".filtros-barra .filtro-chip")
    check(
        "R14 ISSUE-37: contraste AA en chips marcados y sin marcar",
        ratios and min(ratios) >= 4.5,
        f"mínimo={min(ratios) if ratios else None}",
    )
    p_r14.get_by_role("tab", name="Info").click()
    p_r14.get_by_role("button", name="Cambiar de municipio").click()
    ratios_mun = p_r14.evaluate(CONTRASTE, ".municipio-nombre, .municipio-detalle")
    check(
        "R14 ISSUE-37: contraste AA en «¿Dónde vives?»",
        ratios_mun and min(ratios_mun) >= 4.5,
        f"mínimo={min(ratios_mun) if ratios_mun else None}",
    )
    ctx_r14.close()

    # R15 — ISSUE-38: un voto «no valió» no dispara el match ciudadano (es un
    # estado colectivo); sale un aviso sobrio que se va solo. Solo Votar e Info.
    ctx_r15 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r15 = ctx_r15.new_page()
    p_r15.goto(BASE, wait_until="networkidle")
    p_r15.get_by_role("button", name="Entendido, a votar").click()
    p_r15.wait_for_timeout(300)
    p_r15.get_by_role("button", name="No valió").click()
    p_r15.wait_for_timeout(600)
    check(
        "R15 ISSUE-38: sin «¡MATCH CIUDADANO!» por un voto",
        p_r15.locator(".match-screen").count() == 0
        and "match ciudadano" not in p_r15.locator("body").inner_text().lower(),
    )
    aviso = p_r15.locator(".voto-guardado")
    # Con el rediseño el aviso dice qué votaste y ofrece deshacerlo.
    check(
        "R15 Luma: aviso «No valió · guardado» con «Deshacer»",
        aviso.is_visible()
        and "No valió · guardado" in aviso.inner_text()
        and aviso.get_by_role("button", name="Deshacer").is_visible(),
        f"texto={aviso.inner_text() if aviso.count() else None!r}",
    )
    shot(p_r15, "19-reg-issue38-voto-guardado")
    p_r15.wait_for_timeout(4300)
    check("R15 ISSUE-38: el aviso desaparece solo", aviso.count() == 0)
    check(
        "R15 ISSUE-38: navegación con las pestañas esperadas",
        nombres_pestañas(p_r15) == PESTAÑAS_ESPERADAS,
        f"{nombres_pestañas(p_r15)}",
    )
    ctx_r15.close()

    # L1-L8 — Rediseño Luma.
    def quedan_l(pg, n):
        return pg.locator(f'.deck-zone[aria-label="Quedan {n} tarjetas"]').count() == 1

    ctx_l = nuevo_contexto(browser, viewport={"width": 390, "height": 844}, locale="es-ES")
    ctx_l.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    p_l = ctx_l.new_page()
    p_l.goto(BASE, wait_until="networkidle")
    p_l.get_by_role("button", name="Entendido, a votar").click()
    p_l.wait_for_timeout(300)
    primera_l = nombre_arriba(p_l)

    # L1: «Deshacer» devuelve la carta, el voto y el contador.
    p_l.get_by_role("button", name="Valió", exact=True).click()
    p_l.wait_for_timeout(150)
    p_l.locator(".voto-guardado").get_by_role("button", name="Deshacer").click()
    esperar_sin_vuelo(p_l)
    p_l.wait_for_timeout(300)
    check(
        "L1 Luma: «Deshacer» devuelve la carta y quita el voto",
        quedan_l(p_l, 21) and nombre_arriba(p_l) == primera_l and "0/21" in p_l.locator(".brand-badge").inner_text(),
        f"arriba={nombre_arriba(p_l)!r} badge={p_l.locator('.brand-badge').inner_text()!r}",
    )
    check(
        "L1 Luma: el lector anuncia que se deshizo",
        p_l.locator('.deck-zone > [role="status"]').inner_text().startswith("Voto deshecho"),
    )

    # L2: deshacer «Pido explicaciones» cierra también su borrador.
    p_l.get_by_role("button", name="Pido explicaciones").click()
    p_l.wait_for_selector("#claim-texto", timeout=4000)
    p_l.locator(".voto-guardado").get_by_role("button", name="Deshacer").click()
    p_l.wait_for_selector("#claim-texto", state="detached", timeout=4000)
    esperar_sin_vuelo(p_l)
    check("L2 Luma: deshacer «Explica» cierra el borrador y devuelve la carta", quedan_l(p_l, 21))

    # L3: nada que se arrastre lleva backdrop-filter (gama baja).
    filtros = p_l.evaluate(
        "() => [...document.querySelectorAll('.card-frame, .stack-slot')]"
        ".map((e) => getComputedStyle(e).backdropFilter)"
    )
    check("L3 Luma: sin backdrop-filter en las cartas", filtros and all(f in ("none", "") for f in filtros), f"{filtros}")

    # L4: contraste AA en el texto pequeño nuevo.
    ratios_l = p_l.evaluate(
        CONTRASTE, ".action-label, .barra-resumen, .card-mazo-kicker, .card-kicker, .tag, .card-ficha-link, .brand-badge"
    )
    check("L4 Luma: contraste AA en etiquetas, resumen, evidencia y contador", ratios_l and min(ratios_l) >= 4.5, f"{ratios_l}")

    # L5: la ficha se cierra arrastrando el asa hacia abajo.
    p_l.locator(".stack-slot").first.get_by_role("button", name="Ver ficha y evidencia").click()
    p_l.wait_for_selector(".sheet .asa", timeout=4000)
    p_l.wait_for_timeout(500)
    asa = p_l.locator(".sheet .asa").bounding_box()
    ax, ay = asa["x"] + asa["width"] / 2, asa["y"] + asa["height"] / 2
    p_l.mouse.move(ax, ay)
    p_l.mouse.down()
    p_l.mouse.move(ax, ay + 120, steps=6)
    p_l.mouse.move(ax, ay + 260, steps=6)
    p_l.mouse.up()
    p_l.wait_for_selector(".sheet", state="detached", timeout=4000)
    check("L5 Luma: la ficha se cierra arrastrando hacia abajo", p_l.locator(".sheet").count() == 0)

    # L6: «Desliza para copiar» copia el borrador entero con su aviso HITL.
    p_l.locator(".stack-slot").first.get_by_role("button", name="Ver ficha y evidencia").click()
    p_l.get_by_role("button", name="Pedir explicaciones").click()
    p_l.wait_for_selector(".deslizar", timeout=4000)
    p_l.wait_for_timeout(500)
    pista = p_l.locator(".deslizar").bounding_box()
    px, py = pista["x"] + 30, pista["y"] + pista["height"] / 2
    p_l.mouse.move(px, py)
    p_l.mouse.down()
    p_l.mouse.move(px + pista["width"] * 0.5, py, steps=6)
    p_l.mouse.move(px + pista["width"], py, steps=6)
    p_l.mouse.up()
    p_l.wait_for_timeout(300)
    copiado_l = p_l.evaluate("() => navigator.clipboard.readText()")
    check(
        "L6 Luma: deslizar copia el borrador entero",
        p_l.get_by_text("¡Copiado!").is_visible() and "nunca envía nada automáticamente" in copiado_l,
        f"fin={copiado_l[-60:]!r}",
    )
    check(
        "L6 Luma: el borrador dice que copiar no envía nada",
        "Copiar no envía nada" in p_l.locator(".sheet").inner_text(),
    )
    p_l.get_by_role("button", name="Cerrar", exact=True).last.click()
    p_l.wait_for_selector(".sheet-backdrop", state="detached")

    # L7: pestaña Obras con «Por votar» y «Votadas», agrupadas por año.
    for _ in range(2):
        antes_l = nombre_arriba(p_l)
        p_l.get_by_role("button", name="No valió").click()
        esperar_nombre_distinto(p_l, antes_l)
        esperar_sin_vuelo(p_l)
    p_l.get_by_role("tab", name="Obras").click()
    p_l.wait_for_timeout(300)
    lista = p_l.locator(".lista-obras")
    check("L7 Luma: «Por votar» lista 19 obras", lista.locator(".lista-item").count() == 19)
    check(
        "L7 Luma: cada fila de la lista lleva su etiqueta de evidencia",
        lista.locator(".lista-item .tag").count() == 19,
    )
    p_l.get_by_role("button", name="Votadas").click()
    p_l.wait_for_timeout(200)
    check(
        "L7 Luma: «Votadas» enseña las 2 con su voto",
        lista.locator(".lista-item").count() == 2 and lista.locator(".miniatura-voto").all_inner_texts() == ["No valió", "No valió"],
    )
    check("L7 Luma: grupos con el año como título", lista.locator(".lista-anyo").count() >= 1)
    shot(p_l, "27-luma-obras-votadas")
    lista.locator(".lista-item").first.click()
    p_l.wait_for_selector(".sheet", timeout=4000)
    check("L7 Luma: una fila abre la ficha de la obra", "Fuente" in p_l.locator(".sheet").inner_text())
    p_l.keyboard.press("Escape")
    p_l.wait_for_selector(".sheet-backdrop", state="detached")

    # L8: el mazo terminado resume los cuatro recuentos.
    p_l.get_by_role("tab", name="Votar").click()
    votar_valio_hasta_vaciar(p_l)
    recuento = p_l.locator(".recuento li").all_inner_texts()
    check(
        "L8 Luma: al terminar sale el recuento (19 valió, 2 no valió)",
        [r.split("\n")[0] for r in recuento] == ["19", "2", "0", "0"],
        f"{recuento}",
    )
    shot(p_l, "28-luma-fin")
    ctx_l.close()

    # R16 — ISSUE-38: arrastrar la carta hacia arriba vota «Pido explicaciones»
    # y abre el borrador (antes solo se llegaba desde el match o la ficha).
    ctx_r16 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r16 = ctx_r16.new_page()
    p_r16.goto(BASE, wait_until="networkidle")
    p_r16.get_by_role("button", name="Entendido, a votar").click()
    p_r16.wait_for_timeout(300)
    primera = nombre_top(p_r16)
    caja = p_r16.locator(".stack-slot").first.locator(".card-frame").bounding_box()
    cx, cy = caja["x"] + caja["width"] / 2, caja["y"] + caja["height"] * 0.5
    p_r16.mouse.move(cx, cy)
    p_r16.mouse.down()
    for i in range(1, 21):
        p_r16.mouse.move(cx, cy - i * 12, steps=3)
        p_r16.wait_for_timeout(16)
    p_r16.mouse.up()
    p_r16.wait_for_timeout(600)
    check("R16 ISSUE-38: gesto arriba abre el borrador", p_r16.locator("#claim-texto").is_visible())
    check(
        "R16 ISSUE-38: el borrador es de la obra votada",
        primera in p_r16.locator("#claim-texto").input_value(),
    )
    shot(p_r16, "20-reg-issue38-gesto-arriba")
    ctx_r16.close()

    # R17 — ISSUE-38: si el ÚLTIMO voto del mazo es «Pido explicaciones», el
    # borrador sigue abierto al vaciarse el mazo (antes se cerraba solo).
    ctx_r17 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r17 = ctx_r17.new_page()
    p_r17.goto(BASE, wait_until="networkidle")
    p_r17.get_by_role("button", name="Entendido, a votar").click()
    p_r17.wait_for_timeout(300)
    for _ in range(50):
        if p_r17.locator(".stack-slot").count() <= 1:
            break
        p_r17.get_by_role("button", name="Valió", exact=True).click()
        p_r17.wait_for_function("() => !document.querySelector('.action-btn[disabled]')", timeout=4000)
    ultima = nombre_top(p_r17)
    p_r17.get_by_role("button", name="Pido explicaciones").click()
    p_r17.wait_for_selector(".empty-deck", timeout=6000)
    p_r17.wait_for_timeout(600)
    check(
        "R17 ISSUE-38: tras ↑ en la última carta el borrador sigue abierto",
        p_r17.locator("#claim-texto").is_visible(),
    )
    check(
        "R17 ISSUE-38: el borrador es de la última obra",
        p_r17.locator("#claim-texto").count() == 1 and ultima in p_r17.locator("#claim-texto").input_value(),
    )
    ctx_r17.close()


    # R18 — ISSUE-43: señal vecinal «¿Sabes si está terminada?». Es un dato
    # alegado: bloque propio, separado de «Los documentos dicen». La respuesta
    # persiste tras recargar y se anuncia al lector (región live ya montada).
    ctx_r18 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r18 = ctx_r18.new_page()
    p_r18.goto(BASE, wait_until="networkidle")
    p_r18.get_by_role("button", name="Entendido, a votar").click()
    p_r18.wait_for_timeout(300)
    p_r18.get_by_role("button", name="Ver ficha y evidencia").first.click()
    p_r18.wait_for_timeout(500)
    bloque = p_r18.locator(".sheet .capa-vecinos")
    check("R18 ISSUE-43: bloque vecinal en ficha con ejecución faltante", bloque.count() == 1)
    texto_bloque = bloque.inner_text().lower() if bloque.count() == 1 else ""
    check("R18 ISSUE-43: rótulo de dato alegado", "lo dicen los vecinos · dato alegado, no oficial" in texto_bloque)
    check(
        "R18 ISSUE-39: el rótulo vecinal no repite la etiqueta oficial «no verificado»",
        "no verificado" not in texto_bloque,
    )
    check(
        "R18 ISSUE-43: separado de los documentos oficiales",
        "documentos dicen" not in texto_bloque and "dicen los documentos" not in texto_bloque,
    )
    # Va al final, después de la evidencia oficial, y con fondo propio.
    al_final = p_r18.evaluate(
        """() => {
            const s = [...document.querySelectorAll('.sheet .ficha-seccion')];
            const v = s.findIndex((e) => e.classList.contains('capa-vecinos'));
            const ev = s.findIndex((e) => e.querySelector('#ficha-evidencia'));
            return v === s.length - 1 && ev >= 0 && ev < v;
        }"""
    )
    check("R18 ISSUE-39: bloque vecinal al final, tras la evidencia", al_final)
    fondos = p_r18.evaluate(
        """() => {
            const b = document.querySelector('.sheet .capa-vecinos');
            const h = document.querySelector('.sheet');
            return b && h ? [getComputedStyle(b).backgroundColor, getComputedStyle(h).backgroundColor] : null;
        }"""
    )
    check(
        "R18 ISSUE-39: bloque vecinal con fondo propio distinto de la ficha",
        bool(fondos) and fondos[0] != fondos[1] and fondos[0] not in ("rgba(0, 0, 0, 0)", "transparent"),
        f"fondos={fondos!r}",
    )
    region = bloque.get_by_role("status")
    check(
        "R18 ISSUE-43: región live montada y vacía antes de responder",
        region.count() == 1 and region.inner_text() == "",
    )
    bloque.get_by_role("button", name="En obras").click()
    p_r18.wait_for_timeout(300)
    anuncio = region.inner_text() if region.count() == 1 else ""
    check(
        "R18 ISSUE-43: anuncia la respuesta al lector",
        anuncio == "Respuesta guardada: En obras.",
        f"texto={anuncio!r}",
    )
    p_r18.reload(wait_until="networkidle")
    check("R18 ISSUE-43: responder no consume la tarjeta", "asfaltado" in (nombre_top(p_r18) or "").lower())
    p_r18.get_by_role("button", name="Ver ficha y evidencia").first.click()
    p_r18.wait_for_timeout(500)
    pulsado = p_r18.locator(".sheet .capa-vecinos").get_by_role("button", name="En obras").get_attribute("aria-pressed")
    check("R18 ISSUE-43: la respuesta persiste tras recargar", pulsado == "true", f"aria-pressed={pulsado!r}")
    shot(p_r18, "19-reg-issue43-senal-vecinal")
    ctx_r18.close()

    # R19 — ISSUE-39: tarjeta y ficha guiadas por el contenido. Una sola
    # etiqueta de estado (la evidencia, la de la obra en los datos), nada de
    # arte decorativo, ningún emoji en la interfaz y la ficha sin «Capa N».
    ctx_r19 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r19 = ctx_r19.new_page()
    p_r19.goto(BASE, wait_until="networkidle")
    p_r19.get_by_role("button", name="Entendido, a votar").click()
    p_r19.wait_for_timeout(300)
    carta = p_r19.locator(".stack-slot").first.locator(".card-frame")
    nombre_r19 = nombre_top(p_r19)
    esperada = etiqueta_evidencia(nombre_r19)
    etiquetas = carta.locator(".tag")
    check("R19 ISSUE-39: una sola etiqueta en la tarjeta", etiquetas.count() == 1, f"etiquetas={etiquetas.count()}")
    leida = etiquetas.first.inner_text() if etiquetas.count() == 1 else None
    check(
        "R19 ISSUE-39: la etiqueta es el nivel de evidencia de la obra",
        esperada is not None and leida == esperada,
        f"leída={leida!r} esperada={esperada!r}",
    )
    # Los iconos decorativos (Lucide, aria-hidden) se permiten; el arte antiguo no.
    svg_sin_ocultar = carta.locator("svg:not([aria-hidden='true'])").count()
    check(
        "R19 ISSUE-39: tarjeta sin arte decorativo",
        svg_sin_ocultar == 0 and carta.locator(".card-art").count() == 0,
        f"svg sin aria-hidden={svg_sin_ocultar}, .card-art={carta.locator('.card-art').count()}",
    )
    check("R19 ISSUE-39: la tarjeta muestra el coste por vecino", "por vecino" in carta.inner_text())
    emojis = p_r19.evaluate(
        r"() => (document.body.innerText.match(/\p{Extended_Pictographic}/gu) || []).join(' ')"
    )
    check("R19 ISSUE-39: sin emojis en la interfaz", emojis == "", f"emojis={emojis!r}")
    p_r19.get_by_role("button", name="Ver ficha y evidencia").first.click()
    p_r19.wait_for_timeout(500)
    texto_ficha = p_r19.locator(".sheet").inner_text().lower()
    check("R19 ISSUE-39: ficha sin rótulos de capa", "capa " not in texto_ficha)
    tag_ficha = p_r19.locator(".sheet .tag")
    leida_ficha = tag_ficha.first.inner_text() if tag_ficha.count() == 1 else None
    check(
        "R19 ISSUE-39: la ficha muestra el nivel de evidencia de la obra",
        esperada is not None and leida_ficha == esperada,
        f"leída={leida_ficha!r} esperada={esperada!r}",
    )
    shot(p_r19, "25-reg-issue39-ficha")
    ctx_r19.close()

    # R20-R24 — Vista aérea (docs/specs/vista-aerea.md).
    ctx_r20 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r20 = ctx_r20.new_page()
    p_r20.goto(BASE, wait_until="networkidle")
    p_r20.get_by_role("button", name="Entendido, a votar").click()
    p_r20.wait_for_timeout(300)
    # Avanza hasta la primera obra con ubicación (no todas la tienen).
    check("R20 VISTA-AÉREA: hay obras con ubicación", avanzar_hasta(p_r20, True))
    carta = p_r20.locator(".stack-slot").first.locator(".card-frame")
    foto = carta.locator(".aerea-img")
    check("R20 VISTA-AÉREA: la tarjeta muestra la foto aérea", foto.count() == 1)
    alt = foto.first.get_attribute("alt") or ""
    anyo_alt = re.search(r"\b(19|20)\d{2}\b", alt)
    check("R20 VISTA-AÉREA: la foto tiene texto alternativo con la fecha", "Foto aérea" in alt and anyo_alt is not None, alt)
    check("R20 VISTA-AÉREA: la foto no se arrastra sola", foto.first.get_attribute("draggable") == "false")
    cargada = p_r20.evaluate("(img) => img.complete && img.naturalWidth > 0", foto.first.element_handle())
    check("R20 VISTA-AÉREA: la imagen carga", cargada)
    pastilla = carta.locator(".aerea-pastilla").inner_text()
    check(
        "R20 VISTA-AÉREA: fecha del vuelo y licencia visibles",
        anyo_alt is not None and anyo_alt.group(0) in pastilla and "CC-BY" in pastilla,
        pastilla,
    )
    veredicto = carta.locator(".aerea-veredicto").inner_text()
    check(
        "R20 VISTA-AÉREA: el texto no sugiere que la obra no se hizo",
        veredicto != "" and "no se hizo" not in veredicto.lower() and "no existe" not in veredicto.lower(),
        veredicto,
    )
    shot(p_r20, "26-vista-aerea-tarjeta")

    # R21 — el gesto sigue funcionando con la foto: arrastre desde la foto.
    antes_r21 = nombre_arriba(p_r20)
    caja = foto.first.bounding_box()
    cx, cy = caja["x"] + caja["width"] / 2, caja["y"] + caja["height"] / 2
    p_r20.mouse.move(cx, cy)
    p_r20.mouse.down()
    for paso in range(1, 21):
        p_r20.mouse.move(cx + paso * 20, cy, steps=3)
        p_r20.wait_for_timeout(16)
    p_r20.wait_for_timeout(120)
    p_r20.mouse.up()
    try:
        esperar_nombre_distinto(p_r20, antes_r21)
    except Exception:
        pass
    check("R21 VISTA-AÉREA: deslizar desde la foto vota", nombre_arriba(p_r20) != antes_r21)
    esperar_sin_vuelo(p_r20)

    # R22 — ficha: sección «Desde el aire» con enlaces sin claves.
    avanzar_hasta(p_r20, True)
    p_r20.locator(".stack-slot").first.get_by_role("button", name="Ver ficha y evidencia").click()
    p_r20.wait_for_timeout(500)
    seccion = p_r20.locator(".sheet section:has(#ficha-aerea)")
    check("R22 VISTA-AÉREA: la ficha tiene «Desde el aire»", seccion.count() == 1)
    check(
        "R22 VISTA-AÉREA: enlace a Street View",
        seccion.get_by_role("link", name="Ver a pie de calle (Street View)").count() == 1,
    )
    # El satélite debe abrirse en el mismo punto que Street View.
    sat = seccion.get_by_role("link", name="Ver el satélite de Google (sin fecha)")
    sv = seccion.get_by_role("link", name="Ver a pie de calle (Street View)").get_attribute("href") or ""
    href_sat = (sat.get_attribute("href") or "") if sat.count() == 1 else ""
    q_sat = urllib.parse.parse_qs(urllib.parse.urlsplit(href_sat).query)
    punto = urllib.parse.parse_qs(urllib.parse.urlsplit(sv).query).get("viewpoint", [""])[0]
    check(
        "R22 VISTA-AÉREA: satélite de Google en el punto de la obra",
        bool(re.fullmatch(r"-?\d+(\.\d+)?,-?\d+(\.\d+)?", punto))
        and q_sat == {
            "api": ["1"],
            "map_action": ["map"],
            "center": [punto],
            "zoom": ["19"],
            "basemap": ["satellite"],
        },
        href_sat,
    )
    check("R22 VISTA-AÉREA: atribución de la licencia en la ficha", "scne.es" in seccion.inner_text())

    # R23 — mapa interactivo bajo demanda, sin errores de consola.
    # Escucha en ESTA página (los listeners globales van en otra).
    errores_mapa, teselas = [], []
    p_r20.on("console", lambda m: m.type == "error" and errores_mapa.append(m.text))
    p_r20.on("pageerror", lambda e: errores_mapa.append(str(e)))
    p_r20.on(
        "response",
        lambda r: ("ign.es/wmts" in r.url or "terramapas.icv.gva.es" in r.url)
        and r.status == 200
        and teselas.append(r.url),
    )
    seccion.get_by_role("button", name="Explorar en el mapa").click()
    p_r20.wait_for_selector(".aerea-mapa canvas", timeout=15000)
    p_r20.wait_for_function("() => !document.querySelector('.aerea-mapa-caja select')?.disabled", timeout=15000)
    p_r20.wait_for_timeout(2500)
    check("R23 VISTA-AÉREA: el mapa carga teselas del IGN", len(teselas) > 0, f"teselas={len(teselas)}")
    n_antes = len(teselas)
    p_r20.select_option(".aerea-mapa-caja select", "2023")
    p_r20.wait_for_timeout(3000)
    check(
        "R23 VISTA-AÉREA: al elegir 2023 llegan teselas del ICV",
        any("terramapas.icv.gva.es" in u for u in teselas[n_antes:]),
    )
    check("R23 VISTA-AÉREA: sin errores al cargar el mapa", not errores_mapa, str(errores_mapa[:2]))
    shot(p_r20, "27-vista-aerea-mapa")

    # R24 — obra sin ubicación: lo dice y no pinta nada.
    p_r20.get_by_role("button", name="Cerrar ficha").click()
    p_r20.wait_for_selector(".sheet-backdrop", state="detached")
    p_r20.wait_for_timeout(150)
    visto_sin = False
    detalle_r24 = "no se encontró una obra sin ubicación"
    if avanzar_hasta(p_r20, False):
        check(
            "R24 VISTA-AÉREA: la tarjeta sin ubicación no lleva foto",
            p_r20.locator(".stack-slot").first.locator(".aerea-tarjeta").count() == 0,
        )
        p_r20.locator(".stack-slot").first.get_by_role("button", name="Ver ficha y evidencia").click()
        p_r20.wait_for_timeout(400)
        p_r20.wait_for_selector(".sheet #ficha-aerea", timeout=4000)
        texto = p_r20.locator(".sheet").inner_text()
        visto_sin = "Sin ubicación precisa" in texto and p_r20.locator(".sheet .aerea-img").count() == 0
        detalle_r24 = f"sheets={p_r20.locator('.sheet').count()} imgs={p_r20.locator('.sheet .aerea-img').count()} {texto[:80]!r}"
    check("R24 VISTA-AÉREA: obra sin ubicación lo explica y no muestra foto", visto_sin, detalle_r24)
    ctx_r20.close()

    if CON_ANTES:
        # R26 — comparador antes/después: ratón y teclado, y el lector anuncia
        # los dos años.
        ctx_r26 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
        p_r26 = ctx_r26.new_page()
        p_r26.goto(BASE, wait_until="networkidle")
        p_r26.get_by_role("button", name="Entendido, a votar").click()
        encontrada = False
        for _ in range(len(CON_PUNTO) + 2):
            esperar_sin_vuelo(p_r26)
            if nombre_arriba(p_r26).strip() in CON_ANTES:
                encontrada = True
                break
            p_r26.get_by_role("button", name="No puedo valorarlo").first.click()
        check("R26 VISTA-AÉREA: hay una obra con comparador", encontrada)
        if encontrada:
            p_r26.locator(".stack-slot").first.get_by_role("button", name="Ver ficha y evidencia").click()
            rango = p_r26.locator(".aerea-rango")
            rango.wait_for(timeout=4000)
            texto0 = rango.get_attribute("aria-valuetext") or ""
            check("R26 VISTA-AÉREA: el comparador anuncia los dos años", len(re.findall(r"(19|20)\d{2}", texto0)) >= 2, texto0)
            rango.focus()
            for _ in range(4):
                p_r26.keyboard.press("ArrowLeft")
            estilo = p_r26.locator(".aerea-img-antes").get_attribute("style") or ""
            check("R26 VISTA-AÉREA: las flechas mueven el comparador", "70%" in estilo, estilo)
            shot(p_r26, "28-vista-aerea-comparador")
        ctx_r26.close()

    # R25 — recorre el mazo entero: llevan foto exactamente las obras con
    # ubicación precisa en los datos, ni una más ni una menos.
    ctx_r25 = nuevo_contexto(browser, viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r25 = ctx_r25.new_page()
    p_r25.goto(BASE, wait_until="networkidle")
    p_r25.get_by_role("button", name="Entendido, a votar").click()
    discrepancias = []
    vistas = 0
    for _ in range(len(CON_PUNTO) + 2):
        esperar_sin_vuelo(p_r25)
        if p_r25.locator(".stack-slot").count() == 0:
            break
        nombre = nombre_arriba(p_r25).strip()
        con_foto = p_r25.locator(".stack-slot").first.locator(".aerea-tarjeta").count() == 1
        vistas += 1
        if con_foto != CON_PUNTO.get(nombre):
            discrepancias.append(f"{nombre[:40]} foto={con_foto}")
        p_r25.get_by_role("button", name="No puedo valorarlo").first.click()
    check(
        "R25 VISTA-AÉREA: foto en todas las obras con ubicación y en ninguna más",
        vistas == len(CON_PUNTO) and not discrepancias,
        f"vistas={vistas} {discrepancias[:3]}",
    )
    ctx_r25.close()

    # V1-V6 — Recuento colectivo y anónimo (solo en local, almacén en memoria:
    # RECUENTO_MEMORIA=1 con next start).
    if LOCAL:
        ids = [m.group(1) for m in re.finditer(r'"id": "(OBRA-[^"]+)"', open(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "lib", "obras.ts"), encoding="utf-8").read())]
        obra_v = ids[-1]
        antes = _recuento(obra_v)
        check("V1 recuento: GET responde con contadores", antes is not None and "votos" in antes, f"{antes}")
        r1 = secrets.token_hex(16)
        voto = lambda valor, rev, recibo=r1, obra=obra_v: {"obra": obra, "tipo": "voto", "valor": valor, "recibo": recibo, "rev": rev}
        estado, _ = _api("POST", "/api/recuento", {"cambios": [voto("valio", 1)]})
        despues = _recuento(obra_v)
        check(
            "V1 recuento: un voto suma uno",
            estado == 200 and despues and despues["votos"]["valio"] == antes["votos"]["valio"] + 1,
            f"estado={estado} antes={antes} despues={despues}",
        )
        _api("POST", "/api/recuento", {"cambios": [voto("valio", 1)]})
        _api("POST", "/api/recuento", {"cambios": [voto("valio", 2)]})
        check("V1 recuento: reenviar el mismo recibo no suma dos veces", _recuento(obra_v) == despues, f"{_recuento(obra_v)}")
        estado, _ = _api("POST", "/api/recuento", {"cambios": [voto("no_valio", 3)]})
        cambio = _recuento(obra_v)
        check(
            "V2 recuento: cambiar el voto mueve uno de sitio",
            estado == 200 and cambio["votos"]["valio"] == antes["votos"]["valio"] and cambio["votos"]["no_valio"] == antes["votos"]["no_valio"] + 1,
            f"{cambio}",
        )
        # Una petición atrasada (versión vieja) no deshace el cambio.
        _api("POST", "/api/recuento", {"cambios": [voto("valio", 2)]})
        check("V2 recuento: una petición atrasada no deshace un cambio posterior", _recuento(obra_v) == cambio, f"{_recuento(obra_v)}")
        e_obra, _ = _api("POST", "/api/recuento", {"cambios": [voto("valio", 9, obra="no-existe")]})
        e_voto, _ = _api("POST", "/api/recuento", {"cambios": [voto("me_gusta", 9)]})
        e_recibo, _ = _api("POST", "/api/recuento", {"cambios": [voto("valio", 9, recibo="corto")]})
        e_rev, _ = _api("POST", "/api/recuento", {"cambios": [voto("valio", 0)]})
        check("V3 recuento: rechaza obras, valores, recibos y versiones no válidas", (e_obra, e_voto, e_recibo, e_rev) == (400, 400, 400, 400), f"{e_obra} {e_voto} {e_recibo} {e_rev}")
        # Quitar votos sin su recibo no resta nada: no se pueden borrar votos ajenos.
        _api("POST", "/api/recuento", {"cambios": [voto(None, 1, recibo=secrets.token_hex(16)) for _ in range(5)]})
        check("V3 recuento: sin el recibo no se quitan votos ajenos", _recuento(obra_v) == cambio, f"{_recuento(obra_v)}")
        _api("POST", "/api/recuento", {"cambios": [voto(None, 4), voto(None, 5), voto(None, 6)]})
        quitado = _recuento(obra_v)
        check(
            "V3 recuento: quitar con su recibo resta uno y ningún contador baja de cero",
            quitado["votos"]["no_valio"] == antes["votos"]["no_valio"] and min(quitado["votos"].values()) >= 0,
            f"{quitado}",
        )
        # El voto retirado no resucita con una petición atrasada.
        _api("POST", "/api/recuento", {"cambios": [voto("no_valio", 3)]})
        check("V3 recuento: una petición atrasada no resucita un voto retirado", _recuento(obra_v) == quitado, f"{_recuento(obra_v)}")

        # V4 — votar en la app llega al recuento, y deshacer lo quita.
        ctx_v = nuevo_contexto(browser, viewport={"width": 390, "height": 844}, locale="es-ES")
        p_v = ctx_v.new_page()
        p_v.goto(BASE, wait_until="networkidle")
        p_v.get_by_role("button", name="Entendido, a votar").click()
        esperar_sin_vuelo(p_v)
        nombre_v = nombre_arriba(p_v).strip()
        # El id de la obra no está en el DOM: se mira el total de todas.
        total = lambda: sum(sum((_recuento(i) or {"votos": {}})["votos"].values()) for i in ids)
        t0 = total()
        p_v.get_by_role("button", name="Valió").first.click()
        p_v.wait_for_timeout(2500)
        t1 = total()
        check("V4 recuento: un voto en la app llega al recuento", t1 == t0 + 1, f"{t0} -> {t1} ({nombre_v[:30]})")
        p_v.get_by_role("button", name=re.compile("Deshacer")).click()
        p_v.wait_for_timeout(2500)
        check("V4 recuento: deshacer lo quita del recuento", total() == t0, f"{t0} -> {total()}")

        # V5 — la ficha enseña el reparto a partir de 5 votos.
        esperar_sin_vuelo(p_v)
        _api("POST", "/api/recuento", {"cambios": [{"obra": i, "tipo": "voto", "valor": "valio", "recibo": secrets.token_hex(16), "rev": 1} for i in ids for _ in range(6)]})
        p_v.locator(".stack-slot").first.get_by_role("button", name="Ver ficha y evidencia").click()
        seccion = p_v.locator(".recuento-vecinos")
        seccion.wait_for(timeout=5000)
        p_v.wait_for_timeout(800)
        texto = seccion.inner_text()
        check(
            "V5 recuento: la ficha enseña el reparto y avisa de que no es una encuesta",
            seccion.locator(".recuento-barras li").count() == 4 and "no una encuesta" in texto,
            texto[:160],
        )
        shot(p_v, "29-recuento-ficha")
        ctx_v.close()

        # V8 — dos pestañas votando la misma obra cuentan una sola vez.
        ctx_v8 = nuevo_contexto(browser, viewport={"width": 390, "height": 844}, locale="es-ES")
        pa, pb = ctx_v8.new_page(), ctx_v8.new_page()
        for pg in (pa, pb):
            pg.goto(BASE, wait_until="networkidle")
            if pg.get_by_role("button", name="Entendido, a votar").count():
                pg.get_by_role("button", name="Entendido, a votar").click()
            esperar_sin_vuelo(pg)
        t0 = total()
        badge_b = pb.locator(".brand-badge").inner_text()
        pa.get_by_role("button", name="Valió").first.click()
        pa.wait_for_timeout(3500)
        badge_b2 = pb.locator(".brand-badge").inner_text()
        check(
            "V8 recuento: la otra pestaña ve el voto al momento y no lo vuelve a contar",
            total() == t0 + 1 and badge_b2 != badge_b and " 1/" in badge_b2,
            f"{t0} -> {total()} · B: {badge_b} -> {badge_b2}",
        )
        ctx_v8.close()

        # V9 — dos pestañas votando obras distintas: se cuentan las dos y
        # ninguna borra el voto de la otra.
        ctx_v9 = nuevo_contexto(browser, viewport={"width": 390, "height": 844}, locale="es-ES")
        pa, pb = ctx_v9.new_page(), ctx_v9.new_page()
        for pg in (pa, pb):
            pg.goto(BASE, wait_until="networkidle")
            if pg.get_by_role("button", name="Entendido, a votar").count():
                pg.get_by_role("button", name="Entendido, a votar").click()
            esperar_sin_vuelo(pg)
        t0 = total()
        pa.get_by_role("button", name="Valió").first.click()
        pa.wait_for_timeout(2500)
        # Sin recargar: B se entera del voto de A y le enseña la siguiente obra.
        esperar_sin_vuelo(pb)
        pb.get_by_role("button", name="No valió").first.click()
        pb.wait_for_timeout(2500)
        votos_guardados = pa.evaluate("Object.keys(JSON.parse(localStorage.getItem('valio.votos.v1') || '{}')).length")
        check("V9 recuento: dos pestañas, obras distintas: suman dos y se guardan las dos", total() == t0 + 2 and votos_guardados == 2, f"{t0} -> {total()}, guardados={votos_guardados}")
        ctx_v9.close()

        # V10 — almacenamiento lleno: votar dos obras seguidas no hace
        # desaparecer la primera de la pantalla.
        ctx_v10 = nuevo_contexto(browser, viewport={"width": 390, "height": 844}, locale="es-ES")
        p10 = ctx_v10.new_page()
        p10.goto(BASE, wait_until="networkidle")
        if p10.get_by_role("button", name="Entendido, a votar").count():
            p10.get_by_role("button", name="Entendido, a votar").click()
        esperar_sin_vuelo(p10)
        p10.evaluate("""() => {
            const original = Storage.prototype.setItem;
            Storage.prototype.setItem = function (k, v) {
                if (k === 'valio.votos.v1') throw new DOMException('lleno', 'QuotaExceededError');
                return original.call(this, k, v);
            };
        }""")
        p10.get_by_role("button", name="Valió").first.click()
        esperar_sin_vuelo(p10)
        p10.get_by_role("button", name="No valió").first.click()
        esperar_sin_vuelo(p10)
        badge10 = p10.locator(".brand-badge").inner_text()
        check("V10 recuento: con el almacenamiento lleno no se pierde el primer voto", " 2/" in badge10, badge10)
        ctx_v10.close()

        # V6 — freno de abuso: pasado el límite diario, 429.
        r6 = secrets.token_hex(16)
        lote = lambda base: [{"obra": obra_v, "tipo": "senal", "valor": "terminada" if k % 2 == 0 else None, "recibo": r6, "rev": base + k + 1} for k in range(200)]
        codigos = [_api("POST", "/api/recuento", {"cambios": lote(200 * n)})[0] for n in range(2)]
        check("V6 recuento: más de 300 cambios al día desde la misma conexión dan 429", codigos[-1] == 429, f"{codigos}")

        # V7 — carga nacional: se cuentan votos a obras de Madrid, y un lote con
        # una obra desconocida no pierde los cambios buenos. Se cambia de IP
        # (X-Forwarded-For) porque V6 ya agotó el límite de esta.
        id_madrid = json.loads(open(os.path.join(os.path.dirname(__file__), "..", "..", "public", "datos", "provincias", "28.json"), encoding="utf-8").read())["municipios"]["28079"]["obras"][0]["id"]
        cabecera_v7 = {"X-Forwarded-For": "203.0.113.77"}
        antes_m = _recuento(id_madrid)
        e_mixto, cuerpo_mixto = _api("POST", "/api/recuento", {"cambios": [
            {"obra": id_madrid, "tipo": "voto", "valor": "valio", "recibo": secrets.token_hex(16), "rev": 1},
            {"obra": "28079-000000000000", "tipo": "voto", "valor": "valio", "recibo": secrets.token_hex(16), "rev": 1},
        ]}, cabecera_v7)
        despues_m = _recuento(id_madrid)
        check(
            "V7 recuento: vota obras nacionales y descarta solo lo desconocido",
            e_mixto == 200 and antes_m is not None and despues_m["votos"]["valio"] == antes_m["votos"]["valio"] + 1,
            f"{e_mixto} {cuerpo_mixto} {antes_m} -> {despues_m}",
        )

    # R27 — Toda España: buscador con los 8.000 y pico municipios; las obras
    # se descargan por provincia al elegir, con rótulo de dato oficial.
    madrid = json.loads(open(os.path.join(os.path.dirname(__file__), "..", "..", "public", "datos", "provincias", "28.json"), encoding="utf-8").read())["municipios"]["28079"]
    indice_es = json.loads(open(os.path.join(os.path.dirname(__file__), "..", "..", "public", "datos", "municipios.json"), encoding="utf-8").read())["municipios"]
    check("R27 NACIONAL: el buscador tiene todos los municipios de España", len(indice_es) > 8000, str(len(indice_es)))
    ctx_r27 = browser.new_context(viewport={"width": 375, "height": 812}, locale="es-ES")  # sin municipio recordado
    p_r27 = ctx_r27.new_page()
    errores_r27 = []
    p_r27.on("pageerror", lambda e: errores_r27.append(str(e)))
    p_r27.goto(BASE, wait_until="networkidle")
    buscar = p_r27.get_by_role("searchbox", name="Busca tu municipio")
    check("R27 NACIONAL: hay buscador de municipio", buscar.count() == 1)
    buscar.fill("zzzz")
    check("R27 NACIONAL: sin resultados lo dice", p_r27.get_by_text("No encontramos ningún municipio").count() == 1)
    buscar.fill("madrid")
    botones = p_r27.locator(".municipio-btn")
    check("R27 NACIONAL: el buscador pone primero Madrid", botones.count() >= 1 and botones.first.inner_text().startswith("Madrid"))
    botones.first.click()
    p_r27.get_by_role("button", name="Entendido, a votar").click()
    p_r27.wait_for_selector(".stack-slot", timeout=20000)
    badge = p_r27.locator(".brand-badge").inner_text()
    check(
        "R27 NACIONAL: cabecera con DATO OFICIAL y todas las obras de Madrid",
        "DATO OFICIAL" in badge and "Madrid" in badge and f"/{len(madrid['obras'])}" in badge,
        badge,
    )
    carta = p_r27.locator(".stack-slot").first
    check(
        "R27 NACIONAL: la tarjeta dice «Dato oficial, sin revisar a mano»",
        carta.get_by_text("Dato oficial, sin revisar a mano").count() >= 1,
    )
    carta.get_by_role("button", name="Ver ficha y evidencia").click()
    p_r27.wait_for_timeout(500)
    ficha = p_r27.locator(".sheet")
    check("R27 NACIONAL: coste por vecino sobre la población de Madrid",
          "3.506.730" in ficha.inner_text(), ficha.inner_text()[:200])
    enlace = ficha.get_by_role("link", name="Plataforma de Contratación del Sector Público (PLACE)").first.get_attribute("href") or ""
    check("R27 NACIONAL: la ficha enlaza al anuncio oficial", enlace.startswith("https://contrataciondelestado.es/"), enlace)
    check("R27 NACIONAL: sin errores de página", not errores_r27, str(errores_r27[:2]))
    shot(p_r27, "30-nacional-madrid")
    ctx_r27.close()

    # R28 — Municipios sin obras cargadas y municipio guardado con la versión anterior.
    ctx_r28 = browser.new_context(viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r28 = ctx_r28.new_page()
    p_r28.goto(BASE, wait_until="networkidle")
    p_r28.get_by_role("searchbox", name="Busca tu municipio").fill("barcelona")
    p_r28.locator(".municipio-btn").filter(has_text="sin obras cargadas").first.click()
    if p_r28.get_by_role("button", name="Entendido, a votar").count():
        p_r28.get_by_role("button", name="Entendido, a votar").click()
    aviso = p_r28.get_by_role("heading", name=re.compile("Aún no tenemos obras de"))
    aviso.wait_for(timeout=15000)
    texto28 = p_r28.locator(".panel").filter(has=aviso).inner_text()
    check(
        "R28 SIN DATOS: explica que no tenemos obras y por qué, sin decir que no las hay",
        "Cataluña" in texto28 and "no quiere decir que no haya obras" in texto28 and p_r28.locator(".card-frame").count() == 0,
        texto28[:200],
    )
    shot(p_r28, "31-sin-datos-barcelona")
    ctx_r28.close()
    ctx_r28b = browser.new_context(viewport={"width": 375, "height": 812}, locale="es-ES")
    ctx_r28b.add_init_script("try { localStorage.setItem('valio.municipio.v1', 'València'); } catch (e) {}")
    p_r28b = ctx_r28b.new_page()
    p_r28b.goto(BASE, wait_until="networkidle")
    if p_r28b.get_by_role("button", name="Entendido, a votar").count():
        p_r28b.get_by_role("button", name="Entendido, a votar").click()
    p_r28b.wait_for_selector(".brand-badge", timeout=15000)
    check("R28 MIGRACIÓN: quien eligió València con la versión anterior sigue en València",
          "València" in p_r28b.locator(".brand-badge").inner_text(), p_r28b.locator(".brand-badge").inner_text())
    ctx_r28b.close()

    browser.close()

parar_servidor()

health = {
    "console": 100 if not console_errors else 40,
    "functional": 100 - 15 * len([i for i in ISSUES]),
    "issues": ISSUES,
    "console_errors": console_errors[:5],
}
print(json.dumps(health, ensure_ascii=False, indent=2))
sys.exit(1 if ISSUES or console_errors else 0)
