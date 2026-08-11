import type { Participante, Pagamento } from "./pelada";
import type { Organizacao } from "./org";
import { monthKey, parseDate } from "./format";

/** Dia de cobrança da mensalidade — o padrão segue a planilha do VÔLEI 6. */
export const DIA_VENCIMENTO_PADRAO = 11;

/** Regras de cobrança da organização (valores e vencimento configuráveis). */
export type Plano = {
  valorMensalista: number;
  valorAnual: number;
  cota: number;
  diaVencimento: number;
};

export const PLANO_PADRAO: Plano = {
  valorMensalista: 30,
  valorAnual: 330,
  cota: 43,
  diaVencimento: DIA_VENCIMENTO_PADRAO,
};

export function planoDaOrg(org?: Organizacao | null): Plano {
  if (!org) return PLANO_PADRAO;
  return {
    valorMensalista: Number(org.valor_mensalista ?? PLANO_PADRAO.valorMensalista),
    valorAnual: Number(org.valor_anual ?? PLANO_PADRAO.valorAnual),
    cota: Number(org.cota ?? PLANO_PADRAO.cota),
    diaVencimento: Number(org.dia_vencimento ?? PLANO_PADRAO.diaVencimento),
  };
}

/**
 * Valor mensal do atleta. Vem do plano da organização; `valor_plano` é a exceção
 * pontual (ex.: quem paga anual mas com valor diferente do padrão).
 */
export function valorMensal(p: Participante, plano: Plano): number {
  if (p.valor_plano != null && Number(p.valor_plano) > 0) return Number(p.valor_plano);
  return p.tipo_plano === "anual" ? plano.valorAnual / 12 : plano.valorMensalista;
}

/** Valor da anuidade do atleta (12 mensalidades). */
export function valorAnuidade(p: Participante, plano: Plano): number {
  return valorMensal(p, plano) * 12;
}

/* ------------------------------- temporada ------------------------------ */

/**
 * A pelada abre vagas em janeiro: quem entra fica cobrado todos os meses até
 * sair. Estes são os meses de `ano` em que o atleta é cobrado (1 a 12).
 *
 * Duas bordas, como na planilha do clube:
 * - quem entra depois do dia de vencimento só começa a pagar no mês seguinte;
 * - o mês da saída não é cobrado.
 */
export function mesesDaTemporada(
  p: Participante,
  ano: number,
  diaVencimento = DIA_VENCIMENTO_PADRAO,
): number[] {
  const entrada = parseDate(p.data_entrada);
  const saida = parseDate(p.data_saida);

  let primeiro = 1;
  if (entrada && entrada.getFullYear() > ano) return [];
  if (entrada && entrada.getFullYear() === ano) {
    primeiro = entrada.getMonth() + 1;
    if (entrada.getDate() > diaVencimento) primeiro++;
    if (primeiro > 12) return [];
  }

  let ultimo = 12;
  if (saida && saida.getFullYear() < ano) return [];
  if (saida && saida.getFullYear() === ano) ultimo = saida.getMonth(); // mês da saída não conta

  const meses: number[] = [];
  for (let m = primeiro; m <= ultimo; m++) meses.push(m);
  return meses;
}

/** O atleta é cobrado na referência "YYYY-MM"? */
export function naTemporada(
  p: Participante,
  referencia: string,
  diaVencimento = DIA_VENCIMENTO_PADRAO,
): boolean {
  const [ano, mes] = referencia.split("-").map(Number);
  if (!ano || !mes) return false;
  return mesesDaTemporada(p, ano, diaVencimento).includes(mes);
}

/** Atletas cobrados no mês, já ordenados como na planilha. */
export function mensalistasDoMes(
  participantes: Participante[],
  referencia: string,
  diaVencimento = DIA_VENCIMENTO_PADRAO,
) {
  return participantes
    .filter(
      (p) =>
        p.status === "ativo" &&
        p.tipo_plano !== "anual" &&
        naTemporada(p, referencia, diaVencimento),
    )
    .sort((a, b) => (a.apelido || a.nome).localeCompare(b.apelido || b.nome, "pt-BR"));
}

/* ------------------------------ pagamentos ------------------------------ */

export type StatusPag = "pago" | "pendente" | "atrasado";

