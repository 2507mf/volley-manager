import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Eye, EyeOff, Check } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — VÔLEI 6" },
      { name: "description", content: "Acesse o painel de gestão da sua pelada de vôlei." },
      { property: "og:title", content: "Entrar — VÔLEI 6" },
      { property: "og:description", content: "Acesse o painel de gestão da sua pelada de vôlei." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  senha: z.string().min(6, "A senha precisa de ao menos 6 caracteres").max(72),
});

function nivelSenha(senha: string): { pct: number; label: string; cor: string } {
  let score = 0;
  if (senha.length >= 6) score++;
  if (senha.length >= 10) score++;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) score++;
  if (/\d/.test(senha)) score++;
  if (/[^A-Za-z0-9]/.test(senha)) score++;
  if (score <= 1) return { pct: 33, label: "Fraca", cor: "bg-destructive" };
  if (score <= 3) return { pct: 66, label: "Média", cor: "bg-warning" };
  return { pct: 100, label: "Forte", cor: "bg-success" };
}

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const forca = nivelSenha(senha);
  const requisitos = [
    { ok: senha.length >= 8, txt: "No mínimo 8 caracteres" },
    { ok: /\d/.test(senha), txt: "Pelo menos um número" },
    { ok: /[a-z]/.test(senha) && /[A-Z]/.test(senha), txt: "Maiúsculas e minúsculas" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/inicio" });
    });
  }, [navigate]);

  const submit = async (mode: "login" | "signup") => {
    const parsed = schema.safeParse({ email, senha });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    if (mode === "signup" && (senha.length < 8 || !/\d/.test(senha))) {
      toast.error("Senha fraca: use ao menos 8 caracteres e um número.");
      return;
    }
    setLoading(true);
    const { data, error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.senha })
        : await supabase.auth.signUp({
            email: parsed.data.email,
            password: parsed.data.senha,
            options: { emailRedirectTo: window.location.origin },
          });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    // Após o cadastro, se a confirmação de e-mail estiver desativada, já entra direto.
    // Caso o cadastro não retorne sessão, tenta logar em seguida.
    if (!data.session) {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.senha,
      });
      setLoading(false);
      if (loginError) {
        toast.error("Conta criada, mas é preciso confirmar o e-mail antes de entrar.");
        return;
      }
    } else {
      setLoading(false);
    }
    navigate({ to: "/inicio" });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-5 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src="/logo.png" alt="VÔLEI 6" className="size-24 object-contain" />
        <div>
          <h1 className="text-4xl leading-none">VÔLEI 6</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vôlei, mensalidades e caixa no controle.
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
          </TabsList>

          {(["login", "signup"] as const).map((mode) => (
            <TabsContent key={mode} value={mode} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor={`email-${mode}`}>E-mail</Label>
                <Input
                  id={`email-${mode}`}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="organizador@pelada.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`senha-${mode}`}>Senha</Label>
                <div className="relative">
                  <Input
                    id={`senha-${mode}`}
                    type={mostrarSenha ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {mode === "signup" && (
                  <>
                    {senha.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full transition-all", forca.cor)}
                            style={{ width: `${forca.pct}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs text-muted-foreground">
                          {forca.label}
                        </span>
                      </div>
                    )}
                    <ul className="space-y-1">
                      {requisitos.map((r) => (
                        <li
                          key={r.txt}
                          className={cn(
                            "flex items-center gap-1.5 text-xs",
                            r.ok ? "text-success" : "text-muted-foreground",
                          )}
                        >
                          <Check className={cn("size-3.5", r.ok ? "opacity-100" : "opacity-30")} />
                          {r.txt}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <Button className="w-full" disabled={loading} onClick={() => submit(mode)}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                {mode === "login" ? "Entrar" : "Criar minha conta"}
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </main>
  );
}
