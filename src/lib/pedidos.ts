import "server-only";
import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { getConfig, falhou } from "@/lib/cardapio";
import { criarPix, buscarPagamentoMP, mpAtivo } from "@/lib/mercadopago";
import { avisarCliente, avisarEquipe, seguro } from "@/lib/push";
import { avisoDoStatus, calcularTotais, normalizarTelefone } from "@/lib/pedido-calculo";
import { formatBRL, paraCentavos } from "@/lib/dinheiro";
import type { Pedido, StatusPedido } from "@/lib/tipos";

const PRAZO_PIX_MS = 30 * 60_000;

const entradaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o seu nome.").max(80, "Nome longo demais."),
  telefone: z.string().trim().min(1, "Informe o seu telefone."),
  tipo: z.enum(["entrega", "retirada"]),
  endereco: z.string().trim().max(200, "Endereço longo demais.").optional(),
  bairroId: z.uuid().optional(),
  forma: z.enum(["pix_online", "dinheiro", "cartao_entrega"]),
  trocoPara: z.string().trim().max(20).optional(),
  observacao: z.string().trim().max(300, "A observação pode ter até 300 caracteres.").optional(),
  itens: z
    .array(
      z.object({
        tamanhoId: z.uuid(),
        quantidade: z.number().int().min(1).max(20),
        observacao: z.string().trim().max(120).optional(),
      }),
    )
    .min(1, "Seu carrinho está vazio.")
    .max(40, "Itens demais no mesmo pedido."),
});

export type EntradaPedido = z.input<typeof entradaSchema>;
export type RespPedido = { ok: true; token: string } | { ok: false; erro: string };

