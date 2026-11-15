import { describe, expect, it } from "vitest";
import { enderecoValido, formatTelefone, linhasDoResumo, nomeValido, primeiroNome, telefoneValido, validarTroco } from "@/lib/chat-pedido";

describe("chat de pedido", () => {
  it("valida nome e telefone", () => {
    expect(nomeValido("Ana")).toBe(true);
    expect(nomeValido("A")).toBe(false);
    expect(nomeValido("12")).toBe(false);
    expect(telefoneValido("(11) 91234-5678")).toBe(true);
    expect(telefoneValido("1234")).toBe(false);
  });
  it("formata telefone enquanto digita", () => {
    expect(formatTelefone("11912345678")).toBe("(11) 91234-5678");
    expect(formatTelefone("1191234")).toBe("(11) 9123-4");
    expect(formatTelefone("")).toBe("");
  });
  it("pega o primeiro nome", () => {
    expect(primeiroNome("  maria clara souza")).toBe("Maria");
  });
  it("exige número no endereço", () => {
    expect(enderecoValido("Rua das Flores, 120")).toBe(true);
    expect(enderecoValido("Rua das Flores")).toBe(false);
  });
  it("valida o troco contra o total", () => {
    expect(validarTroco("100,00", 8500)).toEqual({ ok: true, cents: 10000 });
    expect(validarTroco("50", 8500).ok).toBe(false);
    expect(validarTroco("abc", 8500).ok).toBe(false);
  });
  it("monta linhas do resumo com extras", () => {
    const l = linhasDoResumo([{ chave: "k", tamanhoId: "t", produtoId: "p", nome: "Calabresa", tamanho: "Grande", preco_cents: 7300, extras: [{ id: "e", nome: "Borda de catupiry", preco_cents: 800 }], quantidade: 2 }]);
    expect(l[0]?.[0]).toBe("2× Calabresa (Grande) + Borda de catupiry");
    expect(l[0]?.[1]).toContain("146,00");
  });
});
