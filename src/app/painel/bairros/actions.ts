"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { membroOuErro } from "@/lib/auth";
import { paraCentavos } from "@/lib/dinheiro";

type Resp = { ok: true } | { ok: false; erro: string };
const txt = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function rodar(fn: () => Promise<void>): Promise<Resp> {
  try {
    await membroOuErro({ admin: true });
    await fn();
    revalidatePath("/painel", "layout");
    revalidatePath("/pedido");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Algo deu errado." };
  }
}

export async function salvarBairro(fd: FormData): Promise<Resp> {
  return rodar(async () => {
    const id = txt(fd, "id");
    const nome = z.string().min(2, "Informe o nome do bairro.").max(60).safeParse(txt(fd, "nome"));
    if (!nome.success) throw new Error(nome.error.issues[0]?.message);
    const taxa = paraCentavos(txt(fd, "taxa") || "0");
    if (taxa === null) throw new Error("Informe a taxa como 8,00 (ou 0 para grátis).");
    const tempoTxt = txt(fd, "tempo_min");
    const tempo = tempoTxt === "" ? null : Number(tempoTxt);
    if (tempo !== null && (!Number.isInteger(tempo) || tempo < 5 || tempo > 240)) throw new Error("Tempo de entrega: use minutos entre 5 e 240 (ou deixe em branco).");
    const dados = { nome: nome.data, taxa_cents: taxa, tempo_min: tempo, ativo: id ? fd.get("ativo") === "on" : true };
    const { error } = id ? await db().from("bairros").update(dados).eq("id", id) : await db().from("bairros").insert(dados);
    if (error) throw new Error("Não foi possível salvar o bairro.");
  });
}

export async function excluirBairro(fd: FormData): Promise<Resp> {
  return rodar(async () => {
    const { error } = await db().from("bairros").delete().eq("id", txt(fd, "id"));
    if (error) throw new Error("Não foi possível excluir.");
  });
}
