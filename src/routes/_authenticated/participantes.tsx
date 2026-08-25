import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Pencil, Plus, Search, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import {
  PLANOS,
  useDeleteParticipante,
  useParticipantes,
  usePlano,
  useSaveParticipante,
  type Participante,
  type TipoPlano,
} from "@/lib/pelada";
import { brl, todayISO, whatsappLink } from "@/lib/format";
import { AvatarParticipante, UploadArquivo } from "@/components/foto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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

export const Route = createFileRoute("/_authenticated/participantes")({
  head: () => ({
    meta: [
      { title: "Participantes" },
      { name: "description", content: "Cadastro e gestão dos jogadores da pelada de vôlei." },
    ],
  }),
  component: Participantes,
});

const TAMANHOS = ["PP", "P", "M", "G", "GG", "XG"];
const SEM_TAMANHO = "—";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  apelido: z.string().trim().max(50).optional(),
  telefone: z.string().trim().max(25).optional(),
  email: z.string().trim().email("E-mail inválido").max(255).optional(),
});

type Form = {
  id?: string;
  codigo: string;
  nome: string;
  apelido: string;
  telefone: string;
  email: string;
  data_nascimento: string;
  tipo_plano: TipoPlano;
  valorPersonalizado: boolean;
  valor_plano: string;
  data_entrada: string;
  data_saida: string;
  numero: string;
  nome_camisa: string;
  tamanho_camisa: string;
  contato_nome: string;
  contato_telefone: string;
  contato_parentesco: string;
  indicado_por: string;
  status: boolean;
  foto_url: string | null;
};

const vazio = (): Form => ({
  codigo: "",
  nome: "",
  apelido: "",
  telefone: "",
  email: "",
  data_nascimento: "",
  tipo_plano: "mensalista",
  valorPersonalizado: false,
  valor_plano: "",
  data_entrada: todayISO(),
  data_saida: "",
  numero: "",
  nome_camisa: "",
  tamanho_camisa: "",
  contato_nome: "",
  contato_telefone: "",
  contato_parentesco: "",
  indicado_por: "",
  status: true,
  foto_url: null,
});

