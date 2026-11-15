"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/admin";
import { membroOuErro } from "@/lib/auth";
import { paraCentavos } from "@/lib/dinheiro";
import { normalizarCodigo } from "@/lib/cupom";

type Resp = { ok: true } | { ok: false; erro: string };
const txt = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function rodar(fn: () => Promise<void>): Promise<Resp> {
  try {
    await membroOuErro({ admin: true });
    await fn();
    revalidatePath("/painel", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Algo deu errado." };
  }
}

export async function salvarCupom(fd: FormData): Promise<Resp> {
  return rodar(async () => {
    const id = txt(fd, "id");
    const codigo = normalizarCodigo(txt(fd, "codigo"));
    if (!/^[A-Z0-9_-]{3,20}$/.test(codigo)) throw new Error("O código precisa ter de 3 a 20 letras ou números (ex.: BEMVINDO10).");
    const tipo = txt(fd, "tipo") === "valor" ? "valor" : "percentual";
    let valor: number;
    if (tipo === "percentual") {
      valor = Number(txt(fd, "valor").replace(",", "."));
      if (!Number.isInteger(valor) || valor < 1 || valor > 100) throw new Error("O desconto em % deve ser um número inteiro de 1 a 100.");
    } else {
      const c = paraCentavos(txt(fd, "valor"));
      if (c === null || c < 1) throw new Error("Informe o desconto em reais (ex.: 10,00).");
      valor = c;
    }
    const minimo = paraCentavos(txt(fd, "minimo") || "0");
    if (minimo === null) throw new Error("Pedido mínimo inválido.");
    const validade = txt(fd, "validade");
    const usosTxt = txt(fd, "usos_max");
    const usos_max = usosTxt === "" ? null : Number(usosTxt);
    if (usos_max !== null && (!Number.isInteger(usos_max) || usos_max < 1)) throw new Error("Limite de usos inválido.");
    const dados = { codigo, tipo, valor, minimo_cents: minimo, validade: validade || null, usos_max, ativo: id ? fd.get("ativo") === "on" : true };
    const { error } = id ? await db().from("cupons").update(dados).eq("id", id) : await db().from("cupons").insert(dados);
    if (error) throw new Error(error.code === "23505" ? "Já existe um cupom com esse código." : "Não foi possível salvar o cupom.");
  });
}

export async function excluirCupom(fd: FormData): Promise<Resp> {
  return rodar(async () => {
    const { error } = await db().from("cupons").delete().eq("id", txt(fd, "id"));
    if (error) throw new Error("Não foi possível excluir.");
  });
}
