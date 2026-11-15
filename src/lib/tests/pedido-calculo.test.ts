import { describe, expect, it } from "vitest";
import { calcularTotais, etapasDoPedido, normalizarTelefone, precoUnitario, proximoStatus, rotuloAcao } from "@/lib/pedido-calculo";
import { dentroDoHorario } from "@/lib/horario";
import { validarCupom } from "@/lib/cupom";
import type { Cupom, Horario } from "@/lib/tipos";
import { deCentavos, formatBRL, paraCentavos } from "@/lib/dinheiro";

describe("dinheiro", () => {
  it("formata centavos em reais", () => {
    expect(formatBRL(4990)).toBe("R$ 49,90");
    expect(formatBRL(0)).toBe("R$ 0,00");
  });
  it("lê valores digitados", () => {
    expect(paraCentavos("49,90")).toBe(4990);
    expect(paraCentavos("R$ 1.049,5")).toBe(104950);
    expect(paraCentavos("abc")).toBeNull();
    expect(deCentavos(4900)).toBe("49,00");
  });
});

describe("pedido", () => {
  it("soma itens e taxa de entrega", () => {
    const t = calcularTotais(
      [
        { preco_unit_cents: 4900, quantidade: 2 },
        { preco_unit_cents: 1400, quantidade: 1 },
      ],
      800,
    );
    expect(t).toEqual({ subtotal_cents: 11200, desconto_cents: 0, taxa_entrega_cents: 800, total_cents: 12000 });
  });

  it("normaliza telefone", () => {
    expect(normalizarTelefone("(11) 91234-5678")).toBe("11912345678");
    expect(normalizarTelefone("+55 11 91234-5678")).toBe("11912345678");
    expect(normalizarTelefone("1234")).toBeNull();
  });

  it("entrega e retirada têm etapas diferentes", () => {
    expect(etapasDoPedido("entrega")).toContain("saiu_para_entrega");
    expect(etapasDoPedido("retirada")).toContain("pronto_retirada");
    expect(etapasDoPedido("retirada")).not.toContain("saiu_para_entrega");
  });

  it("avança o status até o fim e para", () => {
    expect(proximoStatus("entrega", "novo")).toBe("em_preparo");
    expect(proximoStatus("entrega", "em_preparo")).toBe("saiu_para_entrega");
    expect(proximoStatus("retirada", "em_preparo")).toBe("pronto_retirada");
    expect(proximoStatus("entrega", "entregue")).toBeNull();
    expect(proximoStatus("entrega", "cancelado")).toBeNull();
    expect(proximoStatus("entrega", "aguardando_pagamento")).toBeNull();
  });

  it("dá rótulo ao botão da equipe", () => {
    expect(rotuloAcao("entrega", "novo")).toBe("Começar a preparar");
    expect(rotuloAcao("entrega", "em_preparo")).toBe("Saiu para entrega");
    expect(rotuloAcao("entrega", "entregue")).toBeNull();
  });
});

describe("preço do item e totais", () => {
  it("meio a meio cobra o sabor mais caro e soma os extras", () => {
    expect(precoUnitario(5400, 5900, [800, 600])).toBe(5900 + 1400);
    expect(precoUnitario(5400, null, [])).toBe(5400);
  });
  it("desconto nunca passa do subtotal e a entrega não é descontada", () => {
    const t = calcularTotais([{ preco_unit_cents: 5000, quantidade: 2 }], 600, 1000);
    expect(t).toEqual({ subtotal_cents: 10000, desconto_cents: 1000, taxa_entrega_cents: 600, total_cents: 9600 });
    expect(calcularTotais([{ preco_unit_cents: 500, quantidade: 1 }], 0, 9999).total_cents).toBe(0);
  });
});

