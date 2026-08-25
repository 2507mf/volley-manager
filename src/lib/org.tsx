/**
 * Multi-sistema: cada cliente tem a sua organização (uma "pelada"), com dados
 * totalmente isolados por RLS. Um usuário pode pertencer a mais de uma; o super
 * admin enxerga todas.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Anchor,
  Award,
  Bird,
  CircleDot,
  Crown,
  Dumbbell,
  Flame,
  Heart,
  Medal,
  Mountain,
  Rocket,
  Shield,
  Star,
  Sun,
  Swords,
  Target,
  Trophy,
  Users,
  Volleyball,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

/** Nome da plataforma (login, título do navegador). O nome de cada sistema é editável. */
export const NOME_APP = "Vôlei Manager";

export type Organizacao = Tables<"organizacoes">;
export type Membro = Tables<"organizacao_membros">;
export type Perfil = Tables<"perfis">;
export type PapelMembro = Enums<"papel_membro">;

export const PAPEIS: { value: PapelMembro; label: string; descricao: string }[] = [
  { value: "dono", label: "Dono", descricao: "Controle total, inclusive excluir o sistema" },
  { value: "admin", label: "Administrador", descricao: "Cadastra, cobra e lança no caixa" },
  { value: "membro", label: "Membro", descricao: "Acompanha os dados, sem administrar" },
];

/* -------------------------------- ícones ------------------------------- */

export const ICONES: Record<string, LucideIcon> = {
  volleyball: Volleyball,
  trophy: Trophy,
  medal: Medal,
  award: Award,
  crown: Crown,
  shield: Shield,
  star: Star,
  flame: Flame,
  zap: Zap,
  target: Target,
  dumbbell: Dumbbell,
  swords: Swords,
  rocket: Rocket,
  heart: Heart,
  sun: Sun,
  anchor: Anchor,
  bird: Bird,
  mountain: Mountain,
  users: Users,
  circle: CircleDot,
};

export const ICONES_LISTA = Object.keys(ICONES);

export const iconeDe = (nome?: string | null): LucideIcon => ICONES[nome ?? ""] ?? Volleyball;

/* --------------------------------- cores ------------------------------- */
/** Cada tema troca o matiz das variáveis --primary / --chart-1 do tema. */
export const CORES: {
  value: string;
  label: string;
  hue: number;
  chroma: number;
  /** Mesma cor em sRGB, para o PDF (que não entende oklch). */
  hex: string;
}[] = [
  { value: "laranja", label: "Laranja", hue: 45, chroma: 0.19, hex: "#f3680f" },
  { value: "azul", label: "Azul", hue: 253, chroma: 0.16, hex: "#469bf7" },
  { value: "verde", label: "Verde", hue: 152, chroma: 0.16, hex: "#32b364" },
  { value: "vermelho", label: "Vermelho", hue: 25, chroma: 0.19, hex: "#f75d59" },
  { value: "roxo", label: "Roxo", hue: 300, chroma: 0.17, hex: "#a97cf0" },
  { value: "ciano", label: "Ciano", hue: 200, chroma: 0.14, hex: "#00b1ba" },
  { value: "rosa", label: "Rosa", hue: 350, chroma: 0.18, hex: "#e662a8" },
  { value: "amarelo", label: "Amarelo", hue: 85, chroma: 0.17, hex: "#c88d00" },
];

export const corDe = (valor?: string | null) => CORES.find((c) => c.value === valor) ?? CORES[0]!;

/** Amostra da cor para os seletores da tela de configurações. */
export const amostraCor = (valor?: string | null) => {
  const { hue, chroma } = corDe(valor);
  return `oklch(0.68 ${chroma} ${hue})`;
};

function cssDaCor(valor?: string | null) {
  const { hue, chroma } = corDe(valor);
  return [
    `:root{--primary:oklch(0.68 ${chroma} ${hue});--chart-1:oklch(0.68 ${chroma} ${hue});--sidebar-primary:oklch(0.68 ${chroma} ${hue});}`,
    `.dark{--primary:oklch(0.72 ${chroma - 0.01} ${hue});--chart-1:oklch(0.72 ${chroma - 0.01} ${hue});--sidebar-primary:oklch(0.72 ${chroma - 0.01} ${hue});}`,
  ].join("");
}

/* -------------------------------- queries ------------------------------ */

