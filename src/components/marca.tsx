import { useArquivoUrl } from "@/lib/pelada";
import { iconeDe, type Organizacao } from "@/lib/org";
import { cn } from "@/lib/utils";

/**
 * Identidade visual do sistema: logo enviada pelo cliente, ou o ícone escolhido
 * nas configurações. Usada no cabeçalho, no seletor de sistemas e no login.
 */
export function MarcaIcone({
  org,
  className,
}: {
  org: Pick<Organizacao, "icone" | "logo_url" | "nome"> | null;
  className?: string | undefined;
}) {
  const { data: url } = useArquivoUrl(org?.logo_url);
  const Icone = iconeDe(org?.icone);

  if (org?.logo_url && url) {
    return (
      <img src={url} alt={org.nome} className={cn("size-9 rounded-lg object-contain", className)} />
    );
  }
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary",
        className,
      )}
    >
      <Icone className="size-[62%]" />
    </span>
  );
}

export function Marca({
  org,
  className,
}: {
  org: Pick<Organizacao, "icone" | "logo_url" | "nome"> | null;
  className?: string | undefined;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <MarcaIcone org={org} />
      <span className="font-display truncate text-xl font-bold uppercase tracking-wide">
        {org?.nome ?? "Pelada"}
      </span>
    </span>
  );
}
