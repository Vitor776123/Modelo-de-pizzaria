import "server-only";
import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { getConfig, falhou } from "@/lib/cardapio";
import { criarPix, buscarPagamentoMP, mpAtivo } from "@/lib/mercadopago";
import { avisarCliente, avisarEquipe, seguro } from "@/lib/push";
import { avisoDoStatus, calcularTotais, normalizarTelefone, precoUnitario } from "@/lib/pedido-calculo";
import { dataLocalSP, normalizarCodigo, validarCupom } from "@/lib/cupom";
import { formatBRL, paraCentavos } from "@/lib/dinheiro";
import type { Cupom, ExtraItem, Pedido, StatusPedido } from "@/lib/tipos";

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
  cupom: z.string().trim().max(30).optional(),
  itens: z
    .array(
      z.object({
        tamanhoId: z.uuid(),
        /** Meio a meio: tamanho (do outro sabor) escolhido para a outra metade. */
        tamanho2Id: z.uuid().optional(),
        adicionaisIds: z.array(z.uuid()).max(8).optional(),
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

  // itens com preço do banco (sabores, meio a meio e adicionais)
  const ids = [...new Set(e.itens.flatMap((i) => [i.tamanhoId, ...(i.tamanho2Id ? [i.tamanho2Id] : [])]))];
  const { data: tams, error: errT } = await db()
    .from("tamanhos")
    .select("id, nome, preco_cents, ativo, produto:produtos(id, nome, ativo, categoria_id)")
    .in("id", ids);
  if (errT) falhou("Falha ao conferir os itens", errT);
  type LinhaT = { id: string; nome: string; preco_cents: number; ativo: boolean; produto: { id: string; nome: string; ativo: boolean; categoria_id: string } | null };
  const porId = new Map((tams as unknown as LinhaT[]).map((t) => [t.id, t]));

  const todosAd = [...new Set(e.itens.flatMap((i) => i.adicionaisIds ?? []))];
  const mapaAd = new Map<string, { id: string; nome: string; preco_cents: number; ativo: boolean; categoria_id: string | null }>();
  if (todosAd.length) {
    const { data: ads, error: errA } = await db().from("adicionais").select("id, nome, preco_cents, ativo, categoria_id").in("id", todosAd);
    if (errA) falhou("Falha ao conferir os adicionais", errA);
    for (const a of ads ?? []) mapaAd.set(a.id, a);
  }
  const { data: cats, error: errC } = await db().from("categorias").select("id, permite_meio_a_meio");
  if (errC) falhou("Falha ao conferir as categorias", errC);
  const meioPermitido = new Set((cats ?? []).filter((c) => c.permite_meio_a_meio).map((c) => c.id));

  const indisponivel = { ok: false as const, erro: "Um item do carrinho não está mais disponível. Revise o carrinho." };
  const linhas: { produto_id: string; nome: string; tamanho: string; quantidade: number; preco_unit_cents: number; observacao: string | null; extras: ExtraItem[] }[] = [];
  for (const i of e.itens) {
    const t = porId.get(i.tamanhoId);
    if (!t || !t.ativo || !t.produto?.ativo) return indisponivel;
    let nome = t.produto.nome;
    let segundo: number | null = null;
    if (i.tamanho2Id) {
      const t2 = porId.get(i.tamanho2Id);
      if (!t2 || !t2.ativo || !t2.produto?.ativo) return indisponivel;
      if (t2.produto.id === t.produto.id) return { ok: false, erro: "Escolha dois sabores diferentes no meio a meio." };
      if (!meioPermitido.has(t.produto.categoria_id) || !meioPermitido.has(t2.produto.categoria_id)) return { ok: false, erro: "Meio a meio indisponível para esse item." };
      if (t.nome.trim().toLowerCase() !== t2.nome.trim().toLowerCase()) return { ok: false, erro: "No meio a meio os dois sabores precisam ser do mesmo tamanho." };
      nome = `½ ${t.produto.nome} + ½ ${t2.produto.nome}`;
      segundo = t2.preco_cents;
    }
    const extras: ExtraItem[] = [];
    for (const adId of [...new Set(i.adicionaisIds ?? [])]) {
      const a = mapaAd.get(adId);
      if (!a || !a.ativo || (a.categoria_id && a.categoria_id !== t.produto.categoria_id)) return indisponivel;
      extras.push({ nome: a.nome, preco_cents: a.preco_cents });
    }
    linhas.push({
      produto_id: t.produto.id,
      nome,
      tamanho: t.nome,
      quantidade: i.quantidade,
      preco_unit_cents: precoUnitario(t.preco_cents, segundo, extras.map((x) => x.preco_cents)),
      observacao: i.observacao || null,
      extras,
    });
  }

  // entrega: endereço e taxa do bairro
  let taxa = 0;
  let bairroNome: string | null = null;
  let tempoBairro: number | null = null;
  if (e.tipo === "entrega") {
    if (!e.endereco || e.endereco.length < 5) return { ok: false, erro: "Informe o endereço de entrega (rua e número)." };
    if (!e.bairroId) return { ok: false, erro: "Escolha o seu bairro." };
    const { data: b, error: errB } = await db().from("bairros").select("nome, taxa_cents, tempo_min, ativo").eq("id", e.bairroId).maybeSingle();
    if (errB) falhou("Falha ao conferir o bairro", errB);
    if (!b || !b.ativo) return { ok: false, erro: "Não entregamos nesse bairro." };
    taxa = b.taxa_cents;
    bairroNome = b.nome;
    tempoBairro = b.tempo_min;
  }

  const subtotal = linhas.reduce((t, l) => t + l.preco_unit_cents * l.quantidade, 0);
  if (subtotal < cfg.pedido_minimo_cents) {
    return { ok: false, erro: `O pedido mínimo é de ${formatBRL(cfg.pedido_minimo_cents)} (sem a entrega).` };
  }

  // cupom: conferido de novo aqui; o uso é contado de forma atômica
  let desconto = 0;
  let cupomUsado: Cupom | null = null;
  if (e.cupom) {
    const codigo = normalizarCodigo(e.cupom);
    const { data: c, error: errCp } = await db().from("cupons").select("*").eq("codigo", codigo).maybeSingle();
    if (errCp) falhou("Falha ao conferir o cupom", errCp);
    const r = validarCupom((c as Cupom | null) ?? null, subtotal, dataLocalSP());
    if (!r.ok) return { ok: false, erro: r.erro };
    const { data: ok } = await db().rpc("usar_cupom", { p_id: (c as Cupom).id });
    if (!ok) return { ok: false, erro: "Este cupom já foi usado o máximo de vezes." };
    desconto = r.desconto_cents;
    cupomUsado = c as Cupom;
  }
  const totais = calcularTotais(linhas, taxa, desconto);
  const tempoEstimado = e.tipo === "entrega" ? (tempoBairro ?? cfg.tempo_entrega_min) : cfg.tempo_retirada_min;

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
      cupom_codigo: cupomUsado?.codigo ?? null,
      tempo_estimado_min: tempoEstimado,
      forma_pagamento: e.forma,
      troco_para_cents: troco,
      status: aguardaPix ? "aguardando_pagamento" : "novo",
      pix_expira_em: aguardaPix ? new Date(Date.now() + PRAZO_PIX_MS).toISOString() : null,
    })
    .select("id, numero, token")
    .single();
  if (errP || !ped) {
    if (cupomUsado) await db().rpc("devolver_cupom", { p_id: cupomUsado.id });
    return { ok: false, erro: "Não foi possível registrar o pedido. Tente de novo." };
  }

  const { error: errI } = await db().from("pedido_itens").insert(linhas.map((l) => ({ ...l, pedido_id: ped.id })));
  if (errI) {
    await db().from("pedidos").delete().eq("id", ped.id);
    if (cupomUsado) await db().rpc("devolver_cupom", { p_id: cupomUsado.id });
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

/** Início do dia de hoje em São Paulo, como instante UTC (ISO). */
export function inicioDoDiaSP(diasAtras = 0): string {
  const hoje = dataLocalSP(); // AAAA-MM-DD em São Paulo
  const [a, m, d] = hoje.split("-").map(Number);
  // São Paulo não tem horário de verão desde 2019: UTC-3 fixo
  return new Date(Date.UTC(a, m - 1, d - diasAtras, 3, 0, 0)).toISOString();
}

/** Números do dia para o topo do painel. Cancelados e PIX ainda não pago não entram no faturamento. */
export async function resumoHoje(): Promise<{ pedidos: number; faturamento_cents: number; ticket_cents: number }> {
  const { data, error } = await db()
    .from("pedidos")
    .select("total_cents, status, forma_pagamento, pagamento_status")
    .gte("criado_em", inicioDoDiaSP());
  if (error) falhou("Falha ao calcular o dia", error);
  const validos = (data ?? []).filter((p) => p.status !== "cancelado" && p.status !== "aguardando_pagamento");
  const fat = validos.reduce((s, p) => s + p.total_cents, 0);
  return { pedidos: validos.length, faturamento_cents: fat, ticket_cents: validos.length ? Math.round(fat / validos.length) : 0 };
}

export async function pedidoPorId(id: string): Promise<Pedido | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data, error } = await db().from("pedidos").select(SELECT_PEDIDO).eq("id", id).maybeSingle();
  if (error) falhou("Falha ao ler o pedido", error);
  return data ? ordenar(data as unknown as Pedido) : null;
}

/** Histórico com busca por número, nome ou telefone. */
export async function buscarPedidos(o: { q?: string; status?: string; de?: string; ate?: string; limite?: number }): Promise<Pedido[]> {
  let q = db().from("pedidos").select(SELECT_PEDIDO).order("criado_em", { ascending: false }).limit(o.limite ?? 100);
  const texto = (o.q ?? "").trim();
  if (texto) {
    const digitos = texto.replace(/\D/g, "");
    if (/^#?\d{1,6}$/.test(texto)) q = q.eq("numero", Number(texto.replace("#", "")));
    else if (digitos.length >= 8) q = q.ilike("cliente_telefone", `%${digitos}%`);
    else q = q.ilike("cliente_nome", `%${texto.replace(/[%_,()]/g, " ")}%`);
  }
  if (o.status && o.status !== "todos") q = q.eq("status", o.status);
  if (o.de) q = q.gte("criado_em", new Date(`${o.de}T00:00:00-03:00`).toISOString());
  if (o.ate) q = q.lte("criado_em", new Date(`${o.ate}T23:59:59-03:00`).toISOString());
  const { data, error } = await q;
  if (error) falhou("Falha ao buscar pedidos", error);
  return (data as unknown as Pedido[]).map(ordenar);
}
