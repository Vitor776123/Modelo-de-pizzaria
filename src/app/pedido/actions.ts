"use server";

import { criarPedido, type EntradaPedido, type RespPedido } from "@/lib/pedidos";

/** O navegador manda só o que o cliente escolheu; preço, taxa e total são recalculados no servidor. */
export async function finalizarPedido(entrada: EntradaPedido): Promise<RespPedido> {
  try {
    return await criarPedido(entrada);
  } catch (e) {
    console.error("[finalizarPedido]", e);
    return { ok: false, erro: "Não foi possível enviar o pedido agora. Tente novamente em instantes." };
  }
}
