-- Ficha completa: campos que só a Confraria do Vôlei Recife usa.
--
-- As colunas são do sistema todo (o banco é um só), mas a seção "Ficha completa"
-- no cadastro só aparece para a organização que liga `ficha_completa`. O VÔLEI 6
-- segue com o cadastro enxuto.
--
-- Inclui dado pessoal sensível (fator Rh e RG), a pedido do cliente, restrito a
-- quem já tem acesso à organização pela RLS.

ALTER TABLE public.organizacoes
  ADD COLUMN IF NOT EXISTS ficha_completa BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organizacoes.ficha_completa IS
  'Liga os campos extras de cadastro (posição, profissão, documentos) para esta organização.';

ALTER TABLE public.participantes
  ADD COLUMN IF NOT EXISTS posicao        TEXT,
  ADD COLUMN IF NOT EXISTS profissao      TEXT,
  ADD COLUMN IF NOT EXISTS area_atuacao   TEXT,
  ADD COLUMN IF NOT EXISTS fator_rh       TEXT,
  ADD COLUMN IF NOT EXISTS rg             TEXT,
  ADD COLUMN IF NOT EXISTS orgao_rg       TEXT,
  ADD COLUMN IF NOT EXISTS observacoes    TEXT;

DO $ficha$
DECLARE
  org_id UUID;
