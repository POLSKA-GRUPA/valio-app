# Protocolo de trabajo — valio-app

Cómo trabajamos cada semana. Si algo de aquí no lo entiendes, pregúntale a Kenyi
antes de improvisar: improvisar es lo único prohibido.

## Quién hace qué

| Rol | Quién | Qué hace |
|---|---|---|
| Product Owner | Kenyi | Decide prioridades, revisa TODO cada noche, cierra la semana |
| FCT / QA + código | Becario | Issues → rama → commits → PR → merge con build verde |
| Agentes IA | Los que uses | Te ayudan a codear y testear; tú diriges y verificas |

## El ciclo diario

1. **Elige un issue** abierto de este repo (empieza por los etiquetados `buen-primer-issue`).
2. **Crea tu rama** desde `main` actualizada:
   ```bash
   git checkout main && git pull
   git checkout -b fix/12-nombre-corto
   ```
   Prefijos: `feat/` (cosa nueva), `fix/` (bug), `docs/` (documentación), `test/` (pruebas).
3. **Trabaja en commits pequeños**: un propósito por commit, mensaje tipo
   `fix: corrige solape del coste con el chip` o `docs: añade guía UAT`.
   Si el issue es #12, menciona `#12` en el cuerpo.
4. **Abre el PR** con título claro y `Closes #12` en la descripción (así el issue
   se cierra solo al fusionar). Un PR = un tema. Nada de PRs de 20 archivos.
5. **Espera el check de CI** (compila el proyecto). Solo puedes pulsar **Merge**
   si el check está **verde**. Si está rojo, lee el log, arregla, empuja de nuevo.
6. **Kenyi revisa por la noche**: dejará comentarios en tus PRs e issues.
   Responde o corrige al día siguiente. Nada de rehacer en silencio.

## Líneas que nunca se cruzan

- **No inventes datos**: ninguna cifra, fuente ni URL real sin verificar. Las
  tarjetas dicen DEMO y así se quedan hasta el gate P0 (repo `valio-datos`).
- **HITL**: la app nunca envía nada solo. No añadas envíos automáticos.
- **Mobile-first**: si se ve mal en un móvil de 300 €, está mal hecho.
- **Un bug = un commit = un re-test**. Si un fix falla 3 veces seguidas, PARA y
  escribe a Kenyi con lo que has probado (regla del becario: 30 min bloqueado → aviso).
- **No toques** `.github/`, este protocolo, ni `docs/uat/CODEX_REVIEW.md` sin permiso.
- Nada de credenciales, tokens ni datos personales en el código ni en los issues.

## Trabajo con IA (tu copiloto)

Puedes usar agentes IA para escribir código, pero tú eres el responsable:
ejecuta, lee la salida, verifica en el navegador. Antes de abrir el PR, pasa tú
mismo esta lista:

- [ ] Compila (`npm run build`)
- [ ] Probado en el móvil o vista móvil
- [ ] Teclado: se puede usar todo sin ratón
- [ ] Nada inventado (datos, capturas, fuentes)
- [ ] El PR es pequeño y cuenta qué cambia y por qué

## Cierre de semana

- Rellena `plantillas/INFORME_SEMANAL.md` (en `valio-datos`) y abre PR allí.
- Kenyi revisa métricas: issues cerrados, PRs revisados, bugs encontrados.

## Si algo se rompe

Primero `git log` y `git diff` para entender qué cambió. Segundo, pregunta.
Nunca hagas `push --force` ni borres ramas que no son tuyas.
