ALTER TABLE public.mail_messages ADD COLUMN IF NOT EXISTS attachments_listed_at timestamptz;
ALTER TABLE public.asset_documents ADD COLUMN IF NOT EXISTS source_hash text, ADD COLUMN IF NOT EXISTS render_pages jsonb;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS autofill_sources jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE public.mail_attachment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_message_id text NOT NULL,
  attachment_id text NOT NULL,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  name text,
  content_type text,
  size integer,
  status text NOT NULL DEFAULT 'pending',
  doc_type text,
  document_id uuid,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (graph_message_id, attachment_id, asset_id)
);
GRANT SELECT ON public.mail_attachment_jobs TO authenticated;
GRANT ALL ON public.mail_attachment_jobs TO service_role;
ALTER TABLE public.mail_attachment_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff see own asset jobs" ON public.mail_attachment_jobs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.can_see_owner(a.owner_id)));
CREATE INDEX ON public.mail_attachment_jobs (status, created_at);

CREATE TABLE public.attachment_control (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  lease_until timestamptz,
  paused_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.attachment_control TO service_role;
ALTER TABLE public.attachment_control ENABLE ROW LEVEL SECURITY;
INSERT INTO public.attachment_control (id) VALUES (true);