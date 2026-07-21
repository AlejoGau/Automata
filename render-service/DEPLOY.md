# Deploy del Render Service en Easypanel

Servicio **aislado** que genera el mp4 final (Remotion + ElevenLabs). Corre aparte del
backend de WhatsApp para que un render pesado no lo afecte.

## 1. Crear el servicio en Easypanel

- **New Service → App**, mismo proyecto que el backend.
- **Source:** el repo `AlejoGau/Automata`, rama `alejo` (o `main`).
- **Build:** Dockerfile. **Base directory / context:** `render-service`. **Dockerfile:** `Dockerfile`.
- **Recursos:** asignale un **límite de memoria de ~3-4 GB** (con 7.8 GB del server, deja aire
  para WhatsApp + Evolution). Así, aunque un render explote, no se lleva puesto el resto.

## 2. Variables de entorno (en el panel del render service)

```
PORT=3002
RENDER_SHARED_SECRET=<un string largo y random; el MISMO en el backend>
ELEVENLABS_API_KEY=<tu key de ElevenLabs>
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL   # cambiá por la voz es-AR que prefieras
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
SUPABASE_URL=<misma del backend>
SUPABASE_SERVICE_ROLE_KEY=<misma del backend>
RENDER_BUCKET=renders
REMOTION_CONCURRENCY=2
```

## 3. Bucket de Supabase

Creá un bucket llamado **`renders`** (Storage → New bucket). Puede ser privado: el servicio
devuelve una *signed URL* de 7 días para descargar.

## 4. Conectar el backend de Automata

En las variables del **backend** (no el render service) agregá:

```
RENDER_SERVICE_URL=http://<nombre-interno-del-render-service>:3002
RENDER_SHARED_SECRET=<el MISMO valor que pusiste en el render service>
```

> `RENDER_SERVICE_URL`: usá la URL interna de Easypanel entre servicios (más rápido y no sale a
> internet). Si no, la URL pública del render service también sirve.

Redeploy del backend para que tome las variables nuevas.

## 5. Probar

1. En Marketing Studio → Video, generá un guion.
2. Clic en **Renderizar video**. Arranca la barra de progreso (voz → render → subiendo).
3. Al terminar aparece **Descargar video (mp4)**.

Probalo primero con un video de **15 s** para validar rápido.

## Notas

- **Un render a la vez** (cola interna). Si dos usuarios piden a la vez, el segundo espera.
- El primer render tras un deploy tarda un poco más (empaqueta el bundle de Remotion una vez).
- Si `ELEVENLABS_API_KEY` no está, el video se renderiza **sin voz** (útil para probar el pipeline).
