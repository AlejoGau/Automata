# Skill: scene-storyboard

Cómo convertir el guion en un storyboard JSON válido.

## Reglas de tiempo
- Las escenas son contiguas: la primera arranca en `start: 0`, y cada escena empieza donde termina la anterior (sin huecos ni superposiciones).
- La última escena termina exactamente en `durationSeconds`.
- Cada escena dura entre el mínimo y el máximo permitido (ver límites). Cambio visual cada 2–4 segundos.
- El CTA va al final: `cta.end` == `durationSeconds`.

## Reglas de recursos (catálogo cerrado)
- Solo podés usar personajes, acciones, expresiones, fondos, objetos, cámaras, posiciones y transiciones del CATÁLOGO EFECTIVO que se te pasa (base + extensiones del nicho). Si algo no está, no existe: elegí lo más cercano que sí esté.
- Máximo de personajes/objetos por escena según límites.

## Subtítulos
- Máximo 2 líneas y hasta 38 caracteres por línea. Usá `\n` para separar líneas.
- El subtítulo resume la narración (no es idéntico); una sola idea por escena.

## Campos
- `purpose`: uno de "hook", "problem", "solution", "benefit", "cta".
- `narration`: lo que se escucha. `subtitle`: lo que se lee.
- Devolvé SOLO el JSON del storyboard, sin texto extra.
