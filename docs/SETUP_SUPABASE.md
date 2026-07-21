# Configurar el login con Supabase (desde cero)

Guía para dejar funcionando el login real del CRM Automata. El **modo Demo** ya
funciona sin nada de esto; estos pasos son para el modo real (datos persistentes
y dos agentes compartiendo el mismo inbox).

---

## 1. Crear el proyecto en Supabase

1. Entrá a https://supabase.com → **New project**.
2. Elegí nombre (ej: `automata-crm`), una contraseña de base de datos y una región
   cercana. Esperá ~2 minutos a que termine de aprovisionarse.

## 2. Copiar las credenciales

En **Project Settings → API** (o **Data API / API Keys**) vas a ver tres datos:

| Dato | Dónde va |
|------|----------|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` (frontend) y `SUPABASE_URL` (backend) |
| **anon public key** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend) |
| **service_role key** ⚠️ secreta | `SUPABASE_SERVICE_ROLE_KEY` (backend) |

> La `service_role` key salta RLS: **nunca** la pongas en el frontend ni la subas a git.

### Completar los `.env`

**`frontend/.env.local`** (copiá desde `.env.local.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...tu-anon-key
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

> Las credenciales reales van en `frontend/.env.local` y `backend/.env`
> (ambos ignorados por git), **no** en esta guía.

**`backend/.env`** (copiá desde `.env.example`):

```env
PORT=3001
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...tu-service-role-key
# (Evolution API se completa más adelante, no hace falta para el login)
```

## 3. Crear las tablas y la lógica de auth

1. En Supabase, abrí **SQL Editor → New query**.
2. Pegá **todo** el contenido de [`database/schema.sql`](database/schema.sql) y dale **Run**.

Esto crea las tablas, las políticas RLS (ya sin el bug de recursión) y el trigger
`handle_new_user()`, que **al registrarte crea automáticamente tu workspace y las 5
etapas del pipeline**.

## 4. Desactivar la confirmación por email (recomendado para uso interno)

Para poder entrar apenas te registrás, sin tener que confirmar un mail:

- **Authentication → Sign In / Providers → Email** → desactivá **"Confirm email"** → Save.

(Si lo dejás activado, después de registrarte vas a tener que abrir el link que llega
por correo antes de poder iniciar sesión. El CRM te avisa con un mensaje si pasa eso.)

## 5. Registrar a los dos agentes

Levantá la app (ver sección final) y en la pantalla de login:

### Dueño (Alejo) — crea el workspace
1. Click en **"¿Eres nuevo agente? Regístrate aquí"**.
2. Completá:
   - **Nombre:** `Alejo`
   - **Rol:** `Dueño (Owner)`
   - **Workspace:** `Automata`
   - **Email:** `alejo@automata.com`  ← este email hace andar la tarjeta de acceso rápido
   - **Contraseña:** la que quieras
3. Registrate. Quedás dentro y se creó el workspace "Automata" con sus etapas.

### Colaborador (Nico) — se une al MISMO workspace
El registro por la UI crea un workspace **nuevo** para cada quien. Para que Nico
comparta el inbox de Alejo, registralo y después corregí su workspace con un SQL:

1. Registrá a Nico igual que arriba (Rol: `Colaborador`, email: `nico@automata.com`).
2. En **SQL Editor** de Supabase, corré:

```sql
-- Mueve a Nico al workspace de Alejo y borra el workspace huérfano que se le creó
WITH alejo AS (
  SELECT workspace_id FROM public.users WHERE email = 'alejo@automata.com'
), nico AS (
  SELECT id, workspace_id FROM public.users WHERE email = 'nico@automata.com'
)
UPDATE public.users u
SET workspace_id = (SELECT workspace_id FROM alejo), role = 'agent'
WHERE u.email = 'nico@automata.com';

-- (Opcional) eliminar el workspace vacío que se creó para Nico
DELETE FROM public.workspaces w
WHERE w.name = 'Automata'
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.workspace_id = w.id);
```

Listo: ahora Alejo y Nico ven y responden el mismo inbox compartido.

## 6. Levantar la app

```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev      # http://localhost:3001

# Terminal 2 — frontend
cd frontend
npm install
npm run dev      # http://localhost:3000
```

En la pantalla de login, si el toggle de **Configuración** está en "Modo Demo",
pasalo a **"Activar Conexión Real"** para usar Supabase.

---

## Cómo funciona el login (resumen técnico)

- **Registro:** `supabase.auth.signUp()` con `name`, `role` y `workspace_name` en los
  metadatos → el trigger `handle_new_user()` (SECURITY DEFINER) crea el workspace,
  siembra las etapas y crea el perfil en `public.users`.
- **Login:** `supabase.auth.signInWithPassword()` → Supabase devuelve un JWT.
- **Perfil:** el frontend lee `public.users` (rol + workspace) con RLS que permite leer
  tu propia fila y la de tus compañeros, vía la función `current_workspace_id()`.
- **Backend:** el middleware `requireAuth` valida ese mismo JWT en cada request REST.

## Problemas comunes

| Síntoma | Causa / solución |
|---------|------------------|
| `Invalid login credentials` | Email/contraseña incorrectos, o el usuario no se confirmó (paso 4). |
| Te registrás pero no entra | Confirmación de email activada → revisá tu correo o desactivala (paso 4). |
| `infinite recursion detected in policy for relation "users"` | No corriste el `schema.sql` actualizado (paso 3). Volvé a ejecutarlo. |
| Nico no ve los chats de Alejo | No corriste el SQL del paso 5 que lo une al workspace de Alejo. |
