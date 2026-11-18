CREATE OR REPLACE FUNCTION public.mail_move_attachments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE old_asset uuid; new_asset uuid;
BEGIN
  IF NEW.deal_id IS NULL OR NEW.deal_id IS NOT DISTINCT FROM OLD.deal_id THEN RETURN NEW; END IF;
  SELECT asset_id INTO new_asset FROM public.deals WHERE id = NEW.deal_id;
  IF new_asset IS NULL THEN RETURN NEW; END IF;
  IF OLD.deal_id IS NOT NULL THEN SELECT asset_id INTO old_asset FROM public.deals WHERE id = OLD.deal_id; END IF;
  UPDATE public.asset_documents SET asset_id = new_asset
   WHERE id IN (SELECT document_id FROM public.mail_attachment_jobs WHERE graph_message_id = NEW.graph_id AND document_id IS NOT NULL)
     AND asset_id IS DISTINCT FROM new_asset;
  UPDATE public.mail_attachment_jobs j SET asset_id = new_asset
   WHERE j.graph_message_id = NEW.graph_id AND j.asset_id IS DISTINCT FROM new_asset
     AND NOT EXISTS (SELECT 1 FROM public.mail_attachment_jobs x WHERE x.graph_message_id=j.graph_message_id AND x.attachment_id=j.attachment_id AND x.asset_id=new_asset);
  RETURN NEW;
END $$;
CREATE TRIGGER mail_move_attachments AFTER UPDATE OF deal_id ON public.mail_messages
FOR EACH ROW EXECUTE FUNCTION public.mail_move_attachments();