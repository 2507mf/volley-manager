import { useRef, useState } from "react";
import { FileText, ImagePlus, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import { useArquivoUrl, uploadArquivo } from "@/lib/pelada";
import { useOrgId } from "@/lib/org";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ehPDF = (path?: string | null) => !!path && path.toLowerCase().endsWith(".pdf");

/**
 * Miniatura do anexo. Clicar abre o arquivo em tamanho real numa aba nova —
 * vale tanto para imagem quanto para PDF.
 */
export function ArquivoImg({
  path,
  alt,
  className,
}: {
  path?: string | null;
  alt: string;
  className?: string | undefined;
}) {
  const { data: url, isLoading } = useArquivoUrl(path);

  if (!path) return null;
  if (isLoading || !url) {
    return (
      <span className={cn("flex items-center justify-center bg-muted", className)}>
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={`Abrir ${alt}`}
      className={cn(
        "group relative flex items-center justify-center overflow-hidden bg-muted transition-opacity hover:opacity-80",
        className,
      )}
    >
      {ehPDF(path) ? (
        <FileText className="size-5 text-muted-foreground" />
      ) : (
        <img src={url} alt={alt} loading="lazy" className="size-full object-cover" />
      )}
    </a>
  );
}

export function Iniciais({ nome, className }: { nome: string; className?: string | undefined }) {
  const iniciais = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-accent font-display text-base font-bold text-accent-foreground",
        className,
      )}
    >
      {iniciais || "?"}
    </span>
  );
}

export function AvatarParticipante({
  nome,
  foto,
  className,
}: {
  nome: string;
  foto?: string | null;
  className?: string | undefined;
}) {
  const { data: url } = useArquivoUrl(foto);
  if (foto && url) {
    return (
      <img
        src={url}
        alt={nome}
        loading="lazy"
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return <Iniciais nome={nome} className={className} />;
}

export function UploadArquivo({
  value,
  onChange,
  pasta,
  label = "Anexar imagem",
}: {
  value?: string | null;
  onChange: (path: string | null) => void;
  pasta: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const { data: url } = useArquivoUrl(value);
  const orgId = useOrgId();

  const escolher = async (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 10 MB).");
      return;
    }
    setEnviando(true);
    try {
      onChange(await uploadArquivo(file, pasta, orgId));
    } catch {
      toast.error("Não foi possível enviar o arquivo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title="Abrir anexo"
          className="flex size-14 items-center justify-center overflow-hidden rounded-lg border bg-muted transition-opacity hover:opacity-80"
        >
          {ehPDF(value) ? (
            <FileText className="size-6 text-muted-foreground" />
          ) : url ? (
            <img src={url} alt="Prévia" className="size-full object-cover" />
          ) : (
            <Paperclip className="size-5 text-muted-foreground" />
          )}
        </a>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        className="hidden"
        onChange={(e) => escolher(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
      >
        {enviando ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        {value ? "Trocar" : label}
      </Button>
      {value ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
