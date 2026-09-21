# Cómo contribuir

Gracias por el interés. Reglas cortas para que todo fluya.

## Antes de proponer algo grande

Abre primero un issue describiendo el problema que quieres resolver (no la
solución). Este proyecto tiene un PRD que manda: las features nuevas entran por
decisión del product owner, no por pull request directo.

## Cómo enviar un cambio

1. Haz fork o crea una rama desde `main`.
2. Commits pequeños y descriptivos, un propósito por commit.
3. Si es tu contribución y el proyecto usa DCO, firma cada commit:
   `git commit -s` (añade `Signed-off-by`).
4. Abre el PR usando la plantilla. Un PR = un tema.
5. El check de CI (build) debe estar en verde antes de poder fusionar.

## Reglas del proyecto

- Nada de datos inventados: las tarjetas se marcan como demo y los datos reales
  llevan fuente, fecha y estado de verificación.
- Mobile-first: si no funciona en un móvil de gama baja, no cuenta.
- Accesibilidad: todo gesto debe tener alternativa por botón y teclado.
- La app nunca envía nada automáticamente: los borradores los revisa una persona.
- Sin datos personales en código, tests, issues o capturas.

## Entorno

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # debe pasar antes del PR
```
