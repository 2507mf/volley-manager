-- Temporada anual + valores por plano.
--
-- Regra do cliente: as vagas abrem em janeiro. Quem entra fica inscrito até sair —
-- não existe re-inscrição mês a mês. A cobrança passa a ser derivada de
-- data_entrada / data_saida, e a tabela inscricoes_mensais deixa de existir.
--
-- O valor também deixa de ser digitado por atleta: vem do plano configurado na
-- organização, com a possibilidade de exceção pontual (valor_plano).

/* --------------------- valores do plano por organização ---------------- */

ALTER TABLE public.organizacoes
  ADD COLUMN valor_mensalista NUMERIC(10,2) NOT NULL DEFAULT 30,
  ADD COLUMN valor_anual      NUMERIC(10,2) NOT NULL DEFAULT 330,
  ADD COLUMN cota             NUMERIC(10,2) NOT NULL DEFAULT 43,
  ADD COLUMN dia_vencimento   INTEGER       NOT NULL DEFAULT 10
    CHECK (dia_vencimento BETWEEN 1 AND 28);

/* --------------------------- cadastro do atleta ------------------------ */

ALTER TABLE public.participantes
  ADD COLUMN codigo                 INTEGER,
  ADD COLUMN email                  TEXT,
  ADD COLUMN nome_camisa            TEXT,
  ADD COLUMN tamanho_camisa         TEXT,
  ADD COLUMN contato_nome           TEXT,
  ADD COLUMN contato_telefone       TEXT,
  ADD COLUMN contato_parentesco     TEXT,
  ADD COLUMN indicado_por           TEXT,
  ADD COLUMN data_saida             DATE;

COMMENT ON COLUMN public.participantes.data_saida IS
  'Primeiro dia em que o atleta deixa de ser cobrado. Nulo = segue na pelada.';

-- valor_plano vira exceção opcional: em branco, vale o valor do plano da organização.
ALTER TABLE public.participantes ALTER COLUMN valor_plano DROP DEFAULT;
ALTER TABLE public.participantes ALTER COLUMN valor_plano DROP NOT NULL;
UPDATE public.participantes SET valor_plano = NULL WHERE valor_plano IS NULL OR valor_plano <= 0;

COMMENT ON COLUMN public.participantes.valor_plano IS
  'Exceção: valor mensal só deste atleta. Nulo = usa o valor do plano da organização.';

/* ------------------- fim das inscrições mês a mês ---------------------- */

DROP TABLE IF EXISTS public.inscricoes_mensais;
