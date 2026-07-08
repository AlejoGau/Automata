-- Módulo Marketing Studio - Tablas de Base de Datos para Supabase

-- 1. brand_profiles: Perfil de identidad de marca por workspace
CREATE TABLE IF NOT EXISTS public.brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  industry TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#f97316', -- Color naranja por defecto (Automata theme)
  secondary_color TEXT DEFAULT '#fbbf24',
  background_color TEXT DEFAULT '#171717',
  font_family TEXT DEFAULT 'Inter',
  whatsapp TEXT,
  website TEXT,
  default_tone TEXT DEFAULT 'Profesional',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;

-- Política RLS: Aislar por workspace para usuarios autenticados
CREATE POLICY workspace_isolation_brand_profiles ON public.brand_profiles
  FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id())
  WITH CHECK (workspace_id = public.current_workspace_id());


-- 2. marketing_contents: Contenidos creados (carruseles, posts simples, guiones de reels)
CREATE TABLE IF NOT EXISTS public.marketing_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT CHECK (content_type IN ('carrusel', 'reel', 'post_simple')) NOT NULL,
  status TEXT CHECK (status IN ('draft', 'ready')) NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  goal TEXT,
  tone TEXT,
  target_social_network TEXT,
  format TEXT,
  form_data_json JSONB, -- Datos completos enviados en el formulario
  slides_json JSONB,    -- Estructura de slides/escenas generadas por la IA
  caption TEXT,         -- Copy que acompaña la publicación
  hashtags_json JSONB,  -- Array de hashtags
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.marketing_contents ENABLE ROW LEVEL SECURITY;

-- Política RLS: Aislar por workspace para usuarios autenticados
CREATE POLICY workspace_isolation_marketing_contents ON public.marketing_contents
  FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id())
  WITH CHECK (workspace_id = public.current_workspace_id());
