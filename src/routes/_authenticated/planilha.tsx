import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { toast } from "sonner";

import { usePagamentos, useParticipantes, usePlano } from "@/lib/pelada";
import { useOrg } from "@/lib/org";
import { baixarPDF } from "@/lib/pdf";
import { brl, MESES } from "@/lib/format";
import {
  STATUS_ATLETA_CLASS,
  mesVencido,
  mesesDaTemporada,
  mesesEmAtraso,
  pagamentoAnual,
  pagamentoDoMes,
  rotuloSituacao,
  statusAtleta,
  valorMensal,
} from "@/lib/status";
import { AvatarParticipante } from "@/components/foto";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planilha")({
  head: () => ({
    meta: [
      { title: "Planilha" },
      { name: "description", content: "Matriz anual de mensalidades por atleta." },
    ],
  }),
  component: Planilha,
});

const valorCompacto = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Célula de mês: valor pago, "x-x-x" fora da temporada, ou vazia se ainda não venceu. */
type Celula = { texto: string; classe: string };

function Planilha() {
  const { org } = useOrg();
  const plano = usePlano();
  const [ano, setAno] = useState(new Date().getFullYear());
  const participantes = useParticipantes();
  const pagamentos = usePagamentos();

  const pags = pagamentos.data ?? [];
  const ativos = useMemo(
    () => (participantes.data ?? []).filter((p) => p.status === "ativo"),
    [participantes.data],
  );

  const linhas = useMemo(
    () =>
      ativos
        .map((p) => {
          const temporada = new Set(mesesDaTemporada(p, ano, plano.diaVencimento));
          const status = statusAtleta(pags, p, ano, plano.diaVencimento);
          const atraso = mesesEmAtraso(pags, p, ano, plano.diaVencimento);
          const anualPago = p.tipo_plano === "anual" ? pagamentoAnual(pags, p.id, ano) : undefined;

          // A anuidade é paga de uma vez, mas a planilha do clube rateia por mês.
          const rateioAnual = anualPago ? Number(anualPago.valor) / 12 : 0;

          const celulas: Celula[] = [];
          let total = 0;
          for (let m = 1; m <= 12; m++) {
            const mes = `${ano}-${String(m).padStart(2, "0")}`;
            if (!temporada.has(m)) {
              celulas.push({ texto: "x-x-x", classe: "bg-muted/40 text-muted-foreground/70" });
              continue;
            }
            if (p.tipo_plano === "anual") {
              if (anualPago) {
                total += rateioAnual;
                celulas.push({
                  texto: valorCompacto(rateioAnual),
                  classe: "text-emerald-600 font-medium",
                });
              } else {
                celulas.push({ texto: "", classe: "bg-destructive/10" });
              }
              continue;
            }
            const pg = pagamentoDoMes(pags, p.id, mes);
            if (pg) {
              total += Number(pg.valor);
              celulas.push({ texto: valorCompacto(Number(pg.valor)), classe: "font-medium" });
            } else {
              celulas.push({
                texto: "",
                classe: mesVencido(mes, plano.diaVencimento) ? "bg-destructive/10" : "",
              });
            }
          }

          return { p, status, atraso, celulas, total };
        })
        .sort((a, b) => (a.p.apelido || a.p.nome).localeCompare(b.p.apelido || b.p.nome, "pt-BR")),
    [ativos, pags, ano, plano],
  );

  const totaisMes = useMemo(() => {
    const arr = Array.from({ length: 12 }, () => 0);
    linhas.forEach(({ celulas }) => {
      celulas.forEach((c, i) => {
        const n = Number(c.texto.replace(/\./g, "").replace(",", "."));
        if (Number.isFinite(n)) arr[i] = (arr[i] ?? 0) + n;
      });
    });
    return arr;
  }, [linhas]);

  const totalAno = totaisMes.reduce((s, t) => s + t, 0);
  const carregando = participantes.isLoading || pagamentos.isLoading;

  const emitirRelatorio = () => {
    baixarPDF({
      nome: `planilha-${ano}`,
      titulo: `${org?.nome ?? "Pelada"} — controle e receita ${ano}`,
      subtitulo: `${linhas.length} atletas · cota ${brl(plano.cota)} · total do ano ${brl(totalAno)}`,
      paisagem: true,
      secoes: [
        {
          colunas: ["Cód.", "Atleta", "Situação", ...MESES.map((m) => m.slice(0, 3)), "Total"],
          numericas: Array.from({ length: 13 }, (_, i) => i + 3),
          linhas: [
            ...linhas.map(({ p, status, atraso, celulas, total }) => [
              p.codigo ?? "",
              p.apelido || p.nome,
              rotuloSituacao(status, atraso),
              ...celulas.map((c) => c.texto),
              valorCompacto(total),
            ]),
            ["", "Total mês", "", ...totaisMes.map((t) => (t ? valorCompacto(t) : "")), valorCompacto(totalAno)],
          ],
          totalNoFim: true,
          vazio: "Nenhum participante ativo cadastrado.",
        },
      ],
    });
    toast.success("Relatório em PDF gerado.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl leading-none">Planilha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {linhas.length} atletas · cota R$ {valorCompacto(plano.cota)} · total do ano R${" "}
            {valorCompacto(totalAno)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={emitirRelatorio}>
            <FileDown className="size-4" /> PDF
          </Button>
          <div className="flex items-center gap-1 rounded-xl border bg-card p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAno((a) => a - 1)}
              aria-label="Ano anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="stat-num w-12 text-center text-lg font-bold">{ano}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAno((a) => a + 1)}
              aria-label="Próximo ano"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {carregando ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : linhas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum participante ativo cadastrado.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-semibold">
                  Atleta
                </th>
                <th className="whitespace-nowrap px-3 py-2 text-left font-semibold">Situação</th>
                {MESES.map((mes) => (
                  <th key={mes} className="px-2 py-2 text-center font-semibold">
                    {mes.slice(0, 3)}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ p, status, atraso, celulas, total }) => (
                <tr key={p.id} className="border-t">
                  <td
                    className={cn(
                      "sticky left-0 z-10 border-r px-3 py-2",
                      STATUS_ATLETA_CLASS[status],
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <AvatarParticipante
                        nome={p.nome}
                        foto={p.foto_url}
                        className="size-7 text-[11px]"
                      />
                      <span className="whitespace-nowrap font-medium">
                        {p.codigo != null && <span className="mr-1 opacity-70">{p.codigo}.</span>}
                        {p.apelido || p.nome}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        STATUS_ATLETA_CLASS[status],
                      )}
                    >
                      {rotuloSituacao(status, atraso)}
                    </span>
                  </td>
                  {celulas.map((c, i) => (
                    <td
                      key={i}
                      className={cn("border-l px-2 py-2 text-center tabular-nums", c.classe)}
                    >
                      {c.texto}
                    </td>
                  ))}
                  <td className="stat-num border-l px-3 py-2 text-right">{valorCompacto(total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/50 font-semibold">
                <td className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left">Total mês</td>
                <td className="px-3 py-2" />
                {totaisMes.map((t, i) => (
                  <td key={i} className="border-l px-2 py-2 text-center tabular-nums">
                    {t ? valorCompacto(t) : ""}
                  </td>
                ))}
                <td className="stat-num border-l px-3 py-2 text-right">
                  {valorCompacto(totalAno)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        <span className="rounded bg-muted/40 px-1.5 py-0.5 font-medium">x-x-x</span> = fora da
        temporada (antes da entrada ou depois da saída). Fundo vermelho = mês vencido sem pagamento.
        Anuais aparecem com a anuidade rateada nos 12 meses, como na planilha do clube.
      </p>
    </div>
  );
}
