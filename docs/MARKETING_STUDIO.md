# Marketing Studio — Infraestructura y funcionamiento

> Documento de contexto para pasarle a Claude. Explica la infraestructura del
> proyecto Automata y cómo está integrado **Marketing Studio** (generación de
> videos por nicho). Última actualización: rama `main`/`alejo` del repo Automata.

---

## 1. Panorama general

Automata tiene dos partes:
1. **CRM** — mensajería WhatsApp + pipeline de leads (ver `docs/ESTADO_PROYECTO.md`).
2. **Marketing Studio** — un agente que convierte una idea en un **video corto** por nicho.

Marketing Studio está partido en **dos repos con roles claros**, unidos por un **puente**:

```
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│  Automata (backend)         │        │  video-toolkit (workspace aparte) │
│  "el CEREBRO"               │─brief─▶ │  "la PRODUCCIÓN"                  │
│  idea+nicho → storyboard    │        │  voz + visuales + render → MP4    │
│  (la lógica creativa = IP)  │        │  (Claude Code lo dirige)          │
└─────────────────────────────┘        └──────────────────────────────────┘
```

- **Automata** genera el *storyboard validado* y lo exporta como *brief*.
- **video-toolkit** toma el brief y produce el video (voz, fotos, animación, render).

---

## 2. Infraestructura

### Repos (GitHub, cuenta AlejoGau)
| Repo | Qué es | Deploy |
|---|---|---|
| `AlejoGau/Automata` | CRM + cerebro de Marketing Studio (monorepo) | backend→Easypanel, frontend→Vercel |
| `AlejoGau/automata-video-toolkit` | Producción de video (fork de `digitalsamba/claude-code-video-toolkit`) | local / Claude Code |

- El toolkit tiene `origin` = repo propio, `upstream` = digitalsamba (para traer updates con `git pull upstream main`).
- Ramas de Automata: `main` y `alejo` (se mantienen sincronizadas; Easypanel buildea de una de ellas).

### Servicios
- **Supabase** (proyecto `uehnqnrpstxtkfpstyiv`): base de datos + auth del CRM + **Storage bucket `skills`** (las skills de Marketing Studio).
- **Claude API** (Anthropic): orquesta el agente. Modelo por defecto `claude-opus-4-8`.
- **Pexels**: fotos/videos de stock gratis (base visual).
- **ElevenLabs**: voz (TTS).
- **Remotion**: motor de render (texto animado, composición) — vive en el toolkit.
- **Easypanel**: hostea el backend del CRM.

### Estructura del repo Automata
```
Automata/
├── CLAUDE.md                 → spec del agente Marketing Studio
├── README.md
├── docs/                     → ESTADO_PROYECTO.md, SETUP_SUPABASE.md, MARKETING_STUDIO.md
├── backend/src/marketing/    → el CEREBRO (ver sección 3)
├── niches/                   → config por rubro (_template, gimnasios)
├── frontend/                 → CRM (Next.js)
├── database/                 → schema.sql
└── storage/                  → artefactos generados (storyboards, briefs) — NO versionado
```

---

## 3. El cerebro (`backend/src/marketing/`)

| Archivo | Rol |
|---|---|
| `catalog.ts` | Límites globales + catálogo cerrado (personajes, acciones, fondos, estilos, transiciones). Catálogo efectivo = base + extensiones del nicho. |
| `schema.ts` | Esquema **Zod** del storyboard + `validateStoryboard()` (duración, escenas contiguas, subtítulos, catálogo, CTA). |
| `niche.ts` | Carga `niches/<nicho>/NICHE.md` (reglas/dolores/CTAs) + `assets.json` (extensiones). |
| `skills.ts` | Carga las skills desde **Supabase Storage** (bucket `skills`), con **fallback local** a `skills/*.md`. |
| `agent.ts` | **Orquestador**: arma el prompt (reglas + límites + catálogo + nicho + skills) → llama a Claude → parsea/valida el storyboard → **1 corrección** permitida. |
| `bridge.ts` | Convierte el storyboard en un **brief markdown** para el toolkit. |
| `testStoryboard.ts` | Script CLI: genera storyboard + brief y los guarda (y los copia al toolkit si `MARKETING_TOOLKIT_DIR`). |
| `uploadSkills.ts` | Sube `skills/*.md` al bucket de Supabase. |
| `skills/*.md` | Las skills (fuente de verdad): `short-form-scriptwriter.md`, `scene-storyboard.md`. |