export function pagamentoDoMes(pagamentos: Pagamento[], participanteId: string, mes: string) {
  return pagamentos.find((p) => p.participante_id === participanteId && p.referencia === mes);
}

/** Um mês já venceu? (o mês corrente só vence depois do dia de vencimento) */
export function mesVencido(mes: string, diaVencimento: number, hoje = new Date()) {
  const atual = monthKey(hoje);
  if (mes < atual) return true;
  if (mes > atual) return false;
  return hoje.getDate() > diaVencimento;
}

export function statusMensalista(
  pagamentos: Pagamento[],
  participanteId: string,
  mes: string,
  diaVencimento = DIA_VENCIMENTO_PADRAO,
): StatusPag {
  if (pagamentoDoMes(pagamentos, participanteId, mes)) return "pago";
  return mesVencido(mes, diaVencimento) ? "atrasado" : "pendente";
}

/** A anuidade é registrada uma vez, com referência igual ao ano ("2026"). */
export function pagamentoAnual(pagamentos: Pagamento[], participanteId: string, ano: number) {
  return pagamentoDoMes(pagamentos, participanteId, String(ano));
}

export function statusAnual(pagamentos: Pagamento[], p: Participante, ano: number): StatusPag {
  return pagamentoAnual(pagamentos, p.id, ano) ? "pago" : "atrasado";
}

export const STATUS_CLASS: Record<StatusPag, string> = {
  pago: "bg-success/15 text-success border-success/30",
  pendente: "bg-warning/20 text-warning-foreground border-warning/40",
  atrasado: "bg-destructive/15 text-destructive border-destructive/30",
};

export const STATUS_LABEL: Record<StatusPag, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
};

/* --------------------------- situação do atleta ------------------------- */

export type StatusAtleta = "em_dia" | "anual" | "inadimplente" | "inadimplente_grave";

/** Meses da temporada que já venceram e continuam sem pagamento. */
export function mesesEmAtraso(
  pagamentos: Pagamento[],
  p: Participante,
  ano: number,
  diaVencimento = DIA_VENCIMENTO_PADRAO,
): number {
  if (p.tipo_plano === "anual") return 0;
  let count = 0;
  for (const m of mesesDaTemporada(p, ano, diaVencimento)) {
    const mes = `${ano}-${String(m).padStart(2, "0")}`;
    if (!mesVencido(mes, diaVencimento)) continue;
    if (!pagamentoDoMes(pagamentos, p.id, mes)) count++;
  }
  return count;
}

export function statusAtleta(
  pagamentos: Pagamento[],
  p: Participante,
  ano: number,
  diaVencimento = DIA_VENCIMENTO_PADRAO,
): StatusAtleta {
  if (p.tipo_plano === "anual") {
    return statusAnual(pagamentos, p, ano) === "pago" ? "anual" : "inadimplente";
  }
  const atraso = mesesEmAtraso(pagamentos, p, ano, diaVencimento);
  if (atraso === 0) return "em_dia";
  if (atraso === 1) return "inadimplente";
  return "inadimplente_grave";
}

export const STATUS_ATLETA_LABEL: Record<StatusAtleta, string> = {
  em_dia: "Em dia",
  anual: "Pgto anual",
  inadimplente: "1 mês em atraso",
  inadimplente_grave: "2+ meses em atraso",
};

/** Rótulo igual ao da planilha, com a quantidade real de meses. */
export const rotuloSituacao = (status: StatusAtleta, atraso: number) =>
  status === "inadimplente_grave" ? `${atraso} meses em atraso` : STATUS_ATLETA_LABEL[status];

// Cores fiéis à planilha: azul / verde / vermelho / preto.
export const STATUS_ATLETA_CLASS: Record<StatusAtleta, string> = {
  em_dia: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  anual: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  inadimplente: "bg-destructive/15 text-destructive border-destructive/30",
  inadimplente_grave: "bg-neutral-900 text-neutral-50 border-neutral-900",
};

export function diasParaAniversario(nascimento?: string | null) {
  const d = parseDate(nascimento);
  if (!d) return null;
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  let prox = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
  if (prox < base) prox = new Date(hoje.getFullYear() + 1, d.getMonth(), d.getDate());
  return Math.round((prox.getTime() - base.getTime()) / 86400000);
}

export function baixarCSV(nome: string, linhas: (string | number)[][]) {
  const csv = linhas
    .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
