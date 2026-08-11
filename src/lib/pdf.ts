import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Relatórios em PDF. Uma seção vira uma tabela; sem `colunas`, vira uma lista
 * de duas colunas (rótulo à esquerda, valor à direita) para blocos de resumo.
 */
export type SecaoPDF = {
  titulo?: string;
  colunas?: string[];
  linhas: (string | number)[][];
  /** Índices das colunas numéricas, alinhadas à direita. */
  numericas?: number[];
  /** Destaca a última linha (usado para os totais). */
  totalNoFim?: boolean;
  vazio?: string;
};

const MARGEM = 32;
const TINTA = [23, 23, 23] as const;
const CINZA = [115, 115, 115] as const;
const FUNDO_CABECALHO = [240, 240, 238] as const;

export type Relatorio = {
  nome: string;
  titulo: string;
  subtitulo?: string;
  paisagem?: boolean;
  secoes: SecaoPDF[];
};

export function baixarPDF(relatorio: Relatorio) {
  const doc = montarPDF(relatorio);
  const nome = relatorio.nome;
  doc.save(nome.endsWith(".pdf") ? nome : `${nome}.pdf`);
}

export function montarPDF({ titulo, subtitulo, paisagem, secoes }: Relatorio) {
  const doc = new jsPDF({
    orientation: paisagem ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });
  const largura = doc.internal.pageSize.getWidth();

  doc
    .setFont("helvetica", "bold")
    .setFontSize(16)
    .setTextColor(...TINTA);
  doc.text(titulo, MARGEM, MARGEM + 6);

  let y = MARGEM + 22;
  if (subtitulo) {
    doc
      .setFont("helvetica", "normal")
      .setFontSize(10)
      .setTextColor(...CINZA);
    doc.text(subtitulo, MARGEM, y);
    y += 14;
  }

  doc.setDrawColor(220).setLineWidth(0.8);
  doc.line(MARGEM, y, largura - MARGEM, y);
  y += 12;

  for (const secao of secoes) {
    if (secao.titulo) {
      if (y > doc.internal.pageSize.getHeight() - 90) {
        doc.addPage();
        y = MARGEM;
      }
      doc
        .setFont("helvetica", "bold")
        .setFontSize(11)
        .setTextColor(...TINTA);
      doc.text(secao.titulo, MARGEM, y + 8);
      y += 16;
    }

    if (secao.linhas.length === 0) {
      doc
        .setFont("helvetica", "italic")
        .setFontSize(9)
        .setTextColor(...CINZA);
      doc.text(secao.vazio ?? "Nenhum lançamento.", MARGEM, y + 8);
      y += 24;
      continue;
    }

    const ultima = secao.linhas.length - 1;
    autoTable(doc, {
      startY: y,
      margin: { left: MARGEM, right: MARGEM },
      ...(secao.colunas ? { head: [secao.colunas] } : {}),
      body: secao.linhas.map((l) => l.map((c) => String(c))),
      theme: secao.colunas ? "striped" : "plain",
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4, textColor: [23, 23, 23] },
      headStyles: { fillColor: [...FUNDO_CABECALHO], textColor: [23, 23, 23], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 249] },
      columnStyles: Object.fromEntries(
        (secao.numericas ?? (secao.colunas ? [] : [1])).map((i) => [i, { halign: "right" }]),
      ),
      didParseCell: (data) => {
        if (secao.totalNoFim && data.section === "body" && data.row.index === ultima) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [...FUNDO_CABECALHO];
        }
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  }

  // Rodapé: data de emissão e paginação.
  const emitido = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc
      .setFont("helvetica", "normal")
      .setFontSize(8)
      .setTextColor(...CINZA);
    doc.text(`Emitido em ${emitido}`, MARGEM, doc.internal.pageSize.getHeight() - MARGEM / 2);
    doc.text(
      `${i} de ${paginas}`,
      largura - MARGEM,
      doc.internal.pageSize.getHeight() - MARGEM / 2,
      { align: "right" },
    );
  }

  return doc;
}
