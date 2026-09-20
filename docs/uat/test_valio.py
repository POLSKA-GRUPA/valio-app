"""Prueba E2E de la demo ¿VALIÓ? — gestos, botones, teclado, ficha, match, resultados."""
import json
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
SHOTS = "/Users/kenyi/valio-app/docs/uat"
ISSUES = []
console_errors = []

def shot(page, name):
    page.screenshot(path=f"{SHOTS}/{name}.png", full_page=False)

def check(name, cond, detail=""):
    status = "OK " if cond else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        ISSUES.append({"id": name, "detail": detail})

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
    page.get_by_role("button", name="Entendido, a votar").click()
    page.wait_for_timeout(400)
    check("tutorial se cierra", not tut.is_visible())

    # 2. Tarjeta superior visible
    card = page.locator(".stack-slot").first.locator(".card-frame")
    nombre = page.locator(".card-nombre").first
    check("tarjeta DEMO-01 visible", "plaza mayor" in (nombre.inner_text() or "").lower())
    check("badge DEMO en tarjeta", page.locator(".chip-demo").first.is_visible())
    shot(page, "02-mazo-inicial")

    # 3. Botón NO VALIÓ -> match ciudadano
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

    # 5. Gesto de arrastre a la izquierda (DEMO-02)
    nombre_antes = page.locator(".card-nombre").first.inner_text()
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
    page.wait_for_timeout(700)
    if page.locator(".match-screen").is_visible():
        page.get_by_role("button", name="Seguir votando").click()
        page.wait_for_selector(".match-screen", state="detached")
        page.wait_for_timeout(150)
    nombre_despues = page.locator(".card-nombre").first.inner_text()
    check("arrastre a la izquierda vota", nombre_antes != nombre_despues, f"{nombre_antes!r} -> {nombre_despues!r}")

    # 6. Botón ↑ pido explicaciones (DEMO-03)
    nombre_antes = nombre_despues
    page.get_by_role("button", name="Pido explicaciones").click()
    page.wait_for_timeout(500)
    nombre_despues = page.locator(".card-nombre").first.inner_text()
    check("botón explica consume tarjeta", nombre_antes != nombre_despues, f"{nombre_antes!r} -> {nombre_despues!r}")

    # 7. Ficha con Enter y 3 capas (DEMO-04)
    page.keyboard.press("Enter")
    page.wait_for_timeout(500)
    hoja = page.locator(".sheet")
    check("ficha se abre con Enter", hoja.is_visible())
    capas = page.locator(".sheet .capa").count()
    check("ficha con capas resumen/datos/evidencia", capas >= 3, f"capas={capas}")
    check("ficha con estado del dato", "estado del dato" in hoja.inner_text().lower())
    shot(page, "06-ficha-3-capas")
    page.locator(".sheet-close").click()
    page.wait_for_selector(".sheet-backdrop", state="detached")
    page.wait_for_timeout(150)

    # 8. Botón ↓ no puedo valorarlo
    nombre_antes = page.locator(".card-nombre").first.inner_text()
    page.get_by_role("button", name="No puedo valorarlo").click()
    page.wait_for_timeout(500)
    check("botón ↓ consume tarjeta", page.locator(".card-nombre").first.inner_text() != nombre_antes)

    # 9. Votar el resto con ✓
    for _ in range(6):
        sel = page.get_by_role("button", name="Valió", exact=True)
        if not sel.is_visible():
            break
        sel.click()
        page.wait_for_timeout(450)
        seguir = page.get_by_role("button", name="Seguir votando")
        if seguir.is_visible():
            seguir.click()
            page.wait_for_timeout(300)
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
    p2.wait_for_timeout(300)
    p2.keyboard.press("ArrowRight")
    p2.wait_for_timeout(500)
    check("flecha derecha vota sin match", not p2.locator(".match-screen").is_visible())
    check("tarjeta consumida por teclado", "DEMO-02" not in p2.locator(".stack-slot").first.inner_text())
    p2.keyboard.press("ArrowUp")
    p2.wait_for_timeout(400)
    check("flecha arriba consume tarjeta", "pido explicaciones" not in p2.locator(".stack-slot").first.inner_text())

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

    browser.close()

health = {
    "console": 100 if not console_errors else 40,
    "functional": 100 - 15 * len([i for i in ISSUES]),
    "issues": ISSUES,
    "console_errors": console_errors[:5],
}
print(json.dumps(health, ensure_ascii=False, indent=2))
sys.exit(1 if ISSUES or console_errors else 0)
