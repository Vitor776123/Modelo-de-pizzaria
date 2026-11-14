import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/admin";
import { clienteSessao } from "@/lib/supabase/sessao";

export type Membro = { userId: string; email: string; nome: string; papel: "admin" | "atendente" };

/**
 * Quem está logado E pertence à equipe da pizzaria.
 * O login do Supabase é compartilhado com outros apps do projeto, então estar logado não basta:
 * precisa estar em modelo_pizzaria.equipe.
 */
export const getMembro = cache(async (): Promise<Membro | null> => {
  const sb = await clienteSessao();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await db().from("equipe").select("papel, nome").eq("user_id", user.id).maybeSingle();
  if (!data) return null;
  return { userId: user.id, email: user.email ?? "", nome: data.nome ?? user.email ?? "Equipe", papel: data.papel };
});

export async function exigirMembro(): Promise<Membro> {
  const m = await getMembro();
  if (!m) redirect("/entrar");
  return m;
}

export async function exigirAdmin(): Promise<Membro> {
  const m = await exigirMembro();
  if (m.papel !== "admin") redirect("/painel");
  return m;
}

/** Para Server Actions: lança erro em vez de redirecionar. */
export async function membroOuErro(opts: { admin?: boolean } = {}): Promise<Membro> {
  const m = await getMembro();
  if (!m) throw new Error("Sessão expirada. Entre de novo.");
  if (opts.admin && m.papel !== "admin") throw new Error("Só quem administra pode fazer isso.");
  return m;
}
