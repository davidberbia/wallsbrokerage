ALTER TABLE public.deal_contacts ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'autre';
ALTER TABLE public.mail_messages ADD COLUMN IF NOT EXISTS ai_checked_at timestamptz;
ALTER TABLE public.mail_messages ADD COLUMN IF NOT EXISTS has_attachments boolean NOT NULL DEFAULT false;

CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task text NOT NULL,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  cost_eur numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read ai_usage" ON public.ai_usage FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'broker') OR public.has_role(auth.uid(),'viewer'));

CREATE TABLE public.ai_doc_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_email text NOT NULL,
  investor_name text,
  investor_graph_id text NOT NULL UNIQUE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  requested text NOT NULL,
  seller_email text,
  status text NOT NULL DEFAULT 'nouvelle',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_doc_requests TO authenticated;
GRANT ALL ON public.ai_doc_requests TO service_role;
ALTER TABLE public.ai_doc_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broker all docreq" ON public.ai_doc_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker')) WITH CHECK (public.has_role(auth.uid(),'broker'));
CREATE POLICY "viewer read docreq" ON public.ai_doc_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'viewer'));

CREATE TABLE public.ai_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.ai_doc_requests(id) ON DELETE CASCADE,
  kind text NOT NULL,
  reply_to_graph_id text,
  to_email text NOT NULL,
  to_name text,
  subject text NOT NULL,
  body_html text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'en attente',
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_drafts TO authenticated;
GRANT ALL ON public.ai_drafts TO service_role;
ALTER TABLE public.ai_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broker all drafts" ON public.ai_drafts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker')) WITH CHECK (public.has_role(auth.uid(),'broker'));
CREATE POLICY "viewer read drafts" ON public.ai_drafts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'viewer'));

CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  page text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.ai_chat_messages TO authenticated;
GRANT ALL ON public.ai_chat_messages TO service_role;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chat" ON public.ai_chat_messages FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text,
  suggestion text NOT NULL,
  status text NOT NULL DEFAULT 'nouvelle',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_suggestions TO authenticated;
GRANT ALL ON public.ai_suggestions TO service_role;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff suggestions" ON public.ai_suggestions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker') OR public.has_role(auth.uid(),'viewer'))
  WITH CHECK (public.has_role(auth.uid(),'broker') OR public.has_role(auth.uid(),'viewer'));