export function usePerfil() {
  return useQuery({
    queryKey: ["perfil"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("perfis")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      // Conta criada antes do trigger existir: cria o perfil na primeira visita.
      return (
        data ?? {
          id: auth.user.id,
          email: auth.user.email ?? null,
          nome: null,
          super_admin: false,
          created_at: "",
        }
      );
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useOrganizacoes() {
  return useQuery({
    queryKey: ["organizacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizacoes").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useCriarOrganizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome: string; icone: string; cor: string }) => {
      const { data, error } = await supabase.rpc("criar_organizacao", {
        p_nome: input.nome,
        p_icone: input.icone,
        p_cor: input.cor,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useSalvarOrganizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Organizacao> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from("organizacoes").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useExcluirOrganizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organizacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useMembros(orgId: string | null) {
  return useQuery({
    queryKey: ["membros", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizacao_membros")
        .select("*")
        .eq("organizacao_id", orgId!);
      if (error) throw error;
      const ids = data.map((m) => m.user_id);
      const { data: perfis } = ids.length
        ? await supabase.from("perfis").select("*").in("id", ids)
        : { data: [] as Perfil[] };
      const mapa = new Map((perfis ?? []).map((p) => [p.id, p]));
      return data.map((m) => ({ ...m, perfil: mapa.get(m.user_id) ?? null }));
    },
  });
}

export function useAdicionarMembro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orgId: string; email: string; papel: PapelMembro }) => {
      const { error } = await supabase.rpc("adicionar_membro", {
        p_org: input.orgId,
        p_email: input.email,
        p_papel: input.papel,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["membros"] }),
  });
}

export function useRemoverMembro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organizacao_membros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["membros"] }),
  });
}

/* -------------------------------- contexto ----------------------------- */

const CHAVE_ORG = "pelada-org";

type OrgContexto = {
  orgId: string | null;
  org: Organizacao | null;
  organizacoes: Organizacao[];
  trocarOrg: (id: string) => void;
  carregando: boolean;
  superAdmin: boolean;
  papel: PapelMembro | null;
  podeAdministrar: boolean;
};

const Ctx = createContext<OrgContexto | null>(null);

export function useOrg() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrg precisa estar dentro de <OrganizacaoProvider>");
  return ctx;
}

/** Atalho para as queries de dados, que só rodam com uma organização escolhida. */
export function useOrgId() {
  return useOrg().orgId;
}

export function OrganizacaoProvider({
  children,
  aoFicarSemOrganizacao,
}: {
  children: ReactNode;
  aoFicarSemOrganizacao: ReactNode;
}) {
  const organizacoes = useOrganizacoes();
  const perfil = usePerfil();
  const qc = useQueryClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [papel, setPapel] = useState<PapelMembro | null>(null);

  const lista = useMemo(() => organizacoes.data ?? [], [organizacoes.data]);

  // Escolhe a organização: a última usada, ou a primeira disponível.
  useEffect(() => {
    if (!lista.length) {
      setOrgId(null);
      return;
    }
    const salva = typeof window !== "undefined" ? localStorage.getItem(CHAVE_ORG) : null;
    const valida = lista.some((o) => o.id === salva) ? salva : null;
    setOrgId((atual) =>
      atual && lista.some((o) => o.id === atual) ? atual : (valida ?? lista[0]!.id),
    );
  }, [lista]);

  // Papel do usuário na organização atual (o super admin administra todas).
  useEffect(() => {
    let cancelado = false;
    if (!orgId) {
      setPapel(null);
      return;
    }
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: m } = await supabase
        .from("organizacao_membros")
        .select("papel")
        .eq("organizacao_id", orgId)
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!cancelado) setPapel(m?.papel ?? null);
    });
    return () => {
      cancelado = true;
    };
  }, [orgId]);

  const org = useMemo(() => lista.find((o) => o.id === orgId) ?? null, [lista, orgId]);

  // Aplica a cor da marca do sistema atual.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "tema-organizacao";
    let tag = document.getElementById(id) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement("style");
      tag.id = id;
      document.head.append(tag);
    }
    tag.textContent = org ? cssDaCor(org.cor) : "";
  }, [org]);

  const trocarOrg = (id: string) => {
    localStorage.setItem(CHAVE_ORG, id);
    setOrgId(id);
    qc.invalidateQueries();
  };

  const superAdmin = perfil.data?.super_admin ?? false;

  const valor: OrgContexto = {
    orgId,
    org,
    organizacoes: lista,
    trocarOrg,
    carregando: organizacoes.isLoading || perfil.isLoading,
    superAdmin,
    papel,
    podeAdministrar: superAdmin || papel === "dono" || papel === "admin",
  };

  if (!organizacoes.isLoading && lista.length === 0) {
    return <Ctx.Provider value={valor}>{aoFicarSemOrganizacao}</Ctx.Provider>;
  }

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
