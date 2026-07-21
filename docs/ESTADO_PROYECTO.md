# Estado del proyecto — Automata CRM

> Documento de traspaso (handoff). Resume la arquitectura, lo hecho y lo pendiente.
> Última actualización: commit `5272ece` en ramas `main` y `alejo` (sincronizadas).

---

## 1. Qué es
CRM propio para gestionar leads y conversaciones de **WhatsApp** de la agencia "Automata".
Dueño: **Alejo** (rol `owner`). Colaborador: Nico (rol `agent`).

Funcionalidades: bandeja de mensajería en tiempo real, pipeline de leads (Kanban),
dashboard de métricas, y **envío masivo** de mensajes (campañas).

---

## 2. Arquitectura (monorepo)
Un solo repo: **`AlejoGau/Automata`** (privado). Estructura:

```
Automata/
├── backend/     → Node + Express + Socket.io + Supabase (TypeScript)
├── frontend/    → Next.js 16.2.9 (App Router, TypeScript, Tailwind v4)
└── database/    → schema.sql (Supabase/Postgres)
```

- **Supabase** (proyecto `uehnqnrpstxtkfpstyiv`) = base de datos + auth.
- El backend usa la **service role key** para saltear RLS en webhooks.
- El frontend usa la **anon key** + auth de Supabase (login por email/password).

> ⚠️ Nota Next.js: hay un `frontend/AGENTS.md` que advierte que esta versión de
> Next (16.2.9) tiene cambios respecto de versiones conocidas. Leer los docs en
> `node_modules/next/dist/docs/` antes de tocar temas específicos de Next.

---

## 3. Ramas y deploys

| | Repo / rama | Dónde | URL |
|---|---|---|---|
| **Backend** | `Automata` rama **`alejo`** | **Easypanel** (`turnik-automata-backend`, Dockerfile, path `/backend`, puerto 3001) | https://turnik-automata-backend.e5ekca.easypanel.host |
| **Frontend** | ⚠️ todavía repo viejo `automata-crm` | **Vercel** | https://automata-crm-three.vercel.app |

- `main` y `alejo` están **idénticas** (se mantienen sincronizadas). Easypanel buildea de `alejo`.
- Easypanel necesita **GitHub Token** configurado (repo privado). Ya está puesto.
- **Deploy backend NO es automático**: hay que apretar **Deploy** en Easypanel para que tome commits nuevos.

### ⚠️ PENDIENTE crítico: repuntar Vercel
Vercel todavía buildea del repo viejo **`automata-crm`**, no de `Automata`. Por eso
**las mejoras de frontend nuevas NO se ven en producción** hasta hacer esto:
1. Vercel → Settings → Git → conectar **`AlejoGau/Automata`**.
2. Root Directory = **`frontend`**.
3. Production Branch = `main`.
4. Verificar variables `NEXT_PUBLIC_*`.
5. Redeploy.
Después, **archivar/borrar el repo `automata-crm`** (ya está todo migrado a `Automata`).

---

## 4. WhatsApp: Evolution (activo) vs Cloud API (preparado)

Se puede elegir proveedor con la variable **`WHATSAPP_PROVIDER`** (`evolution` | `cloud`).
**Hoy: `evolution`** (default).

### Evolution API — EN USO ✅
- Instancia `Automata` en `https://turnik-evolution-api.e5ekca.easypanel.host`, estado `open` (conectada).
- No-oficial (protocolo WhatsApp Web). **Riesgo de ban** con envíos masivos/spam.
- Envío: `services/evolution.ts`. Webhook entrante: `routes/webhook.ts`.

### WhatsApp Cloud API (Meta) — PREPARADO pero NO en producción
- Código listo y probado (envío `sent`/`delivered` OK), pero **frenado** porque la
  verificación de empresa de Meta pide **CUIT**, y Alejo **no tiene** (proyecto sin
  inscribir). Camino futuro: sacar **monotributo** → constancia AFIP → verificar.
- Número de prueba: **Phone Number ID `1149528651583377`**, **WABA `2148334212376597`**.
- Webhook Cloud: **`GET/POST /api/webhooks/cloud`**, verify token `automata_wh_7f3k9x2p`. Funciona (probado).
- Ventaja futura: Cloud da el número real directo (sin el lío de `@lid`).
- Archivos: `services/whatsapp.ts`, `services/messaging.ts` (capa proveedor),
  `services/inbox.ts`, `routes/webhookCloud.ts`, `sendTestCloud.ts`.

---

## 5. Lo que se hizo (features)

1. **Migración a Cloud API conviviendo con Evolution** (por variable `WHATSAPP_PROVIDER`).
   Evolution sigue de default; Cloud queda listo para el día que haya CUIT.
2. **Webhook Cloud** con verificación GET (`hub.challenge`) + firma `X-Hub-Signature-256`.
3. **Envío masivo (campañas)** — lo más importante que se pidió:
   - Endpoint: **`POST /api/broadcast`** (y alias **`POST /api/messages/broadcast`** que
     acepta el campo `content` o `message`, porque el frontend de Vercel pegaba ahí).
   - Frenos anti-ban: **demora aleatoria 4–12s** entre mensajes, personalización con
     `{nombre}`, **tope 200** por campaña, **candado por workspace** (evita doble disparo).
   - Corre en segundo plano, emite progreso por Socket.io (`broadcast:progress`).
   - Frontend: botón "Envío masivo" en Leads + modal con selección por etapa/todos + barra de progreso.
   - **Estado: FUNCIONA** (probado, llegan los mensajes).
