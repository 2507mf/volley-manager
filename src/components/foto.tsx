import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { useArquivoUrl, uploadArquivo } from "@/lib/pelada";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ArquivoImg({
  path,
  alt,
  className,
}: {
  path?: string | null;
  alt: string;
  className?: string | undefined;
}) {
  const { data: url } = useArquivoUrl(path);
  if (!url) return null;
  return <img src={url} alt={alt} loading="lazy" className={className} />;
}

export function Iniciais({ nome, className }: { nome: string; className?: string }) {
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

  const escolher = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5 MB).");
      return;
    }
    setEnviando(true);
    try {
      onChange(await uploadArquivo(file, pasta));
    } catch {
      toast.error("Não foi possível enviar a imagem.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {value && url ? (
        <img src={url} alt="Prévia" className="size-14 rounded-lg border object-cover" />
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
