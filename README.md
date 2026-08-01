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
