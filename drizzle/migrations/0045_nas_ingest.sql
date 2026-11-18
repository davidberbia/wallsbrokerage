CREATE TABLE public.nas_ingest_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash text NOT NULL UNIQUE,
  key_hint text NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.nas_ingest_keys TO authenticated;
GRANT ALL ON public.nas_ingest_keys TO service_role;
ALTER TABLE public.nas_ingest_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads nas keys" ON public.nas_ingest_keys FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin revokes nas keys" ON public.nas_ingest_keys FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.nas_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sha256 text NOT NULL UNIQUE,
  rel_path text NOT NULL,
  mode text NOT NULL DEFAULT 'actifs',
  asset_id uuid,
  folder_id uuid,
  category text,
  storage_path text,
  size_bytes bigint,
  status text NOT NULL DEFAULT 'done',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nas_files TO authenticated;
GRANT ALL ON public.nas_files TO service_role;
ALTER TABLE public.nas_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads nas files" ON public.nas_files FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.nas_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_path text NOT NULL UNIQUE,
  year text,
  city text,
  label text NOT NULL,
  asset_id uuid,
  status text NOT NULL DEFAULT 'pending',
  candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.nas_folders TO authenticated;
GRANT ALL ON public.nas_folders TO service_role;
ALTER TABLE public.nas_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads nas folders" ON public.nas_folders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin updates nas folders" ON public.nas_folders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));