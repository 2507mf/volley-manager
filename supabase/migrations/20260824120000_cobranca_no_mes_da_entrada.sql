-- A cobrança passa a começar sempre no mês da data de entrada.
--
-- Antes, quem entrava depois do dia de vencimento só era cobrado no mês seguinte —
-- regra tirada do caso do Cézar (admitido 30/07, cobrado a partir de agosto). Ela
-- pegava de surpresa quem cadastrava um atleta no meio do mês, então saiu.
--
-- Quem só deve pagar a partir do mês seguinte agora entra com a data de entrada no
-- primeiro dia daquele mês — que é o ajuste feito aqui para o Cézar.

UPDATE public.participantes
   SET data_entrada = '2026-08-01'
 WHERE apelido = 'Cézar'
   AND data_entrada = '2026-07-30';
