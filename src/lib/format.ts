export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** "2026-08" */
export const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return `${MESES[Number(m) - 1]} / ${y}`;
};

/** Date-only string "2026-08-01" -> Date at local midnight (avoids TZ shift) */
export const parseDate = (s?: string | null) => {
  if (!s) return null;
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

export const formatDate = (s?: string | null) => {
  const d = parseDate(s);
  return d ? d.toLocaleDateString("pt-BR") : "—";
};

export const formatDayMonth = (s?: string | null) => {
  const d = parseDate(s);
  return d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}` : "—";
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const idade = (nascimento?: string | null) => {
  const d = parseDate(nascimento);
  if (!d) return null;
  const hoje = new Date();
  let a = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) a--;
  return a;
};

export const onlyDigits = (s: string) => s.replace(/\D/g, "");

export const whatsappLink = (telefone?: string | null) => {
  if (!telefone) return null;
  const n = onlyDigits(telefone);
  if (n.length < 10) return null;
  return `https://wa.me/${n.length <= 11 ? "55" + n : n}`;
};
