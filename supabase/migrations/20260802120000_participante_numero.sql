-- Número da camisa do participante (opcional), usado na planilha anual.
ALTER TABLE public.participantes ADD COLUMN IF NOT EXISTS numero integer;
