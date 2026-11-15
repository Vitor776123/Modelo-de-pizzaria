import type { Cupom } from "@/lib/tipos";
import { formatBRL } from "@/lib/dinheiro";

export type ResultadoCupom = { ok: true; desconto_cents: number } | { ok: false; erro: string };

export function normalizarCodigo(texto: string): string {
  return texto.trim().toUpperCase().replace(/\s+/g, "");
}

/** `hoje` no formato AAAA-MM-DD (data local de São Paulo). */
export function validarCupom(c: Cupom | null, subtotalCents: number, hoje: string): ResultadoCupom {
  if (!c || !c.ativo) return { ok: false, erro: "Cupom inválido." };
  if (c.validade && c.validade < hoje) return { ok: false, erro: "Este cupom já venceu." };
  if (c.usos_max !== null && c.usos >= c.usos_max) return { ok: false, erro: "Este cupom já foi usado o máximo de vezes." };
  if (subtotalCents < c.minimo_cents) return { ok: false, erro: `Este cupom vale para pedidos a partir de ${formatBRL(c.minimo_cents)}.` };
  const bruto = c.tipo === "percentual" ? Math.floor((subtotalCents * c.valor) / 100) : c.valor;
  return { ok: true, desconto_cents: Math.min(bruto, subtotalCents) };
}

export function dataLocalSP(data: Date = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(data);
  return p; // en-CA já devolve AAAA-MM-DD
}
