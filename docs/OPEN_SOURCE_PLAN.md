# Plan de apertura de código (open source) — ¿VALIÓ?

Estado: **público desde el 2026-10-03** (decisión de Kenyi; se adelanta el
timing de la sección 6). Este documento fija QUÉ se abre, CON QUÉ licencia y
QUÉ se auditó antes del interruptor.

Hecho el día del flip: gitleaks sobre toda la historia (0 hallazgos), revisión
de datos personales en docs, issues y PRs, protección de rama en `main` (PR
con 1 aprobación + checks `build` y `secretos`), reporte privado de
vulnerabilidades y alertas de Dependabot. `valio-datos` sigue privado.

## 1. Principios (ya escritos en el PRD)

- Apertura por defecto del código. Excepción única: las claves antimanipulación
  (antibrigading) no se publican.
- La confianza verificable es el foso: cualquier persona debe poder reproducir
  cómo se obtuvo un dato.
- Se juzgan obras y datos, nunca nombres propios.

## 2. Qué se abre y qué no

| Elemento | Destino | Nota |
|---|---|---|
| `valio-app` (código de la app) | Público | Este repo |
| Método de verificación P0 y plantillas (`valio-datos/docs`, `plantillas`) | Público | Son parte del foso replicable |
| Dataset de obras verificadas | Público con licencia de datos (CC BY 4.0 recomendada) | Citar siempre la fuente oficial original |
| Tareas del alumno, informes internos, `docs/EQUIPO.md` con roles internos | Se limpian o se separan antes del flip | Cero datos personales |
| Claves antibrigading, rate limits y lógica que ayude a atacantes | Privado | Puede vivir en un repo privado `valio-guard` |
| Marca ¿VALIÓ? (nombre y logo) | NO se libera | La licencia de código no es licencia de marca: añadir NOTICE |

## 3. Licencia de código: DECIDIDA

**Decisión (Kenyi, 2026-09-21): licencia MIT. Titular del copyright: SOCIEDAD
ESPAÑOLA DE ASESORAMIENTO Y SISTEMAS INTELIGENTES, S.L. (CIF B05592530).
Publicación cuando el desarrollo esté terminado.**

| Opción | A favor | En contra |
|---|---|---|
| **MIT (ELEGIDA)** | Adopción máxima, cero fricción, cualquier ayuntamiento u ONG puede usarlo sin fricción legal | Un competidor puede cerrar un fork comercial sin devolver nada; la protección queda en la marca (NOTICE) y en la velocidad de ejecución |
| AGPL-3.0 (descartada) | Impediría clones SaaS cerrados | Fricción legal para el sector público |
| EUPL-1.2 (descartada) | Bien vista en sector público europeo | Menos conocida |

Con MIT, el foso real es la disciplina de verificación (método P0), la marca
reservada (NOTICE.md) y la comunidad: no la licencia. El archivo LICENSE ya
está en el repo; el flip de visibilidad se hace al terminar el desarrollo
siguiendo el checklist de la sección 5.

Pendiente de decidir más adelante: licencia del dataset verificado
(recomendación: CC BY 4.0 con atribución a la fuente oficial).

## 4. Contribuciones: DCO, no CLA

- **DCO** (`Signed-off-by` en cada commit) para empezar: ligero, sin abogados.
- CLA solo si algún día se quiere dual-licensing comercial real (entonces hace
  falta ser dueño de todo el copyright).

## 5. Checklist antes del interruptor (el día del flip)

1. Escaneo de secretos en TODA la historia: `gitleaks detect --log-opts="--all"`.
   Cero hallazgos o historia reescrita.
2. Auditoría de datos personales en issues, PRs, docs y capturas (nombres de
   personas reales, teléfonos, expedientes). Los issues internos del becario se
   archivan o se anonimizan.
3. Revisión de docs: quitar referencias internas del despacho que no aportan
   (ruta de negocio, clientes, precios) y generalizar PROTOCOLO_TRABAJO.
4. Añadir `LICENSE` (decisión de la sección 3) y `NOTICE` (marca reservada,
   fuentes de datos, agradecimientos).
5. `README` bilingüe (es/en) y badges de CI. LICENSE y NOTICE ya presentes.
6. Activar branch protection para externos (PR obligatorio, CI verde).
7. Anuncio: artículo validado + posts (skills marketing), enlazando el repo.

## 6. Timing recomendado

- **Hoy (P1)**: hábitos ya aplicados: CI en verde, secret-scan en cada PR,
  changelog, sin secretos, sin datos personales. Coste: cero.
- **P2 (MVP territorial)**: publicar el MÉTODO de verificación.
- **Al terminar el desarrollo (decisión del propietario)**: flip del repo de
código a público con licencia MIT y titular SEASI, S.L.
- Regla: nunca publicar por publicar. Se publica cuando abrir añade confianza
  y no expone a usuarios en pruebas.

## 7. Lo que ya está hecho para esto

- CI de build en cada PR (.github/workflows/ci.yml).
- Escaneo de secretos en cada PR (.github/workflows/secret-scan.yml).
- CHANGELOG.md desde el primer día.
- Plantillas de issue y PR (.github/).
- SECURITY.md con canal de reporte privado.
