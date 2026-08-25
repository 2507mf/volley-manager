import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Undo2, FileDown, CalendarCheck } from "lucide-react";
import { toast } from "sonner";

import {
  FORMAS_PAGAMENTO,
  useDeletePagamento,
  useGastos,
  usePagamentos,
  useParticipantes,
  usePlano,
  useReceitas,
  useSavePagamento,
  type FormaPagamento,
  type Participante,
} from "@/lib/pelada";
import { brl, formatDate, monthKey, monthLabel, todayISO } from "@/lib/format";
import {
  STATUS_ATLETA_CLASS,
  STATUS_CLASS,
  STATUS_LABEL,
  mensalistasDoMes,
  mesesEmAtraso,
  pagamentoAnual,
  pagamentoDoMes,
  rotuloSituacao,
  statusAnual,
  statusAtleta,
  statusMensalista,
  valorAnuidade,
  valorMensal,
} from "@/lib/status";
import { useOrg } from "@/lib/org";
import { useRelatorio } from "@/components/relatorio";
import { AvatarParticipante } from "@/components/foto";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos" },
      { name: "description", content: "Controle mensal e anual de quem já pagou a pelada." },
    ],
  }),
  component: Pagamentos,
});

type Cobranca = {
  participante: Participante;
  referencia: string;
  valor: number;
};

