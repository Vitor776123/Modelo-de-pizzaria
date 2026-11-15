import type { Metadata } from "next";
import Link from "next/link";
import { exigirMembro } from "@/lib/auth";
import { buscarPedidos } from "@/lib/pedidos";
import { formatBRL } from "@/lib/dinheiro";
import { ROTULO_FORMA, ROTULO_STATUS, type StatusPedido } from "@/lib/tipos";
import { Titulo, Vazio } from "@/app/painel/ui";

export const metadata: Metadata = { title: "Histórico" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await exigirMembro();
  const sp = await searchParams;
  const q = sp.q ?? "";
  const status = sp.status ?? "todos";
  const de = /^\d{4}-\d{2}-\d{2}$/.test(sp.de ?? "") ? sp.de : undefined;
  const ate = /^\d{4}-\d{2}-\d{2}$/.test(sp.ate ?? "") ? sp.ate : undefined;
  const pedidos = await buscarPedidos({ q, status, de, ate, limite: 100 });
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Titulo titulo="Histórico" descricao="Procure por número, nome ou telefone do cliente." />
      <form className="grid gap-3 rounded-2xl border border-linha bg-white p-4 sm:grid-cols-2 lg:grid-cols-5" role="search">
        <div className="lg:col-span-2"><label className="rotulo" htmlFor="h-q">Buscar</label><input id="h-q" name="q" defaultValue={q} className="campo" placeholder="#123, nome ou telefone" /></div>
        <div><label className="rotulo" htmlFor="h-s">Situação</label>
          <select id="h-s" name="status" defaultValue={status} className="campo">
            <option value="todos">Todas</option>
            {(Object.keys(ROTULO_STATUS) as StatusPedido[]).map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}
          </select>
        </div>
        <div><label className="rotulo" htmlFor="h-d">De</label><input id="h-d" type="date" name="de" defaultValue={de} className="campo" /></div>
        <div><label className="rotulo" htmlFor="h-a">Até</label><input id="h-a" type="date" name="ate" defaultValue={ate} className="campo" /></div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
          <button className="btn btn-principal btn-pequeno" type="submit">Buscar</button>
          <Link href="/painel/historico" className="btn btn-contorno btn-pequeno">Limpar</Link>
        </div>
      </form>

      {pedidos.length === 0 ? (
        <Vazio titulo="Nada encontrado">Tente outro número, nome ou período.</Vazio>
      ) : (
        <ul className="divide-y divide-linha overflow-hidden rounded-2xl border border-linha bg-white">
          {pedidos.map((p) => (
            <li key={p.id}>
              <Link href={`/painel/comanda/${p.id}`} target="_blank" className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-creme-2">
                <span className="min-w-0">
                  <strong>#{p.numero}</strong> · {p.cliente_nome}
                  <span className="block text-sm text-suave">
                    {new Date(p.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })} · {p.tipo === "entrega" ? "Entrega" : "Retirada"} · {ROTULO_FORMA[p.forma_pagamento]}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <strong className="tabular">{formatBRL(p.total_cents)}</strong>
                  <span className={`selo ${p.status === "cancelado" ? "selo-erro" : p.status === "entregue" ? "selo-ok" : "selo-info"}`}>{ROTULO_STATUS[p.status]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pedidos.length === 100 ? <p className="text-center text-sm text-suave">Mostrando os 100 mais recentes. Refine a busca para ver outros.</p> : null}
    </div>
  );
}
