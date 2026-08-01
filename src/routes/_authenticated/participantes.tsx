import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import {
  PLANOS,
  useDeleteParticipante,
  useParticipantes,
  useSaveParticipante,
  type Participante,
  type TipoPlano,
} from "@/lib/pelada";
import { brl, formatDate, idade, todayISO, whatsappLink } from "@/lib/format";
import { AvatarParticipante, UploadArquivo } from "@/components/foto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
      { title: "Participantes — VÔLEI 6" },
      { name: "description", content: "Cadastro e gestão dos jogadores da pelada de vôlei." },
      { property: "og:title", content: "Participantes — VÔLEI 6" },
      { property: "og:description", content: "Cadastro e gestão dos jogadores da pelada de vôlei." },
    ],
  }),
  component: Participantes,
});

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(100),
  apelido: z.string().trim().max(50).optional(),
  telefone: z.string().trim().max(25).optional(),
  valor_plano: z.number().min(0).max(100000),
});

type Form = {
  id?: string;
  nome: string;
  apelido: string;
  telefone: string;
  data_nascimento: string;
  tipo_plano: TipoPlano;
  valor_plano: string;
  data_entrada: string;
  status: boolean;
  foto_url: string | null;
};

const vazio = (): Form => ({
  nome: "",
  apelido: "",
  telefone: "",
  data_nascimento: "",
  tipo_plano: "mensalista",
  valor_plano: "",
  data_entrada: todayISO(),
  status: true,
  foto_url: null,
});

function Participantes() {
  const { data, isLoading } = useParticipantes();
  const salvar = useSaveParticipante();
  const excluir = useDeleteParticipante();

  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Form>(vazio());
  const [excluindo, setExcluindo] = useState<Participante | null>(null);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (data ?? []).filter(
      (p) =>
        !termo ||
        p.nome.toLowerCase().includes(termo) ||
        (p.apelido ?? "").toLowerCase().includes(termo),
    );
  }, [data, busca]);

  const abrirNovo = () => {
    setForm(vazio());
    setAberto(true);
  };

  const abrirEdicao = (p: Participante) => {
    setForm({
      id: p.id,
      nome: p.nome,
      apelido: p.apelido ?? "",
      telefone: p.telefone ?? "",
      data_nascimento: p.data_nascimento ?? "",
      tipo_plano: p.tipo_plano,
      valor_plano: String(p.valor_plano ?? ""),
      data_entrada: p.data_entrada,
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
      valor_plano: Number(form.valor_plano || 0),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    try {
      await salvar.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        nome: parsed.data.nome,
        apelido: form.apelido.trim() || null,
        telefone: form.telefone.trim() || null,
        data_nascimento: form.data_nascimento || null,
        tipo_plano: form.tipo_plano,
        valor_plano: parsed.data.valor_plano,
        data_entrada: form.data_entrada || todayISO(),
        status: form.status ? "ativo" : "inativo",
        foto_url: form.foto_url,
      });
      toast.success(form.id ? "Participante atualizado." : "Participante cadastrado!");
      setAberto(false);
    } catch {
      toast.error("Não foi possível salvar.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl leading-none">Participantes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {(data ?? []).filter((p) => p.status === "ativo").length} ativos ·{" "}
            {(data ?? []).length} no total
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
          placeholder="Buscar por nome ou apelido"
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
                      <p className="truncate font-semibold">{p.apelido || p.nome}</p>
                      <Badge variant="outline" className="shrink-0 capitalize">
                        {p.tipo_plano}
                      </Badge>
                      {p.status === "inativo" && <Badge variant="secondary">Inativo</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {brl(Number(p.valor_plano))} ·{" "}
                      {p.data_nascimento
                        ? `${idade(p.data_nascimento)} anos · nasc. ${formatDate(p.data_nascimento)}`
                        : `desde ${formatDate(p.data_entrada)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    {zap && (
                      <Button variant="ghost" size="icon" asChild aria-label="WhatsApp">
                        <a href={zap} target="_blank" rel="noreferrer">
                          <MessageCircle className="size-4 text-success" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => abrirEdicao(p)} aria-label="Editar">
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar participante" : "Novo participante"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                maxLength={100}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="apelido">Apelido</Label>
                <Input
                  id="apelido"
                  value={form.apelido}
                  onChange={(e) => setForm({ ...form, apelido: e.target.value })}
                  maxLength={50}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefone">WhatsApp</Label>
                <Input
                  id="telefone"
                  inputMode="tel"
                  placeholder="(11) 99999-9999"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  maxLength={25}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nascimento">Data de nascimento</Label>
                <Input
                  id="nascimento"
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="entrada">Entrou na pelada em</Label>
                <Input
                  id="entrada"
                  type="date"
                  value={form.data_entrada}
                  onChange={(e) => setForm({ ...form, data_entrada: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Plano</Label>
                <Select
                  value={form.tipo_plano}
                  onValueChange={(v) => setForm({ ...form, tipo_plano: v as TipoPlano })}
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
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valor">Valor do plano (R$)</Label>
                <Input
                  id="valor"
                  inputMode="decimal"
                  value={form.valor_plano}
                  onChange={(e) => setForm({ ...form, valor_plano: e.target.value })}
                  placeholder="60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Foto</Label>
              <UploadArquivo
                value={form.foto_url}
                onChange={(path) => setForm({ ...form, foto_url: path })}
                pasta="fotos"
                label="Adicionar foto"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Participante ativo</p>
                <p className="text-xs text-muted-foreground">
                  Inativos não entram no controle de mensalidades.
                </p>
              </div>
              <Switch
                checked={form.status}
                onCheckedChange={(v) => setForm({ ...form, status: v })}
              />
            </div>
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
              Todos os pagamentos registrados desse participante também serão apagados.
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