function Pagamentos() {
  const { org } = useOrg();
  const { abrir: abrirRelatorio } = useRelatorio();
  const plano = usePlano();
  const participantes = useParticipantes();
  const pagamentos = usePagamentos();
  const gastos = useGastos();
  const receitas = useReceitas();
  const salvar = useSavePagamento();
  const remover = useDeletePagamento();

  const [mes, setMes] = useState(monthKey(new Date()));
  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [valor, setValor] = useState("");
  const [data, setData] = useState(todayISO());
  const [forma, setForma] = useState<FormaPagamento>("pix");

  const parts = participantes.data ?? [];
  const ativos = parts.filter((p) => p.status === "ativo");
  const pags = pagamentos.data ?? [];
  const ano = Number(mes.split("-")[0]);

  const anuais = ativos.filter((p) => p.tipo_plano === "anual");

  // A temporada define quem é cobrado: entrou, é cobrado todo mês até sair.
  const doMes = useMemo(() => mensalistasDoMes(ativos, mes), [ativos, mes]);

  const resumoMes = useMemo(() => {
    const pagos = doMes.filter(
      (p) => statusMensalista(pags, p.id, mes, plano.diaVencimento) === "pago",
    );
    const total = pagos.reduce(
      (s, p) => s + Number(pagamentoDoMes(pags, p.id, mes)?.valor ?? 0),
      0,
    );
    const previsto = doMes.reduce((s, p) => s + valorMensal(p, plano), 0);
    return { pagos: pagos.length, total, previsto };
  }, [doMes, pags, mes, plano]);

  const badgeAno = (p: Participante) => {
    const st = statusAtleta(pags, p, ano, plano.diaVencimento);
    const atraso = mesesEmAtraso(pags, p, ano, plano.diaVencimento);
    return { label: rotuloSituacao(st, atraso), cls: STATUS_ATLETA_CLASS[st] };
  };

  const mudarMes = (delta: number) => {
    const [y, m] = mes.split("-").map(Number);
    setMes(monthKey(new Date(y ?? 2026, (m ?? 1) - 1 + delta, 1)));
  };

  const abrirCobranca = (participante: Participante, referencia: string, sugestao: number) => {
    setCobranca({ participante, referencia, valor: sugestao });
    setValor(sugestao.toFixed(2));
    setData(todayISO());
    setForma("pix");
  };

  const confirmar = async () => {
    if (!cobranca) return;
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    try {
      await salvar.mutateAsync({
        participante_id: cobranca.participante.id,
        valor: v,
        data_pagamento: data || todayISO(),
        referencia: cobranca.referencia,
        forma_pagamento: forma,
      });
      toast.success("Pagamento registrado!");
      setCobranca(null);
    } catch {
      toast.error("Não foi possível registrar o pagamento.");
    }
  };

  const desfazer = async (id: string) => {
    await remover.mutateAsync(id);
    toast.success("Pagamento removido.");
  };

  const marcarTodos = async () => {
    const pendentes = doMes.filter((p) => !pagamentoDoMes(pags, p.id, mes));
    if (pendentes.length === 0) {
      toast.info("Todo mundo já está pago neste mês.");
      return;
    }
    try {
      for (const p of pendentes) {
        await salvar.mutateAsync({
          participante_id: p.id,
          valor: valorMensal(p, plano),
          data_pagamento: `${mes}-${String(plano.diaVencimento).padStart(2, "0")}`,
          referencia: mes,
          forma_pagamento: "pix",
        });
      }
      toast.success(`${pendentes.length} pagamentos registrados.`);
    } catch {
      toast.error("Não foi possível registrar todos.");
    }
  };

  const emitirRelatorio = () => {
    const gastosMes = (gastos.data ?? []).filter((g) => g.data.slice(0, 7) === mes);
    const receitasMes = (receitas.data ?? []).filter((r) => r.data.slice(0, 7) === mes);
    const pagamentosMes = pags.filter((p) => p.data_pagamento.slice(0, 7) === mes);
    const totalMens = pagamentosMes.reduce((s, p) => s + Number(p.valor), 0);
    const totalRec = receitasMes.reduce((s, r) => s + Number(r.valor), 0);
    const totalSai = gastosMes.reduce((s, g) => s + Number(g.valor), 0);
    const totalEnt = totalMens + totalRec;

    const atrasados = doMes.filter(
      (p) => statusMensalista(pags, p.id, mes, plano.diaVencimento) === "atrasado",
    );

    abrirRelatorio({
      nome: `relatorio-${mes}`,
      titulo: `${org?.nome ?? "Pelada"} — ${monthLabel(mes)}`,
      subtitulo: `${resumoMes.pagos} de ${doMes.length} mensalistas pagos · vencimento dia ${plano.diaVencimento}`,
      secoes: [
        {
          titulo: "Resumo",
          linhas: [
            ["Mensalidades e anuidades recebidas", brl(totalMens)],
            ["Outras entradas", brl(totalRec)],
            ["Total de entradas", brl(totalEnt)],
            ["Total de saídas", brl(totalSai)],
            ["Saldo do mês", brl(totalEnt - totalSai)],
          ],
          totalNoFim: true,
        },
        {
          titulo: `Mensalistas do mês (${doMes.length})`,
          colunas: ["Atleta", "Situação", "Valor", "Forma", "Pago em"],
          numericas: [2],
          linhas: doMes.map((p) => {
            const pg = pagamentoDoMes(pags, p.id, mes);
            return [
              p.apelido || p.nome,
              STATUS_LABEL[statusMensalista(pags, p.id, mes, plano.diaVencimento)],
              brl(pg ? Number(pg.valor) : valorMensal(p, plano)),
              pg ? pg.forma_pagamento : "—",
              pg ? formatDate(pg.data_pagamento) : "—",
            ];
          }),
          vazio: "Nenhum mensalista na temporada neste mês.",
        },
        {
          titulo: `Em atraso (${atrasados.length})`,
          colunas: ["Atleta", "Valor devido", "Telefone"],
          numericas: [1],
          linhas: atrasados.map((p) => [
            p.apelido || p.nome,
            brl(valorMensal(p, plano)),
            p.telefone ?? "—",
          ]),
          vazio: "Ninguém em atraso. ",
        },
        {
          titulo: `Anuais (${anuais.length})`,
          colunas: ["Atleta", "Situação", "Anuidade", "Pago em"],
          numericas: [2],
          linhas: anuais.map((p) => {
            const pg = pagamentoAnual(pags, p.id, ano);
            return [
              p.apelido || p.nome,
              statusAnual(pags, p, ano) === "pago" ? "Pago" : "Em atraso",
              brl(pg ? Number(pg.valor) : valorAnuidade(p, plano)),
              pg ? formatDate(pg.data_pagamento) : "—",
            ];
          }),
          vazio: "Nenhum participante com plano anual.",
        },
        {
          titulo: "Saídas do mês",
          colunas: ["Data", "Descrição", "Categoria", "Valor"],
          numericas: [3],
          linhas: gastosMes.map((g) => [
            formatDate(g.data),
            g.descricao,
            g.categoria,
            brl(Number(g.valor)),
          ]),
          vazio: "Nenhuma saída no mês.",
        },
        {
          titulo: "Outras entradas do mês",
          colunas: ["Data", "Descrição", "Categoria", "Valor"],
          numericas: [3],
          linhas: receitasMes.map((r) => [
            formatDate(r.data),
            r.descricao,
            r.categoria ?? "—",
            brl(Number(r.valor)),
          ]),
          vazio: "Nenhuma outra entrada no mês.",
        },
      ],
    });
  };

  const carregando = participantes.isLoading || pagamentos.isLoading;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl leading-none">Pagamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A lista do mês é automática: quem está na temporada aparece aqui.
        </p>
      </div>

      <Tabs defaultValue="mensal">
        <TabsList className="w-full">
          <TabsTrigger value="mensal" className="flex-1">
            Mensalistas
          </TabsTrigger>
          <TabsTrigger value="anual" className="flex-1">
            Anuais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mensal" className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border bg-card p-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => mudarMes(-1)}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="text-center">
              <p className="font-display text-lg font-bold uppercase">{monthLabel(mes)}</p>
              <p className="text-xs text-muted-foreground">
                {resumoMes.pagos}/{doMes.length} pagos · {brl(resumoMes.total)} de{" "}
                {brl(resumoMes.previsto)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => mudarMes(1)}
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={marcarTodos} disabled={salvar.isPending}>
              <CalendarCheck className="size-4" /> Marcar todos como pagos
            </Button>
            <Button variant="outline" onClick={emitirRelatorio}>
              <FileDown className="size-4" /> Relatório do mês (PDF)
            </Button>
          </div>

          {carregando ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : doMes.length === 0 ? (
            <Vazio texto="Nenhum mensalista na temporada neste mês. Confira as datas de entrada em Participantes." />
          ) : (
            <div className="space-y-2">
              {doMes.map((p) => {
                const status = statusMensalista(pags, p.id, mes, plano.diaVencimento);
                const pago = pagamentoDoMes(pags, p.id, mes);
                return (
                  <LinhaPagamento
                    key={p.id}
                    participante={p}
                    status={status}
                    detalhe={
                      pago
                        ? `${formatDate(pago.data_pagamento)} · ${pago.forma_pagamento}`
                        : `Vence dia ${plano.diaVencimento} · ${brl(valorMensal(p, plano))}`
                    }
                    valor={pago ? Number(pago.valor) : valorMensal(p, plano)}
                    onMarcar={() => abrirCobranca(p, mes, valorMensal(p, plano))}
                    onDesfazer={pago ? () => desfazer(pago.id) : undefined}
                    statusAno={badgeAno(p)}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="anual" className="space-y-2">
          {carregando ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : anuais.length === 0 ? (
            <Vazio texto="Nenhum participante com plano anual." />
          ) : (
            anuais.map((p) => {
              const status = statusAnual(pags, p, ano);
              const pago = pagamentoAnual(pags, p.id, ano);
              return (
                <LinhaPagamento
                  key={p.id}
                  participante={p}
                  status={status}
                  detalhe={
                    pago
                      ? `Anuidade ${ano} · paga em ${formatDate(pago.data_pagamento)}`
                      : `Anuidade ${ano} · ${brl(valorAnuidade(p, plano))} (${brl(valorMensal(p, plano))}/mês)`
                  }
                  valor={pago ? Number(pago.valor) : valorAnuidade(p, plano)}
                  onMarcar={() => abrirCobranca(p, String(ano), valorAnuidade(p, plano))}
                  onDesfazer={pago ? () => desfazer(pago.id) : undefined}
                  statusAno={badgeAno(p)}
                />
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!cobranca} onOpenChange={(o) => !o && setCobranca(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Registrar pagamento — {cobranca?.participante.apelido || cobranca?.participante.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Referência:{" "}
              <span className="font-medium text-foreground">{cobranca?.referencia}</span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="valor-pag">Valor (R$)</Label>
              <Input
                id="valor-pag"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data-pag">Data do pagamento</Label>
              <Input
                id="data-pag"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select value={forma} onValueChange={(v) => setForma(v as FormaPagamento)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCobranca(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={salvar.isPending}>
              Confirmar pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LinhaPagamento({
  participante,
  status,
  detalhe,
  valor,
  onMarcar,
  onDesfazer,
  statusAno,
}: {
  participante: Participante;
  status: keyof typeof STATUS_CLASS;
  detalhe: string;
  valor: number;
  onMarcar: () => void;
  onDesfazer?: (() => void) | undefined;
  statusAno?: { label: string; cls: string };
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <AvatarParticipante
          nome={participante.nome}
          foto={participante.foto_url}
          className="size-10 text-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {participante.apelido || participante.nome}
          </p>
          <p className="truncate text-xs text-muted-foreground">{detalhe}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {statusAno && (
            <span
              className={cn(
                "hidden rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:inline",
                statusAno.cls,
              )}
            >
              {statusAno.label}
            </span>
          )}
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase",
              STATUS_CLASS[status],
            )}
          >
            {STATUS_LABEL[status]}
          </span>
          <span className="stat-num hidden text-sm sm:inline">{brl(valor)}</span>
          {onDesfazer ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDesfazer}
              aria-label="Desfazer pagamento"
            >
              <Undo2 className="size-4" />
            </Button>
          ) : (
            <Button size="icon" onClick={onMarcar} aria-label="Marcar como pago">
              <Check className="size-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground">{texto}</CardContent>
    </Card>
  );
}
