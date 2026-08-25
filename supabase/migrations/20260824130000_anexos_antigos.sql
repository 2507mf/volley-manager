-- Anexos enviados antes do multi-sistema ficaram em "<user_id>/..." em vez de
-- "<organizacao_id>/...", e a política só liberava para quem subiu o arquivo —
-- por isso os comprovantes antigos sumiam para os outros membros da pelada.
--
-- Passa a liberar também quem compartilha organização com o dono do arquivo.

DROP POLICY IF EXISTS "pelada org select" ON storage.objects;

CREATE POLICY "pelada org select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pelada' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.tem_acesso(public.uuid_ou_nulo((storage.foldername(name))[1]))
      OR public.compartilha_organizacao(public.uuid_ou_nulo((storage.foldername(name))[1]))
    )
  );
