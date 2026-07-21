# Skill: visual-production

Cómo se construye VISUALMENTE cada escena. Es **genérico para todos los nichos**:
cambia el CONTENIDO (textos, query, métricas), no el componente.

## Regla de oro
Cada escena lleva un bloque `visual` EJECUTABLE, no una descripción teatral.
NO uses "personaje X hace Y con expresión Z". Elegí un `visual.type` y llenalo
con contenido concreto del nicho.

## Mapeo propósito → visual.type
| purpose | visual.type | qué cambia por nicho |
|---|---|---|
| hook | `stock` (2–3s con tratamiento) | la `stockQuery` |
| problem | `chat_mockup` (cliente sin respuesta) | textos de las burbujas |
| solution | `chat_mockup` (el bot/negocio responde) o `screen_recording` | textos / demo |
| benefit | `dashboard` (métricas) o `stock` | las métricas mostradas |
| cta | `end_card` | el texto del CTA |

## Reglas por tipo

### stock
- `stockQuery`: **en inglés**, específica y concreta. Pensá qué footage real existe.
  - ✅ "gym owner checking phone between classes", "hairdresser looking at empty appointment book"
  - ❌ "gym" / "success" (genérico → footage random)
- `treatment.kenBurns`: `zoom_in`/`zoom_out`/`pan_left`/`pan_right`/`none`. `overlay`: 0.3–0.5 (scrim oscuro para que el texto se lea).

### chat_mockup  (el corazón del "problema" y la "solución")
- Simula un chat de WhatsApp real del rubro.
- **problem**: mensajes del `cliente` sin respuesta, con horas que avanzan (muestran la demora) y `unreadBadge` alto.
- **solution**: el `negocio`/`bot` responde al toque.
- `bubbles`: `[{ from: "cliente"|"negocio"|"bot", text, time: "HH:MM" }]`. Textos reales y creíbles del rubro.

### dashboard
- `metrics`: 2–4 pares `{ label, value }` creíbles y permitidos por el nicho (nada de cifras garantizadas).

### end_card
- `headline` corto + `cta` (uno de los CTAs aprobados del NICHE.md).

### screen_recording
- Solo si hay demo real; si no, usá `stock` con una `stockQuery`. Poné `description` de qué se ve.

## Importante
- El `subtitle` sigue las reglas de subtítulos (máx 2 líneas, 38 chars/línea).
- El contenido (dolores, claims, CTAs, tono) SIEMPRE sale del NICHE.md. Este skill
  solo define la forma visual.
