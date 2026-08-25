import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";

import { carregarLogo, montarPDF, type MarcaPDF, type Relatorio } from "@/lib/pdf";
import { corDe, useOrg } from "@/lib/org";
import { useArquivoUrl } from "@/lib/pelada";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Relatórios abrem numa prévia antes de sair do sistema: às vezes o organizador
 * só quer conferir, não baixar nem mandar para ninguém.
 */
type Ctx = { abrir: (relatorio: Relatorio) => void };

const RelatorioCtx = createContext<Ctx | null>(null);

export function useRelatorio() {
  const ctx = useContext(RelatorioCtx);
  if (!ctx) throw new Error("useRelatorio precisa estar dentro de <RelatorioProvider>");
  return ctx;
}

const nomeArquivo = (nome: string) => (nome.endsWith(".pdf") ? nome : `${nome}.pdf`);

export function RelatorioProvider({ children }: { children: ReactNode }) {
  const { org } = useOrg();
  const { data: logoUrl } = useArquivoUrl(org?.logo_url);
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const logoRef = useRef<{ url: string; logo: MarcaPDF["logo"] } | null>(null);

  // Todo relatório sai com a identidade do sistema em uso.
  useEffect(() => {
    let cancelado = false;
    if (!relatorio) return;

    const gerar = async () => {
      let logo: MarcaPDF["logo"] = null;
      if (logoUrl) {
        if (logoRef.current?.url !== logoUrl) {
          logoRef.current = { url: logoUrl, logo: await carregarLogo(logoUrl) };
        }
        logo = logoRef.current.logo ?? null;
      }
      if (cancelado) return;

      const marca: MarcaPDF = {
        nome: org?.nome ?? "Pelada",
        cor: corDe(org?.cor).hex,
        logo,
      };
      const blob = montarPDF({ ...relatorio, marca }).output("blob") as Blob;
      blobRef.current = blob;
      setUrl((anterior) => {
        if (anterior) URL.revokeObjectURL(anterior);
        return URL.createObjectURL(blob);
      });
    };

    void gerar();
    return () => {
      cancelado = true;
    };
  }, [relatorio, logoUrl, org?.nome, org?.cor]);

  // Solta o blob ao fechar a prévia.
  useEffect(() => {
    if (relatorio) return;
    setUrl((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return null;
    });
    blobRef.current = null;
  }, [relatorio]);

  const baixar = () => {
    if (!blobRef.current || !relatorio) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blobRef.current);
    a.download = nomeArquivo(relatorio.nome);
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const compartilhar = async () => {
    if (!blobRef.current || !relatorio) return;
    const arquivo = new File([blobRef.current], nomeArquivo(relatorio.nome), {
      type: "application/pdf",
    });
    if (navigator.canShare?.({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo], title: relatorio.titulo });
      } catch {
        /* o usuário cancelou o compartilhamento */
      }
      return;
    }
    baixar();
    toast.info("Seu navegador não compartilha arquivos — o PDF foi baixado.");
  };

  return (
    <RelatorioCtx.Provider value={{ abrir: setRelatorio }}>
      {children}

      <Dialog open={!!relatorio} onOpenChange={(o) => !o && setRelatorio(null)}>
        <DialogContent className="flex h-[92vh] max-w-5xl flex-col gap-3 p-4 sm:max-w-5xl">
          <DialogHeader className="flex-row items-center justify-between space-y-0">
            <div className="min-w-0">
              <DialogTitle className="truncate text-base">{relatorio?.titulo}</DialogTitle>
              {relatorio?.subtitulo && (
                <p className="truncate text-xs text-muted-foreground">{relatorio.subtitulo}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 pr-7">
              <Button variant="outline" size="sm" onClick={baixar}>
                <Download className="size-4" /> Baixar
              </Button>
              <Button size="sm" onClick={compartilhar}>
                <Share2 className="size-4" /> Compartilhar
              </Button>
            </div>
          </DialogHeader>

          {url && (
            <iframe
              src={url}
              title={relatorio?.titulo ?? "Relatório"}
              className="min-h-0 flex-1 rounded-lg border bg-white"
            />
          )}
        </DialogContent>
      </Dialog>
    </RelatorioCtx.Provider>
  );
}