BEGIN
  SELECT id INTO org_id FROM public.organizacoes
   WHERE nome = 'Confraria do Vôlei Recife' ORDER BY created_at LIMIT 1;
  IF org_id IS NULL THEN
    RAISE NOTICE 'Confraria não encontrada; rode antes a carga dela.';
    RETURN;
  END IF;

  UPDATE public.organizacoes SET ficha_completa = true WHERE id = org_id;

  UPDATE public.participantes p
     SET posicao      = v.posicao,
         profissao    = v.profissao,
         area_atuacao = v.area_atuacao,
         fator_rh     = v.fator_rh,
         rg           = v.rg,
         orgao_rg     = v.orgao_rg,
         status       = v.status::public.status_participante
    FROM (VALUES
    ('13', 'Atacante', 'Vigilante', 'Motorista', 'B+', '4.513.254', 'SSP/PE', 'ativo'),
    ('45', 'Levantador', 'Empresário', 'Distribuidora de alimentos para culinária oriental', 'A+', '3.995.801', 'SSP/PE', 'inativo'),
    ('29', 'Atacante', 'Professor', 'Biologia, Ecologia', 'A+', '831.029', 'SSP/SE', 'ativo'),
    ('21', 'Atacante', 'Consultor em Qualidade de Software', 'Tecnologia', 'A+', '7.955.664', 'SDS/PE', 'ativo'),
    ('37', 'Atacante', 'Motorista', 'Motorista de aplicativo', 'O+', '3.918.662', 'SSP/PE', 'ativo'),
    ('47', 'Atacante', 'Eletricista', 'Elétrica', NULL, '5.103.590', 'SSP/PE', 'ativo'),
    ('32', 'Atacante', 'Consultor Empresarial', 'Consultor Empresarial credenciado ao Sebrae e empreendedor serial', 'O-', '9.917.576', 'SDS/PE', 'ativo'),
    ('30', 'Atacante', 'Administrador de empresa', 'Administração de restaurantes', 'O+', '4.277.513', 'SSP/PE', 'ativo'),
    ('55', 'Atacante', 'Advogado', 'Empresário, preparação para concurso público', 'B+', '5.700.831', 'SSP/PE', 'ativo'),
    ('51', 'Levantador', 'Conselho Tutelar', 'Na mesma', 'B+', '3.531.585', 'SDS/PE', 'ativo'),
    ('33', 'Atacante', 'Motorista', 'Motorista de carro forte', 'O-', '5.372.665', 'SDS/PE', 'ativo'),
    ('49', 'Levantador', 'Técnico em edificações', 'Construção civil', 'O+', '6.390.436', 'SDS/PE', 'ativo'),
    ('4', 'Levantador', 'Servidor Público Federal', 'TRF — Recursos Especiais e Extraordinário', 'A+', '3.050.650', 'SSP/PE', 'ativo'),
    ('2', 'Levantador', 'Empresário', 'Brindes', 'O+', '5.184.428', 'SSP/PE', 'ativo'),
    ('53', 'Atacante', 'Supervisor de vendas', 'Italac', 'O+', '2.876.948', 'SDS/PE', 'ativo'),
    ('56', 'Atacante', 'Professor', 'Educação (PCR)', 'AB+', '3.196.373', 'SDS/PE', 'ativo'),
    ('36', 'Levantador', 'Arquiteto', 'Construtor', 'A+', '7.233.220', 'SDS/PE', 'ativo'),
    ('52', 'Atacante', 'Técnico em Edificações', 'Planejamento de Obras', 'A+', '4.746.253', 'SDS/PE', 'ativo'),
    ('28', 'Atacante', 'Montador de Móveis', 'Montador de móveis', 'AB+', '5.660.682', 'SDS/PE', 'ativo'),
    ('42', 'Atacante', 'Estudante', 'Estudante', NULL, NULL, 'SDS/PE', 'ativo'),
    ('8', 'Atacante', 'Vigilante', 'Supervisor de CFTV', 'B+', '5.403.427', 'SSP/PE', 'ativo'),
    ('17', 'Atacante', 'Servidor Público Estadual', 'Polícia Militar de Pernambuco', 'O+', '5.694.380', 'SSP/PE', 'ativo'),
    ('14', 'Atacante', 'Diretor Comercial', 'Vendas', 'O+', '4.687.799', 'SSP/PE', 'ativo'),
    ('34', 'Atacante', 'Empresário', 'Transportes, armazenagem e distribuição', 'O+', '4.652.064', 'SSP/PE', 'ativo'),
    ('9', 'Atacante', 'Engenheiro Eletricista', 'Engenharia', NULL, '7.360.833', 'SDS/PE', 'ativo'),
    ('16', 'Atacante', 'Estudante', 'Estudante', 'A+', '9.397.950', 'SDS/PE', 'ativo'),
    ('41', 'Atacante', 'Fotógrafo', 'Eventos sociais', 'B+', '6.908.244', 'SDS/PE', 'ativo'),
    ('7', 'Atacante', 'Analista de Sistemas', 'TI', 'O+', '6.314.536', 'SSP/PE', 'ativo'),
    ('31', 'Levantador', 'Social Media', 'Comunicação (Marketing Digital)', NULL, '86.212.120', 'SDS/PE', 'ativo'),
    ('59', 'Atacante', 'Estudante', 'Escola', 'B+', '157.100.944-20', 'SDS/PE', 'ativo'),
    ('15', 'Atacante', 'Advogado', 'Criminal e Cível', 'A+', '8.015.856', 'SDS/PE', 'ativo'),
    ('25', 'Atacante', 'Administrador', 'Comércio', 'A+', '5.194.739', 'SDS/PE', 'ativo'),
    ('58', 'Atacante', 'Gestor comercial', 'Pet Food', 'B+', '4.953.993', 'SSP/PE', 'ativo'),
    ('39', 'Levantador', 'Empresário', 'Telecomunicações', 'O+', '3.824.970', 'SSP/PE', 'ativo'),
    ('50', 'Atacante', 'Empresário', 'Gestão Empresarial', 'A+', '3.195.378', 'SSP/PE', 'ativo'),
    ('24', 'Atacante', 'Tecnologia da informação', 'Tecnologia da informação', 'O+', '9.332.744', 'SDS/PE', 'ativo'),
    ('48', 'Atacante', 'Bombeiro Militar', 'Reserva remunerada', 'A+', '27.941.337', 'BM/PE', 'ativo'),
    ('57', 'Atacante', 'Contador', 'Contabilidade', NULL, '7.810.123', 'SDS/PE', 'ativo'),
    ('35', 'Atacante', 'Analista Financeiro Universitário', 'Hospital Público Universitário', 'A+', '4.238.444', 'SDS/PE', 'ativo'),
    ('40', 'Atacante', 'Pensionista', 'Pensionista', 'O+', '4.907.113', 'SSP/PE', 'ativo'),
    ('18', 'Atacante', 'Servidor Público', 'Auditoria', 'O+', '2.706.639', 'SSP/PE', 'ativo'),
    ('27', 'Atacante', 'Servidor Público Municipal', 'Guarda Municipal de Olinda', 'O+', '2.107.540', 'SDS/PE', 'ativo'),
    ('10', 'Atacante', 'Servidor Público Municipal', 'Guarda Municipal do Recife', 'O+', '3.182.625', 'SDS/PE', 'ativo'),
    ('43', 'Atacante', 'Engenheiro', 'Engenharia de Segurança do Trabalho', 'O+', '5.897.661', 'SDS/PE', 'ativo'),
    ('20', 'Atacante', 'Social Media / Jornalista / Marketing de Influência', 'Marketing digital, social media e crescimento de perfis', NULL, '9.131.808', 'SDS/PE', 'ativo'),
    ('54', 'Atacante', 'Professor', 'Professor', 'O+', '8.459.761', 'SDS/PE', 'ativo'),
    ('26', 'Levantador', 'Representante Comercial', 'Alumínio e Vidro', NULL, '5.070.290', 'SSP/PE', 'ativo'),
    ('3', 'Atacante', 'Empresário', 'Alimentação', NULL, '5.440.461', 'SDS/PE', 'ativo'),
    ('11', 'Atacante', 'Porteiro', 'Porteiro', 'A+', '2.115.438', 'SDS/PE', 'ativo'),
    ('46', 'Atacante', 'Empresário', 'Distribuidora (descartáveis, limpeza, papelaria)', 'B+', '6.379.821', 'SDS/PE', 'ativo'),
    ('6', 'Levantador', 'Empresário', 'Revenda de chapas acrílicas, ACM, alumínio e PVC', 'O+', '4.265.798', 'SSP/PE', 'ativo'),
    ('38', 'Atacante', 'Técnico em Refrigeração', 'Autônomo', 'A-', '6.280.196', 'SDS/PE', 'ativo'),
    ('12', 'Atacante', 'Eng. Mecânico', 'Consultoria e inspeção de qualidade para produtos e obras de saneamento', 'A+', '6.330.704', 'SDS/PE', 'ativo'),
    ('23', 'Atacante', 'Comerciário', 'Comércio de suplementos', 'A+', '5.376.290', 'SDS/PE', 'ativo'),
    ('5', 'Atacante', 'Cozinheiro', 'CFTV', 'B+', '6.319.149', 'SSP/PE', 'ativo'),
    ('19', 'Atacante', 'Empresário', 'Funerária', NULL, '3.770.484', 'SSP/PE', 'ativo'),
    ('22', 'Atacante', 'Vendedor', 'Telecom', NULL, '4.381.835', 'SSP/PE', 'ativo'),
    ('1', 'Atacante', 'Servidor Público Estadual', 'Polícia Civil de Pernambuco', 'A+', '2.050.530', 'SSP/PE', 'ativo')
    ) AS v (codigo, posicao, profissao, area_atuacao, fator_rh, rg, orgao_rg, status)
   WHERE p.organizacao_id = org_id AND p.codigo::text = v.codigo::text;
END;
$ficha$;
