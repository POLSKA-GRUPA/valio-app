"""Espera una descarga real; un timeout o una imagen rota siguen siendo fallo."""
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError


def imagen_cargada(page, imagen, timeout=10000):
    try:
        page.wait_for_function(
            "img => img.complete && img.naturalWidth > 0",
            arg=imagen.element_handle(),
            timeout=timeout,
        )
        return True
    except PlaywrightTimeoutError:
        return False
