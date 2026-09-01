CREATE POLICY "broker reads brochures" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'brochures' AND public.has_role(auth.uid(), 'broker'));
CREATE POLICY "broker uploads brochures" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brochures' AND public.has_role(auth.uid(), 'broker'));
CREATE POLICY "broker updates brochures" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brochures' AND public.has_role(auth.uid(), 'broker'));
CREATE POLICY "broker deletes brochures" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brochures' AND public.has_role(auth.uid(), 'broker'));