# Automata

Monorepo de Automata: el **CRM** (mensajería WhatsApp + pipeline de leads) y **Marketing Studio** (agente que genera storyboards de video por nicho).

## Estructura
```
Automata/
├── CLAUDE.md            → spec del agente Marketing Studio (se carga en Claude Code)
├── README.md           → este archivo
├── docs/               → documentación
│   ├── ESTADO_PROYECTO.md   (traspaso / estado general)
│   └── SETUP_SUPABASE.md    (setup de la base)
├── backend/            → API Node (Express + Socket.io + Supabase)
│   └── src/marketing/  → Marketing Studio: cerebro (storyboard) + puente al toolkit
│       └── skills/     → skills (.md), fuente de verdad → se suben a Supabase Storage
├── frontend/           → app Next.js (deploy en Vercel)
├── database/           → schema.sql (Supabase/Postgres)
├── niches/             → configuración por rubro
│   ├── _template/      → plantilla para nichos nuevos
│   └── gimnasios/      → NICHE.md + assets.json
└── storage/            → artefactos generados (storyboards, briefs) — NO versionado
```

## Marketing Studio + video-toolkit
- **Automata (este repo)** genera el *storyboard validado* por nicho (la lógica creativa).
- **[claude-code-video-toolkit](https://github.com/digitalsamba/claude-code-video-toolkit)** (workspace aparte) produce el video (voz, visuales, render).
- **Puente:** `backend/src/marketing/bridge.ts` exporta el storyboard como *brief* markdown; si se define `MARKETING_TOOLKIT_DIR`, lo copia al toolkit listo para `/video`.

### Probar el cerebro
```bash
cd backend
npm run studio:storyboard -- gimnasios "Perdés alumnos por responder tarde"
# escribe storage/marketing/<id>.storyboard.json y <id>.brief.md
```

## Deploys
- **Backend** → Easypanel (`turnik-automata-backend`), rama `main`.
- **Frontend** → Vercel, rama `main`, root `frontend/`.
