import type { StatusPedido, TipoPedido } from "@/lib/tipos";

/** Telefone só com dígitos, sem o 55 na frente. Devolve null se não parecer um celular/fixo brasileiro. */
export function normalizarTelefone(texto: string): string | null {
  let d = texto.replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : null;
}

export function calcularTotais(itens: { preco_unit_cents: number; quantidade: number }[], taxaEntregaCents: number, descontoCents = 0) {
  const subtotal = itens.reduce((s, i) => s + i.preco_unit_cents * i.quantidade, 0);
  const desconto = Math.min(Math.max(descontoCents, 0), subtotal);
  return { subtotal_cents: subtotal, desconto_cents: desconto, taxa_entrega_cents: taxaEntregaCents, total_cents: subtotal - desconto + taxaEntregaCents };
}

/** Preço de uma unidade: meio a meio cobra o sabor mais caro; borda e adicionais somam. */
export function precoUnitario(baseCents: number, segundoSaborCents: number | null, extrasCents: number[]): number {
  return Math.max(baseCents, segundoSaborCents ?? 0) + extrasCents.reduce((s, v) => s + v, 0);
}

/** Etapas que o cliente acompanha, na ordem (estilo iFood). */
export function etapasDoPedido(tipo: TipoPedido): StatusPedido[] {
  return tipo === "entrega"
    ? ["novo", "em_preparo", "saiu_para_entrega", "entregue"]
    : ["novo", "em_preparo", "pronto_retirada", "entregue"];
}

/** Próximo passo que a equipe aperta no painel. Null quando não há mais nada a fazer. */
export function proximoStatus(tipo: TipoPedido, atual: StatusPedido): StatusPedido | null {
  if (atual === "aguardando_pagamento" || atual === "cancelado" || atual === "entregue") return null;
  const etapas = etapasDoPedido(tipo);
  const i = etapas.indexOf(atual);
  return i >= 0 && i < etapas.length - 1 ? etapas[i + 1] : null;
}

export const ROTULO_ACAO: Record<StatusPedido, string> = {
  aguardando_pagamento: "Confirmar pagamento",
  novo: "Aceitar pedido",
  em_preparo: "Começar a preparar",
  saiu_para_entrega: "Saiu para entrega",
  pronto_retirada: "Pronto para retirar",
  entregue: "Marcar como entregue",
  cancelado: "Cancelar",
};

/** Texto do botão da equipe para ir ao próximo passo (o rótulo descreve o que vai acontecer). */
export function rotuloAcao(tipo: TipoPedido, atual: StatusPedido): string | null {
  const prox = proximoStatus(tipo, atual);
  return prox ? (prox === "em_preparo" ? "Começar a preparar" : ROTULO_ACAO[prox]) : null;
}

/** Aviso enviado ao cliente quando o pedido muda de etapa. */
export function avisoDoStatus(numero: number, status: StatusPedido): { titulo: string; corpo: string } | null {
  switch (status) {
    case "novo":
      return { titulo: `Pedido #${numero} recebido`, corpo: "A pizzaria recebeu o seu pedido." };
    case "em_preparo":
      return { titulo: `Pedido #${numero} em preparo`, corpo: "Sua pizza já está indo para o forno." };
    case "saiu_para_entrega":
      return { titulo: `Pedido #${numero} saiu para entrega`, corpo: "O entregador está a caminho." };
    case "pronto_retirada":
      return { titulo: `Pedido #${numero} pronto`, corpo: "Pode vir buscar o seu pedido." };
    case "entregue":
      return { titulo: `Pedido #${numero} entregue`, corpo: "Bom apetite!" };
    case "cancelado":
      return { titulo: `Pedido #${numero} cancelado`, corpo: "Seu pedido foi cancelado. Fale com a pizzaria se precisar." };
    default:
      return null;
  }
}
