import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { exigirMembro } from "@/lib/auth";
import { pedidoPorId } from "@/lib/pedidos";
import { getConfig } from "@/lib/cardapio";
import { formatBRL } from "@/lib/dinheiro";
import { ROTULO_FORMA } from "@/lib/tipos";
import { BotaoImprimir } from "@/app/painel/comanda/[id]/imprimir";

export const metadata: Metadata = { title: "Comanda" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await exigirMembro();
  const { id } = await params;
  const [p, config] = await Promise.all([pedidoPorId(id), getConfig()]);
  if (!p) notFound();
  const dataHora = new Date(p.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
  return (
    <div className="mx-auto max-w-[22rem] bg-white p-4 font-mono text-[13px] leading-snug text-black print:max-w-none print:p-0">
      <BotaoImprimir />
      <div className="text-center">
        <p className="text-base font-bold">{config.nome}</p>
        <p>PEDIDO #{p.numero}</p>
        <p>{dataHora}</p>
      </div>
      <hr className="my-2 border-dashed border-black" />
      <p className="text-base font-bold">{p.tipo === "entrega" ? "ENTREGA" : "RETIRADA NO BALCÃO"}</p>
      <p>{p.cliente_nome}</p>
      <p>{p.cliente_telefone}</p>
      {p.tipo === "entrega" ? <p>{p.endereco} - {p.bairro_nome}</p> : null}
      <hr className="my-2 border-dashed border-black" />
      {p.itens.map((i) => (
        <div key={i.id} className="mb-2">
          <p className="font-bold">{i.quantidade}x {i.nome} ({i.tamanho})</p>
          {i.extras?.map((x) => <p key={x.nome} className="pl-3">+ {x.nome}</p>)}
          {i.observacao ? <p className="pl-3">OBS: {i.observacao}</p> : null}
          <p className="pl-3">{formatBRL(i.preco_unit_cents * i.quantidade)}</p>
        </div>
      ))}
      {p.observacao ? <p className="font-bold">OBS DO PEDIDO: {p.observacao}</p> : null}
      <hr className="my-2 border-dashed border-black" />
      <p>Itens: {formatBRL(p.subtotal_cents)}</p>
      {p.desconto_cents > 0 ? <p>Desconto{p.cupom_codigo ? ` (${p.cupom_codigo})` : ""}: -{formatBRL(p.desconto_cents)}</p> : null}
      {p.taxa_entrega_cents > 0 ? <p>Entrega: {formatBRL(p.taxa_entrega_cents)}</p> : null}
      <p className="text-base font-bold">TOTAL: {formatBRL(p.total_cents)}</p>
      <p>{ROTULO_FORMA[p.forma_pagamento]} - {p.pagamento_status === "pago" ? "PAGO" : "COBRAR NA ENTREGA"}</p>
      {p.troco_para_cents ? <p>Troco para {formatBRL(p.troco_para_cents)} (levar {formatBRL(p.troco_para_cents - p.total_cents)})</p> : null}
    </div>
  );
}