function Participantes() {
  const { data, isLoading } = useParticipantes();
  const plano = usePlano();
  const salvar = useSaveParticipante();
  const excluir = useDeleteParticipante();

  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Form>(vazio());
  const [excluindo, setExcluindo] = useState<Participante | null>(null);

  const set = <K extends keyof Form>(campo: K, valor: Form[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  /** Novo atleta entra com o próximo código livre — o organizador não digita. */
  const proximoCodigo = useMemo(
    () => Math.max(0, ...(data ?? []).map((p) => p.codigo ?? 0)) + 1,
    [data],
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (data ?? [])
      .filter(
        (p) =>
          !termo ||
          p.nome.toLowerCase().includes(termo) ||
          (p.apelido ?? "").toLowerCase().includes(termo) ||
          String(p.numero ?? "").includes(termo),
      )
      .sort((a, b) =>
        (a.apelido || a.nome).localeCompare(b.apelido || b.nome, "pt-BR", {
          sensitivity: "base",
        }),
      );
  }, [data, busca]);

  const abrirNovo = () => {
    setForm(vazio());
    setAberto(true);
  };

  const abrirEdicao = (p: Participante) => {
    setForm({
      id: p.id,
      codigo: p.codigo != null ? String(p.codigo) : "",
      nome: p.nome,
      apelido: p.apelido ?? "",
      telefone: p.telefone ?? "",
      email: p.email ?? "",
      data_nascimento: p.data_nascimento ?? "",
      tipo_plano: p.tipo_plano,
      valorPersonalizado: p.valor_plano != null,
      valor_plano: p.valor_plano != null ? String(p.valor_plano) : "",
      data_entrada: p.data_entrada,
      data_saida: p.data_saida ?? "",
      numero: p.numero != null ? String(p.numero) : "",
      nome_camisa: p.nome_camisa ?? "",
      tamanho_camisa: p.tamanho_camisa ?? "",
      contato_nome: p.contato_nome ?? "",
      contato_telefone: p.contato_telefone ?? "",
      contato_parentesco: p.contato_parentesco ?? "",
      indicado_por: p.indicado_por ?? "",
      status: p.status === "ativo",
      foto_url: p.foto_url,
    });
    setAberto(true);
  };

  const submeter = async () => {
    const parsed = schema.safeParse({
      nome: form.nome,
      apelido: form.apelido || undefined,
      telefone: form.telefone || undefined,
      email: form.email || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    const personalizado = Number(form.valor_plano.replace(",", "."));
    if (form.valorPersonalizado && (!Number.isFinite(personalizado) || personalizado <= 0)) {
      toast.error("Informe o valor mensal da exceção.");
      return;
    }
    try {
      await salvar.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        codigo: form.codigo.trim() ? Number(form.codigo) : proximoCodigo,
        nome: parsed.data.nome,
        apelido: form.apelido.trim() || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        data_nascimento: form.data_nascimento || null,
        tipo_plano: form.tipo_plano,
        valor_plano: form.valorPersonalizado ? personalizado : null,
        data_entrada: form.data_entrada || todayISO(),
        data_saida: form.data_saida || null,
        numero: form.numero.trim() ? Number(form.numero) : null,
        nome_camisa: form.nome_camisa.trim() || null,
        tamanho_camisa: form.tamanho_camisa || null,
        contato_nome: form.contato_nome.trim() || null,
        contato_telefone: form.contato_telefone.trim() || null,
        contato_parentesco: form.contato_parentesco.trim() || null,
        indicado_por: form.indicado_por.trim() || null,
        status: form.status ? "ativo" : "inativo",
        foto_url: form.foto_url,
      });
      toast.success(form.id ? "Participante atualizado." : "Participante cadastrado!");
      setAberto(false);
    } catch {
      toast.error("Não foi possível salvar.");
    }
  };

  const valorPreview = form.valorPersonalizado
    ? Number(form.valor_plano.replace(",", ".")) || 0
    : form.tipo_plano === "anual"
      ? plano.valorAnual / 12
      : plano.valorMensalista;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl leading-none">Participantes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {(data ?? []).filter((p) => p.status === "ativo").length} ativos · {(data ?? []).length}{" "}
            no total
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus className="size-4" /> Novo
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, apelido ou número"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum participante ainda. Cadastre o primeiro jogador da pelada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lista.map((p) => {
            const zap = whatsappLink(p.telefone);
            return (
              <Card key={p.id} className={p.status === "inativo" ? "opacity-60" : undefined}>
                <CardContent className="flex items-center gap-3 p-4">
                  <AvatarParticipante nome={p.nome} foto={p.foto_url} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {p.numero != null && (
                        <span className="stat-num shrink-0 text-sm text-muted-foreground">
                          {p.numero}
                        </span>
                      )}
                      <p className="truncate font-semibold">{p.apelido || p.nome}</p>
                      <Badge variant="outline" className="shrink-0 capitalize">
                        {p.tipo_plano}
                      </Badge>
                      {p.status === "inativo" && <Badge variant="secondary">Inativo</Badge>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    {zap && (
                      <Button variant="ghost" size="icon" asChild aria-label="WhatsApp">
                        <a href={zap} target="_blank" rel="noreferrer">
                          <MessageCircle className="size-4 text-success" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirEdicao(p)}
                      aria-label="Editar"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExcluindo(p)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar participante" : "Novo participante"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <Secao titulo="Dados pessoais">
              <div className="grid gap-4 sm:grid-cols-6">
                {form.id && (
                  <Campo label="Cód." className="sm:col-span-1">
                    <Input
                      inputMode="numeric"
                      value={form.codigo}
                      onChange={(e) => set("codigo", e.target.value)}
                      maxLength={4}
                    />
                  </Campo>
                )}
                <Campo
                  label="Nome completo *"
                  className={form.id ? "sm:col-span-5" : "sm:col-span-6"}
                >
                  <Input
                    value={form.nome}
                    onChange={(e) => set("nome", e.target.value)}
                    maxLength={120}
                  />
                </Campo>
                <Campo label="Apelido" className="sm:col-span-3">
                  <Input
                    value={form.apelido}
                    onChange={(e) => set("apelido", e.target.value)}
                    placeholder="Como aparece nas listas"
                    maxLength={50}
                  />
                </Campo>
                <Campo label="Data de nascimento" className="sm:col-span-3">
                  <Input
                    type="date"
                    value={form.data_nascimento}
                    onChange={(e) => set("data_nascimento", e.target.value)}
                  />
                </Campo>
                <Campo label="WhatsApp" className="sm:col-span-3">
                  <Input
                    inputMode="tel"
                    placeholder="(81) 99999-9999"
                    value={form.telefone}
                    onChange={(e) => set("telefone", e.target.value)}
                    maxLength={25}
                  />
                </Campo>
                <Campo label="E-mail" className="sm:col-span-3">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    maxLength={255}
                  />
                </Campo>
                <Campo label="Indicado por" className="sm:col-span-6">
                  <Input
                    value={form.indicado_por}
                    onChange={(e) => set("indicado_por", e.target.value)}
                    placeholder="Quem trouxe o atleta para a pelada"
                    maxLength={80}
                  />
                </Campo>
              </div>
            </Secao>

            <Secao titulo="Camisa">
              <div className="grid gap-4 sm:grid-cols-6">
                <Campo label="Número" className="sm:col-span-1">
                  <Input
                    inputMode="numeric"
                    value={form.numero}
                    onChange={(e) => set("numero", e.target.value)}
                    placeholder="7"
                    maxLength={3}
                  />
                </Campo>
                <Campo label="Nome na camisa" className="sm:col-span-3">
                  <Input
                    value={form.nome_camisa}
                    onChange={(e) => set("nome_camisa", e.target.value)}
                    maxLength={30}
                  />
                </Campo>
                <Campo label="Tamanho" className="sm:col-span-2">
                  <Select
                    value={form.tamanho_camisa || SEM_TAMANHO}
                    onValueChange={(v) => set("tamanho_camisa", v === SEM_TAMANHO ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_TAMANHO}>Não informado</SelectItem>
                      {TAMANHOS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Campo>
              </div>
            </Secao>

            <Secao titulo="Contato de emergência">
              <div className="grid gap-4 sm:grid-cols-3">
                <Campo label="Nome">
                  <Input
                    value={form.contato_nome}
                    onChange={(e) => set("contato_nome", e.target.value)}
                    maxLength={80}
                  />
                </Campo>
                <Campo label="Telefone">
                  <Input
                    inputMode="tel"
                    placeholder="(81) 99999-9999"
                    value={form.contato_telefone}
                    onChange={(e) => set("contato_telefone", e.target.value)}
                    maxLength={25}
                  />
                </Campo>
                <Campo label="Parentesco">
                  <Input
                    value={form.contato_parentesco}
                    onChange={(e) => set("contato_parentesco", e.target.value)}
                    placeholder="Esposa, Pai, Irmã…"
                    maxLength={40}
                  />
                </Campo>
              </div>
            </Secao>

            <Secao titulo="Plano e temporada">
              <div className="grid gap-4 sm:grid-cols-3">
                <Campo label="Plano">
                  <Select
                    value={form.tipo_plano}
                    onValueChange={(v) => set("tipo_plano", v as TipoPlano)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLANOS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Campo>
                <Campo label="Entrada na pelada">
                  <Input
                    type="date"
                    value={form.data_entrada}
                    onChange={(e) => set("data_entrada", e.target.value)}
                  />
                </Campo>
                <Campo label="Saída (se saiu)">
                  <Input
                    type="date"
                    value={form.data_saida}
                    onChange={(e) => set("data_saida", e.target.value)}
                  />
                </Campo>
              </div>

              <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                A cobrança é automática: a partir da entrada o atleta é cobrado todo mês, até a data
                de saída. Não é preciso inscrevê-lo mês a mês.
              </p>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">
                    Valor: <span className="stat-num">{brl(valorPreview)}</span> por mês
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {form.valorPersonalizado
                      ? "Exceção só para este atleta."
                      : "Definido no plano do sistema, em Configurações."}
                  </p>
                </div>
                <Switch
                  checked={form.valorPersonalizado}
                  onCheckedChange={(v) => set("valorPersonalizado", v)}
                  aria-label="Usar valor personalizado"
                />
              </div>

              {form.valorPersonalizado && (
                <Campo label="Valor mensal deste atleta (R$)">
                  <Input
                    inputMode="decimal"
                    value={form.valor_plano}
                    onChange={(e) => set("valor_plano", e.target.value)}
                    placeholder="30"
                  />
                </Campo>
              )}

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Ativo na pelada</p>
                  <p className="text-xs text-muted-foreground">
                    Inativos somem das cobranças e da planilha.
                  </p>
                </div>
                <Switch
                  checked={form.status}
                  onCheckedChange={(v) => set("status", v)}
                  aria-label="Ativo"
                />
              </div>
            </Secao>

            <Secao titulo="Foto">
              <UploadArquivo
                value={form.foto_url}
                onChange={(path) => set("foto_url", path)}
                pasta="fotos"
                label="Adicionar foto"
              />
            </Secao>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={submeter} disabled={salvar.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {excluindo?.apelido || excluindo?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os pagamentos registrados desse participante também serão apagados. Se ele
              apenas saiu da pelada, prefira preencher a data de saída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!excluindo) return;
                await excluir.mutateAsync(excluindo.id);
                setExcluindo(null);
                toast.success("Participante excluído.");
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Campo({
  label,
  className,
  children,
}: {
  label: string;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
