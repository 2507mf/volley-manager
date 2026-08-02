import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, Enums } from "@/integrations/supabase/types";

export type Participante = Tables<"participantes">;
export type Pagamento = Tables<"pagamentos">;
export type Gasto = Tables<"gastos">;
export type Receita = Tables<"receitas">;
export type Inscricao = Tables<"inscricoes_mensais">;
export type TipoPlano = Enums<"tipo_plano">;
export type FormaPagamento = Enums<"forma_pagamento">;
export type CategoriaGasto = string;

export const CATEGORIAS_GASTO: { value: CategoriaGasto; label: string }[] = [
  { value: "quadra", label: "Aluguel de quadra" },
  { value: "material", label: "Bolas e material esportivo" },
  { value: "uniformes", label: "Coletes / uniformes" },
  { value: "agua_gelo", label: "Água / gelo" },
  { value: "confraternizacao", label: "Confraternizações / eventos" },
  { value: "manutencao", label: "Manutenção de equipamento" },
  { value: "outros", label: "Outros" },
];

export const CATEGORIAS_RECEITA = [
  "Venda de camisa",
  "Rifa",
  "Convidado / avulso",
  "Doação",
  "Patrocínio",
  "Outros",
];

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

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

/* ---------------------------- participantes ---------------------------- */

export function useParticipantes() {
  return useQuery({
    queryKey: ["participantes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("participantes")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveParticipante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Participante> & { nome: string }) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await supabase.from("participantes").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const payload = { ...rest, user_id: await uid() } as TablesInsert<"participantes">;
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
  return useQuery({
    queryKey: ["pagamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("*")
        .order("data_pagamento", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSavePagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"pagamentos">, "user_id">) => {
      const { error } = await supabase
        .from("pagamentos")
        .upsert({ ...input, user_id: await uid() }, { onConflict: "participante_id,referencia" });
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

/* -------------------------- inscrições mensais ------------------------- */

export function useInscricoes() {
  return useQuery({
    queryKey: ["inscricoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inscricoes_mensais").select("*");
      if (error) throw error;
      return data;
    },
  });
}

export function useInscricoesAno(ano: number) {
  return useQuery({
    queryKey: ["inscricoes", "ano", ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes_mensais")
        .select("*")
        .like("referencia", `${ano}-%`);
      if (error) throw error;
      return data;
    },
  });
}

export function useAddInscricoes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { participanteIds: string[]; referencia: string }) => {
      const userId = await uid();
      const rows = input.participanteIds.map((participante_id) => ({
        user_id: userId,
        participante_id,
        referencia: input.referencia,
      }));
      const { error } = await supabase
        .from("inscricoes_mensais")
        .upsert(rows, { onConflict: "participante_id,referencia" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useRemoveInscricao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inscricoes_mensais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* -------------------------------- gastos ------------------------------- */

export function useGastos() {
  return useQuery({
    queryKey: ["gastos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gastos")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Gasto> & { descricao: string; valor: number }) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await supabase.from("gastos").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("gastos")
          .insert({ ...rest, user_id: await uid() } as TablesInsert<"gastos">);
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
  return useQuery({
    queryKey: ["receitas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receitas")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Receita> & { descricao: string; valor: number }) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await supabase.from("receitas").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("receitas")
          .insert({ ...rest, user_id: await uid() } as TablesInsert<"receitas">);
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

export async function uploadArquivo(file: File, pasta: string) {
  const userId = await uid();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${pasta}/${crypto.randomUUID()}.${ext}`;
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
      const { data, error } = await supabase.storage
        .from("pelada")
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
