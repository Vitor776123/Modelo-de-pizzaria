"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { membroOuErro } from "@/lib/auth";
import { paraCentavos } from "@/lib/dinheiro";

type Resp = { ok: true } | { ok: false; erro: string };
const txt = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const on = (fd: FormData, k: string) => fd.get(k) === "on";
const vazioNulo = (s: string) => (s === "" ? null : s);

export async function salvarConfig(fd: FormData): Promise<Resp> {
  try {
    await membroOuErro({ admin: true });
    const minimo = paraCentavos(txt(fd, "pedido_minimo") || "0");
    if (minimo === null) throw new Error("Pedido mínimo inválido. Use 30,00 (ou 0 para sem mínimo).");
    const d = z
      .object({
        nome: z.string().min(2, "Informe o nome da pizzaria.").max(80),
        slogan: z.string().max(160),
        horario_texto: z.string().min(2, "Informe o horário de funcionamento.").max(120),
        tempo_entrega_min: z.coerce.number().int().min(5).max(240),
        tempo_retirada_min: z.coerce.number().int().min(5).max(240),
      })
      .safeParse({
        nome: txt(fd, "nome"),
        slogan: txt(fd, "slogan"),
        horario_texto: txt(fd, "horario_texto"),
        tempo_entrega_min: txt(fd, "tempo_entrega_min"),
        tempo_retirada_min: txt(fd, "tempo_retirada_min"),
      });
    if (!d.success) throw new Error(d.error.issues[0]?.message ?? "Dados inválidos.");

    const aceita_entrega = on(fd, "aceita_entrega");
    const aceita_retirada = on(fd, "aceita_retirada");
    if (!aceita_entrega && !aceita_retirada) throw new Error("Deixe ao menos entrega ou retirada ligada.");
    const aceita_pix_online = on(fd, "aceita_pix_online");
    const aceita_dinheiro = on(fd, "aceita_dinheiro");
    const aceita_cartao_entrega = on(fd, "aceita_cartao_entrega");
    if (!aceita_pix_online && !aceita_dinheiro && !aceita_cartao_entrega) throw new Error("Deixe ao menos uma forma de pagamento ligada.");

    const dados: Record<string, unknown> = {
      ...d.data,
      whatsapp: vazioNulo(txt(fd, "whatsapp").replace(/\D/g, "")),
      instagram: vazioNulo(txt(fd, "instagram").replace(/^@/, "")),
      endereco: vazioNulo(txt(fd, "endereco")),
      pedido_minimo_cents: minimo,
      aceita_entrega,
      aceita_retirada,
      aceita_pix_online,
      aceita_dinheiro,
      aceita_cartao_entrega,
      pix_chave: vazioNulo(txt(fd, "pix_chave")),
      pix_favorecido: vazioNulo(txt(fd, "pix_favorecido")),
      atualizado_em: new Date().toISOString(),
    };

    const qr = fd.get("qr_pix");
    if (qr instanceof File && qr.size > 0) {
      if (!/^image\/(jpeg|png|webp)$/.test(qr.type)) throw new Error("O QR Code precisa ser JPG, PNG ou WebP.");
      if (qr.size > 3 * 1024 * 1024) throw new Error("O QR Code passa de 3 MB.");
      const ext = qr.type === "image/png" ? "png" : qr.type === "image/webp" ? "webp" : "jpg";
      const caminho = `config/qr-pix-${crypto.randomUUID()}.${ext}`;
      const { error: e1 } = await db().storage.from("modelo-pizzaria").upload(caminho, qr, { contentType: qr.type });
      if (e1) throw new Error("Não foi possível enviar o QR Code.");
      dados.qr_pix_url = db().storage.from("modelo-pizzaria").getPublicUrl(caminho).data.publicUrl;
    } else if (on(fd, "remover_qr")) {
      dados.qr_pix_url = null;
    }

    const { error } = await db().from("configuracoes").update(dados).eq("id", true);
    if (error) throw new Error("Não foi possível salvar as configurações.");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Algo deu errado." };
  }
}
