import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Moon, Sun, Download, Info } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { useGastos, usePagamentos, useParticipantes, useReceitas } from "@/lib/pelada";
import { brl, todayISO } from "@/lib/format";
import { baixarCSV, DIA_VENCIMENTO } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Pelada Manager" },
      { name: "description", content: "Preferências da conta, tema e exportação de dados." },
      { property: "og:title", content: "Configurações — Pelada Manager" },
      { property: "og:description", content: "Preferências da conta, tema e exportação de dados." },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const participantes = useParticipantes();
  const pagamentos = usePagamentos();
  const gastos = useGastos();
  const receitas = useReceitas();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const exportarParticipantes = () => {
    const linhas: (string | number)[][] = [
      ["Nome", "Apelido", "WhatsApp", "Nascimento", "Plano", "Valor", "Entrada", "Status"],
      ...(participantes.data ?? []).map((p) => [
        p.nome,
        p.apelido ?? "",
        p.telefone ?? "",
        p.data_nascimento ?? "",
        p.tipo_plano,
        Number(p.valor_plano),
        p.data_entrada,
        p.status,
      ]),
    ];
    baixarCSV(`participantes-${todayISO()}.csv`, linhas);
    toast.success("Lista exportada.");
  };

  const saldo =
    (pagamentos.data ?? []).reduce((s, p) => s + Number(p.valor), 0) +
    (receitas.data ?? []).reduce((s, r) => s + Number(r.valor), 0) -
    (gastos.data ?? []).reduce((s, g) => s + Number(g.valor), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl leading-none">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Conta, aparência e dados da pelada.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Organizador</p>
            <p className="text-sm font-medium">{email || "—"}</p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-4" /> Sair da conta
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aparência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
              <div>
                <p className="text-sm font-medium">Modo escuro</p>
                <p className="text-xs text-muted-foreground">Ideal para usar no ginásio à noite.</p>
              </div>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={() => toggle()}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Resumo titulo="Participantes" valor={String((participantes.data ?? []).length)} />
            <Resumo titulo="Pagamentos" valor={String((pagamentos.data ?? []).length)} />
            <Resumo titulo="Gastos" valor={String((gastos.data ?? []).length)} />
            <Resumo titulo="Saldo" valor={brl(saldo)} />
          </div>
          <Button variant="outline" onClick={exportarParticipantes}>
            <Download className="size-4" /> Exportar participantes (CSV)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            Mensalidades vencem no dia {DIA_VENCIMENTO} de cada mês. Planos anuais vencem na data de
            aniversário de entrada do participante na pelada.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Resumo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-[11px] uppercase text-muted-foreground">{titulo}</p>
      <p className="stat-num mt-1 text-lg">{valor}</p>
    </div>
  );
}
