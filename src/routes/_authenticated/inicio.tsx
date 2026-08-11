import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Cake,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Scale,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  CATEGORIA_ANUIDADE,
  CATEGORIA_MENSALIDADE,
  labelCategoriaGasto,
  useGastos,
  usePagamentos,
  useParticipantes,
  usePlano,
  useReceitas,
  type Participante,
} from "@/lib/pelada";
import { brl, formatDayMonth, MESES, parseDate } from "@/lib/format";
import { diasParaAniversario, mesesEmAtraso, statusAtleta } from "@/lib/status";
import { AvatarParticipante } from "@/components/foto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Início" },
      { name: "description", content: "Entradas, saídas, lucro e aniversariantes da pelada." },
    ],
  }),
  component: Inicio,
});

const CORES_CAT = [
  "var(--viz-cat-1)",
  "var(--viz-cat-2)",
  "var(--viz-cat-3)",
  "var(--viz-cat-4)",
  "var(--viz-cat-5)",
  "var(--viz-cat-6)",
  "var(--viz-cat-7)",
  "var(--viz-cat-8)",
];

const compacto = (v: number) =>
  v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : String(v);

type Fatia = { nome: string; valor: number };

/** Agrupa lançamentos por categoria e dobra a cauda em "Demais" (8 cores no máximo). */
function agrupar(itens: Fatia[]): Fatia[] {
  const mapa = new Map<string, number>();
  itens.forEach((i) => mapa.set(i.nome, (mapa.get(i.nome) ?? 0) + i.valor));
  const ordenado = [...mapa.entries()]
    .map(([nome, valor]) => ({ nome, valor }))
    .filter((f) => f.valor > 0)
    .sort((a, b) => b.valor - a.valor);
  if (ordenado.length <= 8) return ordenado;
  const demais = ordenado.slice(7).reduce((s, f) => s + f.valor, 0);
  return [...ordenado.slice(0, 7), { nome: "Demais", valor: demais }];
}

