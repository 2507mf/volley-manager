import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { toast } from "sonner";

import { usePagamentos, useParticipantes, useInscricoesAno } from "@/lib/pelada";
import { useOrg } from "@/lib/org";
import { MESES } from "@/lib/format";
import {
  DIA_VENCIMENTO,
  STATUS_ATLETA_CLASS,
  STATUS_ATLETA_LABEL,
  baixarCSV,
  mesesEmAtraso,
  pagamentoDoMes,
  statusAtleta,
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
      { property: "og:title", content: "Planilha" },
      { property: "og:description", content: "Matriz anual de mensalidades por atleta." },
    ],
  }),
  component: Planilha,
});

const valorCompacto = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Planilha() {
  const { org } = useOrg();
  const [ano, setAno] = useState(new Date().getFullYear());
  const participantes = useParticipantes();
  const pagamentos = usePagamentos();
  const inscricoes = useInscricoesAno(ano);

  const pags = pagamentos.data ?? [];
  const ativos = (participantes.data ?? []).filter((p) => p.status === "ativo");

  const hoje = new Date();
  const atual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const mesVencido = (mes: string) =>
    mes < atual || (mes === atual && hoje.getDate() > DIA_VENCIMENTO);

  const inscritosPorAtleta = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (inscricoes.data ?? []).forEach((i) => {
      if (!map.has(i.participante_id)) map.set(i.participante_id, new Set());
      map.get(i.participante_id)!.add(i.referencia);
    });
    return map;
  }, [inscricoes.data]);

  const linhas = useMemo(
    () =>
      ativos
        .map((p) => {
          const inscritos = inscritosPorAtleta.get(p.id) ?? new Set<string>();
          const status = statusAtleta(pags, p, inscritos, ano);
          const atraso = mesesEmAtraso(pags, p.id, inscritos, ano);
          return { p, inscritos, status, atraso };
        })
        .sort((a, b) =>
          (a.p.apelido || a.p.nome).localeCompare(b.p.apelido || b.p.nome),
        ),
    [ativos, inscritosPorAtleta, pags, ano],
  );

  const totaisMes = useMemo(() => {
    const arr = Array.from({ length: 12 }, () => 0);
    ativos.forEach((p) => {
      for (let m = 1; m <= 12; m++) {
        const mes = `${ano}-${String(m).padStart(2, "0")}`;
        const pg = pagamentoDoMes(pags, p.id, mes);
        if (pg) arr[m - 1] = (arr[m - 1] ?? 0) + Number(pg.valor);
      }
      // anuais: soma o pagamento anual no mês em que foi pago
      if (p.tipo_plano === "anual") {
        const pa = pagamentoDoMes(pags, p.id, String(ano));
        if (pa) {
          const i = Number(pa.data_pagamento.slice(5, 7)) - 1;
          arr[i] = (arr[i] ?? 0) + Number(pa.valor);
        }
      }
    });
    return arr;
  }, [ativos, pags, ano]);

  const carregando =
    participantes.isLoading || pagamentos.isLoading || inscricoes.isLoading;

  const rotulo = (status: (typeof linhas)[number]["status"], atraso: number) =>
    status === "inadimplente_grave" ? `${atraso} meses em atraso` : STATUS_ATLETA_LABEL[status];

  const emitirRelatorio = () => {
    const saida: (string | number)[][] = [];
    saida.push([`Planilha ${org?.nome ?? "Pelada"} — ${ano}`]);
    saida.push([]);
    saida.push(["Atleta", "Status", ...MESES.map((m) => m.slice(0, 3))]);
    linhas.forEach(({ p, status, atraso }) => {
      const anualPag =
        p.tipo_plano === "anual" ? pagamentoDoMes(pags, p.id, String(ano)) : undefined;
      const anualMes = anualPag ? Number(anualPag.data_pagamento.slice(5, 7)) : 0;
      const cols: (string | number)[] = [
        `${p.numero != null ? p.numero + " " : ""}${p.apelido || p.nome}`,
        rotulo(status, atraso),
      ];
      for (let m = 1; m <= 12; m++) {
        const mes = `${ano}-${String(m).padStart(2, "0")}`;
        if (p.tipo_plano === "anual") {
          cols.push(anualPag && anualMes === m ? Number(anualPag.valor) : "");
        } else {
          const pg = pagamentoDoMes(pags, p.id, mes);
          cols.push(pg ? Number(pg.valor) : "");
        }
      }
      saida.push(cols);
    });
    saida.push([]);
    saida.push(["Total", "", ...totaisMes.map((t) => (t ? t : ""))]);
    baixarCSV(`planilha-${ano}.csv`, saida);
    toast.success("Relatório gerado.");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl leading-none">Planilha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle anual de mensalidades por atleta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={emitirRelatorio}>
            <FileDown className="size-4" /> Relatório
          </Button>
          <div className="flex items-center gap-1 rounded-xl border bg-card p-1">
            <Button variant="ghost" size="icon" onClick={() => setAno((a) => a - 1)} aria-label="Ano anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="stat-num w-12 text-center text-lg font-bold">{ano}</span>
            <Button variant="ghost" size="icon" onClick={() => setAno((a) => a + 1)} aria-label="Próximo ano">
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
                <th className="whitespace-nowrap px-3 py-2 text-left font-semibold">Status</th>
                {MESES.map((mes) => (
                  <th key={mes} className="px-2 py-2 text-center font-semibold">
                    {mes.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ p, inscritos, status, atraso }) => {
                const anualPag =
                  p.tipo_plano === "anual" ? pagamentoDoMes(pags, p.id, String(ano)) : undefined;
                const anualMes = anualPag ? Number(anualPag.data_pagamento.slice(5, 7)) : 0;
                return (
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
                          {p.numero != null && (
                            <span className="mr-1 opacity-70">{p.numero}.</span>
                          )}
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
                        {rotulo(status, atraso)}
                      </span>
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const mes = `${ano}-${String(m).padStart(2, "0")}`;
                      let txt = "";
                      let cls = "";
                      if (p.tipo_plano === "anual") {
                        if (anualPag && anualMes === m) {
                          txt = valorCompacto(Number(anualPag.valor));
                          cls = "text-emerald-600 font-medium";
                        }
                      } else {
                        const pg = pagamentoDoMes(pags, p.id, mes);
                        if (pg) {
                          txt = valorCompacto(Number(pg.valor));
                          cls = "font-medium";
                        } else if (!inscritos.has(mes)) {
                          cls = "bg-muted/30";
                        } else if (mesVencido(mes)) {
                          cls = "bg-destructive/10";
                        }
                      }
                      return (
                        <td
                          key={m}
                          className={cn("border-l px-2 py-2 text-center tabular-nums", cls)}
                        >
                          {txt}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/50 font-semibold">
                <td className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left">Total</td>
                <td className="px-3 py-2" />
                {totaisMes.map((t, i) => (
                  <td key={i} className="border-l px-2 py-2 text-center tabular-nums">
                    {t ? valorCompacto(t) : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
