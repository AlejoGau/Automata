# Skill: scene-storyboard

Cómo convertir el guion en un storyboard JSON válido con la capa de producción visual.

## Reglas de tiempo
- Escenas contiguas: la primera arranca en `start: 0`, cada una empieza donde termina la anterior (sin huecos ni superposiciones).
- La última escena termina exactamente en `durationSeconds`. El CTA va al final (`cta.end` == `durationSeconds`).
- Cada escena dura entre el mínimo y el máximo (ver límites). Cambio visual cada 2–4 s.

## Cada escena lleva un bloque `visual` ejecutable
NO describas personajes actuando. Usá la skill **visual-production**: elegí un
`visual.type` según el `purpose` y llenalo con contenido concreto del nicho.

Ejemplo (problema con chat_mockup):
```json
{
  "id": "scene-2", "start": 3, "end": 8, "purpose": "problem",
  "narration": "Entre clases no llegás a contestar y los mensajes se acumulan.",
  "subtitle": "Los mensajes se acumulan\nsin respuesta.",
  "transition": "cut",
  "visual": {
    "type": "chat_mockup",
    "bubbles": [
      { "from": "cliente", "text": "Hola! ¿Precio de la cuota?", "time": "18:32" },
      { "from": "cliente", "text": "Hola?", "time": "19:50" },
      { "from": "cliente", "text": "Ya fue, pregunto en otro lado", "time": "21:14" }
    ],
    "unreadBadge": 12
  }
}
```

Ejemplo (hook con stock):
```json
"visual": { "type": "stock", "stockQuery": "gym owner checking phone between classes", "treatment": { "kenBurns": "zoom_in", "overlay": 0.35 } }
```

## Subtítulos
- Máx 2 líneas y hasta 38 caracteres por línea (`\n` separa líneas). Resume la narración, una idea por escena.

## Salida
Devolvé SOLO el JSON del storyboard, sin markdown ni texto extra.
