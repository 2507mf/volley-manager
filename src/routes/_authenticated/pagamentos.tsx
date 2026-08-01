import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Undo2 } from "lucide-react";
import { toast } from "sonner";

import {
  FORMAS_PAGAMENTO,
  useDeletePagamento,
  usePagamentos,
  useParticipantes,
  useSavePagamento,
  type FormaPagamento,
  type Participante,
} from "@/lib/pelada";
import { brl, formatDate, monthKey, monthLabel, todayISO } from "@/lib/format";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  cicloAnual,
  pagamentoDoMes,
  statusAnual,
  statusMensalista,
} from "@/lib/status";
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
      { title: "Pagamentos — VÔLEI 6" },
      { name: "description", content: "Controle mensal e anual de quem já pagou a pelada." },
      { property: "og:title", content: "Pagamentos — VÔLEI 6" },
      { property: "og:description", content: "Controle mensal e anual de quem já pagou a pelada." },
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
  const participantes = useParticipantes();
  const pagamentos = usePagamentos();
  const salvar = useSavePagamento();
  const remover = useDeletePagamento();

  const [mes, setMes] = useState(monthKey(new Date()));
  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [valor, setValor] = useState("");
  const [data, setData] = useState(todayISO());
  const [forma, setForma] = useState<FormaPagamento>("pix");

  const ativos = (participantes.data ?? []).filter((p) => p.status === "ativo");
  const pags = pagamentos.data ?? [];

  const mensalistas = ativos.filter((p) => p.tipo_plano === "mensalista");
  const anuais = ativos.filter((p) => p.tipo_plano === "anual");

  const resumoMes = useMemo(() => {
    const pagos = mensalistas.filter((p) => statusMensalista(pags, p.id, mes) === "pago");
    const total = pagos.reduce(
      (s, p) => s + Number(pagamentoDoMes(pags, p.id, mes)?.valor ?? 0),
      0,
    );
    return { pagos: pagos.length, total };
  }, [mensalistas, pags, mes]);

  const mudarMes = (delta: number) => {
    const [y, m] = mes.split("-").map(Number);
    setMes(monthKey(new Date(y ?? 2026, (m ?? 1) - 1 + delta, 1)));
  };

  const abrirCobranca = (participante: Participante, referencia: string) => {
    setCobranca({ participante, referencia, valor: Number(participante.valor_plano) });
    setValor(String(participante.valor_plano ?? ""));
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

  const carregando = participantes.isLoading || pagamentos.isLoading;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl leading-none">Pagamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Marque quem já acertou a mensalidade ou a anuidade.
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
            <Button variant="ghost" size="icon" onClick={() => mudarMes(-1)} aria-label="Mês anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <div className="text-center">
              <p className="font-display text-lg font-bold uppercase">{monthLabel(mes)}</p>
              <p className="text-xs text-muted-foreground">
                {resumoMes.pagos}/{mensalistas.length} pagos · {brl(resumoMes.total)} arrecadado
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => mudarMes(1)} aria-label="Próximo mês">
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {carregando ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : mensalistas.length === 0 ? (
            <Vazio texto="Nenhum mensalista ativo cadastrado." />
          ) : (
            <div className="space-y-2">
              {mensalistas.map((p) => {
                const status = statusMensalista(pags, p.id, mes);
                const pago = pagamentoDoMes(pags, p.id, mes);
                return (
                  <LinhaPagamento
                    key={p.id}
                    participante={p}
                    status={status}
                    detalhe={
                      pago
                        ? `${formatDate(pago.data_pagamento)} · ${pago.forma_pagamento}`
                        : `Vence dia 10 · ${brl(Number(p.valor_plano))}`
                    }
                    valor={pago ? Number(pago.valor) : Number(p.valor_plano)}
                    onMarcar={() => abrirCobranca(p, mes)}
                    onDesfazer={pago ? () => desfazer(pago.id) : undefined}
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
              const ciclo = cicloAnual(p);
              const status = statusAnual(pags, p);
              const pago = pagamentoDoMes(pags, p.id, ciclo.referencia);
              return (
                <LinhaPagamento
                  key={p.id}
                  participante={p}
                  status={status}
                  detalhe={
                    pago
                      ? `Ciclo ${ciclo.referencia} · pago em ${formatDate(pago.data_pagamento)}`
                      : `Ciclo ${ciclo.referencia} · vence ${ciclo.vencimento.toLocaleDateString("pt-BR")}`
                  }
                  valor={pago ? Number(pago.valor) : Number(p.valor_plano)}
                  onMarcar={() => abrirCobranca(p, ciclo.referencia)}
                  onDesfazer={pago ? () => desfazer(pago.id) : undefined}
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
              Referência: <span className="font-medium text-foreground">{cobranca?.referencia}</span>
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
}: {
  participante: Participante;
  status: keyof typeof STATUS_CLASS;
  detalhe: string;
  valor: number;
  onMarcar: () => void;
  onDesfazer?: (() => void) | undefined;
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
            <Button variant="ghost" size="icon" onClick={onDesfazer} aria-label="Desfazer pagamento">
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
