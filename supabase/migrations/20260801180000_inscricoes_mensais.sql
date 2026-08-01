-- Inscrição mensal: o admin define, a cada mês, quais mensalistas participam.
-- Só os inscritos entram na lista de cobrança daquele mês.
CREATE TABLE public.inscricoes_mensais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  participante_id UUID NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  referencia TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participante_id, referencia)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inscricoes_mensais TO authenticated;
GRANT ALL ON public.inscricoes_mensais TO service_role;
ALTER TABLE public.inscricoes_mensais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inscricoes" ON public.inscricoes_mensais FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_inscricoes_user ON public.inscricoes_mensais(user_id);
CREATE INDEX idx_inscricoes_ref ON public.inscricoes_mensais(referencia);
