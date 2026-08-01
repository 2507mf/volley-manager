import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { Home, Users, Wallet, Receipt, Settings, Volleyball, Moon, Sun, LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

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
  { to: "/configuracoes", label: "Config", icon: Settings },
] as const;

function AppLayout() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const sair = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/inicio" className="flex items-center gap-2">
            <span className="court-stripe flex size-9 items-center justify-center rounded-lg">
              <Volleyball className="size-5 text-primary-foreground" />
            </span>
            <span className="font-display text-xl font-bold uppercase tracking-wide">
              VÔLEI 6
            </span>
          </Link>

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
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 backdrop-blur md:hidden">
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
