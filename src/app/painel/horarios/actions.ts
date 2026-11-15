"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/admin";
import { membroOuErro } from "@/lib/auth";

type Resp = { ok: true } | { ok: false; erro: string };
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function salvarHorarios(fd: FormData): Promise<Resp> {
  try {
    await membroOuErro({ admin: true });
    const linhas = [];
    for (let dia = 0; dia <= 6; dia++) {
      const abre = String(fd.get(`abre_${dia}`) ?? "");
      const fecha = String(fd.get(`fecha_${dia}`) ?? "");
      const ativo = fd.get(`ativo_${dia}`) === "on";
      if (ativo && (!HORA.test(abre) || !HORA.test(fecha))) throw new Error("Preencha abre e fecha com horas válidas nos dias abertos.");
      linhas.push({ dia_semana: dia, abre: HORA.test(abre) ? abre : "18:00", fecha: HORA.test(fecha) ? fecha : "23:00", ativo });
    }
    const { error } = await db().from("horarios").upsert(linhas, { onConflict: "dia_semana" });
    if (error) throw new Error("Não foi possível salvar os horários.");
    const { error: e2 } = await db().from("configuracoes").update({ usar_horarios: fd.get("usar_horarios") === "on" }).eq("id", true);
    if (e2) throw new Error("Não foi possível salvar a opção de horário automático.");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Algo deu errado." };
  }
}
