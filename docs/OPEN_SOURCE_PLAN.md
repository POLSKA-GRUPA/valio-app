# Plan de apertura de código (open source) — ¿VALIÓ?

Estado: privado. Destino: público cuando el producto esté presentable (ver
Timing). Este documento fija QUÉ se abrirá, CON QUÉ licencia y QUÉ hay que
auditar antes del interruptor.

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

## 3. Licencia de código: comparativa honesta

| Opción | A favor | En contra |
|---|---|---|
| **AGPL-3.0** (recomendada) | Nadie puede montar un clon SaaS cerrado de ¿VALIÓ? sin aportar; permite vender licencias comerciales duales más adelante; estándar en civic tech | Algunos ayuntamientos son conservadores con copyleft |
| **EUPL-1.2** | Diseñada por la UE, bien vista en sector público europeo, copyleft suave | Menos conocida por developers |
| **Apache-2.0 / MIT** | Adopción máxima, cero fricción | Un competidor puede cerrar un fork comercial sin devolver nada |

Recomendación: **AGPL-3.0** para el código, **CC BY 4.0** para el dataset,
**marca reservada** en NOTICE. Si el objetivo número uno es que lo copien los
ayuntamientos sin miedo, EUPL es el plan B. Pendiente de decisión de Kenyi.

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
5. `README` bilingüe (es/en) y badges de CI.
6. Activar branch protection para externos (PR obligatorio, CI verde).
7. Anuncio: artículo validado + posts (skills marketing), enlazando el repo.

## 6. Timing recomendado

- **Hoy (P1)**: hábitos ya aplicados: CI en verde, secret-scan en cada PR,
  changelog, sin secretos, sin datos personales. Coste: cero.
- **P2 (MVP territorial)**: publicar el MÉTODO de verificación.
- **P3 (beta pública gobernada)**: flip del repo de código. La beta pública del
  PRD es el momento natural para que el repo sea público y recoja
  contribuciones externas.
- Regla: nunca publicar por publicar. Se publica cuando abrir añade confianza
  y no expone a usuarios en pruebas.

## 7. Lo que ya está hecho para esto

- CI de build en cada PR (.github/workflows/ci.yml).
- Escaneo de secretos en cada PR (.github/workflows/secret-scan.yml).
- CHANGELOG.md desde el primer día.
- Plantillas de issue y PR (.github/).
- SECURITY.md con canal de reporte privado.