/** Cria o pedido. Os preços vêm sempre do banco, nunca do navegador. */
export async function criarPedido(entrada: EntradaPedido): Promise<RespPedido> {
  const parsed = entradaSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Confira os dados do pedido." };
  const e = parsed.data;

  const telefone = normalizarTelefone(e.telefone);
  if (!telefone) return { ok: false, erro: "Informe um telefone com DDD, por exemplo (11) 91234-5678." };

  const cfg = await getConfig();
  if (!cfg.aberto) return { ok: false, erro: "A pizzaria está fechada no momento. Volte no nosso horário de atendimento." };
  if (e.tipo === "entrega" && !cfg.aceita_entrega) return { ok: false, erro: "No momento não estamos fazendo entregas." };
  if (e.tipo === "retirada" && !cfg.aceita_retirada) return { ok: false, erro: "No momento não temos retirada no balcão." };
  if (e.forma === "pix_online" && !cfg.aceita_pix_online) return { ok: false, erro: "PIX online indisponível no momento." };
  if (e.forma === "dinheiro" && !cfg.aceita_dinheiro) return { ok: false, erro: "Pagamento em dinheiro indisponível." };
  if (e.forma === "cartao_entrega" && !cfg.aceita_cartao_entrega) return { ok: false, erro: "Pagamento no cartão indisponível." };

  // itens com preço do banco
  const ids = [...new Set(e.itens.map((i) => i.tamanhoId))];
  const { data: tams, error: errT } = await db()
    .from("tamanhos")
    .select("id, nome, preco_cents, ativo, produto:produtos(id, nome, ativo)")
    .in("id", ids);
  if (errT) falhou("Falha ao conferir os itens", errT);
  type LinhaT = { id: string; nome: string; preco_cents: number; ativo: boolean; produto: { id: string; nome: string; ativo: boolean } | null };
  const porId = new Map((tams as unknown as LinhaT[]).map((t) => [t.id, t]));

  const linhas = [];
  for (const i of e.itens) {
    const t = porId.get(i.tamanhoId);
    if (!t || !t.ativo || !t.produto?.ativo) return { ok: false, erro: "Um item do carrinho não está mais disponível. Revise o carrinho." };
    linhas.push({
      produto_id: t.produto.id,
      nome: t.produto.nome,
      tamanho: t.nome,
      quantidade: i.quantidade,
      preco_unit_cents: t.preco_cents,
      observacao: i.observacao || null,
    });
  }

  // entrega: endereço e taxa do bairro
  let taxa = 0;
  let bairroNome: string | null = null;
  if (e.tipo === "entrega") {
    if (!e.endereco || e.endereco.length < 5) return { ok: false, erro: "Informe o endereço de entrega (rua e número)." };
    if (!e.bairroId) return { ok: false, erro: "Escolha o seu bairro." };
    const { data: b, error: errB } = await db().from("bairros").select("nome, taxa_cents, ativo").eq("id", e.bairroId).maybeSingle();
    if (errB) falhou("Falha ao conferir o bairro", errB);
    if (!b || !b.ativo) return { ok: false, erro: "Não entregamos nesse bairro." };
    taxa = b.taxa_cents;
    bairroNome = b.nome;
  }

  const totais = calcularTotais(linhas, taxa);
  if (totais.subtotal_cents < cfg.pedido_minimo_cents) {
    return { ok: false, erro: `O pedido mínimo é de ${formatBRL(cfg.pedido_minimo_cents)} (sem a entrega).` };
  }

  let troco: number | null = null;
  if (e.forma === "dinheiro" && e.trocoPara) {
    troco = paraCentavos(e.trocoPara);
    if (troco === null) return { ok: false, erro: "Informe um valor válido para o troco." };
    if (troco < totais.total_cents) return { ok: false, erro: "O troco precisa ser para um valor maior que o total do pedido." };
  }

  const aguardaPix = e.forma === "pix_online";
  const { data: ped, error: errP } = await db()
    .from("pedidos")
    .insert({
      cliente_nome: e.nome,
      cliente_telefone: telefone,
      tipo: e.tipo,
      endereco: e.tipo === "entrega" ? e.endereco : null,
      bairro_id: e.tipo === "entrega" ? e.bairroId : null,
      bairro_nome: bairroNome,
      observacao: e.observacao || null,
      ...totais,
      forma_pagamento: e.forma,
      troco_para_cents: troco,
      status: aguardaPix ? "aguardando_pagamento" : "novo",
      pix_expira_em: aguardaPix ? new Date(Date.now() + PRAZO_PIX_MS).toISOString() : null,
    })
    .select("id, numero, token")
    .single();
  if (errP || !ped) return { ok: false, erro: "Não foi possível registrar o pedido. Tente de novo." };

  const { error: errI } = await db().from("pedido_itens").insert(linhas.map((l) => ({ ...l, pedido_id: ped.id })));
  if (errI) {
    await db().from("pedidos").delete().eq("id", ped.id);
    return { ok: false, erro: "Não foi possível registrar os itens do pedido. Tente de novo." };
  }
  await db().from("pedido_eventos").insert({ pedido_id: ped.id, status: aguardaPix ? "aguardando_pagamento" : "novo" });

  if (aguardaPix && mpAtivo()) {
    try {
      const pix = await criarPix({
        valor: totais.total_cents / 100,
        descricao: `Pedido #${ped.numero} · ${cfg.nome}`,
        referencia: ped.id,
        email: `cliente+${telefone}@email.com`,
        nome: e.nome,
        expiraEmMs: Date.now() + PRAZO_PIX_MS,
      });
      await db().from("pedidos").update({ mp_payment_id: pix.id, pix_copia_cola: pix.copiaECola }).eq("id", ped.id);
    } catch (err) {
      // sem o PIX automático o cliente ainda vê o PIX manual (chave/QR) e a equipe confirma no painel
      console.error("[pedido] falha ao criar PIX no Mercado Pago", err);
    }
  }

  if (!aguardaPix) {
    await seguro(() =>
      avisarEquipe({
        titulo: `Novo pedido #${ped.numero}`,
        corpo: `${e.nome} · ${formatBRL(totais.total_cents)} · ${e.tipo === "entrega" ? "entrega" : "retirada"}`,
        url: "/painel",
        tag: `pedido-${ped.id}`,
      }),
    );
  }
  return { ok: true, token: ped.token as string };
}

const SELECT_PEDIDO = "*, itens:pedido_itens(*), eventos:pedido_eventos(status, criado_em)";

