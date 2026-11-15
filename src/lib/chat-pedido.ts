import { formatBRL, paraCentavos } from "@/lib/dinheiro";
import type { ItemCarrinho } from "@/lib/carrinho";

/** Funções puras do chat de pedido (testáveis). */

export const soDigitos = (s: string) => s.replace(/\D/g, "");

export function nomeValido(nome: string): boolean {
  const n = nome.trim();
  return n.length >= 2 && n.length <= 80 && /\p{L}{2,}/u.test(n);
}

export function telefoneValido(tel: string): boolean {
  const n = soDigitos(tel).length;
  return n === 10 || n === 11;
}

/** (11) 91234-5678 enquanto a pessoa digita. */
export function formatTelefone(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function primeiroNome(nome: string): string {
  const p = nome.trim().split(/\s+/)[0] ?? "";
  return p ? `${p.charAt(0).toLocaleUpperCase("pt-BR")}${p.slice(1)}` : "";
}

export function enderecoValido(e: string): boolean {
  return e.trim().length >= 5 && /\d/.test(e);
}

/** Troco: precisa ser maior que o total. Devolve o valor em centavos ou uma mensagem de erro. */
export function validarTroco(texto: string, totalCents: number): { ok: true; cents: number } | { ok: false; erro: string } {
  const c = paraCentavos(texto);
  if (c === null) return { ok: false, erro: "Não entendi o valor. Digite assim: 100,00" };
  if (c <= totalCents) return { ok: false, erro: `O troco precisa ser para mais que o total (${formatBRL(totalCents)}).` };
  return { ok: true, cents: c };
}

/** Linhas do resumo do pedido: "1× Calabresa (Grande)" → "R$ 57,00", com extras e observação. */
export function linhasDoResumo(itens: ItemCarrinho[]): [string, string][] {
  return itens.map((i) => {
    const extras = i.extras.length ? ` + ${i.extras.map((x) => x.nome).join(", ")}` : "";
    return [`${i.quantidade}× ${i.nome} (${i.tamanho})${extras}`, formatBRL(i.preco_cents * i.quantidade)];
  });
}

export const ATRASO_MENSAGEM_MS = 650;