4. **Frontend — números/leads más prolijos** (commit `5272ece`):
   - `getLeadDisplay` + `formatPhone`: si el lead no tiene nombre real (solo dígitos),
     muestra el teléfono **una sola vez** formateado (ej. `+54 9 11 6283-8106`) y no lo
     repite; si no hay nombre, dice "Sin nombre". Aplicado en lista, cabecera, Kanban y detalle.
   - ⚠️ **No visible aún en producción** hasta repuntar Vercel (ver punto 3).
5. **Diseño** (animaciones/transiciones, temas por usuario, colores del login) — ya estaban
   en el frontend de Vercel (`automata-crm`), que ahora es el canónico dentro de `Automata`.
6. **Consolidación de repos**: `automata-crm` era una copia completa paralela y divergida.
   Se unificó todo en `Automata` (se trajo el frontend real de Vercel adentro).

---

## 6. Variables de entorno

### Backend (en Easypanel)
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...        # SECRETO (rotar, ver punto 8)
EVOLUTION_API_URL=https://turnik-evolution-api.e5ekca.easypanel.host
EVOLUTION_API_KEY=...                # SECRETO (rotar)
EVOLUTION_INSTANCE_NAME=Automata
EVOLUTION_WEBHOOK_SECRET=
PORT=3001
WHATSAPP_PROVIDER=evolution          # evolution | cloud
META_ACCESS_TOKEN=...                # temporal ~24h; permanente con System User
META_PHONE_NUMBER_ID=1149528651583377
META_WABA_ID=2148334212376597
META_VERIFY_TOKEN=automata_wh_7f3k9x2p
META_GRAPH_VERSION=v22.0
```
Opcional a futuro: `META_APP_SECRET` (para validar firma del webhook Cloud).

### Frontend (en Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_BACKEND_URL=https://turnik-automata-backend.e5ekca.easypanel.host
```

---

## 7. Endpoints del backend (referencia)
- `GET  /health`
- `GET/POST /api/webhooks/whatsapp` — webhook de Evolution
- `GET/POST /api/webhooks/cloud` — webhook de Meta Cloud API
- `GET  /api/conversations`, `/api/conversations/:id/messages`, `POST /api/conversations/sync`
- `POST /api/messages/send`, `GET /api/messages/search`
- `POST /api/broadcast` y alias `POST /api/messages/broadcast` — envío masivo
- `GET/POST /api/leads`, `PUT /api/leads/:id/stage`
- `GET  /api/dashboard/stats`
Todo lo `/api/*` (menos webhooks) va con `Authorization: Bearer <token Supabase>`.

Scripts útiles del backend: `npm run dev`, `npm run build`, `npm run send:test` (Evolution),
`npm run send:cloud` (Cloud API hello_world), `npm run webhook:setup`.

---

## 8. Pendientes / próximos pasos

### Alta prioridad
- [ ] **Repuntar Vercel** a `Automata` (ver punto 3) — sin esto no se ven las mejoras de front.
- [ ] **Redeploy del backend en Easypanel** cada vez que se comitea (no es automático).
- [ ] **Rotar secretos**: `SUPABASE_SERVICE_ROLE_KEY` y `EVOLUTION_API_KEY` se pegaron en
      chat durante el desarrollo → regenerarlos en Supabase/Evolution y actualizar en Easypanel.

### Mejoras pedidas / en curso
- [ ] **Importar Google Sheet de ~390 contactos**: plan = exportar a CSV y correr un script
      en el backend que inserte leads deduplicando por teléfono. FALTA: muestra de columnas
      y del **formato de los teléfonos** para normalizarlos a formato WhatsApp (`549...`).
- [ ] **Números `@lid` (IDs privados de WhatsApp)**: de 55 contactos, **42 son `@lid`** y solo
      **6 se pueden resolver** al número real (cruzando por foto de perfil). Es **limitación
      de privacidad de WhatsApp**, no del código. Consecuencias: algunos leads muestran un
      ID largo tipo `187041681776857` en vez de teléfono, y **hay duplicados** (misma persona
      como LID y como número real). Opciones propuestas:
      1. **Frontend**: mostrar los LID no resueltos como "Contacto WhatsApp" (seguro, cosmético).
      2. **Backend**: revisar si el webhook trae el número real en `senderPn` (WhatsApp nuevo)
         para resolver más en el ingreso (con riesgo, hay que probar con un webhook real).
      3. **Fusionar duplicados** existentes (delicado: unir conversaciones/mensajes).

### Ideas futuras
- [ ] Cuando haya CUIT → verificar empresa en Meta y **migrar a Cloud API** (`WHATSAPP_PROVIDER=cloud`),
      que elimina el problema de `@lid` (da el número real directo) y saca el riesgo de ban.

---

## 9. Cómo trabajar de acá en adelante
- Rama de trabajo: **`main`** (mantener `alejo` sincronizada, porque Easypanel buildea de `alejo`).
  Ideal: repuntar Easypanel también a `main` y usar una sola rama.
- Backend deploya por Easypanel (apretar Deploy). Frontend por Vercel (una vez repuntado).
- Antes de comitear: `npm run build` en backend y `npm run build` en frontend para no romper deploys.
