import type { Pedido } from "@/lib/tipos";

export type Vendas = {
  pedidos: number;
  faturamento_cents: number;
  ticket_cents: number;
  descontos_cents: number;
  porForma: { forma: string; pedidos: number; total_cents: number }[];
  porTipo: { entrega: number; retirada: number };
  topProdutos: { nome: string; quantidade: number; total_cents: number }[];
  porDia: { dia: string; pedidos: number; total_cents: number }[];
};

/** Agrega pedidos já filtrados por período. Cancelados e PIX sem pagar ficam de fora. */
export function agregarVendas(pedidos: Pedido[], diaLocal: (iso: string) => string): Vendas {
  const validos = pedidos.filter((p) => p.status !== "cancelado" && p.status !== "aguardando_pagamento");
  const fat = validos.reduce((s, p) => s + p.total_cents, 0);
  const forma = new Map<string, { pedidos: number; total_cents: number }>();
  const prod = new Map<string, { quantidade: number; total_cents: number }>();
  const dia = new Map<string, { pedidos: number; total_cents: number }>();
  const tipo = { entrega: 0, retirada: 0 };
  for (const p of validos) {
    const f = forma.get(p.forma_pagamento) ?? { pedidos: 0, total_cents: 0 };
    forma.set(p.forma_pagamento, { pedidos: f.pedidos + 1, total_cents: f.total_cents + p.total_cents });
    tipo[p.tipo] += 1;
    const d = diaLocal(p.criado_em);
    const dd = dia.get(d) ?? { pedidos: 0, total_cents: 0 };
    dia.set(d, { pedidos: dd.pedidos + 1, total_cents: dd.total_cents + p.total_cents });
    for (const i of p.itens) {
      // meio a meio conta para cada sabor (meia unidade cada)
      const nomes = i.nome.startsWith("½ ") ? i.nome.split(" + ").map((n) => n.replace("½ ", "")) : [i.nome];
      for (const n of nomes) {
        const x = prod.get(n) ?? { quantidade: 0, total_cents: 0 };
        const parte = 1 / nomes.length;
        prod.set(n, { quantidade: x.quantidade + i.quantidade * parte, total_cents: x.total_cents + Math.round(i.preco_unit_cents * i.quantidade * parte) });
      }
    }
  }
  return {
    pedidos: validos.length,
    faturamento_cents: fat,
    ticket_cents: validos.length ? Math.round(fat / validos.length) : 0,
    descontos_cents: validos.reduce((s, p) => s + (p.desconto_cents ?? 0), 0),
    porForma: [...forma].map(([f, v]) => ({ forma: f, ...v })).sort((a, b) => b.total_cents - a.total_cents),
    porTipo: tipo,
    topProdutos: [...prod].map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 8),
    porDia: [...dia].map(([d, v]) => ({ dia: d, ...v })).sort((a, b) => a.dia.localeCompare(b.dia)),
  };
}
