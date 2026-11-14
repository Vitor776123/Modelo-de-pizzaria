"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/admin";
import { membroOuErro } from "@/lib/auth";
import { mudarStatus, marcarPago } from "@/lib/pedidos";
import { proximoStatus } from "@/lib/pedido-calculo";
import type { StatusPedido, TipoPedido } from "@/lib/tipos";

export type Resp = { ok: true } | { ok: false; erro: string };

async function rodar(fn: () => Promise<void>): Promise<Resp> {
  try {
    await fn();
    revalidatePath("/painel", "layout");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Algo deu errado." };
  }
}

export async function avancarPedido(pedidoId: string): Promise<Resp> {
  return rodar(async () => {
    await membroOuErro();
    const { data } = await db().from("pedidos").select("status, tipo").eq("id", pedidoId).single();
    if (!data) throw new Error("Pedido não encontrado.");
    const prox = proximoStatus(data.tipo as TipoPedido, data.status as StatusPedido);
    if (!prox) throw new Error("Este pedido já está na última etapa.");
    await mudarStatus(pedidoId, prox);
  });
}

export async function cancelarPedido(pedidoId: string): Promise<Resp> {
  return rodar(async () => {
    await membroOuErro();
    await mudarStatus(pedidoId, "cancelado");
  });
}

export async function confirmarPixManual(pedidoId: string): Promise<Resp> {
  return rodar(async () => {
    await membroOuErro();
    await marcarPago(pedidoId);
  });
}

export async function alternarAberto(aberto: boolean): Promise<Resp> {
  return rodar(async () => {
    await membroOuErro();
    const { error } = await db().from("configuracoes").update({ aberto }).eq("id", true);
    if (error) throw new Error("Não foi possível mudar o estado da loja.");
  });
}
