import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Plus,
  Trash2,
  Wallet,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  CATEGORIAS_GASTO,
  CATEGORIAS_RECEITA,
  labelCategoriaGasto,
  useDeleteGasto,
  useDeleteReceita,
  useGastos,
  usePagamentos,
  useReceitas,
  useSaveGasto,
  useSaveReceita,
  type CategoriaGasto,
} from "@/lib/pelada";
import { brl, formatDate, monthKey, monthLabel, todayISO } from "@/lib/format";
import { baixarCSV } from "@/lib/status";
import { ArquivoImg, UploadArquivo } from "@/components/foto";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Pelada Manager" },
      { name: "description", content: "Entradas, saídas, saldo em caixa e relatórios da pelada." },
      { property: "og:title", content: "Financeiro — Pelada Manager" },
      { property: "og:description", content: "Entradas, saídas, saldo em caixa e relatórios da pelada." },
    ],
  }),
  component: Financeiro,
});

const CORES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
];

function Financeiro() {
  const gastos = useGastos();
  const receitas = useReceitas();
  const pagamentos = usePagamentos();
  const salvarGasto = useSaveGasto();
  const salvarReceita = useSaveReceita();
  const excluirGasto = useDeleteGasto();
  const excluirReceita = useDeleteReceita();

  const listaGastos = gastos.data ?? [];
  const listaReceitas = receitas.data ?? [];
  const listaPagamentos = pagamentos.data ?? [];

  const totais = useMemo(() => {
    const entradasPag = listaPagamentos.reduce((s, p) => s + Number(p.valor), 0);
    const entradasOutras = listaReceitas.reduce((s, r) => s + Number(r.valor), 0);
    const saidas = listaGastos.reduce((s, g) => s + Number(g.valor), 0);
    return {
      entradas: entradasPag + entradasOutras,
      entradasPag,
      entradasOutras,
      saidas,
      saldo: entradasPag + entradasOutras - saidas,
    };
  }, [listaPagamentos, listaReceitas, listaGastos]);

  const porCategoria = useMemo(() => {
    const mapa = new Map<CategoriaGasto, number>();
    listaGastos.forEach((g) =>
      mapa.set(g.categoria, (mapa.get(g.categoria) ?? 0) + Number(g.valor)),
    );
    return [...mapa.entries()]
      .map(([categoria, valor]) => ({ nome: labelCategoriaGasto(categoria), valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [listaGastos]);

  const porMes = useMemo(() => {
    const mapa = new Map<string, { mes: string; entradas: number; saidas: number }>();
    const get = (key: string) => {
      if (!mapa.has(key)) mapa.set(key, { mes: key, entradas: 0, saidas: 0 });
      return mapa.get(key)!;
    };
    listaPagamentos.forEach((p) => {
      get(monthKey(new Date(p.data_pagamento))).entradas += Number(p.valor);
    });
    listaReceitas.forEach((r) => {
      get(monthKey(new Date(r.data))).entradas += Number(r.valor);
    });
    listaGastos.forEach((g) => {
      get(monthKey(new Date(g.data))).saidas += Number(g.valor);
    });
    const ordenado = [...mapa.values()].sort((a, b) => a.mes.localeCompare(b.mes)).slice(-6);
    let acumulado = 0;
    return ordenado.map((m) => {
      acumulado += m.entradas - m.saidas;
      return { ...m, label: m.mes.slice(5) + "/" + m.mes.slice(2, 4), saldo: acumulado };
    });
  }, [listaPagamentos, listaReceitas, listaGastos]);

  const exportar = () => {
    const linhas: (string | number)[][] = [["Tipo", "Data", "Descrição", "Categoria", "Valor"]];
    listaPagamentos.forEach((p) =>
      linhas.push(["Entrada", p.data_pagamento, `Mensalidade ${p.referencia}`, p.forma_pagamento, Number(p.valor)]),
    );
    listaReceitas.forEach((r) =>
      linhas.push(["Entrada", r.data, r.descricao, r.categoria ?? "Outras", Number(r.valor)]),
    );
    listaGastos.forEach((g) =>
      linhas.push(["Saída", g.data, g.descricao, labelCategoriaGasto(g.categoria), Number(g.valor)]),
    );
    linhas.push([]);
    linhas.push(["Total entradas", "", "", "", totais.entradas]);
    linhas.push(["Total saídas", "", "", "", totais.saidas]);
    linhas.push(["Saldo", "", "", "", totais.saldo]);
    baixarCSV(`relatorio-pelada-${todayISO()}.csv`, linhas);
    toast.success("Relatório exportado.");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl leading-none">Financeiro</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entradas, saídas e saldo em caixa.</p>
        </div>
        <Button variant="outline" onClick={exportar}>
          <Download className="size-4" /> Relatório
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-success/40 bg-success/5">
          <CardContent className="p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <ArrowUpRight className="size-4 text-success" /> Entradas
            </p>
            <p className="stat-num mt-2 text-2xl text-success">{brl(totais.entradas)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {brl(totais.entradasPag)} mensalidades
            </p>
          </CardContent>
        </Card>
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <ArrowDownRight className="size-4 text-destructive" /> Saídas
            </p>
            <p className="stat-num mt-2 text-2xl text-destructive">{brl(totais.saidas)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{listaGastos.length} lançamentos</p>
          </CardContent>
        </Card>
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <Wallet className="size-4 text-primary" /> Saldo em caixa
            </p>
            <p className="stat-num mt-2 text-2xl">{brl(totais.saldo)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Atualizado automaticamente</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entradas x saídas por mês</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {porMes.length === 0 ? (
              <SemDados />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    formatter={(v: number) => brl(Number(v))}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {porCategoria.length === 0 ? (
              <SemDados />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={porCategoria}
                    dataKey="valor"
                    nameKey="nome"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {porCategoria.map((_, i) => (
                      <Cell key={i} fill={CORES[i % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => brl(Number(v))}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Evolução do saldo</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {porMes.length === 0 ? (
              <SemDados />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={porMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    formatter={(v: number) => brl(Number(v))}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="saldo"
                    name="Saldo"
                    stroke="var(--chart-1)"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="gastos">
        <TabsList className="w-full">
          <TabsTrigger value="gastos" className="flex-1">
            Saídas
          </TabsTrigger>
          <TabsTrigger value="receitas" className="flex-1">
            Outras entradas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gastos" className="space-y-3">
          <FormGasto onSave={(v) => salvarGasto.mutateAsync(v)} />
          {listaGastos.length === 0 && <SemLancamentos />}
          {listaGastos.map((g) => (
            <Card key={g.id}>
              <CardContent className="flex items-center gap-3 p-3">
                {g.comprovante_url ? (
                  <ArquivoImg
                    path={g.comprovante_url}
                    alt="Comprovante"
                    className="size-11 rounded-lg border object-cover"
                  />
                ) : (
                  <span className="flex size-11 items-center justify-center rounded-lg bg-muted">
                    <Paperclip className="size-4 text-muted-foreground" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{g.descricao}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(g.data)} · {labelCategoriaGasto(g.categoria)}
                    {g.responsavel ? ` · ${g.responsavel}` : ""}
                  </p>
                </div>
                <span className="stat-num shrink-0 text-sm text-destructive">
                  -{brl(Number(g.valor))}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir gasto"
                  onClick={async () => {
                    await excluirGasto.mutateAsync(g.id);
                    toast.success("Gasto removido.");
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="receitas" className="space-y-3">
          <FormReceita onSave={(v) => salvarReceita.mutateAsync(v)} />
          {listaReceitas.length === 0 && <SemLancamentos />}
          {listaReceitas.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.descricao}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(r.data)} · {r.categoria ?? "Outras"}
                  </p>
                </div>
                <Badge variant="secondary" className="stat-num text-success">
                  +{brl(Number(r.valor))}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir receita"
                  onClick={async () => {
                    await excluirReceita.mutateAsync(r.id);
                    toast.success("Receita removida.");
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        Resumo do mês corrente: {monthLabel(monthKey(new Date()))}
      </p>
    </div>
  );
}

function FormGasto({
  onSave,
}: {
  onSave: (v: {
    descricao: string;
    valor: number;
    categoria: CategoriaGasto;
    data: string;
    responsavel: string | null;
    comprovante_url: string | null;
  }) => Promise<unknown>;
}) {
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState<CategoriaGasto>("quadra");
  const [data, setData] = useState(todayISO());
  const [responsavel, setResponsavel] = useState("");
  const [comprovante, setComprovante] = useState<string | null>(null);

  const salvar = async () => {
    const v = Number(valor.replace(",", "."));
    if (descricao.trim().length < 2 || !Number.isFinite(v) || v <= 0) {
      toast.error("Preencha descrição e valor válidos.");
      return;
    }
    await onSave({
      descricao: descricao.trim().slice(0, 120),
      valor: v,
      categoria,
      data,
      responsavel: responsavel.trim() || null,
      comprovante_url: comprovante,
    });
    toast.success("Gasto registrado!");
    setAberto(false);
    setDescricao("");
    setValor("");
    setResponsavel("");
    setComprovante(null);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="size-4" /> Novo gasto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo gasto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="desc-gasto">Descrição</Label>
            <Input
              id="desc-gasto"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Aluguel da quadra - agosto"
              maxLength={120}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaGasto)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_GASTO.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor-gasto">Valor (R$)</Label>
              <Input
                id="valor-gasto"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data-gasto">Data</Label>
              <Input
                id="data-gasto"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resp-gasto">Responsável</Label>
              <Input
                id="resp-gasto"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                maxLength={60}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Comprovante</Label>
            <UploadArquivo
              value={comprovante}
              onChange={setComprovante}
              pasta="comprovantes"
              label="Anexar comprovante"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar}>Salvar gasto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormReceita({
  onSave,
}: {
  onSave: (v: {
    descricao: string;
    valor: number;
    categoria: string;
    data: string;
  }) => Promise<unknown>;
}) {
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS_RECEITA[0] ?? "Outras");
  const [data, setData] = useState(todayISO());

  const salvar = async () => {
    const v = Number(valor.replace(",", "."));
    if (descricao.trim().length < 2 || !Number.isFinite(v) || v <= 0) {
      toast.error("Preencha descrição e valor válidos.");
      return;
    }
    await onSave({ descricao: descricao.trim().slice(0, 120), valor: v, categoria, data });
    toast.success("Entrada registrada!");
    setAberto(false);
    setDescricao("");
    setValor("");
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="secondary">
          <Plus className="size-4" /> Nova entrada
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova entrada</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="desc-rec">Descrição</Label>
            <Input
              id="desc-rec"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Venda de camisas"
              maxLength={120}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_RECEITA.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor-rec">Valor (R$)</Label>
              <Input
                id="valor-rec"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="data-rec">Data</Label>
            <Input id="data-rec" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar}>Salvar entrada</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SemDados() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Sem dados suficientes ainda.
    </div>
  );
}

function SemLancamentos() {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground">
        Nenhum lançamento registrado.
      </CardContent>
    </Card>
  );
}
