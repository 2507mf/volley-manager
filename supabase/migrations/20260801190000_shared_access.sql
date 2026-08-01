-- Acesso compartilhado: qualquer usuário autenticado enxerga e edita todos os dados.
-- Substitui as políticas por-usuário (user_id = auth.uid()) por políticas abertas ao papel authenticated.

-- participantes
DROP POLICY IF EXISTS "own participantes" ON public.participantes;
CREATE POLICY "shared participantes" ON public.participantes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- pagamentos
DROP POLICY IF EXISTS "own pagamentos" ON public.pagamentos;
CREATE POLICY "shared pagamentos" ON public.pagamentos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- receitas
DROP POLICY IF EXISTS "own receitas" ON public.receitas;
CREATE POLICY "shared receitas" ON public.receitas FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- gastos
DROP POLICY IF EXISTS "own gastos" ON public.gastos;
CREATE POLICY "shared gastos" ON public.gastos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- inscricoes_mensais
DROP POLICY IF EXISTS "own inscricoes" ON public.inscricoes_mensais;
CREATE POLICY "shared inscricoes" ON public.inscricoes_mensais FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- storage: permite que qualquer autenticado leia os arquivos do bucket 'pelada'
-- (fotos e comprovantes enviados por qualquer conta). Upload continua na pasta do próprio usuário.
DROP POLICY IF EXISTS "pelada own files select" ON storage.objects;
CREATE POLICY "pelada shared select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pelada');
