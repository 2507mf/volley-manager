import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home,
  Users,
  Wallet,
  Receipt,
  Settings,
  Table,
  Moon,
  Sun,
  LogOut,
  ChevronsUpDown,
  Plus,
  Check,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { OrganizacaoProvider, useOrg } from "@/lib/org";
import { MarcaIcone } from "@/components/marca";
import { NovoSistemaDialog, PrimeiroSistema } from "@/components/sistema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppLayout,
});

const NAV = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/participantes", label: "Participantes", icon: Users },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/pagamentos", label: "Pagamentos", icon: Receipt },
  { to: "/planilha", label: "Planilha", icon: Table },
  { to: "/configuracoes", label: "Config", icon: Settings },
] as const;

function AppLayout() {
  return (
    <OrganizacaoProvider aoFicarSemOrganizacao={<PrimeiroSistema />}>
      <Layout />
    </OrganizacaoProvider>
  );
}

function SeletorSistema() {
  const { org, organizacoes, orgId, trocarOrg, superAdmin } = useOrg();
  const [novoAberto, setNovoAberto] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-accent">
            <MarcaIcone org={org} />
            <span className="font-display truncate text-xl font-bold uppercase tracking-wide">
              {org?.nome ?? "—"}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="flex items-center justify-between">
            Meus sistemas
            {superAdmin && (
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-primary">
                <ShieldCheck className="size-3" /> Super admin
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizacoes.map((o) => (
            <DropdownMenuItem
              key={o.id}
              onSelect={() => trocarOrg(o.id)}
              className="flex items-center gap-2"
            >
              <MarcaIcone org={o} className="size-6 rounded-md" />
              <span className="min-w-0 flex-1 truncate">{o.nome}</span>
              {o.id === orgId && <Check className="size-4 shrink-0 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setNovoAberto(true)}>
            <Plus className="size-4" /> Criar novo sistema
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NovoSistemaDialog open={novoAberto} onOpenChange={setNovoAberto} />
    </>
  );
}

function Layout() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { carregando, orgId } = useOrg();

  const sair = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <SeletorSistema />

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
              >
                {item.label === "Config" ? "Configurações" : item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={sair} aria-label="Sair">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        {carregando || !orgId ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-card/95 backdrop-blur md:hidden",
        )}
      >
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-primary"
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
