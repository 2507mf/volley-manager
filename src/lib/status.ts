import type { Participante, Pagamento } from "./pelada";
import { monthKey, parseDate } from "./format";

export const DIA_VENCIMENTO = 10;

export type StatusPag = "pago" | "pendente" | "atrasado";

export function pagamentoDoMes(pagamentos: Pagamento[], participanteId: string, mes: string) {
  return pagamentos.find((p) => p.participante_id === participanteId && p.referencia === mes);
}

export function statusMensalista(
  pagamentos: Pagamento[],
  participanteId: string,
  mes: string,
): StatusPag {
  if (pagamentoDoMes(pagamentos, participanteId, mes)) return "pago";
  const hoje = new Date();
  const atual = monthKey(hoje);
  if (mes < atual) return "atrasado";
  if (mes > atual) return "pendente";
  return hoje.getDate() > DIA_VENCIMENTO ? "atrasado" : "pendente";
}

/** Ciclo anual vigente: começa no último aniversário da data de entrada. */
export function cicloAnual(p: Participante) {
  const entrada = parseDate(p.data_entrada) ?? new Date();
  const hoje = new Date();
  let inicio = new Date(hoje.getFullYear(), entrada.getMonth(), entrada.getDate());
  if (inicio > hoje) inicio = new Date(hoje.getFullYear() - 1, entrada.getMonth(), entrada.getDate());
  const vencimento = new Date(inicio.getFullYear() + 1, entrada.getMonth(), entrada.getDate());
  return { referencia: String(inicio.getFullYear()), inicio, vencimento };
}

export function statusAnual(pagamentos: Pagamento[], p: Participante): StatusPag {
  const { referencia } = cicloAnual(p);
  return pagamentoDoMes(pagamentos, p.id, referencia) ? "pago" : "atrasado";
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
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
