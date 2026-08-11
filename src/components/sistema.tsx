import { useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { CORES, ICONES, ICONES_LISTA, amostraCor, useCriarOrganizacao, useOrg } from "@/lib/org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* --------------------------- seletores de marca ------------------------- */

export function EscolherIcone({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-10 gap-1.5">
      {ICONES_LISTA.map((nome) => {
        const Icone = ICONES[nome]!;
        const ativo = value === nome;
        return (
          <button
            key={nome}
            type="button"
            aria-label={`Ícone ${nome}`}
            aria-pressed={ativo}
            onClick={() => onChange(nome)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg border transition-colors",
              ativo
                ? "border-primary bg-primary/12 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icone className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

export function EscolherCor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CORES.map((c) => {
        const ativo = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            aria-label={`Cor ${c.label}`}
            aria-pressed={ativo}
            onClick={() => onChange(c.value)}
            style={{ backgroundColor: amostraCor(c.value) }}
            className={cn(
              "flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-all",
              ativo && "ring-2 ring-foreground",
            )}
          >
            {ativo && <Check className="size-4 text-white drop-shadow" />}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------- criar um sistema -------------------------- */

function useCriar(aoCriar?: () => void) {
  const criar = useCriarOrganizacao();
  const { trocarOrg } = useOrg();
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState("volleyball");
  const [cor, setCor] = useState("laranja");

  const submeter = async () => {
    if (nome.trim().length < 2) {
      toast.error("Dê um nome ao sistema.");
      return;
    }
    try {
      const id = await criar.mutateAsync({ nome: nome.trim(), icone, cor });
      trocarOrg(id);
      toast.success("Sistema criado!");
      setNome("");
      aoCriar?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar o sistema.");
    }
  };

  return { nome, setNome, icone, setIcone, cor, setCor, submeter, criando: criar.isPending };
}

function CamposSistema({
  form,
  idPrefixo,
}: {
  form: ReturnType<typeof useCriar>;
  idPrefixo: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefixo}-nome`}>Nome do sistema</Label>
        <Input
          id={`${idPrefixo}-nome`}
          value={form.nome}
          onChange={(e) => form.setNome(e.target.value)}
          placeholder="VÔLEI 6, Quadra do José…"
          maxLength={60}
        />
        <p className="text-xs text-muted-foreground">
          É o nome que aparece no topo do app e nos relatórios.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Ícone</Label>
        <EscolherIcone value={form.icone} onChange={form.setIcone} />
      </div>
      <div className="space-y-1.5">
        <Label>Cor</Label>
        <EscolherCor value={form.cor} onChange={form.setCor} />
      </div>
    </div>
  );
}

export function NovoSistemaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const form = useCriar(() => onOpenChange(false));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo sistema</DialogTitle>
          <DialogDescription>
            Cada sistema tem participantes, pagamentos e caixa totalmente separados.
          </DialogDescription>
        </DialogHeader>
        <CamposSistema form={form} idPrefixo="novo" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={form.submeter} disabled={form.criando}>
            {form.criando && <Loader2 className="size-4 animate-spin" />} Criar sistema
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Tela de quem entrou e ainda não tem nenhum sistema. */
export function PrimeiroSistema() {
  const form = useCriar();
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-3xl leading-none">Crie o seu sistema</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Um sistema é a sua pelada: participantes, mensalidades e caixa em um lugar só, visíveis
            apenas para quem você autorizar.
          </p>
        </div>
        <CamposSistema form={form} idPrefixo="primeiro" />
        <Button className="w-full" onClick={form.submeter} disabled={form.criando}>
          {form.criando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Criar sistema
        </Button>
      </div>
    </main>
  );
}
