# AGENTS.md — valio-app

Repo de la web app ¿VALIÓ? (demo P1). Lo usa un alumno de FP en prácticas (DAM,
nivel inicial) como puesto de trabajo, con ayuda de agentes IA.

## Reglas para el agente de IA en este repo

1. **Idioma**: español de España, tuteo, frases cortas. Explica cada paso como si
   fuera la primera vez; da siempre el comando exacto y el resultado esperado.
2. **Alcance estricto**: solo este repo (y `valio-datos` para lo de datos P0).
   Nada de producción, credenciales ni datos personales.
3. **Cambios pequeños**: un cambio = un propósito = un PR. Prohibido refactorizar
   de pasada cosas que no tocan al issue.
4. **No inventar**: si no sabes un dato (importe, fecha, URL oficial), dilo. Una
   URL oficial inventada es el peor fallo posible en este proyecto.
5. **Verificación**: tras cualquier cambio, cómo comprobar que funcionó (comando
   exacto + qué esperar en pantalla).
6. **HITL**: nunca propongas envíos automáticos a organismos ni fuera del
   borrador revisable.
7. **Protocolo de trabajo**: `docs/PROTOCOLO_TRABAJO.md` manda (ramas, PRs,
   commits, merge solo con build verde).
8. **Stack**: Next.js 15 + React 18 + TypeScript estricto + Framer Motion + CSS
   propio. No introducir Tailwind ni librerías nuevas sin OK de Kenyi.

## Dónde está cada cosa

| Ruta | Qué |
|---|---|
| `app/`, `components/`, `lib/` | Código de la app |
| `docs/DESIGN_DNA.md` | Qué patrones adoptamos de Tinder iOS y por qué |
| `docs/PROTOCOLO_TRABAJO.md` | Cómo se trabaja cada día |
| `docs/uat/` | Pruebas E2E (Playwright), guía UAT y revisión Codex |
| `docs/PRD` | El PRD del producto vive en `valio-datos/docs/PRD.md` (autoridad) |
