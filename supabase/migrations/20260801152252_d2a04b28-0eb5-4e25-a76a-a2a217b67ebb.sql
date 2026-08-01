CREATE TYPE public.tipo_plano AS ENUM ('mensalista','anual','avulso');
CREATE TYPE public.status_participante AS ENUM ('ativo','inativo');
CREATE TYPE public.forma_pagamento AS ENUM ('pix','dinheiro','cartao','transferencia');
CREATE TYPE public.categoria_gasto AS ENUM ('quadra','material','uniformes','agua_gelo','confraternizacao','manutencao','outros');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.participantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nome TEXT NOT NULL,
  apelido TEXT,
  telefone TEXT,
  data_nascimento DATE,
  tipo_plano public.tipo_plano NOT NULL DEFAULT 'mensalista',
  valor_plano NUMERIC(10,2) NOT NULL DEFAULT 0,
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.status_participante NOT NULL DEFAULT 'ativo',
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participantes TO authenticated;
GRANT ALL ON public.participantes TO service_role;
ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own participantes" ON public.participantes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_participantes_updated BEFORE UPDATE ON public.participantes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_participantes_user ON public.participantes(user_id);

CREATE TABLE public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  participante_id UUID NOT NULL REFERENCES public.participantes(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL,
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  referencia TEXT NOT NULL,
  forma_pagamento public.forma_pagamento NOT NULL DEFAULT 'pix',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participante_id, referencia)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pagamentos" ON public.pagamentos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_pagamentos_user ON public.pagamentos(user_id);
CREATE INDEX idx_pagamentos_ref ON public.pagamentos(referencia);

CREATE TABLE public.receitas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'outros',
  valor NUMERIC(10,2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receitas TO authenticated;
GRANT ALL ON public.receitas TO service_role;
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own receitas" ON public.receitas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_receitas_user ON public.receitas(user_id);

CREATE TABLE public.gastos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria public.categoria_gasto NOT NULL DEFAULT 'outros',
  valor NUMERIC(10,2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  responsavel TEXT,
  comprovante_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gastos TO authenticated;
GRANT ALL ON public.gastos TO service_role;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own gastos" ON public.gastos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_gastos_user ON public.gastos(user_id);