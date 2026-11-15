"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Pedido } from "@/lib/tipos";
import { ROTULO_FORMA, ROTULO_STATUS } from "@/lib/tipos";
import { rotuloAcao } from "@/lib/pedido-calculo";
import { formatBRL } from "@/lib/dinheiro";
import { inscrever, pushSuportado } from "@/lib/push-cliente";
import { alternarAberto, avancarPedido, cancelarPedido, confirmarPixManual, type Resp } from "@/app/painel/actions";
import { Indicador, Titulo, Vazio } from "@/app/painel/ui";
import { IconeMoto, IconeSacola, IconeZap } from "@/components/icones";

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function haQuanto(iso: string, agora: number | null): string {
  if (agora === null) return hora(iso);
  const min = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  return `há ${Math.floor(min / 60)} h ${min % 60} min`;
}

type Coluna = "novos" | "preparo" | "saida";
const COLUNA: Record<string, Coluna> = { aguardando_pagamento: "novos", novo: "novos", em_preparo: "preparo", saiu_para_entrega: "saida", pronto_retirada: "saida" };
const TITULO_COLUNA: Record<Coluna, string> = { novos: "Novos", preparo: "No forno", saida: "Saída / balcão" };

function bip(ctx: AudioContext) {
  const tom = (freq: number, ini: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime + ini);
    g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + ini + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ini + 0.35);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + ini);
    o.stop(ctx.currentTime + ini + 0.4);
  };
  tom(880, 0);
  tom(1175, 0.18);
  tom(880, 0.5);
  tom(1175, 0.68);
}

