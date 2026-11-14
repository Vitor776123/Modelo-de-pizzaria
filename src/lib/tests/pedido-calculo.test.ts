import { describe, expect, it } from "vitest";
import { calcularTotais, etapasDoPedido, normalizarTelefone, proximoStatus, rotuloAcao } from "@/lib/pedido-calculo";
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
    expect(t).toEqual({ subtotal_cents: 11200, taxa_entrega_cents: 800, total_cents: 12000 });
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