### Qué usa Marketing Studio (cerebro)
- **Claude API** (`CLAUDE_API_KEY`) para generar el storyboard (con salida JSON validada por Zod + adaptive thinking).
- **Supabase Storage** (bucket `skills`) para las instrucciones del agente.
- **niches/** para la config por rubro (dolores, claims permitidos/prohibidos, CTAs, assets).
- El **puente** deja el brief listo para el toolkit.

### Comandos
```bash
cd backend
npm run studio:storyboard -- gimnasios "Perdés alumnos por responder tarde" 15
#   → storage/marketing/<id>.storyboard.json  +  <id>.brief.md
#   → si MARKETING_TOOLKIT_DIR está seteado, copia el brief a <toolkit>/briefs/

npm run studio:skills:upload
#   → crea el bucket "skills" en Supabase y sube skills/*.md
```

### Variables de entorno (backend/.env)
```
CLAUDE_API_KEY=sk-ant-...              # API de Claude (orquestador)
MARKETING_MODEL=claude-opus-4-8        # opcional (modelo)
MARKETING_SKILLS_BUCKET=skills         # bucket de Supabase Storage
MARKETING_NICHES_DIR=                  # opcional (default: ../niches)
MARKETING_TOOLKIT_DIR=                 # opcional: carpeta del video-toolkit (para el puente)
PEXELS_API_KEY=...                     # stock
ELEVENLABS_API_KEY=sk_...              # voz
# (+ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY del CRM)
```

---

## 4. La producción (`video-toolkit`)

Fork de `digitalsamba/claude-code-video-toolkit`. Es un **workspace de Claude Code**: abrís
Claude Code en esa carpeta y lo dirigís con comandos (`/setup`, `/video`).

- **Skills que usa** (`.claude/skills/`): `remotion`, `elevenlabs`, `ffmpeg`, `moviepy`, etc.
- **Camino elegido (barato, sin GPU/tarjeta):** voz con **ElevenLabs** + fotos de **Pexels** + **Remotion** (render local) + **FFmpeg**. Modal/GPU quedó **instalado pero sin usar** (no se puso tarjeta).
- **Flujo:** `/video` toma un brief de `briefs/` → genera voz → baja stock → renderiza MP4 en `projects/<nombre>/`.
- **`.env` del toolkit** (local, NO va a git): `ELEVENLABS_API_KEY`, `PEXELS_API_KEY`.
- **`projects/`** está gitignoreado (los videos son trabajo local, regenerable desde el brief).

---

## 5. Flujo completo (end-to-end)

```
1. Automata:  npm run studio:storyboard -- <nicho> "<idea>" <segundos>
              → storyboard JSON validado + brief.md  (+ copia al toolkit/briefs/)
2. Toolkit:   abrir Claude Code en video-toolkit/ → /video → usar el brief
              → voz (ElevenLabs) + stock (Pexels) + texto animado (Remotion) → MP4
```

---

## 6. Estado actual

| Ítem | Estado |
|---|---|
| Skills en Supabase (bucket `skills`) | ✅ |
| Cerebro: storyboard validado por nicho | ✅ (probado con gimnasios) |
| Puente storyboard → brief | ✅ |
| Toolkit configurado (ElevenLabs + Pexels, sin GPU) | ✅ |
| Primer video (15s gimnasios) | ✅ hecho |
| Toolkit respaldado en GitHub propio | ✅ |
| **Subtítulos sincronizados con la voz** | ⬜ pendiente — usar timestamps de ElevenLabs (endpoint with-timestamps) o faster-whisper |
| Automatización (API/UI en el CRM para generar videos solos) | ⬜ futuro — hoy es manual/dirigido |
| Repuntar Vercel a Automata | ⬜ ver `docs/ESTADO_PROYECTO.md` |

### Próximos pasos sugeridos
1. **Sincronizar subtítulos**: en el toolkit, generar la voz con **timestamps de ElevenLabs** y temporizar los captions palabra por palabra (estilo reel). Dejarlo fijo en el flujo.
2. **Más nichos**: replicar `niches/gimnasios/` para peluquerías, restaurantes, etc.
3. **(Futuro) Automatizar**: endpoint/botón que dispare storyboard→brief→render sin intervención manual, reusando el motor del toolkit.

---

## 7. Notas importantes
- El agente **no inventa** dolores/claims/CTAs: solo usa los del `NICHE.md`. Catálogo cerrado.
- Un video usa **un** nicho. Formato por defecto 9:16, 35s (mín 15, máx 60), máx 9 escenas.
- **Secretos:** todas las keys van en `.env` (gitignoreado), nunca en `.env.example` ni en git.
- **Costo:** casi $0 — Claude API (centavos), Pexels (gratis), ElevenLabs (centavos), Remotion (gratis). Sin GPU.
