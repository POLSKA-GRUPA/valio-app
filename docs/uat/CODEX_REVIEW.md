# HandoffV1 — Revisión Codex (commit 362f1cc)

status: concern

finding:

1. [alta] components/Deck.tsx:155-168 — El manejador global de teclado actúa durante el tutorial, no filtra controles interactivos ni llama a `preventDefault`; las flechas pueden votar detrás del tutorial y `Enter` puede abrir la ficha además de activar el botón enfocado.
2. [alta] components/ClaimDraft.tsx:57-69, components/DetailSheet.tsx:24-36, components/MatchScreen.tsx:15-39 — Los diálogos declaran `aria-modal`, pero no trasladan, confinan ni restauran el foco y tampoco admiten cierre con Escape. El fondo continúa siendo navegable.
3. [media] lib/store.tsx:25-29, lib/obras.ts:233, components/Panels.tsx:29-37 — `JSON.parse` se fuerza a `Votos` sin validar. Además, `Record<string,Voto>` afirma que cualquier clave existe aunque el estado inicial sea vacío. Datos persistidos obsoletos o manipulados pueden producir votos inválidos o bloquear la aplicación.
4. [media] lib/store.tsx:23-34, components/Deck.tsx:138-150 — `listo` no protege el mazo. Parpadeo SSR/efecto y ventana donde una interacción temprana puede sobrescribir el historial.
5. [media] lib/store.tsx:6-7,29,54-57 — Se incumple "localStorage solo con votos": también se persiste `valio.tutorial.visto.v1`.
6. [media] components/Deck.tsx:79-85,145-150,226-251,285-297 — Solo el arrastre pasa por `salir`; botones y teclado llaman directamente a `decidir`. Las alternativas no muestran el sello ni una salida equivalente.
7. [baja] app/page.tsx:35-49 — El patrón ARIA de pestañas está incompleto: faltan `tabpanel`, `aria-controls`, foco itinerante y navegación con flechas.
8. [baja] components/Deck.tsx:137,316, app/page.tsx:30 — `activo` siempre vale `true` cuando `Deck` está montado y la reexportación `Votos` no se consume. Código redundante.
9. [baja] lib/obras.ts:141 — El texto afirma que existen "tres gestos verticales", pero solo hay dos.

proof: revisión estática read-only (`git show`, lectura con `nl -ba`, `git grep` de secretos/env/red/dangerouslySetInnerHTML/ARIA; conteos de tarjetas DEMO y umbrales). Sin build ni pruebas ejecutadas por restricción de sandbox.

residual_risk: No se validaron en navegador el orden real del foco, anuncios de lector de pantalla, temporización de salida de Framer Motion, gestos diagonales ni comportamiento entre navegadores.

## Resolución (commit posterior)

Todos los hallazgos corregidos y verificados con E2E Playwright (28/28, 0 errores de consola):

1. Manejador de teclado: ignora tutorial/overlays/elementos interactivos y hace `preventDefault`.
2. `lib/useDialog.ts`: foco inicial, trampa de Tab, Escape y restauración de foco en ficha, match y borrador.
3. `sanitizarVotos` valida todo lo leído de localStorage.
4. `listo` protege el mazo hasta cargar el almacenamiento.
5. README e Info declaran qué se persiste (votos + tutorial) en el dispositivo.
6. Botones y teclado vuelan la tarjeta con su sello (mismo camino que el arrastre).
7. `tabpanel` + `aria-controls` + flechas/Home/End en la tablist con roving tabindex.
8. Eliminados prop `activo` y reexportación de `Votos`.
9. Texto de gestos verticales corregido.
