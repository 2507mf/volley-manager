import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Cake, CircleAlert, CircleCheck, TrendingUp, Users, CalendarClock } from "lucide-react";

import { useGastos, useInscricoes, usePagamentos, useParticipantes, useReceitas } from "@/lib/pelada";
import { brl, formatDayMonth, monthKey, monthLabel, parseDate } from "@/lib/format";
import { cicloAnual, diasParaAniversario, statusAnual, statusMensalista } from "@/lib/status";
import { AvatarParticipante } from "@/components/foto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Início — VÔLEI 6" },
      { name: "description", content: "Resumo da pelada: caixa, mensalidades e aniversariantes." },
      { property: "og:title", content: "Início — VÔLEI 6" },
      { property: "og:description", content: "Resumo da pelada: caixa, mensalidades e aniversariantes." },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const participantes = useParticipantes();
  const pagamentos = usePagamentos();
  const inscricoes = useInscricoes();
  const gastos = useGastos();
  const receitas = useReceitas();

  const carregando =
    participantes.isLoading ||
    pagamentos.isLoading ||
    inscricoes.isLoading ||
    gastos.isLoading ||
    receitas.isLoading;

  const dados = useMemo(() => {
    const parts = participantes.data ?? [];
    const pags = pagamentos.data ?? [];
    const ins = inscricoes.data ?? [];
    const mes = monthKey(new Date());
    const ativos = parts.filter((p) => p.status === "ativo");

    const mensalistas = ativos.filter((p) => p.tipo_plano === "mensalista");
    const inscritos = mensalistas.filter((p) =>
      ins.some((i) => i.referencia === mes && i.participante_id === p.id),
    );
    const emDia = inscritos.filter((p) => statusMensalista(pags, p.id, mes) === "pago").length;
    const atrasados = inscritos.filter(
      (p) => statusMensalista(pags, p.id, mes) === "atrasado",
    ).length;

    const anuaisAtrasados = ativos.filter(
      (p) => p.tipo_plano === "anual" && statusAnual(pags, p) === "atrasado",
    ).length;

    const entradas =
      pags.reduce((s, p) => s + Number(p.valor), 0) +
      (receitas.data ?? []).reduce((s, r) => s + Number(r.valor), 0);
    const saidas = (gastos.data ?? []).reduce((s, g) => s + Number(g.valor), 0);

    const mesAtual = new Date().getMonth();
    const aniversariantes = ativos
      .filter((p) => parseDate(p.data_nascimento)?.getMonth() === mesAtual)
      .sort(
        (a, b) =>
          (parseDate(a.data_nascimento)?.getDate() ?? 0) -
          (parseDate(b.data_nascimento)?.getDate() ?? 0),
      );

    const hojeAniversario = aniversariantes.filter(
      (p) => parseDate(p.data_nascimento)?.getDate() === new Date().getDate(),
    );

    const vencimentos = ativos
      .filter((p) => p.tipo_plano === "anual")
      .map((p) => ({ participante: p, ...cicloAnual(p) }))
      .sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime())
      .slice(0, 5);

    return {
      ativos,
      total: parts.length,
      mensalistas,
      inscritos: inscritos.length,
      emDia,
      atrasados,
      anuaisAtrasados,
      saldo: entradas - saidas,
      entradas,
      saidas,
      aniversariantes,
      hojeAniversario,
      vencimentos,
      mes,
    };
  }, [participantes.data, pagamentos.data, gastos.data, receitas.data, inscricoes.data]);

  if (carregando) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl leading-none">Painel da pelada</h1>
        <p className="mt-1 text-sm text-muted-foreground">{monthLabel(dados.mes)}</p>
      </div>

      {dados.hojeAniversario.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
          <Cake className="mt-0.5 size-5 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">Hoje é aniversário!</p>
            <p className="text-muted-foreground">
              {dados.hojeAniversario.map((p) => p.apelido || p.nome).join(", ")} — mande os parabéns
              no grupo.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="size-4" />}
          titulo="Participantes cadastrados"
          valor={String(dados.total)}
          nota={`${dados.mensalistas.length} mensalistas`}
        />
        <StatCard
          icon={<CircleCheck className="size-4 text-success" />}
          titulo="Mensalistas em dia"
          valor={`${dados.emDia}/${dados.inscritos}`}
          nota="Inscritos no mês"
        />
        <StatCard
          icon={<CircleAlert className="size-4 text-destructive" />}
          titulo="Em atraso"
          valor={String(dados.atrasados + dados.anuaisAtrasados)}
          nota={`${dados.anuaisAtrasados} anuais vencidos`}
        />
        <StatCard
          icon={<TrendingUp className="size-4 text-primary" />}
          titulo="Saldo em caixa"
          valor={brl(dados.saldo)}
          nota={`${brl(dados.entradas)} entradas · ${brl(dados.saidas)} saídas`}
          destaque
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cake className="size-4 text-primary" /> Aniversariantes do mês
            </CardTitle>
            <Badge variant="secondary">{dados.aniversariantes.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {dados.aniversariantes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ninguém faz aniversário neste mês.
              </p>
            )}
            {dados.aniversariantes.map((p) => {
              const dias = diasParaAniversario(p.data_nascimento);
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <AvatarParticipante nome={p.nome} foto={p.foto_url} className="size-9 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.apelido || p.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDayMonth(p.data_nascimento)}
                    </p>
                  </div>
                  <Badge variant={dias === 0 ? "default" : "outline"}>
                    {dias === 0 ? "Hoje!" : `em ${dias} dias`}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="size-4 text-secondary" /> Próximos vencimentos (anuais)
            </CardTitle>
            <Link to="/pagamentos" className="text-xs font-medium text-primary hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {dados.vencimentos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum plano anual cadastrado.</p>
            )}
            {dados.vencimentos.map(({ participante, vencimento }) => (
              <div key={participante.id} className="flex items-center gap-3">
                <AvatarParticipante
                  nome={participante.nome}
                  foto={participante.foto_url}
                  className="size-9 text-sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {participante.apelido || participante.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vence em {vencimento.toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="stat-num text-sm">{brl(Number(participante.valor_plano))}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  titulo,
  valor,
  nota,
  destaque,
}: {
  icon: React.ReactNode;
  titulo: string;
  valor: string;
  nota?: string;
  destaque?: boolean;
}) {
  return (
    <Card className={destaque ? "border-primary/50 bg-primary/5" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {icon}
          {titulo}
        </div>
        <p className="stat-num mt-2 text-2xl">{valor}</p>
        {nota && <p className="mt-1 text-xs text-muted-foreground">{nota}</p>}
      </CardContent>
    </Card>
  );
}
