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

/** Identidade do sistema no cabeçalho: logo enviada, ou iniciais na cor da marca. */
export type MarcaPDF = {
  nome: string;
  cor: string;
  logo?: { dataUrl: string; largura: number; altura: number } | null;
};

export type Relatorio = {
  nome: string;
  titulo: string;
  subtitulo?: string;
  paisagem?: boolean;
  secoes: SecaoPDF[];
  marca?: MarcaPDF;
};

const MARGEM = 40;
const TINTA = [17, 17, 17] as const;
const CINZA = [122, 122, 118] as const;
const LINHA = [226, 226, 222] as const;
const ZEBRA = [250, 250, 248] as const;

const hexParaRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

/** Baixa a logo e converte para PNG — jsPDF não aceita URL nem webp. */
export async function carregarLogo(url: string): Promise<MarcaPDF["logo"]> {
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) return null;
    const blob = await resposta.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((ok, erro) => {
        const el = new Image();
        el.onload = () => ok(el);
        el.onerror = erro;
        el.src = objectUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      return {
        dataUrl: canvas.toDataURL("image/png"),
        largura: img.naturalWidth,
        altura: img.naturalHeight,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null; // sem logo o cabeçalho cai nas iniciais
  }
}

/* ------------------------------ cabeçalho ------------------------------ */

const LADO_MARCA = 34;

function desenharMarca(doc: jsPDF, marca: MarcaPDF | undefined, x: number, y: number) {
  if (!marca) return;
  const cor = hexParaRgb(marca.cor);

  if (marca.logo) {
    // Encaixa a logo no quadrado sem distorcer.
    const escala = Math.min(LADO_MARCA / marca.logo.largura, LADO_MARCA / marca.logo.altura);
    const l = marca.logo.largura * escala;
    const a = marca.logo.altura * escala;
    doc.addImage(
      marca.logo.dataUrl,
      "PNG",
      x + (LADO_MARCA - l) / 2,
      y + (LADO_MARCA - a) / 2,
      l,
      a,
    );
    return;
  }

  doc.setFillColor(...cor);
  doc.roundedRect(x, y, LADO_MARCA, LADO_MARCA, 7, 7, "F");
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(255, 255, 255);
  doc.text(iniciais(marca.nome), x + LADO_MARCA / 2, y + LADO_MARCA / 2 + 4.5, {
    align: "center",
  });
}

export function montarPDF({ titulo, subtitulo, paisagem, secoes, marca }: Relatorio) {
  const doc = new jsPDF({
    orientation: paisagem ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const acento = hexParaRgb(marca?.cor ?? "#f3680f");

  /* -------- cabeçalho: marca à esquerda, emissão à direita -------- */
  const topo = MARGEM - 6;
  desenharMarca(doc, marca, MARGEM, topo);

  const textoX = marca ? MARGEM + LADO_MARCA + 12 : MARGEM;
  if (marca) {
    doc
      .setFont("helvetica", "bold")
      .setFontSize(8)
      .setTextColor(...acento);
    doc.text(marca.nome.toUpperCase(), textoX, topo + 10);
  }
  doc
    .setFont("helvetica", "bold")
    .setFontSize(15)
    .setTextColor(...TINTA);
  doc.text(titulo, textoX, topo + (marca ? 25 : 14));
  if (subtitulo) {
    doc
      .setFont("helvetica", "normal")
      .setFontSize(9)
      .setTextColor(...CINZA);
    doc.text(subtitulo, textoX, topo + (marca ? 37 : 27));
  }

  const emitido = new Date().toLocaleDateString("pt-BR", { dateStyle: "long" });
  doc
    .setFont("helvetica", "normal")
    .setFontSize(8)
    .setTextColor(...CINZA);
  doc.text(emitido, largura - MARGEM, topo + 10, { align: "right" });

  let y = topo + LADO_MARCA + 16;
  doc.setDrawColor(...acento).setLineWidth(1.6);
  doc.line(MARGEM, y, largura - MARGEM, y);
  y += 20;

  /* ------------------------------ seções ------------------------------ */
  for (const secao of secoes) {
    if (secao.titulo) {
      if (y > altura - 96) {
        doc.addPage();
        y = MARGEM;
      }
      doc
        .setFont("helvetica", "bold")
        .setFontSize(10.5)
        .setTextColor(...TINTA);
      doc.text(secao.titulo, MARGEM, y);
      y += 10;
    }

    if (secao.linhas.length === 0) {
      doc
        .setFont("helvetica", "italic")
        .setFontSize(9)
        .setTextColor(...CINZA);
      doc.text(secao.vazio ?? "Nenhum lançamento.", MARGEM, y + 10);
      y += 30;
      continue;
    }

    const ultima = secao.linhas.length - 1;
    autoTable(doc, {
      startY: y,
      margin: { left: MARGEM, right: MARGEM, top: MARGEM, bottom: MARGEM + 14 },
      ...(secao.colunas ? { head: [secao.colunas] } : {}),
      body: secao.linhas.map((l) => l.map((c) => String(c))),
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
        textColor: [...TINTA],
        lineColor: [...LINHA],
        lineWidth: { bottom: 0.5 },
        overflow: "linebreak",
      },
      headStyles: {
        fontStyle: "bold",
        fontSize: 7.5,
        textColor: [...CINZA],
        fillColor: false,
        lineColor: [...LINHA],
        lineWidth: { bottom: 1 },
      },
      alternateRowStyles: { fillColor: [...ZEBRA] },
      columnStyles: Object.fromEntries(
        (secao.numericas ?? (secao.colunas ? [] : [1])).map((i) => [i, { halign: "right" }]),
      ),
      didParseCell: (data) => {
        if (data.section === "head") data.cell.text = data.cell.text.map((t) => t.toUpperCase());
        if (secao.totalNoFim && data.section === "body" && data.row.index === ultima) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = false;
          data.cell.styles.lineWidth = { top: 1, bottom: 0 };
          data.cell.styles.lineColor = [...TINTA];
        }
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26;
  }

  /* ------------------------------- rodapé ------------------------------ */
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    const base = altura - MARGEM + 16;
    doc.setDrawColor(...LINHA).setLineWidth(0.5);
    doc.line(MARGEM, base - 12, largura - MARGEM, base - 12);
    doc
      .setFont("helvetica", "normal")
      .setFontSize(7.5)
      .setTextColor(...CINZA);
    doc.text(marca?.nome ?? "", MARGEM, base);
    doc.text(`Página ${i} de ${paginas}`, largura - MARGEM, base, { align: "right" });
  }

  return doc;
}
