"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Pedido } from "@/lib/tipos";
import { ROTULO_FORMA, ROTULO_STATUS } from "@/lib/tipos";
import { rotuloAcao } from "@/lib/pedido-calculo";
import { formatBRL } from "@/lib/dinheiro";
import { inscrever, pushSuportado } from "@/lib/push-cliente";
import { alternarAberto, avancarPedido, cancelarPedido, confirmarPixManual, type Resp } from "@/app/painel/actions";

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function CartaoPedido({ p, aoAgir, ocupado }: { p: Pedido; aoAgir: (f: () => Promise<Resp>) => void; ocupado: boolean }) {
  const acao = rotuloAcao(p.tipo, p.status);
  const aguardaPix = p.status === "aguardando_pagamento";
  return (
    <article className="rounded-2xl bg-white p-4 shadow-suave" aria-label={`Pedido ${p.numero}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl">#{p.numero} · {p.cliente_nome}</h3>
        <span className={`selo ${aguardaPix ? "selo-alerta" : p.status === "novo" ? "selo-erro" : "selo-info"}`}>{ROTULO_STATUS[p.status]}</span>
      </div>
      <p className="mt-1 text-sm text-suave">
        {hora(p.criado_em)} · {p.tipo === "entrega" ? `Entrega — ${p.endereco}, ${p.bairro_nome}` : "Retirada"} ·{" "}
        <a className="underline" href={`https://wa.me/55${p.cliente_telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{p.cliente_telefone}</a>
      </p>
      <ul className="mt-3 space-y-1 text-[0.98rem]">
        {p.itens.map((i) => (
          <li key={i.id}><strong>{i.quantidade}×</strong> {i.nome} <span className="text-suave">({i.tamanho})</span></li>
        ))}
      </ul>
      {p.observacao ? <p className="mt-2 rounded-xl bg-creme p-2 text-sm">Obs.: {p.observacao}</p> : null}
      <p className="mt-3 text-sm">
        <strong className="tabular">{formatBRL(p.total_cents)}</strong> · {ROTULO_FORMA[p.forma_pagamento]} · {p.pagamento_status === "pago" ? "pago" : "a receber"}
        {p.troco_para_cents ? ` · troco p/ ${formatBRL(p.troco_para_cents)}` : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {aguardaPix ? (
          <button className="btn btn-pequeno btn-verde" disabled={ocupado} onClick={() => aoAgir(() => confirmarPixManual(p.id))}>Confirmar PIX recebido</button>
        ) : acao ? (
          <button className="btn btn-pequeno btn-principal" disabled={ocupado} onClick={() => aoAgir(() => avancarPedido(p.id))}>{acao}</button>
        ) : null}
        <button
          className="btn btn-pequeno btn-contorno"
          disabled={ocupado}
          onClick={() => {
            if (window.confirm(`Cancelar o pedido #${p.numero}?`)) aoAgir(() => cancelarPedido(p.id));
          }}
        >
          Cancelar
        </button>
      </div>
    </article>
  );
}

export function Quadro({ ativos, recentes, aberto, vapid }: { ativos: Pedido[]; recentes: Pedido[]; aberto: boolean; vapid: string | null }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 10000);
    return () => clearInterval(id);
  }, [router]);

  function agir(f: () => Promise<Resp>) {
    setErro(null);
    iniciar(async () => {
      const r = await f();
      if (!r.ok) setErro(r.erro);
      else router.refresh();
    });
  }

  async function ligarAvisos() {
    try {
      if (!vapid) throw new Error("Avisos não configurados.");
      const sub = await inscrever(vapid);
      const r = await fetch("/api/push/equipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setAviso(r.ok ? "Avisos ligados neste aparelho." : "Não foi possível ligar os avisos.");
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Não foi possível ligar os avisos.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-suave">
        <div>
          <p className="font-bold">{aberto ? "Loja aberta: recebendo pedidos" : "Loja fechada: o cardápio não aceita pedidos"}</p>
          <p className="text-sm text-suave">Esta tela atualiza sozinha a cada 10 segundos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={`btn btn-pequeno ${aberto ? "btn-contorno" : "btn-verde"}`} disabled={pendente} onClick={() => agir(() => alternarAberto(!aberto))}>
            {aberto ? "Fechar a loja" : "Abrir a loja"}
          </button>
          {pushSuportado() ? <button className="btn btn-pequeno btn-contorno" onClick={ligarAvisos}>Avisar neste aparelho</button> : null}
        </div>
      </div>
      {aviso ? <p role="status" className="text-sm text-suave">{aviso}</p> : null}
      {erro ? <p role="alert" className="rounded-xl bg-[#fbe3e1] p-3 text-sm font-medium text-[#8c1d17]">{erro}</p> : null}

      <section aria-labelledby="ativos-t">
        <h2 id="ativos-t" className="mb-3 text-2xl">Em andamento ({ativos.length})</h2>
        {ativos.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-suave">Nenhum pedido na fila agora.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {ativos.map((p) => <CartaoPedido key={p.id} p={p} aoAgir={agir} ocupado={pendente} />)}
          </div>
        )}
      </section>

      {recentes.length > 0 ? (
        <section aria-labelledby="rec-t">
          <h2 id="rec-t" className="mb-3 text-2xl">Finalizados recentes</h2>
          <ul className="divide-y divide-linha rounded-2xl bg-white shadow-suave">
            {recentes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>#{p.numero} · {p.cliente_nome} · {hora(p.criado_em)}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular">{formatBRL(p.total_cents)}</span>
                  <span className={`selo ${p.status === "cancelado" ? "selo-erro" : "selo-ok"}`}>{ROTULO_STATUS[p.status]}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
