import { CalendarDays, ExternalLink, Paperclip, Tag, User } from "lucide-react";
import type { ReactNode } from "react";

import { useArquivoUrl, labelCategoriaGasto, type Gasto } from "@/lib/pelada";
import { brl, formatDate } from "@/lib/format";
import { ehPDF } from "@/components/foto";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Detalhe de uma saída, com o comprovante em tamanho de leitura. */
export function DetalheGasto({ gasto, onFechar }: { gasto: Gasto | null; onFechar: () => void }) {
  const { data: url, isLoading } = useArquivoUrl(gasto?.comprovante_url);
  const anexo = gasto?.comprovante_url ?? null;
  const pdf = ehPDF(anexo);

  return (
    <Dialog open={!!gasto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle className="text-lg">{gasto?.descricao}</DialogTitle>
          <p className="stat-num text-2xl font-bold text-destructive">
            -{brl(Number(gasto?.valor ?? 0))}
          </p>
        </DialogHeader>

        <dl className="space-y-2 rounded-lg border p-3 text-sm">
          <Info icone={<CalendarDays className="size-4" />} rotulo="Data">
            {formatDate(gasto?.data)}
          </Info>
          <Info icone={<Tag className="size-4" />} rotulo="Categoria">
            {gasto ? labelCategoriaGasto(gasto.categoria) : "—"}
          </Info>
          <Info icone={<User className="size-4" />} rotulo="Responsável">
            {gasto?.responsavel || "—"}
          </Info>
          <Info icone={<Paperclip className="size-4" />} rotulo="Lançado em">
            {gasto?.created_at ? formatDate(gasto.created_at.slice(0, 10)) : "—"}
          </Info>
        </dl>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Comprovante
          </p>

          {!anexo ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum comprovante anexado. Use o lápis para editar a saída e anexar.
            </p>
          ) : isLoading || !url ? (
            <div className="h-56 animate-pulse rounded-lg border bg-muted" />
          ) : pdf ? (
            <iframe src={url} title="Comprovante" className="h-72 w-full rounded-lg border" />
          ) : (
            <a href={url} target="_blank" rel="noreferrer" title="Abrir em tamanho real">
              <img
                src={url}
                alt="Comprovante"
                className="max-h-72 w-full rounded-lg border object-contain"
              />
            </a>
          )}
        </div>

        <DialogFooter>
          {anexo && url && (
            <Button variant="outline" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> Abrir anexo
              </a>
            </Button>
          )}
          <Button onClick={onFechar}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({
  icone,
  rotulo,
  children,
}: {
  icone: ReactNode;
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icone}</span>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="ml-auto text-right font-medium">{children}</dd>
    </div>
  );
}
