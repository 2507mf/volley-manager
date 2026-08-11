# Volley Manager

Sistema de Gerenciamento de Pelada de Vôlei

Crie um sistema web (aplicativo de gestão) para administrar uma "pelada" de vôlei recorrente, com foco em controle de participantes, mensalidades/anuidades e finanças.

Contexto

O sistema é usado pelo organizador da pelada para controlar quem joga, quem já pagou, quanto está entrando e saindo de dinheiro, e datas importantes dos participantes (aniversários). Deve ter uma interface limpa, rápida de usar no celular (o organizador vai mexer nisso durante o jogo ou no grupo do WhatsApp) e com visual esportivo, mas profissional.

Funcionalidades principais

1. Gestão de Participantes

Cadastro de participantes com: nome, apelido (opcional), telefone/WhatsApp, data de nascimento, foto (opcional), data de entrada na pelada, status (ativo/inativo).

Tipo de plano por participante: Mensalista (paga todo mês) ou Anual (paga uma vez por ano) 

Valor da mensalidade/anuidade pode ser diferente por participante (ex: descontos, planos promocionais).

Histórico de pagamentos de cada participante.

2. Controle de Pagamentos

Painel mensal mostrando quem já pagou e quem está pendente/atrasado (mensalistas).

Painel anual mostrando vencimento e status dos anuais.

Marcar pagamento como "pago", com data e forma de pagamento (Pix, dinheiro, cartão).

Alertas visuais (cores) para pagamentos em atraso.

3. Financeiro (Entradas e Saídas)

Registro de entradas: pagamentos de mensalistas, anuais, outras receitas (ex: venda de camisa, rifa).

Registro de saídas (gastos) com categorias discriminadas, por exemplo:

Aluguel de quadra

Bolas e material esportivo

Coletes/uniformes

Água/gelo

Confraternizações/eventos

Manutenção de equipamento

Outros

Cada gasto deve ter: descrição, categoria, valor, data, responsável pelo pagamento (se aplicável), comprovante/foto anexada (opcional).

Saldo em caixa atualizado automaticamente (entradas − saídas).

Dashboard financeiro com gráficos: saldo ao longo do tempo, gastos por categoria (gráfico de pizza/barras), comparativo mês a mês.

Relatório mensal/anual exportável (resumo de entradas, saídas e saldo).

4. Aniversários

Lista de aniversariantes do mês em destaque na tela inicial.

Notificação/alerta quando chegar o dia do aniversário de algum participante.

5. Dashboard Inicial

Visão geral: total de participantes ativos, mensalistas em dia vs. atrasados, saldo atual em caixa, aniversariantes do mês, próximos vencimentos.

6. Extras desejáveis (se possível)

Modo escuro.

Estrutura de dados sugerida

participantes: id, nome, apelido, telefone, data_nascimento, tipo_plano (mensalista/anual/avulso), valor_plano, data_entrada, status, foto_url

pagamentos: id, participante_id, valor, data_pagamento, referencia (mês/ano ou ano), forma_pagamento, status

gastos: id, descricao, categoria, valor, data, comprovante_url, responsavel

caixa: cálculo automático (view/agregação) somando pagamentos − gastos

Design

Cores esportivas (aranja/azul), tipografia clara, ícones esportivos.

Mobile e web.

Navegação simples por abas: Início | Participantes | Financeiro | Pagamentos | Configurações

## Arquitetura multi-sistema

Cada cliente tem o seu próprio **sistema** (uma organização): VÔLEI 6, quadra do José, etc.
Os dados são isolados no banco — não há tela ou consulta que atravesse essa fronteira.

- `organizacoes` — nome, descrição, ícone, cor e logo, tudo editável em Configurações.
- `organizacao_membros` — quem acessa cada sistema, com papel `dono` / `admin` / `membro`.
- `perfis` — espelho de `auth.users` com a flag `super_admin`.
- `participantes`, `pagamentos`, `receitas`, `gastos`, `inscricoes_mensais` carregam
  `organizacao_id`, e as políticas de RLS liberam a linha via `public.tem_acesso(organizacao_id)`.

O **super admin** (definido em `public.email_super_admin`, hoje `mariafernanda2507@gmail.com`)
enxerga e administra todos os sistemas; qualquer outra conta só vê aqueles de que é membro.
Quem cria uma conta nova monta o seu próprio sistema na primeira entrada e vira `dono` dele.

Arquivos no storage ficam em `pelada/<organizacao_id>/<pasta>/…`, com a mesma regra de acesso.

## Temporada e valores

As vagas abrem em janeiro. A partir da **data de entrada** o atleta é cobrado todos os meses
até a **data de saída** — não existe inscrição mês a mês. Duas bordas, iguais às da planilha
do clube: quem entra depois do dia de vencimento só começa a pagar no mês seguinte, e o mês
da saída não é cobrado. Tudo isso vive em `mesesDaTemporada()` (`src/lib/status.ts`).

Os valores são do sistema, não do atleta: `organizacoes.valor_mensalista`, `valor_anual`,
`cota` e `dia_vencimento`, editáveis em Configurações → Planos e valores. `participantes.valor_plano`
existe só como **exceção** (valor mensal de um atleta específico, ex.: quem paga anual fora do
padrão). Pagamentos já registrados guardam o valor da época.

A anuidade é um pagamento único com `referencia` igual ao ano (`"2026"`); a Planilha o rateia
nos 12 meses, como o Excel do clube. Mensalidades usam `referencia` `"AAAA-MM"`.

## Dashboard

A tela inicial reproduz o fluxo de caixa do cliente: Análise Anual (entradas, saídas, lucro),
Entrada × Saída por mês, e a análise por período com Top Entradas / Top Saídas. `Anuidade` e
`Mensalidade` são derivadas dos pagamentos; as demais categorias vêm de `receitas` e `gastos`.

A paleta de gráficos está em `--viz-*` (`src/styles.css`), validada para daltonismo: entrada ×
saída usa o par azul/vermelho porque verde/vermelho reprova em deuteranopia (ΔE 4,1).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f8bd7d84-9476-41c5-9a2e-b43d04d80521).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
