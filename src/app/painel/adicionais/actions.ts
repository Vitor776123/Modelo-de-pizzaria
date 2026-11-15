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
    revalidatePath("/cardapio");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Algo deu errado." };
  }
}

export async function salvarAdicional(fd: FormData): Promise<Resp> {
  return rodar(async () => {
    const id = txt(fd, "id");
    const nome = z.string().min(2, "Informe o nome (ex.: Borda de catupiry).").max(60).safeParse(txt(fd, "nome"));
    if (!nome.success) throw new Error(nome.error.issues[0]?.message);
    const preco = paraCentavos(txt(fd, "preco") || "0");
    if (preco === null) throw new Error("Preço inválido. Use 8,00 (ou 0 para grátis).");
    const cat = txt(fd, "categoria_id");
    const dados = { nome: nome.data, preco_cents: preco, categoria_id: cat === "" ? null : cat, ativo: id ? fd.get("ativo") === "on" : true };
    const { error } = id ? await db().from("adicionais").update(dados).eq("id", id) : await db().from("adicionais").insert(dados);
    if (error) throw new Error("Não foi possível salvar o adicional.");
  });
}

export async function excluirAdicional(fd: FormData): Promise<Resp> {
  return rodar(async () => {
    const { error } = await db().from("adicionais").delete().eq("id", txt(fd, "id"));
    if (error) throw new Error("Não foi possível excluir.");
  });
}
