import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";

import { montarPDF, type Relatorio } from "@/lib/pdf";
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
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    if (!relatorio) return;
    const blob = montarPDF(relatorio).output("blob") as Blob;
    blobRef.current = blob;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      blobRef.current = null;
    };
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
