const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Preços ficam sempre em centavos (inteiros); só viram "R$ 49,00" na hora de mostrar. */
export function formatBRL(cents: number): string {
  return fmt.format(cents / 100).replace(/ /g, " ");
}

/** "49,90" ou "49.90" → 4990. Devolve null se não for um valor válido. */
export function paraCentavos(texto: string): number | null {
  let t = texto.trim().replace(/[R$\s]/g, "");
  // Com vírgula, os pontos são separador de milhar ("1.249,90"); sem vírgula, o ponto é decimal ("49.90").
  t = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

/** 4990 → "49,90" (para preencher campos de formulário). */
export function deCentavos(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
