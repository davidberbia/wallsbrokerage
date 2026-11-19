ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS docs_reviewed_at timestamptz;

CREATE OR REPLACE FUNCTION public.merge_asset(_keep uuid, _dup uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k jsonb; d jsonb; merged jsonb; cols text; key text; val jsonb;
BEGIN
  IF _keep = _dup THEN RETURN; END IF;
  SELECT to_jsonb(a) INTO k FROM public.assets a WHERE id = _keep;
  SELECT to_jsonb(a) INTO d FROM public.assets a WHERE id = _dup;
  IF k IS NULL OR d IS NULL THEN RETURN; END IF;
  merged := k;
  FOR key, val IN SELECT * FROM jsonb_each(d) LOOP
    IF key IN ('id','created_at','updated_at','docs_reviewed_at') OR val = 'null'::jsonb OR val #>> '{}' = '' OR val IN ('[]'::jsonb,'{}'::jsonb) THEN CONTINUE; END IF;
    IF (k -> key) IS NULL OR k -> key = 'null'::jsonb OR k #>> array[key] = '' OR k -> key IN ('[]'::jsonb,'{}'::jsonb) THEN
      merged := jsonb_set(merged, array[key], val);
    ELSIF key = 'description' AND position(val #>> '{}' in coalesce(merged #>> array[key],'')) = 0 THEN
      merged := jsonb_set(merged, array[key], to_jsonb((merged #>> array[key]) || E'\n\n' || (val #>> '{}')));
    END IF;
  END LOOP;
  SELECT string_agg(format('%I = r.%I', column_name, column_name), ', ') INTO cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assets' AND column_name <> 'id' AND is_generated = 'NEVER';
  EXECUTE format('UPDATE public.assets a SET %s FROM jsonb_populate_record(NULL::public.assets, $1) r WHERE a.id = $2', cols) USING merged, _keep;

  UPDATE public.asset_documents SET asset_id = _keep WHERE asset_id = _dup;
  UPDATE public.brochure_sends SET asset_id = _keep WHERE asset_id = _dup;
  UPDATE public.campaigns SET asset_id = _keep WHERE asset_id = _dup;
  UPDATE public.deals SET asset_id = _keep WHERE asset_id = _dup;
  UPDATE public.document_shares SET asset_id = _keep WHERE asset_id = _dup;
  DELETE FROM public.mail_attachment_jobs j WHERE j.asset_id = _dup AND EXISTS (SELECT 1 FROM public.mail_attachment_jobs o WHERE o.asset_id = _keep AND o.graph_message_id = j.graph_message_id AND o.attachment_id = j.attachment_id);
  UPDATE public.mail_attachment_jobs SET asset_id = _keep WHERE asset_id = _dup;
  UPDATE public.mandates SET asset_id = _keep WHERE asset_id = _dup;
  UPDATE public.nas_files SET asset_id = _keep WHERE asset_id = _dup;
  UPDATE public.nas_folders SET asset_id = _keep WHERE asset_id = _dup;
  IF EXISTS (SELECT 1 FROM public.comparables WHERE asset_id = _keep) THEN
    DELETE FROM public.comparables WHERE asset_id = _dup;
  ELSE
    UPDATE public.comparables SET asset_id = _keep WHERE asset_id = _dup;
  END IF;
  UPDATE public.linkedin_posts SET asset_ids = array(SELECT DISTINCT unnest(array_replace(asset_ids, _dup, _keep))) WHERE _dup = ANY(asset_ids);
  DELETE FROM public.assets WHERE id = _dup;
END $$;
REVOKE ALL ON FUNCTION public.merge_asset(uuid, uuid) FROM PUBLIC, anon, authenticated;