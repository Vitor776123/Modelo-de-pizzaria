import type { Metadata } from "next";
import Link from "next/link";
import { exigirMembro } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { inicioDoDiaSP } from "@/lib/pedidos";
import { agregarVendas } from "@/lib/vendas";
import { formatBRL } from "@/lib/dinheiro";
import { ROTULO_FORMA, type FormaPagamento, type Pedido } from "@/lib/tipos";
import { Cartao, Indicador, Titulo, Vazio } from "@/app/painel/ui";

export const metadata: Metadata = { title: "Vendas" };

const PERIODOS = [
  { dias: 0, nome: "Hoje" },
  { dias: 6, nome: "7 dias" },
  { dias: 29, nome: "30 dias" },
];

export default async function Page({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  await exigirMembro();
  const { p } = await searchParams;
  const dias = PERIODOS.find((x) => String(x.dias) === p)?.dias ?? 6;
  const { data, error } = await db()
    .from("pedidos")
    .select("id, criado_em, status, tipo, forma_pagamento, total_cents, desconto_cents, itens:pedido_itens(nome, quantidade, preco_unit_cents)")
    .gte("criado_em", inicioDoDiaSP(dias))
    .limit(5000);
  if (error) throw new Error("Não foi possível carregar as vendas.");
  const v = agregarVendas((data ?? []) as unknown as Pedido[], (iso) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }));
  const maior = Math.max(1, ...v.porDia.map((d) => d.total_cents));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Titulo
        titulo="Vendas"
        descricao="Não conta pedidos cancelados nem PIX ainda não pago."
        acao={
          <div className="flex gap-1 rounded-full border border-linha bg-white p-1">
            {PERIODOS.map((x) => (
              <Link key={x.dias} href={`/painel/vendas?p=${x.dias}`} aria-current={x.dias === dias ? "page" : undefined} className={`rounded-full px-3 py-1 text-sm font-bold ${x.dias === dias ? "bg-carvao text-white" : ""}`}>{x.nome}</Link>
            ))}
          </div>
        }
      />
      {v.pedidos === 0 ? (
        <Vazio titulo="Sem vendas no período">Assim que houver pedidos, os números aparecem aqui.</Vazio>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador rotulo="Faturamento" valor={formatBRL(v.faturamento_cents)} destaque />
            <Indicador rotulo="Pedidos" valor={String(v.pedidos)} nota={`${v.porTipo.entrega} entrega · ${v.porTipo.retirada} retirada`} />
            <Indicador rotulo="Ticket médio" valor={formatBRL(v.ticket_cents)} />
            <Indicador rotulo="Descontos" valor={formatBRL(v.descontos_cents)} nota="em cupons" />
          </div>

          <Cartao titulo="Por dia">
            <ul className="space-y-2">
              {v.porDia.map((d) => (
                <li key={d.dia} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-sm">
                  <span className="text-suave">{d.dia.slice(8)}/{d.dia.slice(5, 7)}</span>
                  <span className="h-3 overflow-hidden rounded-full bg-creme-2"><span className="block h-full rounded-full bg-tomate" style={{ width: `${Math.max(3, (d.total_cents / maior) * 100)}%` }} /></span>
                  <span className="tabular font-semibold">{formatBRL(d.total_cents)} <span className="font-normal text-suave">({d.pedidos})</span></span>
                </li>
              ))}
            </ul>
          </Cartao>

          <div className="grid gap-5 md:grid-cols-2">
            <Cartao titulo="Mais vendidas">
              <ol className="space-y-2 text-sm">
                {v.topProdutos.map((t, i) => (
                  <li key={t.nome} className="flex justify-between gap-3"><span><strong>{i + 1}.</strong> {t.nome}</span><span className="tabular font-semibold">{Number.isInteger(t.quantidade) ? t.quantidade : t.quantidade.toFixed(1)}×</span></li>
                ))}
              </ol>
            </Cartao>
            <Cartao titulo="Formas de pagamento">
              <ul className="space-y-2 text-sm">
                {v.porForma.map((f) => (
                  <li key={f.forma} className="flex justify-between gap-3"><span>{ROTULO_FORMA[f.forma as FormaPagamento] ?? f.forma} <span className="text-suave">({f.pedidos})</span></span><span className="tabular font-semibold">{formatBRL(f.total_cents)}</span></li>
                ))}
              </ul>
            </Cartao>
          </div>
        </>
      )}
    </div>
  );
}
