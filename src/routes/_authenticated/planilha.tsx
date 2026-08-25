import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileDown, Search, X } from "lucide-react";

import { usePagamentos, useParticipantes, usePlano } from "@/lib/pelada";
import { useOrg } from "@/lib/org";
import { useRelatorio } from "@/components/relatorio";
import { MESES } from "@/lib/format";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

/** Recortes da planilha. O PDF sai sempre com o recorte que está na tela. */
const SITUACOES = [
  { value: "todos", label: "Todas as situações" },
  { value: "quitados", label: "Quitados (em dia e anuais)" },
  { value: "atraso", label: "Em atraso (qualquer)" },
  { value: "atraso1", label: "1 mês em atraso" },
  { value: "atraso2", label: "2+ meses em atraso" },
] as const;

const PLANOS_FILTRO = [
  { value: "todos", label: "Todos os planos" },
  { value: "mensalista", label: "Mensalistas" },
  { value: "anual", label: "Anuais" },
] as const;

type FiltroSituacao = (typeof SITUACOES)[number]["value"];
type FiltroPlano = (typeof PLANOS_FILTRO)[number]["value"];

function Planilha() {
  const { org } = useOrg();
  const { abrir: abrirRelatorio } = useRelatorio();
  const plano = usePlano();
  const [ano, setAno] = useState(new Date().getFullYear());
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<FiltroSituacao>("todos");
  const [filtroPlano, setFiltroPlano] = useState<FiltroPlano>("todos");
  const participantes = useParticipantes();
  const pagamentos = usePagamentos();

  const pags = pagamentos.data ?? [];
  const ativos = useMemo(
    () => (participantes.data ?? []).filter((p) => p.status === "ativo"),
    [participantes.data],
  );

  const linhasTodas = useMemo(
    () =>
      ativos
        .map((p) => {
          const temporada = new Set(mesesDaTemporada(p, ano));
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

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return linhasTodas.filter(({ p, status }) => {
      if (
        termo &&
        !p.nome.toLowerCase().includes(termo) &&
        !(p.apelido ?? "").toLowerCase().includes(termo) &&
        !String(p.codigo ?? "").includes(termo)
      )
        return false;
      if (filtroPlano !== "todos" && p.tipo_plano !== filtroPlano) return false;
      if (situacao === "quitados") return status === "em_dia" || status === "anual";
      if (situacao === "atraso")
        return status === "inadimplente" || status === "inadimplente_grave";
      if (situacao === "atraso1") return status === "inadimplente";
      if (situacao === "atraso2") return status === "inadimplente_grave";
      return true;
    });
  }, [linhasTodas, busca, situacao, filtroPlano]);

  const filtrando = situacao !== "todos" || filtroPlano !== "todos" || busca.trim() !== "";
  const limparFiltros = () => {
    setBusca("");
    setSituacao("todos");
    setFiltroPlano("todos");
  };

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
    abrirRelatorio({
      nome: filtrando ? `planilha-${ano}-filtrada` : `planilha-${ano}`,
      titulo: `Controle e receita ${ano}`,
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
            [
              "",
              "Total mês",
              "",
              ...totaisMes.map((t) => (t ? valorCompacto(t) : "")),
              valorCompacto(totalAno),
            ],
          ],
          // as 3 primeiras colunas sao cod/atleta/situacao; os meses comecam na 3
          emAtraso: (linha, coluna) =>
            coluna >= 3 &&
            coluna <= 14 &&
            (linhas[linha]?.celulas[coluna - 3]?.classe.includes("destructive") ?? false),
          totalNoFim: true,
          vazio: "Nenhum atleta neste recorte.",
        },
      ],
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl leading-none">Planilha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtrando ? `${linhas.length} de ${linhasTodas.length}` : linhas.length} atletas · cota
            R$ {valorCompacto(plano.cota)} · total R$ {valorCompacto(totalAno)}
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

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar atleta"
            className="pl-9"
          />
        </div>
        <Select value={situacao} onValueChange={(v) => setSituacao(v as FiltroSituacao)}>
          <SelectTrigger className="w-[210px]" aria-label="Filtrar por situação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SITUACOES.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroPlano} onValueChange={(v) => setFiltroPlano(v as FiltroPlano)}>
          <SelectTrigger className="w-[160px]" aria-label="Filtrar por plano">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLANOS_FILTRO.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtrando && (
          <Button variant="ghost" size="sm" onClick={limparFiltros}>
            <X className="size-4" /> Limpar
          </Button>
        )}
      </div>

      {carregando ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : linhas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {filtrando
              ? "Nenhum atleta neste recorte. Ajuste os filtros acima."
              : "Nenhum participante ativo cadastrado."}
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-[70vh] overflow-auto rounded-xl border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 border-b bg-muted px-3 py-2 text-left font-semibold">
                  Atleta
                </th>
                <th className="sticky top-0 z-20 whitespace-nowrap border-b bg-muted px-3 py-2 text-left font-semibold">
                  Situação
                </th>
                {MESES.map((mes) => (
                  <th
                    key={mes}
                    className="sticky top-0 z-20 border-b bg-muted px-2 py-2 text-center font-semibold"
                  >
                    {mes.slice(0, 3)}
                  </th>
                ))}
                <th className="sticky top-0 z-20 border-b bg-muted px-3 py-2 text-right font-semibold">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ p, status, atraso, celulas, total }) => (
                <tr key={p.id} className="border-t">
                  <td
                    className={cn(
                      "sticky left-0 z-10 border-r bg-card px-3 py-2",
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
              <tr className="font-semibold">
                <td className="sticky bottom-0 left-0 z-30 border-t bg-muted px-3 py-2 text-left">
                  Total mês
                </td>
                <td className="sticky bottom-0 z-20 border-t bg-muted px-3 py-2" />
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
