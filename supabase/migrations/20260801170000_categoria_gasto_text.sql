-- Permite categorias de gasto personalizadas: converte a coluna de enum para texto livre.
ALTER TABLE public.gastos
  ALTER COLUMN categoria DROP DEFAULT;

ALTER TABLE public.gastos
  ALTER COLUMN categoria TYPE text USING categoria::text;

ALTER TABLE public.gastos
  ALTER COLUMN categoria SET DEFAULT 'outros';
