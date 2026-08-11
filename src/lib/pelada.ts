import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg, useOrgId } from "@/lib/org";
import { planoDaOrg } from "@/lib/status";
import type { Tables, TablesInsert, Enums } from "@/integrations/supabase/types";

export type Participante = Tables<"participantes">;
export type Pagamento = Tables<"pagamentos">;
export type Gasto = Tables<"gastos">;
export type Receita = Tables<"receitas">;
export type TipoPlano = Enums<"tipo_plano">;
export type FormaPagamento = Enums<"forma_pagamento">;
export type CategoriaGasto = string;

// Categorias fiéis ao fluxo de caixa da planilha, mais as clássicas da pelada.
// A coluna é texto livre: o organizador pode criar as suas no Financeiro.
export const CATEGORIAS_GASTO: { value: CategoriaGasto; label: string }[] = [
  { value: "quadra", label: "Aluguel de quadra" },
  { value: "energia_agua", label: "Energia / Água" },
  { value: "manutencao", label: "Manutenções" },
  { value: "novos_equipamentos", label: "Novos equipamentos" },
  { value: "fornecedores", label: "Fornecedores" },
  { value: "material", label: "Bolas e material esportivo" },
  { value: "uniformes", label: "Coletes / uniformes" },
  { value: "agua_gelo", label: "Água / gelo" },
  { value: "confraternizacao", label: "Confraternizações / eventos" },
  { value: "taxa_extra_confra", label: "Taxa extra confraternização" },
  { value: "torneio", label: "Torneio" },
  { value: "servico", label: "Serviço" },
  { value: "outros", label: "Outros" },
];

export const CATEGORIAS_RECEITA = [
  "Resíduo do ano anterior",
  "Ressarcimento",
  "Venda de camisa",
  "Rifa",
  "Convidado / avulso",
  "Doação",
  "Patrocínio",
  "Torneio",
  "Outros",
];

/** Entradas de mensalidade e anuidade não são lançadas à mão: vêm dos pagamentos. */
export const CATEGORIA_ANUIDADE = "Anuidade";
export const CATEGORIA_MENSALIDADE = "Mensalidade";

export const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
];

export const PLANOS: { value: TipoPlano; label: string }[] = [
  { value: "mensalista", label: "Mensalista" },
  { value: "anual", label: "Anual" },
  { value: "avulso", label: "Avulso" },
];

export const labelCategoriaGasto = (c: CategoriaGasto) =>
  CATEGORIAS_GASTO.find((x) => x.value === c)?.label ?? c;

/** Valores e vencimento configurados para o sistema atual. */
export function usePlano() {
  const { org } = useOrg();
  return planoDaOrg(org);
}

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

/** Toda escrita carimba a organização atual; sem ela, nada é gravado. */
function exigirOrg(orgId: string | null): string {
  if (!orgId) throw new Error("Nenhum sistema selecionado.");
  return orgId;
}

/* ---------------------------- participantes ---------------------------- */

export function useParticipantes() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["participantes", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("participantes")
        .select("*")
        .eq("organizacao_id", orgId!)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveParticipante() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (input: Partial<Participante> & { nome: string }) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await supabase.from("participantes").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const payload = {
          ...rest,
          user_id: await uid(),
          organizacao_id: exigirOrg(orgId),
        } as TablesInsert<"participantes">;
        const { error } = await supabase.from("participantes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteParticipante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("participantes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* ------------------------------ pagamentos ----------------------------- */

export function usePagamentos() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["pagamentos", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("*")
        .eq("organizacao_id", orgId!)
        .order("data_pagamento", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSavePagamento() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"pagamentos">, "user_id" | "organizacao_id">) => {
      const { error } = await supabase
        .from("pagamentos")
        .upsert(
          { ...input, user_id: await uid(), organizacao_id: exigirOrg(orgId) },
          { onConflict: "organizacao_id,participante_id,referencia" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeletePagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pagamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* ------------------------------- gastos ------------------------------- */

export function useGastos() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["gastos", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gastos")
        .select("*")
        .eq("organizacao_id", orgId!)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveGasto() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (input: Partial<Gasto> & { descricao: string; valor: number }) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await supabase.from("gastos").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gastos").insert({
          ...rest,
          user_id: await uid(),
          organizacao_id: exigirOrg(orgId),
        } as TablesInsert<"gastos">);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gastos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* ------------------------------- receitas ------------------------------ */

export function useReceitas() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["receitas", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receitas")
        .select("*")
        .eq("organizacao_id", orgId!)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveReceita() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (input: Partial<Receita> & { descricao: string; valor: number }) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await supabase.from("receitas").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("receitas").insert({
          ...rest,
          user_id: await uid(),
          organizacao_id: exigirOrg(orgId),
        } as TablesInsert<"receitas">);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("receitas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* ------------------------------ arquivos ------------------------------- */

/** Arquivos ficam sob a pasta da organização — é assim que a RLS do storage isola. */
export async function uploadArquivo(file: File, pasta: string, orgId: string | null) {
  const org = exigirOrg(orgId);
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${org}/${pasta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("pelada").upload(path, file);
  if (error) throw error;
  return path;
}

export function useArquivoUrl(path?: string | null) {
  return useQuery({
    queryKey: ["arquivo", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("pelada").createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
