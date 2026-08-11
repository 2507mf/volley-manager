-- Temporada anual + valores por plano.
--
-- Regra do cliente: as vagas abrem em janeiro. Quem entra fica inscrito até sair —
-- não existe re-inscrição mês a mês. A cobrança passa a ser derivada de
-- data_entrada / data_saida, e a tabela inscricoes_mensais deixa de existir.
--
-- O valor também deixa de ser digitado por atleta: vem do plano configurado na
-- organização, com a possibilidade de exceção pontual (valor_plano).
--
-- Escrita para poder rodar mais de uma vez sem erro (o Lovable e o SQL Editor
-- podem aplicar a mesma migration).

/* --------------------- valores do plano por organização ---------------- */

ALTER TABLE public.organizacoes
  ADD COLUMN IF NOT EXISTS valor_mensalista NUMERIC(10,2) NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS valor_anual      NUMERIC(10,2) NOT NULL DEFAULT 330,
  ADD COLUMN IF NOT EXISTS cota             NUMERIC(10,2) NOT NULL DEFAULT 43,
  ADD COLUMN IF NOT EXISTS dia_vencimento   INTEGER       NOT NULL DEFAULT 11;

DO $$
BEGIN
  ALTER TABLE public.organizacoes
    ADD CONSTRAINT organizacoes_dia_vencimento_check CHECK (dia_vencimento BETWEEN 1 AND 28);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

/* --------------------------- cadastro do atleta ------------------------ */

ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS codigo             INTEGER,
  ADD COLUMN IF NOT EXISTS email              TEXT,
  ADD COLUMN IF NOT EXISTS nome_camisa        TEXT,
  ADD COLUMN IF NOT EXISTS tamanho_camisa     TEXT,
  ADD COLUMN IF NOT EXISTS contato_nome       TEXT,
  ADD COLUMN IF NOT EXISTS contato_telefone   TEXT,
  ADD COLUMN IF NOT EXISTS contato_parentesco TEXT,
  ADD COLUMN IF NOT EXISTS indicado_por       TEXT,
  ADD COLUMN IF NOT EXISTS data_saida         DATE;

COMMENT ON COLUMN public.participantes.data_saida IS
  'Primeiro dia em que o atleta deixa de ser cobrado. Nulo = segue na pelada.';

-- Se 'codigo' já existia com outro tipo (ex.: text), normaliza para integer.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'participantes'
      AND column_name = 'codigo' AND data_type <> 'integer'
  ) THEN
    ALTER TABLE public.participantes
      ALTER COLUMN codigo TYPE INTEGER USING nullif(btrim(codigo::text), '')::integer;
  END IF;
END;
$$;

-- valor_plano vira exceção opcional: em branco, vale o valor do plano da organização.
ALTER TABLE public.participantes ALTER COLUMN valor_plano DROP DEFAULT;
ALTER TABLE public.participantes ALTER COLUMN valor_plano DROP NOT NULL;
UPDATE public.participantes SET valor_plano = NULL WHERE valor_plano <= 0;

COMMENT ON COLUMN public.participantes.valor_plano IS
  'Exceção: valor mensal só deste atleta. Nulo = usa o valor do plano da organização.';

/* ------------------- fim das inscrições mês a mês ---------------------- */

DROP TABLE IF EXISTS public.inscricoes_mensais;
