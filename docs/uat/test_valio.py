"""Prueba E2E de la demo ¿VALIÓ? — gestos, botones, teclado, ficha, match, resultados."""
import json
import os
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
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

def nombre_top(page):
    return page.locator(".card-nombre").first.inner_text()

def esperar_nombre_distinto(page, anterior, ms=4000):
    page.wait_for_function(
        "(a) => (document.querySelector('.card-nombre')?.textContent || '') !== a",
        arg=anterior,
        timeout=ms,
    )

def esperar_sin_vuelo(page, ms=4000):
    page.wait_for_function(
        "() => !document.querySelector('[aria-label^=\"Voto registrado\"]')",
        timeout=ms,
    )

def cerrar_match_si_sale(page):
    try:
        page.wait_for_selector(".match-screen", state="visible", timeout=1500)
    except Exception:
        return
    page.get_by_role("button", name="Seguir votando").click()
    page.wait_for_selector(".match-screen", state="detached")
    page.wait_for_timeout(150)

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

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 375, "height": 812}, has_touch=True, locale="es-ES")
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    page = ctx.new_page()
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: console_errors.append(str(e)))

    page.goto(BASE, wait_until="networkidle")
    check("carga inicial", page.locator(".brand").count() == 1)

    # 1. Tutorial
    tut = page.locator(".tutorial")
    check("tutorial visible en primera visita", tut.is_visible())
    shot(page, "01-tutorial")

    # 1b. Las flechas NO votan durante el tutorial
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(600)
    check("teclado bloqueado durante tutorial", "plaza mayor" in (nombre_top(page) or "").lower())
    page.get_by_role("button", name="Entendido, a votar").click()
    page.wait_for_timeout(400)
    check("tutorial se cierra", not tut.is_visible())

    # 2. Tarjeta superior visible
    check("tarjeta DEMO-01 visible", "plaza mayor" in (nombre_top(page) or "").lower())
    check("badge DEMO en tarjeta", page.locator(".chip-demo").first.is_visible())
    shot(page, "02-mazo-inicial")

    # 3. Botón NO VALIÓ -> match ciudadano
    antes = nombre_top(page)
    page.get_by_role("button", name="No valió").click()
    page.wait_for_timeout(500)
    match = page.locator(".match-screen")
    check("match ciudadano tras NO VALIÓ", match.is_visible())
    check("checklist de 5 señales", page.locator(".match-checklist span").count() == 5)
    shot(page, "03-match-ciudadano")

    # 4. Pedir explicaciones desde el match
    page.get_by_role("button", name="Pedir explicaciones").first.click()
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

    # 4b. Escape cierra el match y devuelve el foco
    cerrar_match_si_sale(page)
    if not page.locator(".match-screen").count():
        # reabrir para probar Escape: votar otra tarjeta a la izquierda no es posible aquí;
        # probamos Escape con la ficha más adelante. Restauramos foco al cuerpo.
        page.evaluate("document.activeElement && document.activeElement.blur()")

    esperar_nombre_distinto(page, antes)

    # 5. Gesto de arrastre a la izquierda (DEMO-02)
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
    cerrar_match_si_sale(page)
    esperar_nombre_distinto(page, antes)
    check("arrastre a la izquierda vota", True)

    # 6. Botón ↑ pido explicaciones (DEMO-03)
    antes = nombre_top(page)
    page.get_by_role("button", name="Pido explicaciones").click()
    esperar_nombre_distinto(page, antes)
    check("botón explica consume tarjeta", True)

    # 7. Ficha con Enter (foco al cuerpo) y 3 capas (DEMO-04)
    page.evaluate("document.activeElement && document.activeElement.blur()")
    page.keyboard.press("Enter")
    page.wait_for_timeout(500)
    hoja = page.locator(".sheet")
    check("ficha se abre con Enter", hoja.is_visible())
    capas = page.locator(".sheet .capa").count()
    check("ficha con capas resumen/datos/evidencia", capas >= 3, f"capas={capas}")
    check("ficha con estado del dato", "estado del dato" in hoja.inner_text().lower())
    shot(page, "06-ficha-3-capas")

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
    for _ in range(6):
        sel = page.get_by_role("button", name="Valió", exact=True)
        if not sel.is_visible() or sel.is_disabled():
            break
        sel.click()
        page.wait_for_timeout(450)
        cerrar_match_si_sale(page)
    page.wait_for_selector(".empty-deck", timeout=6000)
    check("mazo vacío al final", "Ya has votado todo" in page.locator(".empty-deck").inner_text())
    shot(page, "07-mazo-vacio")

    # 10. Resultados: 8 votos
    page.get_by_role("tab", name="Resultados").click()
    page.wait_for_timeout(400)
    items = page.locator(".result-item").count()
    check("resultados con 8 votos", items == 8, f"items={items}")
    shot(page, "08-resultados")

    # 11. Cabreo
    page.get_by_role("tab", name="Cabreo").click()
    page.wait_for_timeout(400)
    check("mapa del cabreo con 8 filas", page.locator(".cabreo-item").count() == 8)
    shot(page, "09-cabreo")

    # 12. Info
    page.get_by_role("tab", name="Info").click()
    page.wait_for_timeout(300)
    check("info con aviso demo", "ninguna cifra es real" in page.locator(".panel").inner_text().lower())

    # 13. Persistencia tras recarga
    page.get_by_role("tab", name="Resultados").click()
    page.reload(wait_until="networkidle")
    page.get_by_role("tab", name="Resultados").click()
    page.wait_for_timeout(400)
    check("votos persisten tras recarga", page.locator(".result-item").count() == 8)

    # 14. Teclado en estado limpio (otro contexto sin votos)
    ctx2 = browser.new_context(viewport={"width": 375, "height": 812})
    p2 = ctx2.new_page()
    p2.goto(BASE, wait_until="networkidle")
    p2.get_by_role("button", name="Entendido, a votar").click()
    p2.wait_for_timeout(400)
    p2.evaluate("document.activeElement && document.activeElement.blur()")
    p2.keyboard.press("ArrowRight")
    esperar_nombre_distinto(p2, "Rehabilitación de la plaza mayor (ejemplo)")
    check("flecha derecha vota sin match", not p2.locator(".match-screen").is_visible())
    check("tarjeta consumida por teclado", "plaza mayor" not in nombre_top(p2))
    antes2 = nombre_top(p2)
    p2.keyboard.press("ArrowUp")
    esperar_nombre_distinto(p2, antes2)
    check("flecha arriba consume tarjeta", True)

    # 15. Tamaños de pantalla
    for w, h, name in [(414, 896, "10-414"), (768, 1024, "11-768")]:
        pg = browser.new_context(viewport={"width": w, "height": h}, locale="es-ES").new_page()
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
    ctx_r1 = browser.new_context(viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r1 = ctx_r1.new_page()
    # simulamos un origen no seguro: sin API moderna de portapapeles
    p_r1.add_init_script(
        "Object.defineProperty(navigator, 'clipboard', { get: () => undefined });"
    )
    p_r1.goto(BASE, wait_until="networkidle")
    p_r1.get_by_role("button", name="Entendido, a votar").click()
    p_r1.get_by_role("button", name="No valió").click()
    p_r1.get_by_role("button", name="Pedir explicaciones").first.click()
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
    ctx_r2 = browser.new_context(viewport={"width": 375, "height": 812}, locale="es-ES")
    p_r2 = ctx_r2.new_page()
    p_r2.goto(BASE, wait_until="networkidle")
    p_r2.get_by_role("button", name="Entendido, a votar").click()
    p_r2.wait_for_timeout(300)
    for _ in range(8):
        sel = p_r2.get_by_role("button", name="Valió", exact=True)
        if not sel.is_visible():
            break
        sel.click()
        p_r2.wait_for_timeout(450)
        cerrar_match_si_sale(p_r2)
    p_r2.wait_for_selector(".empty-deck", timeout=6000)
    p_r2.get_by_role("button", name="Volver a empezar").click()
    p_r2.wait_for_timeout(600)
    check(
        "R2 ISSUE-12: volver a empezar rellena el mazo",
        p_r2.locator(".card-nombre").first.is_visible(),
    )
    shot(p_r2, "13-reg-issue12-volver")
    ctx_r2.close()

    # R3 — ISSUE-13: paneles ocultos fuera del layout y mazo a pantalla.
    ctx_r3 = browser.new_context(viewport={"width": 740, "height": 360}, locale="es-ES")
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
    ctx_r4 = browser.new_context(viewport={"width": 375, "height": 812}, locale="es-ES")
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
    ctx_r5 = browser.new_context(viewport={"width": 375, "height": 812}, locale="es-ES")
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