function ordenar(p: Pedido): Pedido {
  return { ...p, eventos: [...(p.eventos ?? [])].sort((a, b) => a.criado_em.localeCompare(b.criado_em)) };
}

export async function pedidoPorToken(token: string): Promise<Pedido | null> {
  if (!/^[a-f0-9]{36}$/.test(token)) return null;
  const { data, error } = await db().from("pedidos").select(SELECT_PEDIDO).eq("token", token).maybeSingle();
  if (error) falhou("Falha ao ler o pedido", error);
  return data ? ordenar(data as unknown as Pedido) : null;
}

/** Pedidos para o painel: os que ainda estão andando, mais os últimos finalizados. */
export async function listarPedidosPainel(): Promise<{ ativos: Pedido[]; recentes: Pedido[] }> {
  const [ativos, recentes] = await Promise.all([
    db()
      .from("pedidos")
      .select(SELECT_PEDIDO)
      .in("status", ["aguardando_pagamento", "novo", "em_preparo", "saiu_para_entrega", "pronto_retirada"])
      .order("criado_em"),
    db().from("pedidos").select(SELECT_PEDIDO).in("status", ["entregue", "cancelado"]).order("criado_em", { ascending: false }).limit(30),
  ]);
  if (ativos.error) falhou("Falha ao listar pedidos", ativos.error);
  if (recentes.error) falhou("Falha ao listar pedidos", recentes.error);
  return {
    ativos: (ativos.data as unknown as Pedido[]).map(ordenar),
    recentes: (recentes.data as unknown as Pedido[]).map(ordenar),
  };
}

/** Muda a etapa do pedido, registra na linha do tempo e avisa o cliente. */
export async function mudarStatus(pedidoId: string, novo: StatusPedido, extra: Record<string, unknown> = {}) {
  const { data, error } = await db()
    .from("pedidos")
    .update({ status: novo, atualizado_em: new Date().toISOString(), ...extra })
    .eq("id", pedidoId)
    .select("id, numero, cliente_nome, total_cents, tipo")
    .single();
  if (error || !data) throw new Error("Não foi possível atualizar o pedido.");
  await db().from("pedido_eventos").insert({ pedido_id: pedidoId, status: novo });
  const aviso = avisoDoStatus(data.numero, novo);
  if (aviso) await seguro(() => avisarCliente(pedidoId, { ...aviso, url: "/", tag: `pedido-${pedidoId}` }));
  return data;
}

/** PIX confirmado (pelo Mercado Pago ou pela equipe): o pedido entra na fila da cozinha. */
export async function marcarPago(pedidoId: string) {
  const { data: atual } = await db().from("pedidos").select("status, pagamento_status").eq("id", pedidoId).maybeSingle();
  if (!atual || atual.pagamento_status === "pago") return false;
  const dados = await mudarStatus(pedidoId, atual.status === "aguardando_pagamento" ? "novo" : (atual.status as StatusPedido), {
    pagamento_status: "pago",
  });
  await seguro(() =>
    avisarEquipe({
      titulo: `Novo pedido #${dados.numero} (PIX pago)`,
      corpo: `${dados.cliente_nome} · ${formatBRL(dados.total_cents)}`,
      url: "/painel",
      tag: `pedido-${pedidoId}`,
    }),
  );
  return true;
}

/** Webhook do Mercado Pago: confirma consultando a API (nunca confia só no aviso recebido). */
export async function processarWebhookMP(paymentId: string) {
  const pg = await buscarPagamentoMP(paymentId);
  if (!pg?.external_reference) return { ok: true, ignorado: "sem referência" };
  if (pg.status !== "approved") return { ok: true, ignorado: pg.status };
  const { data: ped } = await db().from("pedidos").select("id, total_cents").eq("id", pg.external_reference).maybeSingle();
  if (!ped) return { ok: true, ignorado: "pedido não encontrado" };
  if (Math.round(pg.transaction_amount * 100) < ped.total_cents) return { ok: true, ignorado: "valor menor que o total" };
  await marcarPago(ped.id);
  return { ok: true };
}
