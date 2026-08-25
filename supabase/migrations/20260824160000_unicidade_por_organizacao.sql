-- Unicidade por organização, não por usuário.
--
-- Havia um índice único em (user_id, apelido) — criado fora deste repositório,
-- de quando o sistema era de um cliente só. Com multi-sistema ele impede que o
-- mesmo apelido exista em duas peladas cadastradas pela mesma conta: Alfredo,
-- David, Kako, Marcelo Rocha e Zé Carlos jogam no VÔLEI 6 e na Confraria.
--
-- Derruba qualquer índice único das tabelas de dados que esteja preso a user_id
-- e recoloca a regra onde ela faz sentido: dentro da organização.

DO $uniq$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT indexname
      FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename IN ('participantes', 'pagamentos', 'receitas', 'gastos')
       AND indexdef ILIKE '%UNIQUE%'
       AND indexdef ILIKE '%user_id%'
  LOOP
    -- pode ter nascido como constraint ou como índice solto
    BEGIN
      EXECUTE format('ALTER TABLE public.participantes DROP CONSTRAINT IF EXISTS %I', r.indexname);
    EXCEPTION WHEN others THEN NULL;
    END;
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.indexname);
    RAISE NOTICE 'Índice único preso a user_id removido: %', r.indexname;
  END LOOP;
END;
$uniq$;

-- Apelido volta a ser único, mas dentro da pelada. Só cria se os dados de hoje
-- permitirem — assim a migration nunca quebra por duplicata preexistente.
DO $apelido$
DECLARE
  duplicados INTEGER;
BEGIN
  SELECT count(*) INTO duplicados FROM (
    SELECT organizacao_id, lower(btrim(apelido))
      FROM public.participantes
     WHERE apelido IS NOT NULL AND btrim(apelido) <> ''
     GROUP BY 1, 2 HAVING count(*) > 1
  ) d;

  IF duplicados > 0 THEN
    RAISE NOTICE 'Há % apelido(s) repetido(s) dentro de uma mesma organização; '
                 'a regra de unicidade não foi criada.', duplicados;
    RETURN;
  END IF;

  CREATE UNIQUE INDEX IF NOT EXISTS participantes_org_apelido_uidx
      ON public.participantes (organizacao_id, lower(btrim(apelido)))
   WHERE apelido IS NOT NULL AND btrim(apelido) <> '';
END;
$apelido$;