function Inicio() {
  const participantes = useParticipantes();
  const pagamentos = usePagamentos();
  const gastos = useGastos();
  const receitas = useReceitas();
  const plano = usePlano();

  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [inicio, setInicio] = useState(`${hoje.getFullYear()}-01-01`);
  const [fim, setFim] = useState(`${hoje.getFullYear()}-12-31`);

  const carregando =
    participantes.isLoading || pagamentos.isLoading || gastos.isLoading || receitas.isLoading;

  const parts = useMemo(() => participantes.data ?? [], [participantes.data]);
  const pags = useMemo(() => pagamentos.data ?? [], [pagamentos.data]);
  const gs = useMemo(() => gastos.data ?? [], [gastos.data]);
  const rs = useMemo(() => receitas.data ?? [], [receitas.data]);

  const planoDe = useMemo(() => new Map(parts.map((p) => [p.id, p.tipo_plano])), [parts]);

  /* --------------------------- análise anual --------------------------- */

  const anual = useMemo(() => {
    const noAno = (d: string) => d.slice(0, 4) === String(ano);
    const entradas =
      pags.filter((p) => noAno(p.data_pagamento)).reduce((s, p) => s + Number(p.valor), 0) +
      rs.filter((r) => noAno(r.data)).reduce((s, r) => s + Number(r.valor), 0);
    const saidas = gs.filter((g) => noAno(g.data)).reduce((s, g) => s + Number(g.valor), 0);

    const meses = MESES.map((nome, i) => {
      const ref = `${ano}-${String(i + 1).padStart(2, "0")}`;
      const ent =
        pags
          .filter((p) => p.data_pagamento.slice(0, 7) === ref)
          .reduce((s, p) => s + Number(p.valor), 0) +
        rs.filter((r) => r.data.slice(0, 7) === ref).reduce((s, r) => s + Number(r.valor), 0);
      const sai = gs
        .filter((g) => g.data.slice(0, 7) === ref)
        .reduce((s, g) => s + Number(g.valor), 0);
      return { mes: nome.slice(0, 3), entradas: ent, saidas: sai };
    });

    return { entradas, saidas, lucro: entradas - saidas, meses };
  }, [pags, rs, gs, ano]);

  /* ------------------------- período específico ------------------------ */

  const periodo = useMemo(() => {
    const dentro = (d: string) => d >= inicio && d <= fim;

    const entradas = agrupar([
      ...pags
        .filter((p) => dentro(p.data_pagamento))
        .map((p) => ({
          nome:
            planoDe.get(p.participante_id) === "anual" ? CATEGORIA_ANUIDADE : CATEGORIA_MENSALIDADE,
          valor: Number(p.valor),
        })),
      ...rs
        .filter((r) => dentro(r.data))
        .map((r) => ({ nome: r.categoria, valor: Number(r.valor) })),
    ]);

    const saidas = agrupar(
      gs
        .filter((g) => dentro(g.data))
        .map((g) => ({ nome: labelCategoriaGasto(g.categoria), valor: Number(g.valor) })),
    );

    const totalEnt = entradas.reduce((s, f) => s + f.valor, 0);
    const totalSai = saidas.reduce((s, f) => s + f.valor, 0);
    return { entradas, saidas, totalEnt, totalSai, lucro: totalEnt - totalSai };
  }, [pags, rs, gs, planoDe, inicio, fim]);

  /* --------------------------- atletas / datas -------------------------- */

  const atletas = useMemo(() => {
    const ativos = parts.filter((p) => p.status === "ativo");
    let emDia = 0;
    let atrasados = 0;
    let mesesDevidos = 0;
    ativos.forEach((p) => {
      const st = statusAtleta(pags, p, ano, plano.diaVencimento);
      if (st === "em_dia" || st === "anual") emDia++;
      else {
        atrasados++;
        mesesDevidos += mesesEmAtraso(pags, p, ano, plano.diaVencimento) || 1;
      }
    });
    return { ativos, emDia, atrasados, mesesDevidos };
  }, [parts, pags, ano, plano]);

  const mesAtual = hoje.getMonth();
  const aniversariantes = useMemo(
    () =>
      atletas.ativos
        .filter((p) => parseDate(p.data_nascimento)?.getMonth() === mesAtual)
        .sort(
          (a, b) =>
            (parseDate(a.data_nascimento)?.getDate() ?? 0) -
            (parseDate(b.data_nascimento)?.getDate() ?? 0),
        ),
    [atletas.ativos, mesAtual],
  );

  const hojeAniversario = aniversariantes.filter(
    (p) => diasParaAniversario(p.data_nascimento) === 0,
  );

  if (carregando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {hojeAniversario.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
          <Cake className="mt-0.5 size-5 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">Hoje é aniversário!</p>
            <p className="text-muted-foreground">
              {hojeAniversario.map((p) => p.apelido || p.nome).join(", ")} — mande os parabéns no
              grupo.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------- Análise anual ------------------------- */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-base">Análise Anual</CardTitle>
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAno((a) => a - 1)}
                aria-label="Ano anterior"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="stat-num w-20 text-center text-3xl font-bold text-primary">
                {ano}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAno((a) => a + 1)}
                aria-label="Próximo ano"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <LinhaTotal
              icone={<ArrowUpRight className="size-4" />}
              cor="var(--viz-entrada)"
              titulo="Entradas"
              valor={anual.entradas}
            />
            <LinhaTotal
              icone={<ArrowDownRight className="size-4" />}
              cor="var(--viz-saida)"
              titulo="Saídas"
              valor={anual.saidas}
            />
            <LinhaTotal
              icone={<Scale className="size-4" />}
              cor="var(--primary)"
              titulo="Lucro"
              valor={anual.lucro}
              destaque
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Entrada x Saída — mensal</CardTitle>
            <Legenda />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={anual.meses}
                barGap={2}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="mes"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  width={56}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => compacto(v)}
                />
                <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<DicaBarras />} />
                <Bar
                  dataKey="entradas"
                  name="Entradas"
                  fill="var(--viz-entrada)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="saidas" name="Saídas" fill="var(--viz-saida)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ------------------ Análise de período específico ------------------ */}
      <Card>
        <CardHeader className="gap-3 pb-2 sm:flex-row sm:items-end sm:justify-between sm:space-y-0">
          <CardTitle className="text-base">Análise de período específico</CardTitle>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="dt-ini" className="text-xs text-muted-foreground">
                Data inicial
              </Label>
              <Input
                id="dt-ini"
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="h-9 w-[150px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dt-fim" className="text-xs text-muted-foreground">
                Data final
              </Label>
              <Input
                id="dt-fim"
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="h-9 w-[150px]"
              />
            </div>
            <div className="text-right">
              <p className="text-xs uppercase text-muted-foreground">Lucro</p>
              <p className="stat-num text-xl font-bold">{brl(periodo.lucro)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <BlocoCategorias
            titulo="Top Entradas"
            fatias={periodo.entradas}
            total={periodo.totalEnt}
          />
          <BlocoCategorias titulo="Top Saídas" fatias={periodo.saidas} total={periodo.totalSai} />
        </CardContent>
      </Card>

      {/* ------------------------- atletas e datas ------------------------- */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador
          icone={<CircleCheck className="size-4 text-success" />}
          titulo="Atletas em dia"
          valor={`${atletas.emDia}/${atletas.ativos.length}`}
          nota="Mensalistas e anuais quitados"
        />
        <Indicador
          icone={<CircleAlert className="size-4 text-destructive" />}
          titulo="Em atraso"
          valor={String(atletas.atrasados)}
          nota={`${atletas.mesesDevidos} meses em aberto`}
        />
        <Indicador
          icone={<Scale className="size-4 text-primary" />}
          titulo="Saldo em caixa"
          valor={brl(anual.lucro)}
          nota={`${brl(anual.entradas)} entradas · ${brl(anual.saidas)} saídas`}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cake className="size-4 text-primary" /> Aniversariantes do mês
          </CardTitle>
          <Badge variant="secondary">{aniversariantes.length}</Badge>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {aniversariantes.length === 0 && (
            <p className="text-sm text-muted-foreground">Ninguém faz aniversário neste mês.</p>
          )}
          {aniversariantes.map((p) => (
            <LinhaAniversario key={p.id} participante={p} />
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Anuidade e mensalidade saem dos pagamentos registrados; as demais entradas e todas as saídas
        vêm do{" "}
        <Link to="/financeiro" className="font-medium text-primary hover:underline">
          Financeiro
        </Link>
        .
      </p>
    </div>
  );
}

/* -------------------------------- peças -------------------------------- */

function Legenda() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm" style={{ background: "var(--viz-entrada)" }} />
        Entradas
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm" style={{ background: "var(--viz-saida)" }} />
        Saídas
      </span>
    </div>
  );
}

function DicaBarras({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover p-2.5 text-xs shadow-md">
      <p className="mb-1 font-semibold text-popover-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-sm" style={{ background: p.color }} />
          {p.name}
          <span className="stat-num ml-auto text-popover-foreground">{brl(p.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

function LinhaTotal({
  icone,
  cor,
  titulo,
  valor,
  destaque,
}: {
  icone: ReactNode;
  cor: string;
  titulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b pb-3 last:border-0 last:pb-0",
        destaque && "border-0",
      )}
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in oklab, ${cor} 15%, transparent)`, color: cor }}
      >
        {icone}
      </span>
      <span className="text-sm font-medium">{titulo}</span>
      <span
        className={cn("stat-num ml-auto text-lg font-bold", destaque && "text-xl text-primary")}
      >
        {brl(valor)}
      </span>
    </div>
  );
}

function BlocoCategorias({
  titulo,
  fatias,
  total,
}: {
  titulo: string;
  fatias: Fatia[];
  total: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <span className="stat-num text-sm">{brl(total)}</span>
      </div>

      {fatias.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum lançamento neste período.
        </p>
      ) : (
        <div className="grid items-center gap-3 sm:grid-cols-[1fr_140px]">
          {/* A lista ranqueada carrega rótulo e valor — é ela que dá o relevo às fatias. */}
          <ol className="space-y-1.5">
            {fatias.map((f, i) => (
              <li key={f.nome} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-right text-xs text-muted-foreground">{i + 1}</span>
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ background: CORES_CAT[i % CORES_CAT.length] }}
                />
                <span className="min-w-0 flex-1 truncate">{f.nome}</span>
                <span className="stat-num text-xs">{brl(f.valor)}</span>
              </li>
            ))}
          </ol>

          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={fatias}
                dataKey="valor"
                nameKey="nome"
                innerRadius={38}
                outerRadius={62}
                paddingAngle={2}
                stroke="var(--viz-surface)"
                strokeWidth={2}
              >
                {fatias.map((f, i) => (
                  <Cell key={f.nome} fill={CORES_CAT[i % CORES_CAT.length]} />
                ))}
              </Pie>
              <Tooltip content={<DicaFatia total={total} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function DicaFatia({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
  total: number;
}) {
  const item = payload?.[0];
  if (!active || !item) return null;
  const pct = total > 0 ? Math.round(((item.value ?? 0) / total) * 100) : 0;
  return (
    <div className="rounded-lg border bg-popover p-2.5 text-xs shadow-md">
      <p className="font-semibold text-popover-foreground">{item.name}</p>
      <p className="stat-num text-muted-foreground">
        {brl(item.value ?? 0)} · {pct}%
      </p>
    </div>
  );
}

function Indicador({
  icone,
  titulo,
  valor,
  nota,
}: {
  icone: ReactNode;
  titulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {icone}
          {titulo}
        </div>
        <p className="stat-num mt-2 text-2xl">{valor}</p>
        {nota && <p className="mt-1 text-xs text-muted-foreground">{nota}</p>}
      </CardContent>
    </Card>
  );
}

function LinhaAniversario({ participante: p }: { participante: Participante }) {
  const dias = diasParaAniversario(p.data_nascimento);
  return (
    <div className="flex items-center gap-3">
      <AvatarParticipante nome={p.nome} foto={p.foto_url} className="size-9 text-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{p.apelido || p.nome}</p>
        <p className="text-xs text-muted-foreground">{formatDayMonth(p.data_nascimento)}</p>
      </div>
      <Badge variant={dias === 0 ? "default" : "outline"}>
        {dias === 0 ? "Hoje!" : `em ${dias} dias`}
      </Badge>
    </div>
  );
}
