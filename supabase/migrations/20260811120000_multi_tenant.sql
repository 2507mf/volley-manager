-- Multi-tenant: cada cliente tem seu próprio sistema (organização).
-- Um usuário só enxerga as organizações das quais é membro; o super admin enxerga todas.
-- Substitui o acesso compartilhado global criado em 20260801190000_shared_access.sql.

/* ------------------------------- perfis -------------------------------- */

CREATE TABLE public.perfis (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  nome TEXT,
  super_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.perfis TO authenticated;
GRANT UPDATE (nome) ON public.perfis TO authenticated; -- ninguém promove a si mesmo a super admin
GRANT ALL ON public.perfis TO service_role;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_perfis_email ON public.perfis (lower(email));

-- E-mails que nascem com acesso a todos os sistemas.
CREATE OR REPLACE FUNCTION public.email_super_admin(e TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(coalesce(e, '')) IN ('mariafernanda2507@gmail.com');
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfis (id, email, nome, super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name'),
    public.email_super_admin(NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Perfis para quem já tinha conta antes desta migration.
INSERT INTO public.perfis (id, email, super_admin)
SELECT u.id, u.email, public.email_super_admin(u.email) FROM auth.users u
ON CONFLICT (id) DO NOTHING;

/* ---------------------------- organizações ----------------------------- */

CREATE TYPE public.papel_membro AS ENUM ('dono', 'admin', 'membro');

CREATE TABLE public.organizacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT NOT NULL DEFAULT 'volleyball',
  cor TEXT NOT NULL DEFAULT 'laranja',
  logo_url TEXT,
  criado_por UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizacoes TO authenticated;
GRANT ALL ON public.organizacoes TO service_role;
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_organizacoes_updated BEFORE UPDATE ON public.organizacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.organizacao_membros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  papel public.papel_membro NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organizacao_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizacao_membros TO authenticated;
GRANT ALL ON public.organizacao_membros TO service_role;
ALTER TABLE public.organizacao_membros ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_membros_user ON public.organizacao_membros(user_id);

/* --------------------- funções de controle de acesso -------------------- */
-- SECURITY DEFINER para não recorrer às próprias políticas (evita recursão infinita).

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND super_admin);
$$;

CREATE OR REPLACE FUNCTION public.tem_acesso(org UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org IS NOT NULL AND (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organizacao_membros m
      WHERE m.organizacao_id = org AND m.user_id = auth.uid()
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.pode_administrar(org UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org IS NOT NULL AND (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organizacao_membros m
      WHERE m.organizacao_id = org AND m.user_id = auth.uid()
        AND m.papel IN ('dono', 'admin')
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin, public.tem_acesso, public.pode_administrar
  TO authenticated;

/* ----------------------- políticas de organização ---------------------- */

CREATE POLICY "ver organizacoes" ON public.organizacoes FOR SELECT TO authenticated
  USING (public.tem_acesso(id) OR criado_por = auth.uid());
CREATE POLICY "criar organizacao" ON public.organizacoes FOR INSERT TO authenticated
  WITH CHECK (criado_por = auth.uid());
CREATE POLICY "editar organizacao" ON public.organizacoes FOR UPDATE TO authenticated
  USING (public.pode_administrar(id)) WITH CHECK (public.pode_administrar(id));
CREATE POLICY "excluir organizacao" ON public.organizacoes FOR DELETE TO authenticated
  USING (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.organizacao_membros m
    WHERE m.organizacao_id = id AND m.user_id = auth.uid() AND m.papel = 'dono'
  ));

CREATE POLICY "ver membros" ON public.organizacao_membros FOR SELECT TO authenticated
  USING (public.tem_acesso(organizacao_id));
CREATE POLICY "gerir membros" ON public.organizacao_membros FOR ALL TO authenticated
  USING (public.pode_administrar(organizacao_id))
  WITH CHECK (public.pode_administrar(organizacao_id));

-- Perfis: cada um lê o próprio; membros de uma mesma organização se enxergam;
-- o super admin lê todos (necessário para a tela de administração).
CREATE OR REPLACE FUNCTION public.compartilha_organizacao(alvo UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizacao_membros meu
    JOIN public.organizacao_membros outro USING (organizacao_id)
    WHERE meu.user_id = auth.uid() AND outro.user_id = alvo
  );
$$;
GRANT EXECUTE ON FUNCTION public.compartilha_organizacao TO authenticated;

CREATE POLICY "ver perfis" ON public.perfis FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_super_admin() OR public.compartilha_organizacao(id));
CREATE POLICY "editar proprio perfil" ON public.perfis FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

/* ------------------ criar organização + virar dono (RPC) --------------- */

CREATE OR REPLACE FUNCTION public.criar_organizacao(
  p_nome TEXT,
  p_icone TEXT DEFAULT 'volleyball',
  p_cor TEXT DEFAULT 'laranja'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  nova_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada.';
  END IF;
  IF coalesce(btrim(p_nome), '') = '' THEN
    RAISE EXCEPTION 'Informe o nome do sistema.';
  END IF;

  INSERT INTO public.organizacoes (nome, icone, cor, criado_por)
  VALUES (btrim(p_nome), coalesce(p_icone, 'volleyball'), coalesce(p_cor, 'laranja'), auth.uid())
  RETURNING id INTO nova_id;

  INSERT INTO public.organizacao_membros (organizacao_id, user_id, papel)
  VALUES (nova_id, auth.uid(), 'dono');

  RETURN nova_id;
END;
$$;

-- Adiciona um membro pelo e-mail (a pessoa precisa já ter conta no sistema).
CREATE OR REPLACE FUNCTION public.adicionar_membro(
  p_org UUID,
  p_email TEXT,
  p_papel public.papel_membro DEFAULT 'admin'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  alvo UUID;
BEGIN
  IF NOT public.pode_administrar(p_org) THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar membros deste sistema.';
  END IF;

  SELECT id INTO alvo FROM public.perfis WHERE lower(email) = lower(btrim(p_email));
  IF alvo IS NULL THEN
    RAISE EXCEPTION 'Nenhuma conta encontrada com esse e-mail. Peça para a pessoa criar a conta primeiro.';
  END IF;

  INSERT INTO public.organizacao_membros (organizacao_id, user_id, papel)
  VALUES (p_org, alvo, p_papel)
  ON CONFLICT (organizacao_id, user_id) DO UPDATE SET papel = EXCLUDED.papel;

  RETURN alvo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_organizacao, public.adicionar_membro TO authenticated;

/* -------------------- vincular os dados às organizações ---------------- */

ALTER TABLE public.participantes       ADD COLUMN organizacao_id UUID REFERENCES public.organizacoes ON DELETE CASCADE;
ALTER TABLE public.pagamentos          ADD COLUMN organizacao_id UUID REFERENCES public.organizacoes ON DELETE CASCADE;
ALTER TABLE public.receitas            ADD COLUMN organizacao_id UUID REFERENCES public.organizacoes ON DELETE CASCADE;
ALTER TABLE public.gastos              ADD COLUMN organizacao_id UUID REFERENCES public.organizacoes ON DELETE CASCADE;
ALTER TABLE public.inscricoes_mensais  ADD COLUMN organizacao_id UUID REFERENCES public.organizacoes ON DELETE CASCADE;

-- Migra a base atual (compartilhada) para uma única organização "VÔLEI 6".
DO $$
DECLARE
  org_id UUID;
  dono_id UUID;
BEGIN
  SELECT id INTO dono_id FROM auth.users ORDER BY created_at LIMIT 1;
  IF dono_id IS NULL THEN
    RETURN; -- base sem usuários: nada a migrar
  END IF;

  INSERT INTO public.organizacoes (nome, descricao, icone, cor, criado_por)
  VALUES ('VÔLEI 6', 'Controle e receita do Vôlei 6', 'volleyball', 'laranja', dono_id)
  RETURNING id INTO org_id;

  -- Todo mundo que já tinha acesso compartilhado continua com acesso.
  INSERT INTO public.organizacao_membros (organizacao_id, user_id, papel)
  SELECT org_id, u.id, CASE WHEN u.id = dono_id THEN 'dono' ELSE 'admin' END::public.papel_membro
  FROM auth.users u
  ON CONFLICT (organizacao_id, user_id) DO NOTHING;

  UPDATE public.participantes      SET organizacao_id = org_id WHERE organizacao_id IS NULL;
  UPDATE public.pagamentos         SET organizacao_id = org_id WHERE organizacao_id IS NULL;
  UPDATE public.receitas           SET organizacao_id = org_id WHERE organizacao_id IS NULL;
  UPDATE public.gastos             SET organizacao_id = org_id WHERE organizacao_id IS NULL;
  UPDATE public.inscricoes_mensais SET organizacao_id = org_id WHERE organizacao_id IS NULL;
END;
$$;

ALTER TABLE public.participantes       ALTER COLUMN organizacao_id SET NOT NULL;
ALTER TABLE public.pagamentos          ALTER COLUMN organizacao_id SET NOT NULL;
ALTER TABLE public.receitas            ALTER COLUMN organizacao_id SET NOT NULL;
ALTER TABLE public.gastos              ALTER COLUMN organizacao_id SET NOT NULL;
ALTER TABLE public.inscricoes_mensais  ALTER COLUMN organizacao_id SET NOT NULL;

CREATE INDEX idx_participantes_org      ON public.participantes(organizacao_id);
CREATE INDEX idx_pagamentos_org         ON public.pagamentos(organizacao_id);
CREATE INDEX idx_receitas_org           ON public.receitas(organizacao_id);
CREATE INDEX idx_gastos_org             ON public.gastos(organizacao_id);
CREATE INDEX idx_inscricoes_org         ON public.inscricoes_mensais(organizacao_id);

-- Unicidade passa a ser por organização (o mesmo participante não existe em duas).
ALTER TABLE public.pagamentos         DROP CONSTRAINT IF EXISTS pagamentos_participante_id_referencia_key;
ALTER TABLE public.pagamentos         ADD CONSTRAINT pagamentos_org_participante_ref_key
  UNIQUE (organizacao_id, participante_id, referencia);
ALTER TABLE public.inscricoes_mensais DROP CONSTRAINT IF EXISTS inscricoes_mensais_participante_id_referencia_key;
ALTER TABLE public.inscricoes_mensais ADD CONSTRAINT inscricoes_org_participante_ref_key
  UNIQUE (organizacao_id, participante_id, referencia);

/* ---------------- políticas dos dados: por organização ----------------- */

DROP POLICY IF EXISTS "shared participantes" ON public.participantes;
CREATE POLICY "participantes por organizacao" ON public.participantes FOR ALL TO authenticated
  USING (public.tem_acesso(organizacao_id)) WITH CHECK (public.tem_acesso(organizacao_id));

DROP POLICY IF EXISTS "shared pagamentos" ON public.pagamentos;
CREATE POLICY "pagamentos por organizacao" ON public.pagamentos FOR ALL TO authenticated
  USING (public.tem_acesso(organizacao_id)) WITH CHECK (public.tem_acesso(organizacao_id));

DROP POLICY IF EXISTS "shared receitas" ON public.receitas;
CREATE POLICY "receitas por organizacao" ON public.receitas FOR ALL TO authenticated
  USING (public.tem_acesso(organizacao_id)) WITH CHECK (public.tem_acesso(organizacao_id));

DROP POLICY IF EXISTS "shared gastos" ON public.gastos;
CREATE POLICY "gastos por organizacao" ON public.gastos FOR ALL TO authenticated
  USING (public.tem_acesso(organizacao_id)) WITH CHECK (public.tem_acesso(organizacao_id));

DROP POLICY IF EXISTS "shared inscricoes" ON public.inscricoes_mensais;
CREATE POLICY "inscricoes por organizacao" ON public.inscricoes_mensais FOR ALL TO authenticated
  USING (public.tem_acesso(organizacao_id)) WITH CHECK (public.tem_acesso(organizacao_id));

/* ------------------------ storage por organização ---------------------- */
-- Arquivos novos ficam em "<organizacao_id>/<pasta>/<arquivo>".
-- O primeiro nível dos arquivos antigos é o id do usuário; mantemos o acesso a eles.

CREATE OR REPLACE FUNCTION public.uuid_ou_nulo(t TEXT) RETURNS UUID
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN t::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.uuid_ou_nulo TO authenticated;

DROP POLICY IF EXISTS "pelada shared select" ON storage.objects;
DROP POLICY IF EXISTS "pelada own files insert" ON storage.objects;
DROP POLICY IF EXISTS "pelada own files update" ON storage.objects;
DROP POLICY IF EXISTS "pelada own files delete" ON storage.objects;

CREATE POLICY "pelada org select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pelada' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.tem_acesso(public.uuid_ou_nulo((storage.foldername(name))[1]))
    )
  );
CREATE POLICY "pelada org insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pelada'
    AND public.tem_acesso(public.uuid_ou_nulo((storage.foldername(name))[1]))
  );
CREATE POLICY "pelada org update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pelada'
    AND public.tem_acesso(public.uuid_ou_nulo((storage.foldername(name))[1]))
  );
CREATE POLICY "pelada org delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pelada'
    AND public.tem_acesso(public.uuid_ou_nulo((storage.foldername(name))[1]))
  );
