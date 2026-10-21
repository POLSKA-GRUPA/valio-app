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
5. **Verifica en local y deja evidencia**: `npm run build`, TypeScript y las
   regresiones pertinentes deben estar verdes. Otra persona o agente revisa el
   cambio antes del merge. Por decisión del owner, los checks de GitHub no son
   el gate de aceptación; no hay que contratar CI ni cambiar protecciones para
   suplir esa validación. Si GitHub exige una aprobación adicional, el owner
   resuelve el merge: no se presenta una revisión local como esa aprobación.
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

## Publicar sin dejar producción fuera de Git

Sólo el owner publica. El orden es **pruebas y revisión → merge → comprobar
`origin/main` → publicar → verificar deployment y alias → registrar el cierre**.
No se publica desde una rama de pruebas dejando su integración para después.

Antes de publicar, ejecuta `git fetch origin`, comprueba que `git status --short`
está vacío y que `git rev-parse HEAD` coincide con `git rev-parse origin/main`.
Si no coinciden, no publiques: integra y repite las comprobaciones. Registra
SHA completo, tag remoto, deployment y rollback en `docs/releases/`. Los tags
de producción no se fuerzan ni se mueven. No basta con que el código siga sólo
en el ordenador del owner.

Un merge puede activar la integración Git de Vercel: comprueba su configuración
y valida el payload antes de fusionar; después confirma qué deployment atiende
cada alias. No cambies permisos ni ajustes de producción para saltarte un bloqueo.

La reconciliación de la entrega del 18 de octubre está en
[su registro de anclaje](releases/2026-10-18.md). Estas instrucciones son un
procedimiento de publicación, no un bloqueo técnico de la CLI de Vercel.
