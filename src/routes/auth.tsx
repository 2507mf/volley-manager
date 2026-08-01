import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

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

  const google = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
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
                <Input
                  id={`senha-${mode}`}
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••"
                />
              </div>
              <Button className="w-full" disabled={loading} onClick={() => submit(mode)}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                {mode === "login" ? "Entrar" : "Criar minha conta"}
              </Button>
            </TabsContent>
          ))}
        </Tabs>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" disabled={loading} onClick={google}>
          Continuar com o Google
        </Button>
      </div>
    </main>
  );
}