describe("cupom", () => {
  const base: Cupom = { id: "1", codigo: "X", tipo: "percentual", valor: 10, minimo_cents: 4000, validade: null, usos_max: null, usos: 0, ativo: true };
  it("percentual com mínimo", () => {
    expect(validarCupom(base, 5000, "2026-11-14")).toEqual({ ok: true, desconto_cents: 500 });
    expect(validarCupom(base, 3000, "2026-11-14").ok).toBe(false);
  });
  it("vencido, esgotado e inativo", () => {
    expect(validarCupom({ ...base, validade: "2026-11-13" }, 5000, "2026-11-14").ok).toBe(false);
    expect(validarCupom({ ...base, usos_max: 3, usos: 3 }, 5000, "2026-11-14").ok).toBe(false);
    expect(validarCupom({ ...base, ativo: false }, 5000, "2026-11-14").ok).toBe(false);
    expect(validarCupom(null, 5000, "2026-11-14").ok).toBe(false);
  });
  it("valor fixo limitado ao subtotal", () => {
    expect(validarCupom({ ...base, tipo: "valor", valor: 2000, minimo_cents: 0 }, 1500, "2026-11-14")).toEqual({ ok: true, desconto_cents: 1500 });
  });
});

describe("horário automático", () => {
  // 2026-11-14 é sábado. São Paulo = UTC-3: 21:00 local = 00:00 UTC do dia 15.
  const h = (dia: number, abre: string, fecha: string): Horario => ({ dia_semana: dia, abre, fecha, ativo: true });
  const sabado21h = new Date("2026-11-15T00:00:00Z");
  it("sem o recurso ligado, sempre aberto", () => {
    expect(dentroDoHorario(false, [], sabado21h)).toBe(true);
  });
  it("dentro e fora da janela", () => {
    expect(dentroDoHorario(true, [h(6, "18:00", "23:30")], sabado21h)).toBe(true);
    expect(dentroDoHorario(true, [h(6, "18:00", "20:00")], sabado21h)).toBe(false);
    expect(dentroDoHorario(true, [h(5, "18:00", "23:30")], sabado21h)).toBe(false);
    expect(dentroDoHorario(true, [], sabado21h)).toBe(false);
  });
  it("janela que vira a madrugada vale no dia seguinte", () => {
    const domingo0030 = new Date("2026-11-15T03:30:00Z");
    expect(dentroDoHorario(true, [h(6, "18:00", "01:00")], domingo0030)).toBe(true);
    expect(dentroDoHorario(true, [h(6, "18:00", "00:15")], domingo0030)).toBe(false);
  });
});

import { agregarVendas } from "@/lib/vendas";
import type { Pedido } from "@/lib/tipos";

describe("vendas", () => {
  const base = { desconto_cents: 0, tipo: "entrega", forma_pagamento: "pix_online", criado_em: "2026-11-14T15:00:00Z", itens: [] } as unknown as Pedido;
  const ped = (o: Partial<Pedido>): Pedido => ({ ...base, ...o }) as Pedido;
  it("ignora cancelados e PIX ainda não pago, soma o resto", () => {
    const v = agregarVendas(
      [ped({ total_cents: 5000, status: "entregue" }), ped({ total_cents: 3000, status: "cancelado" }), ped({ total_cents: 9000, status: "aguardando_pagamento" }), ped({ total_cents: 1000, status: "novo", tipo: "retirada" })],
      (iso) => iso.slice(0, 10),
    );
    expect(v.pedidos).toBe(2);
    expect(v.faturamento_cents).toBe(6000);
    expect(v.ticket_cents).toBe(3000);
    expect(v.porTipo).toEqual({ entrega: 1, retirada: 1 });
  });
  it("meio a meio divide a venda entre os dois sabores", () => {
    const item = { id: "1", produto_id: null, nome: "½ Margherita + ½ Calabresa", tamanho: "Grande", quantidade: 2, preco_unit_cents: 6000, observacao: null, extras: [] };
    const v = agregarVendas([ped({ total_cents: 12000, status: "entregue", itens: [item] })], (iso) => iso.slice(0, 10));
    expect(v.topProdutos.map((p) => [p.nome, p.quantidade, p.total_cents])).toEqual([["Margherita", 1, 6000], ["Calabresa", 1, 6000]]);
  });
});
