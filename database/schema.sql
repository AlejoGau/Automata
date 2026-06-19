-- CRM Automata - Supabase SQL Schema
-- Copy and paste this script into the Supabase SQL Editor.

-- Enable UUID extension (should be enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. WORKSPACES
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (Row Level Security) on workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 2. USERS (Profiles tied to Supabase Auth)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('owner', 'agent')) NOT NULL DEFAULT 'agent',
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Trigger to automatically create a profile in public.users when a user signs up.
-- Si el registro trae 'workspace_id' se une a ese workspace existente.
-- Si trae 'workspace_name' (registro del dueño), crea un workspace nuevo
-- y le siembra las 5 etapas de pipeline por defecto. Todo en SECURITY DEFINER
-- para que no choque con las políticas RLS.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ws_id UUID;
BEGIN
  IF NEW.raw_user_meta_data->>'workspace_id' IS NOT NULL THEN
    -- Unirse a un workspace ya existente
    ws_id := (NEW.raw_user_meta_data->>'workspace_id')::uuid;
  ELSE
    -- Crear un workspace nuevo para este usuario (dueño)
    INSERT INTO public.workspaces (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'workspace_name', 'Automata'))
    RETURNING id INTO ws_id;

    -- Sembrar las etapas de pipeline por defecto para el workspace recién creado
    INSERT INTO public.pipeline_stages (name, "order", workspace_id) VALUES
      ('Nuevo', 1, ws_id),
      ('Contactado', 2, ws_id),
      ('En Negociación', 3, ws_id),
      ('Ganado', 4, ws_id),
      ('Perdido', 5, ws_id);
  END IF;

  INSERT INTO public.users (id, email, name, role, workspace_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent'),
    ws_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. PIPELINE STAGES
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- 4. TAGS
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, workspace_id)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- 5. LEADS
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT,
  stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(phone, workspace_id)
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 6. CONVERSATIONS
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE UNIQUE NOT NULL,
  assigned_agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('open', 'closed')) NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 7. MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  direction TEXT CHECK (direction IN ('incoming', 'outgoing')) NOT NULL,
  content TEXT NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  external_id TEXT UNIQUE,
  status TEXT CHECK (status IN ('sent', 'delivered', 'read')) NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 8. LEAD TAGS (Pivot table)
CREATE TABLE public.lead_tags (
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

-- 9. NOTES
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- RLS Policies (acceso a nivel workspace para usuarios autenticados)
-- =========================================================================

-- Helper SECURITY DEFINER: devuelve el workspace_id del usuario logueado.
-- Al ser SECURITY DEFINER ignora RLS, evitando la recursión infinita que se
-- produce cuando una política de 'users' consulta a la propia tabla 'users'.
CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT workspace_id FROM public.users WHERE id = auth.uid();
$$;

-- USERS: el usuario siempre puede leer su propio perfil, y a sus compañeros de
-- workspace. (El perfil se crea vía trigger SECURITY DEFINER, no desde el cliente.)
CREATE POLICY users_read_self_or_workspace ON public.users
  FOR SELECT TO authenticated USING (
    id = auth.uid() OR workspace_id = public.current_workspace_id()
  );

-- WORKSPACES: solo el workspace propio
CREATE POLICY workspace_member_access ON public.workspaces
  FOR ALL TO authenticated
  USING (id = public.current_workspace_id())
  WITH CHECK (id = public.current_workspace_id());

-- PIPELINE STAGES
CREATE POLICY workspace_isolation_stages ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id())
  WITH CHECK (workspace_id = public.current_workspace_id());

-- TAGS
CREATE POLICY workspace_isolation_tags ON public.tags
  FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id())
  WITH CHECK (workspace_id = public.current_workspace_id());

-- LEADS
CREATE POLICY workspace_isolation_leads ON public.leads
  FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id())
  WITH CHECK (workspace_id = public.current_workspace_id());

-- CONVERSATIONS
CREATE POLICY workspace_isolation_conversations ON public.conversations
  FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id())
  WITH CHECK (workspace_id = public.current_workspace_id());

-- MESSAGES, NOTES y LEAD_TAGS: la pertenencia al workspace se rastrea a través
-- de la tabla padre, cuya política ya usa current_workspace_id() (sin recursión).
CREATE POLICY workspace_isolation_messages ON public.messages
  FOR ALL TO authenticated USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE workspace_id = public.current_workspace_id()
    )
  );

CREATE POLICY workspace_isolation_lead_tags ON public.lead_tags
  FOR ALL TO authenticated USING (
    lead_id IN (
      SELECT id FROM public.leads
      WHERE workspace_id = public.current_workspace_id()
    )
  );

CREATE POLICY workspace_isolation_notes ON public.notes
  FOR ALL TO authenticated USING (
    lead_id IN (
      SELECT id FROM public.leads
      WHERE workspace_id = public.current_workspace_id()
    )
  );
