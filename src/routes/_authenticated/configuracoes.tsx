import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LogOut,
  Moon,
  Sun,
  Download,
  Info,
  Loader2,
  Trash2,
  UserPlus,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { useGastos, usePagamentos, useParticipantes, useReceitas } from "@/lib/pelada";
import {
  PAPEIS,
  useAdicionarMembro,
  useExcluirOrganizacao,
  useMembros,
  useOrg,
  useRemoverMembro,
  useSalvarOrganizacao,
  type PapelMembro,
} from "@/lib/org";
import { brl, todayISO } from "@/lib/format";
import { baixarCSV, DIA_VENCIMENTO } from "@/lib/status";
import { EscolherCor, EscolherIcone } from "@/components/sistema";
import { MarcaIcone } from "@/components/marca";
import { UploadArquivo } from "@/components/foto";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações" },
      { name: "description", content: "Identidade do sistema, acessos, tema e exportação." },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const { org, orgId, superAdmin, papel, podeAdministrar, organizacoes, trocarOrg } = useOrg();
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
        <p className="mt-1 text-sm text-muted-foreground">
          Identidade do sistema, acessos, aparência e dados.
        </p>
      </div>

      <IdentidadeSistema />

      {podeAdministrar && <Membros />}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-auto">
              <p className="text-xs uppercase text-muted-foreground">Você está logado como</p>
              <p className="text-sm font-medium">{email || "—"}</p>
            </div>
            {superAdmin ? (
              <Badge className="gap-1">
                <ShieldCheck className="size-3" /> Super admin
              </Badge>
            ) : (
              papel && (
                <Badge variant="secondary">
                  {PAPEIS.find((p) => p.value === papel)?.label ?? papel}
                </Badge>
              )
            )}
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

      {superAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="size-4 text-primary" /> Todos os sistemas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Como super admin você acessa todos os sistemas da plataforma.
            </p>
            {organizacoes.map((o) => (
              <button
                key={o.id}
                onClick={() => trocarOrg(o.id)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
              >
                <MarcaIcone org={o} className="size-8 rounded-md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{o.nome}</span>
                  {o.descricao && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {o.descricao}
                    </span>
                  )}
                </span>
                {o.id === orgId && <Badge variant="secondary">Atual</Badge>}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

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
            <Switch checked={theme === "dark"} onCheckedChange={() => toggle()} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados de {org?.nome ?? "—"}</CardTitle>
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

/* --------------------------- identidade visual -------------------------- */

function IdentidadeSistema() {
  const { org, podeAdministrar } = useOrg();
  const salvar = useSalvarOrganizacao();
  const excluir = useExcluirOrganizacao();

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [icone, setIcone] = useState("volleyball");
  const [cor, setCor] = useState("laranja");
  const [logo, setLogo] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  useEffect(() => {
    if (!org) return;
    setNome(org.nome);
    setDescricao(org.descricao ?? "");
    setIcone(org.icone);
    setCor(org.cor);
    setLogo(org.logo_url);
  }, [org]);

  if (!org) return null;

  const alterado =
    nome !== org.nome ||
    descricao !== (org.descricao ?? "") ||
    icone !== org.icone ||
    cor !== org.cor ||
    logo !== org.logo_url;

  const submeter = async () => {
    if (nome.trim().length < 2) {
      toast.error("Informe o nome do sistema.");
      return;
    }
    try {
      await salvar.mutateAsync({
        id: org.id,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        icone,
        cor,
        logo_url: logo,
      });
      toast.success("Sistema atualizado.");
    } catch {
      toast.error("Não foi possível salvar.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MarcaIcone org={{ nome, icone, logo_url: logo }} className="size-7 rounded-md" />
          Identidade do sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!podeAdministrar && (
          <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            Só administradores podem alterar a identidade deste sistema.
          </p>
        )}
        <fieldset disabled={!podeAdministrar} className="space-y-4 disabled:opacity-60">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-nome">Nome</Label>
              <Input
                id="org-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-desc">Descrição</Label>
              <Input
                id="org-desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Controle e receita do Vôlei 6"
                maxLength={120}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Ícone</Label>
            <EscolherIcone value={icone} onChange={setIcone} />
            <p className="text-xs text-muted-foreground">
              Usado quando não há logo enviada.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Cor do sistema</Label>
            <EscolherCor value={cor} onChange={setCor} />
          </div>

          <div className="space-y-1.5">
            <Label>Logo (opcional)</Label>
            <UploadArquivo
              value={logo}
              onChange={setLogo}
              pasta="marca"
              label="Enviar logo"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={submeter} disabled={!alterado || salvar.isPending}>
              {salvar.isPending && <Loader2 className="size-4 animate-spin" />} Salvar alterações
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmandoExclusao(true)}
            >
              <Trash2 className="size-4" /> Excluir sistema
            </Button>
          </div>
        </fieldset>
      </CardContent>

      <AlertDialog open={confirmandoExclusao} onOpenChange={setConfirmandoExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {org.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Participantes, pagamentos, gastos e receitas deste sistema serão apagados
              definitivamente. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await excluir.mutateAsync(org.id);
                  toast.success("Sistema excluído.");
                } catch {
                  toast.error("Só o dono do sistema pode excluí-lo.");
                }
                setConfirmandoExclusao(false);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* -------------------------------- membros -------------------------------- */

function Membros() {
  const { orgId, org } = useOrg();
  const membros = useMembros(orgId);
  const adicionar = useAdicionarMembro();
  const remover = useRemoverMembro();

  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<PapelMembro>("admin");

  const convidar = async () => {
    if (!orgId || !email.trim()) return;
    try {
      await adicionar.mutateAsync({ orgId, email: email.trim(), papel });
      toast.success("Acesso liberado.");
      setEmail("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível liberar o acesso.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quem tem acesso a {org?.nome}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {(membros.data ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.perfil?.nome || m.perfil?.email || "Conta sem e-mail"}
                </p>
                {m.perfil?.nome && m.perfil.email && (
                  <p className="truncate text-xs text-muted-foreground">{m.perfil.email}</p>
                )}
              </div>
              <Badge variant={m.papel === "dono" ? "default" : "secondary"}>
                {PAPEIS.find((p) => p.value === m.papel)?.label ?? m.papel}
              </Badge>
              {m.papel !== "dono" && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover acesso"
                  onClick={async () => {
                    await remover.mutateAsync(m.id);
                    toast.success("Acesso removido.");
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <Label htmlFor="membro-email">Liberar acesso por e-mail</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="membro-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@email.com"
              className="min-w-[200px] flex-1"
            />
            <Select value={papel} onValueChange={(v) => setPapel(v as PapelMembro)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAPEIS.filter((p) => p.value !== "dono").map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={convidar} disabled={adicionar.isPending || !email.trim()}>
              {adicionar.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              Liberar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            A pessoa precisa já ter criado uma conta com esse e-mail.
          </p>
        </div>
      </CardContent>
    </Card>
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
