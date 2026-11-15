"use server";

import { criarPedido, type EntradaPedido, type RespPedido } from "@/lib/pedidos";
import { db } from "@/lib/supabase/admin";
import { dataLocalSP, normalizarCodigo, validarCupom } from "@/lib/cupom";
import type { Cupom } from "@/lib/tipos";

/** Só para mostrar o desconto no checkout; ao enviar o pedido o servidor confere tudo de novo. */
export async function conferirCupom(codigo: string, subtotalCents: number): Promise<{ ok: true; codigo: string; desconto_cents: number } | { ok: false; erro: string }> {
  const c = normalizarCodigo(codigo);
  if (!c) return { ok: false, erro: "Digite o código do cupom." };
  const { data } = await db().from("cupons").select("*").eq("codigo", c).maybeSingle();
  const r = validarCupom((data as Cupom | null) ?? null, subtotalCents, dataLocalSP());
  return r.ok ? { ok: true, codigo: c, desconto_cents: r.desconto_cents } : r;
}

/** O navegador manda só o que o cliente escolheu; preço, taxa e total são recalculados no servidor. */
export async function finalizarPedido(entrada: EntradaPedido): Promise<RespPedido> {
  try {
    return await criarPedido(entrada);
  } catch (e) {
    console.error("[finalizarPedido]", e);
    return { ok: false, erro: "Não foi possível enviar o pedido agora. Tente novamente em instantes." };
  }
}
