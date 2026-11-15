"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { membroOuErro } from "@/lib/auth";
import { paraCentavos } from "@/lib/dinheiro";

type Resp = { ok: true } | { ok: false; erro: string };
const BUCKET = "modelo-pizzaria";

async function rodar(fn: () => Promise<void>): Promise<Resp> {
  try {
    await membroOuErro({ admin: true });
    await fn();
    revalidatePath("/painel", "layout");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Algo deu errado." };
  }
}

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const marcado = (fd: FormData, k: string) => fd.get(k) === "on";
function ok<T>(r: { success: true; data: T } | { success: false; error: z.ZodError }): T {
  if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Dados inválidos.");
  return r.data;
}

export async function salvarCategoria(fd: FormData): Promise<Resp> {
  return rodar(async () => {
    const id = txt(fd, "id");
    const d = ok(z.object({ nome: z.string().min(2, "Dê um nome à categoria.").max(60), ordem: z.coerce.number().int().min(0).max(999) }).safeParse({ nome: txt(fd, "nome"), ordem: txt(fd, "ordem") || 0 }));
    const dados = { ...d, ativo: id ? marcado(fd, "ativo") : true, permite_meio_a_meio: marcado(fd, "permite_meio_a_meio") };
    const { error } = id ? await db().from("categorias").update(dados).eq("id", id) : await db().from("categorias").insert(dados);
    if (error) throw new Error("Não foi possível salvar a categoria.");
  });
}

export async function excluirCategoria(fd: FormData): Promise<Resp> {
  return rodar(async () => {
    const id = txt(fd, "id");
    const { count } = await db().from("produtos").select("id", { count: "exact", head: true }).eq("categoria_id", id);
    if (count) throw new Error("Esta categoria ainda tem produtos. Mova ou exclua os produtos antes.");
    const { error } = await db().from("categorias").delete().eq("id", id);
    if (error) throw new Error("Não foi possível excluir.");
  });
}

async function enviarFoto(arquivo: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) throw new Error("A foto precisa ser JPG, PNG ou WebP.");
  if (arquivo.size > 5 * 1024 * 1024) throw new Error("A foto passa de 5 MB. Reduza e tente de novo.");
  const ext = arquivo.type === "image/png" ? "png" : arquivo.type === "image/webp" ? "webp" : "jpg";
  const caminho = `produtos/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from(BUCKET).upload(caminho, arquivo, { contentType: arquivo.type, cacheControl: "31536000" });
  if (error) throw new Error("Não foi possível enviar a foto.");
  return db().storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

const produtoSchema = z.object({
  categoria_id: z.uuid("Escolha a categoria."),
  nome: z.string().min(2, "Dê um nome ao produto.").max(80),
  descricao: z.string().max(400),
  ordem: z.coerce.number().int().min(0).max(999),
});

export async function salvarProduto(fd: FormData): Promise<Resp> {
  return rodar(async () => {
    const id = txt(fd, "id");
    const d = ok(produtoSchema.safeParse({ categoria_id: txt(fd, "categoria_id"), nome: txt(fd, "nome"), descricao: txt(fd, "descricao"), ordem: txt(fd, "ordem") || 0 }));
    const dados: Record<string, unknown> = { ...d, destaque: marcado(fd, "destaque"), ativo: id ? marcado(fd, "ativo") : true };
    const foto = fd.get("foto");
    if (foto instanceof File && foto.size > 0) dados.foto_url = await enviarFoto(foto);
    if (marcado(fd, "remover_foto") && !(foto instanceof File && foto.size > 0)) dados.foto_url = null;
    const { error } = id ? await db().from("produtos").update(dados).eq("id", id) : await db().from("produtos").insert(dados);
    if (error) throw new Error("Não foi possível salvar o produto.");
  });
}

export async function excluirProduto(fd: FormData): Promise<Resp> {
  return rodar(async () => {
    const id = txt(fd, "id");
    // Pedidos antigos guardam nome e preço próprios; o vínculo com o produto é só referência.
    const { error } = await db().from("produtos").delete().eq("id", id);
    if (error) throw new Error("Não foi possível excluir. Se há pedidos ligados a ele, desative em vez de excluir.");
  });
}

export async function salvarTamanho(fd: FormData): Promise<Resp> {
  return rodar(async () => {
    const id = txt(fd, "id");
    const preco = paraCentavos(txt(fd, "preco"));
    if (preco === null || preco <= 0) throw new Error("Informe um preço válido, como 49,90.");
    const d = ok(z.object({ produto_id: z.uuid(), nome: z.string().min(1, "Dê um nome ao tamanho (ex.: Grande).").max(40), ordem: z.coerce.number().int().min(0).max(99) }).safeParse({ produto_id: txt(fd, "produto_id"), nome: txt(fd, "nome"), ordem: txt(fd, "ordem") || 0 }));
    const dados = { ...d, preco_cents: preco, ativo: id ? marcado(fd, "ativo") : true };
    const { error } = id ? await db().from("tamanhos").update(dados).eq("id", id) : await db().from("tamanhos").insert(dados);
    if (error) throw new Error("Não foi possível salvar o tamanho.");
  });
}

export async function excluirTamanho(fd: FormData): Promise<Resp> {
  return rodar(async () => {
    const { error } = await db().from("tamanhos").delete().eq("id", txt(fd, "id"));
    if (error) throw new Error("Não foi possível excluir. Desative o tamanho em vez de excluir.");
  });
}
