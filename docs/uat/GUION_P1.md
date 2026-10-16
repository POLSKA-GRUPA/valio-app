# Guion del test P1 — ¿se entiende el voto sin explicación?


> **10 testers reales entienden el voto sin
> explicación y recuerdan qué votaron al día siguiente.**


Guión para test de gate P1 con testers reales.

## 1. Reclutamiento (sin datos personales)

- 10 personas cualquiera, **nadie del equipo**. Nadie que haya visto la app.
- De cada tester se apunta SOLO: número de tester (1–10) y franja de edad
  (18–30 / 31–45 / 46–60 / 60+). Nada más: ni iniciales, ni nombres, ni
  teléfonos, ni fotos. Este repo es público.
- Consentimiento verbal en una línea: «¿Te importa probar una app dos minutos
  hoy y contestarme una pregunta mañana? Solo apunto tu franja de edad.»
- Apunta con qué versión se hizo cada sesión (fecha y commit de `main` o URL
  de la preview). Las sesiones hechas con la DEMO (antes del #35) no cuentan
  para el gate: sus cifras no eran reales.


## 2. Sesión de test

1. Entrega el móvil con la app abierta en el mazo y di EXACTAMENTE:
   **«Abre esto y haz lo que te parezca.»** Nada más.
2. No expliques nada. Si pregunta «¿qué es esto?», responde solo
   «haz lo que te parezca» y apunta que preguntó.
3. Observa en silencio y rellena la tabla de §5: ¿vota sin ayuda?, ¿dónde
   duda?, tiempo hasta el primer voto, qué gestos descubre.
4. Cuando pare, agradece y haz UNA pregunta: «¿Qué acabas de hacer?»

## 3. «¿Qué acabas de hacer?»

Apunta la respuesta literal, sin interpretarla. Sirve para ver si el tester
entiende que está **votando obras públicas** (no un juego ni una encuesta
comercial). Si la respuesta no menciona votar ni obras, marca «No» en la
columna «Entiende qué hizo».

## 4. Pregunta del día siguiente

**«¿Qué votaste ayer y por qué?»**
Cuenta como **recuerda** si nombra al menos una obra (o su tipo y lugar) y
lo que votó en ella. «Voté varias cosas» no cuenta.

- #1: Mayoritariamente «no puedo valorarlo» ya que en muchas ocasiones desconozco el precio real de las obras y por tanto, no me veo capacitado para dar mi voto.

## 5. Tabla de resultados 

| # | Franja | Versión | Conoce Teulada | Vota sin ayuda | Preguntó qué era | Entiende qué hizo | 1er voto | Gestos | Usó botones | Dónde dudó | Día siguiente recuerda |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 18–30 | sin registrar | Sí | Sí | Sí | — | 00:30 | Valió, No valió, No puedo valorarlo, Pido explicaciones | No | En la app, nada; duda de su utilidad. Poco familiarizado con contratos públicos. | Sin criterio (ver §4) |
| … | | | | | | | | | | | |


## 6. Cómo se calcula el gate

- **A** = testers que votan sin ayuda → objetivo **10/10**.
- **B** = testers que recuerdan al día siguiente → objetivo **≥7/10**.
- **El gate P1 se supera solo si A y B se cumplen.**
- **Regla de gestos:** si un mismo gesto le falla a más de 3 testers, ese gesto
  se simplifica antes de repetir el test.
- El tester #1 no registró la versión: cuenta como piloto del guion y no
  entra en A ni B.



