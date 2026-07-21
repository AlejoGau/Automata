# NICHE.md — Gimnasios

## Público objetivo
Dueños de gimnasios chicos y medianos en Argentina. Manejan el negocio en persona, responden WhatsApp entre clases, no tienen equipo administrativo grande ni tiempo para herramientas complejas.

## Dolores reales
1. Consultas de WhatsApp sin responder (y alumnos que se van a otro gimnasio por eso).
2. Alumnos que abandonan sin que nadie lo detecte a tiempo.
3. Pagos vencidos que hay que perseguir uno por uno.
4. Renovaciones olvidadas.
5. Seguimiento manual en planillas o en la cabeza.
6. Falta de métricas: no saben cuántos alumnos activos tienen realmente.
7. Desorganización de rutinas.
8. Turnos o clases no confirmadas.

## Beneficios permitidos
- Responder consultas al instante, incluso fuera de horario.
- Detectar alumnos inactivos antes de que abandonen.
- Recordatorios automáticos de pagos y renovaciones.
- Ver métricas del negocio en un solo lugar.
- Menos tiempo administrativo, más tiempo en el salón.

## Claims prohibidos
Además de los globales:
- Aumento asegurado de ventas o alumnos.
- Reducción exacta de costos sin evidencia.
- "Nunca más perdés un alumno."

## Tono
- Registro: profesional, claro, cercano.
- Idioma: es-AR con voseo natural ("Conocé", "Respondé").
- Orientado a dueños, no a alumnos.
- Sin tecnicismos (no decir "CRM", "API", "automatización con IA" salvo que el usuario lo pida; decir "sistema", "respuestas automáticas").

## CTAs aprobados
- "Conocé Automata"
- "Probalo con tu gimnasio"
- "Escribinos por WhatsApp"

## Personajes y fondos extra
Declarados también en `assets.json`.

Personajes:
- `gym_owner`
- `gym_member`

Fondos:
- `gym`

Acciones extra:
- `workout`

## Ejemplos aprobados
Entrada de referencia:

```json
{
  "topic": "Los gimnasios pierden alumnos por responder tarde",
  "audience": "dueños de gimnasios",
  "durationSeconds": 35,
  "style": "stickman",
  "language": "es-AR",
  "cta": "Conocé Automata"
}
```

Salida esperada: guion de 35 s, máximo 9 escenas, personajes de palitos, subtítulos grandes, un problema + una solución + un beneficio + un CTA, 9:16, MP4 listo para revisión.