function CartaoPedido({ p, agora, aoAgir, ocupado }: { p: Pedido; agora: number | null; aoAgir: (f: () => Promise<Resp>) => void; ocupado: boolean }) {
  const acao = rotuloAcao(p.tipo, p.status);
  const aguardaPix = p.status === "aguardando_pagamento";
  const novo = p.status === "novo";
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-suave ${novo ? "border-tomate ring-2 ring-tomate/25" : "border-linha"}`} aria-label={`Pedido ${p.numero}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold text-suave">
            #{p.numero}
            <span className="inline-flex items-center gap-1 font-semibold">{p.tipo === "entrega" ? <IconeMoto className="h-4 w-4" /> : <IconeSacola className="h-4 w-4" />}{p.tipo === "entrega" ? "Entrega" : "Retirada"}</span>
          </p>
          <h3 className="truncate text-xl">{p.cliente_nome}</h3>
        </div>
        <div className="text-right">
          <span className={`selo ${aguardaPix ? "selo-alerta" : novo ? "selo-erro" : "selo-info"}`}>{ROTULO_STATUS[p.status]}</span>
          <p className="mt-1 text-xs text-suave" suppressHydrationWarning>{haQuanto(p.criado_em, agora)}</p>
        </div>
      </div>

      <ul className="mt-3 space-y-2 border-t border-linha pt-3 text-[0.97rem]">
        {p.itens.map((i) => (
          <li key={i.id}>
            <p><strong>{i.quantidade}×</strong> {i.nome} <span className="text-suave">({i.tamanho})</span></p>
            {i.extras?.length ? <p className="text-sm font-semibold text-tomate">+ {i.extras.map((x) => x.nome).join(", ")}</p> : null}
            {i.observacao ? <p className="text-sm text-suave">Obs.: {i.observacao}</p> : null}
          </li>
        ))}
      </ul>

      {p.observacao ? <p className="mt-3 rounded-xl bg-[#fdebc8] px-3 py-2 text-sm font-semibold text-[#7a420a]">Pedido: {p.observacao}</p> : null}
      {p.tipo === "entrega" ? <p className="mt-3 text-sm"><strong>{p.endereco}</strong> · {p.bairro_nome}</p> : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-linha pt-3 text-sm">
        <span>
          <strong className="tabular text-base">{formatBRL(p.total_cents)}</strong>
          <span className="text-suave"> · {ROTULO_FORMA[p.forma_pagamento]}</span>
          {p.troco_para_cents ? <span className="text-suave"> · troco p/ {formatBRL(p.troco_para_cents)}</span> : null}
        </span>
        <span className={`selo ${p.pagamento_status === "pago" ? "selo-ok" : "selo-neutro"}`}>{p.pagamento_status === "pago" ? "Pago" : "A receber"}</span>
      </div>
      {p.desconto_cents > 0 ? <p className="mt-1 text-xs text-suave">Desconto {p.cupom_codigo ?? ""}: − {formatBRL(p.desconto_cents)}</p> : null}

      <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
        {aguardaPix ? (
          <button className="btn btn-verde col-span-3" disabled={ocupado} onClick={() => aoAgir(() => confirmarPixManual(p.id))}>Confirmar PIX recebido</button>
        ) : acao ? (
          <button className="btn btn-principal col-span-3" disabled={ocupado} onClick={() => aoAgir(() => avancarPedido(p.id))}>{acao}</button>
        ) : null}
        <Link href={`/painel/comanda/${p.id}`} target="_blank" className="btn btn-contorno btn-pequeno justify-center">Comanda</Link>
        <a href={`https://wa.me/55${p.cliente_telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="btn btn-contorno btn-pequeno" aria-label={`WhatsApp de ${p.cliente_nome}`}><IconeZap className="h-4 w-4" /></a>
        <button
          className="btn btn-contorno btn-pequeno justify-center"
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

export function Quadro({
  ativos,
  recentes,
  aberto,
  fechadaPorHorario,
  resumo,
  vapid,
}: {
  ativos: Pedido[];
  recentes: Pedido[];
  aberto: boolean;
  fechadaPorHorario: boolean;
  resumo: { pedidos: number; faturamento_cents: number; ticket_cents: number };
  vapid: string | null;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [agora, setAgora] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<"todos" | Coluna>("todos");
  const [som, setSom] = useState(false);
  const [temPush, setTemPush] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const conhecidos = useRef<Set<string> | null>(null);

  useEffect(() => {
    const t0 = setTimeout(() => {
      setAgora(Date.now());
      setTemPush(pushSuportado());
      try {
        setSom(localStorage.getItem("painel-som") === "1");
      } catch {
        /* sem armazenamento */
      }
    }, 0);
    const t = setInterval(() => setAgora(Date.now()), 30000);
    const r = setInterval(() => router.refresh(), 10000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
      clearInterval(r);
    };
  }, [router]);

  const novosIds = useMemo(() => ativos.filter((p) => p.status === "novo").map((p) => p.id), [ativos]);

  // pedido novo na fila: toca o som e vibra (a primeira leitura não conta)
  useEffect(() => {
    const anteriores = conhecidos.current;
    conhecidos.current = new Set(novosIds);
    if (!anteriores) return;
    if (novosIds.some((id) => !anteriores.has(id))) {
      if (som && audio.current) bip(audio.current);
      navigator.vibrate?.([200, 100, 200]);
    }
  }, [novosIds, som]);

  useEffect(() => {
    const n = ativos.filter((p) => p.status === "novo" || p.status === "aguardando_pagamento").length;
    document.title = n > 0 ? `(${n}) Painel` : "Painel";
  }, [ativos]);

  function alternarSom() {
    if (!som) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audio.current ??= new Ctx();
      void audio.current.resume();
      bip(audio.current);
    }
    setSom(!som);
    try {
      localStorage.setItem("painel-som", som ? "0" : "1");
    } catch {
      /* sem armazenamento */
    }
  }

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
      if (!vapid) throw new Error("Avisos do celular ainda não configurados.");
      const sub = await inscrever(vapid);
      const r = await fetch("/api/push/equipe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      setAviso(r.ok ? "Avisos ligados neste aparelho." : "Não foi possível ligar os avisos.");
    } catch (e) {
      setAviso(e instanceof Error && e.message !== "permissao-negada" ? e.message : "Permissão de notificação negada neste aparelho.");
    }
  }

  const porColuna = (c: Coluna) => ativos.filter((p) => COLUNA[p.status] === c);
  const colunas: Coluna[] = ["novos", "preparo", "saida"];
  const visiveis = filtro === "todos" ? colunas : [filtro];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Titulo
        titulo="Pedidos"
        descricao="Atualiza sozinho a cada 10 segundos."
        acao={
          <div className="flex flex-wrap gap-2">
            <button className={`btn btn-pequeno ${aberto ? "btn-contorno" : "btn-verde"}`} disabled={pendente} onClick={() => agir(() => alternarAberto(!aberto))}>
              {aberto ? "Pausar pedidos" : "Voltar a receber"}
            </button>
            <button className={`btn btn-pequeno ${som ? "btn-queijo" : "btn-contorno"}`} onClick={alternarSom} aria-pressed={som}>
              {som ? "🔔 Som ligado" : "🔕 Ligar som"}
            </button>
            {temPush ? <button className="btn btn-pequeno btn-contorno" onClick={ligarAvisos}>Avisar no celular</button> : null}
          </div>
        }
      />

      {!aberto ? <p role="status" className="rounded-2xl bg-[#fdebc8] p-4 text-sm font-semibold text-[#7a420a]">Pedidos pausados: o site mostra a pizzaria como fechada.</p> : fechadaPorHorario ? <p role="status" className="rounded-2xl bg-[#dbe8fb] p-4 text-sm font-semibold text-[#1d3f7a]">Fora do horário de funcionamento: o site está fechado para pedidos até abrir pelo horário automático.</p> : null}
      {aviso ? <p role="status" className="text-sm text-suave">{aviso}</p> : null}
      {erro ? <p role="alert" className="rounded-xl bg-[#fbe3e1] p-3 text-sm font-semibold text-[#8c1d17]">{erro}</p> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Novos" valor={String(porColuna("novos").length)} nota="aguardando você" destaque={porColuna("novos").length > 0} />
        <Indicador rotulo="No forno" valor={String(porColuna("preparo").length)} />
        <Indicador rotulo="Saída / balcão" valor={String(porColuna("saida").length)} />
        <Indicador rotulo="Hoje" valor={formatBRL(resumo.faturamento_cents)} nota={`${resumo.pedidos} ${resumo.pedidos === 1 ? "pedido" : "pedidos"} · ticket ${formatBRL(resumo.ticket_cents)}`} />
      </div>

      <div className="flex gap-2 overflow-x-auto xl:hidden" role="tablist" aria-label="Filtrar pedidos">
        {(["todos", ...colunas] as const).map((c) => (
          <button key={c} role="tab" aria-selected={filtro === c} onClick={() => setFiltro(c)} className={`shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-bold ${filtro === c ? "border-carvao bg-carvao text-white" : "border-linha bg-white"}`}>
            {c === "todos" ? `Todos (${ativos.length})` : `${TITULO_COLUNA[c]} (${porColuna(c).length})`}
          </button>
        ))}
      </div>

      {ativos.length === 0 ? (
        <Vazio titulo="Nenhum pedido na fila">Quando alguém pedir pelo site, o pedido aparece aqui na hora{som ? " com um aviso sonoro" : ""}.</Vazio>
      ) : (
        <div className={`grid gap-5 ${filtro === "todos" ? "xl:grid-cols-3" : ""}`}>
          {visiveis.map((c) => (
            <section key={c} aria-label={TITULO_COLUNA[c]} className={`space-y-3 ${filtro === "todos" ? "" : "md:grid md:grid-cols-2 md:gap-3 md:space-y-0"}`}>
              <h2 className="hidden text-xl xl:block">{TITULO_COLUNA[c]} <span className="text-suave">({porColuna(c).length})</span></h2>
              {porColuna(c).map((p) => <CartaoPedido key={p.id} p={p} agora={agora} aoAgir={agir} ocupado={pendente} />)}
              {porColuna(c).length === 0 ? <p className="hidden rounded-2xl border border-dashed border-linha p-4 text-center text-sm text-suave xl:block">Vazio</p> : null}
            </section>
          ))}
        </div>
      )}

      {recentes.length > 0 ? (
        <section aria-labelledby="rec-t" className="pt-2">
          <div className="mb-3 flex items-end justify-between">
            <h2 id="rec-t" className="text-2xl">Finalizados recentes</h2>
            <Link href="/painel/historico" className="text-sm font-bold underline underline-offset-4">Ver histórico</Link>
          </div>
          <ul className="divide-y divide-linha overflow-hidden rounded-2xl border border-linha bg-white">
            {recentes.slice(0, 8).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>#{p.numero} · {p.cliente_nome} · {hora(p.criado_em)}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular font-semibold">{formatBRL(p.total_cents)}</span>
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
