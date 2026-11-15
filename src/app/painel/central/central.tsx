"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Pedido } from "@/lib/tipos";
import { ROTULO_FORMA } from "@/lib/tipos";
import { rotuloAcao } from "@/lib/pedido-calculo";
import { formatBRL } from "@/lib/dinheiro";
import { avancarPedido, confirmarPixManual, type Resp } from "@/app/painel/actions";

type Coluna = "novos" | "preparo" | "saida";
const COLUNA: Record<string, Coluna> = { aguardando_pagamento: "novos", novo: "novos", em_preparo: "preparo", saiu_para_entrega: "saida", pronto_retirada: "saida" };
const TITULO: Record<Coluna, string> = { novos: "NOVOS", preparo: "NO FORNO", saida: "SAÍDA / BALCÃO" };

function alarme(ctx: AudioContext) {
  [0, 0.22, 0.44, 0.9, 1.12, 1.34].forEach((ini, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = i % 3 === 2 ? 1319 : i % 3 === 1 ? 1047 : 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime + ini);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + ini + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ini + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + ini);
    o.stop(ctx.currentTime + ini + 0.25);
  });
}

const minutos = (iso: string, agora: number) => Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000));

function Cartao({ p, agora, ocupado, agir }: { p: Pedido; agora: number; ocupado: boolean; agir: (f: () => Promise<Resp>) => void }) {
  const min = minutos(p.criado_em, agora);
  const atraso = p.status === "em_preparo" || p.status === "novo" ? (min >= 25 ? "bg-erro text-white" : min >= 15 ? "bg-queijo text-carvao" : "bg-white/15 text-white") : "bg-white/15 text-white";
  const acao = rotuloAcao(p.tipo, p.status);
  const aguardaPix = p.status === "aguardando_pagamento";
  const novo = p.status === "novo";
  const temObs = Boolean(p.observacao);
  return (
    <article className={`rounded-3xl bg-carvao-2 p-5 ${novo ? "ring-4 ring-tomate" : "ring-1 ring-white/10"}`} aria-label={`Pedido ${p.numero}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-5xl leading-none">#{p.numero}</p>
          <p className="mt-2 truncate text-xl font-bold">{p.cliente_nome}</p>
        </div>
        <div className="text-right">
          <span className={`inline-block rounded-full px-3 py-1 text-lg font-extrabold tabular ${atraso}`}>{min} min</span>
          <p className="mt-2 text-lg font-bold">{p.tipo === "entrega" ? "ENTREGA" : "RETIRADA"}</p>
        </div>
      </header>

      {temObs ? (
        <div className="mt-4 rounded-2xl bg-queijo p-3 text-carvao">
          <p className="text-sm font-extrabold tracking-wide">⚠ CLIENTE PEDIU</p>
          <p className="text-xl font-bold leading-snug">{p.observacao}</p>
        </div>
      ) : null}

      <ul className="mt-4 space-y-3">
        {p.itens.map((i) => (
          <li key={i.id} className="rounded-2xl bg-black/25 p-3">
            <p className="text-2xl font-extrabold leading-tight">
              <span className="mr-2 inline-block min-w-10 rounded-lg bg-white px-2 text-center text-carvao">{i.quantidade}×</span>
              {i.nome} <span className="font-semibold text-white/70">· {i.tamanho}</span>
            </p>
            {i.extras?.length ? <p className="mt-1 text-xl font-bold text-queijo">+ {i.extras.map((x) => x.nome).join(" · ")}</p> : null}
            {i.observacao ? <p className="mt-1 rounded-lg bg-queijo px-2 py-1 text-lg font-bold text-carvao">OBS: {i.observacao}</p> : null}
          </li>
        ))}
      </ul>

      {p.tipo === "entrega" ? <p className="mt-4 text-lg text-white/85"><strong>{p.endereco}</strong> · {p.bairro_nome}</p> : null}
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg">
        <strong className="tabular text-2xl">{formatBRL(p.total_cents)}</strong>
        <span className="text-white/75">{ROTULO_FORMA[p.forma_pagamento]}</span>
        <span className={`rounded-full px-3 py-0.5 text-sm font-extrabold ${p.pagamento_status === "pago" ? "bg-ok text-white" : "bg-white/15"}`}>{p.pagamento_status === "pago" ? "PAGO" : "COBRAR"}</span>
        {p.troco_para_cents ? <span className="text-queijo">troco p/ {formatBRL(p.troco_para_cents)}</span> : null}
      </p>

      {aguardaPix ? (
        <button className="btn btn-verde mt-4 w-full !min-h-16 text-xl" disabled={ocupado} onClick={() => agir(() => confirmarPixManual(p.id))}>Confirmar PIX recebido</button>
      ) : acao ? (
        <button className={`btn mt-4 w-full !min-h-16 text-xl ${novo ? "btn-queijo" : "btn-principal"}`} disabled={ocupado} onClick={() => agir(() => avancarPedido(p.id))}>
          {novo ? "ACEITAR · começar a preparar" : acao}
        </button>
      ) : null}
      <Link href={`/painel/comanda/${p.id}`} target="_blank" className="mt-2 block text-center text-sm font-bold text-white/60 underline underline-offset-4">Imprimir comanda</Link>
    </article>
  );
}

export function Central({ ativos, nome, aberto, resumo }: { ativos: Pedido[]; nome: string; aberto: boolean; resumo: { pedidos: number; faturamento_cents: number; ticket_cents: number } }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [agora, setAgora] = useState(0);
  const [somLigado, setSomLigado] = useState(false);
  const [tela, setTela] = useState<"todos" | Coluna>("todos");
  const audio = useRef<AudioContext | null>(null);

  const novos = ativos.filter((p) => p.status === "novo");
  const aguardando = ativos.filter((p) => p.status === "aguardando_pagamento");
  const por = (c: Coluna) => ativos.filter((p) => COLUNA[p.status] === c);

  useEffect(() => {
    const t0 = setTimeout(() => setAgora(Date.now()), 0);
    const t = setInterval(() => setAgora(Date.now()), 15000);
    const r = setInterval(() => router.refresh(), 6000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
      clearInterval(r);
    };
  }, [router]);

  // mantém a tela acesa enquanto a central está aberta
  useEffect(() => {
    let trava: { release: () => Promise<void> } | null = null;
    const pedir = async () => {
      try {
        trava = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null;
      } catch {
        /* sem suporte */
      }
    };
    void pedir();
    const volta = () => document.visibilityState === "visible" && void pedir();
    document.addEventListener("visibilitychange", volta);
    return () => {
      document.removeEventListener("visibilitychange", volta);
      void trava?.release();
    };
  }, []);

  // alarme: toca a cada 7 s enquanto houver pedido novo sem aceitar
  const qtdNovos = novos.length;
  useEffect(() => {
    document.title = qtdNovos > 0 ? `🔔 (${qtdNovos}) NOVO PEDIDO` : "Central de pedidos";
    if (qtdNovos === 0 || !somLigado) return;
    const tocar = () => {
      if (audio.current) alarme(audio.current);
      navigator.vibrate?.([300, 120, 300]);
    };
    tocar();
    const id = setInterval(tocar, 7000);
    return () => clearInterval(id);
  }, [qtdNovos, somLigado]);

  const ligarSom = useCallback(() => {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio.current ??= new Ctx();
    void audio.current.resume();
    alarme(audio.current);
    setSomLigado(true);
  }, []);

  function agir(f: () => Promise<Resp>) {
    setErro(null);
    iniciar(async () => {
      const r = await f();
      if (!r.ok) setErro(r.erro);
      else router.refresh();
    });
  }

  function telaCheia() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }

  const colunas: Coluna[] = ["novos", "preparo", "saida"];
  const visiveis = tela === "todos" ? colunas : [tela];

  return (
    <div className="escuro fixed inset-0 z-50 flex flex-col bg-carvao text-white">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-black/40 px-4 py-3">
        <button
          type="button"
          onClick={somLigado ? () => setSomLigado(false) : ligarSom}
          aria-label={somLigado ? "Som ligado, tocar para silenciar" : "Som desligado, tocar para ligar"}
          className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-full text-3xl ${qtdNovos > 0 ? "animate-pulse bg-tomate" : "bg-white/10"}`}
        >
          <span aria-hidden>{somLigado ? "🔔" : "🔕"}</span>
          {qtdNovos > 0 ? <span className="absolute -right-1 -top-1 grid h-7 min-w-7 place-items-center rounded-full bg-white px-1 text-base font-extrabold text-tomate">{qtdNovos}</span> : null}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-2xl leading-tight">{nome}</p>
          <p className="text-sm text-white/65">{aberto ? "Recebendo pedidos" : "Pedidos pausados"} · hoje {formatBRL(resumo.faturamento_cents)} em {resumo.pedidos} pedidos</p>
        </div>
        <div className="flex gap-2 text-center">
          {colunas.map((c) => (
            <div key={c} className={`min-w-20 rounded-2xl px-3 py-1.5 ${c === "novos" && por(c).length ? "bg-tomate" : "bg-white/10"}`}>
              <p className="tabular font-display text-3xl leading-none">{por(c).length}</p>
              <p className="text-[0.65rem] font-bold tracking-wide">{TITULO[c]}</p>
            </div>
          ))}
        </div>
        <button type="button" onClick={telaCheia} className="btn btn-claro btn-pequeno">Tela cheia</button>
        <Link href="/painel" className="btn btn-contorno btn-pequeno !border-white/40 !text-white">Sair</Link>
      </header>

      {!somLigado ? (
        <button type="button" onClick={ligarSom} className="bg-queijo px-4 py-3 text-center text-lg font-extrabold text-carvao">
          🔕 Toque aqui para ligar o som — sem isso o alarme de pedido novo não toca
        </button>
      ) : null}
      {aguardando.length > 0 ? <p className="bg-[#fdebc8] px-4 py-2 text-center font-bold text-[#7a420a]">{aguardando.length} pedido(s) aguardando pagamento PIX</p> : null}
      {erro ? <p role="alert" className="bg-erro px-4 py-2 text-center font-bold">{erro}</p> : null}

      <nav className="flex gap-2 overflow-x-auto border-b border-white/10 px-4 py-2 xl:hidden" aria-label="Filtrar">
        {(["todos", ...colunas] as const).map((c) => (
          <button key={c} onClick={() => setTela(c)} aria-pressed={tela === c} className={`shrink-0 rounded-full px-4 py-1.5 font-bold ${tela === c ? "bg-white text-carvao" : "bg-white/10"}`}>
            {c === "todos" ? `Todos (${ativos.length})` : `${TITULO[c]} (${por(c).length})`}
          </button>
        ))}
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        {ativos.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="font-display text-5xl">Tudo em dia 🍕</p>
              <p className="mt-3 text-xl text-white/65">Quando chegar um pedido, esta tela toca o alarme e mostra tudo aqui.</p>
            </div>
          </div>
        ) : (
          <div className={`grid gap-4 ${tela === "todos" ? "xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-3"}`}>
            {visiveis.map((c) => (
              <section key={c} aria-label={TITULO[c]} className="space-y-4">
                <h2 className="hidden font-display text-2xl text-white/70 xl:block">{TITULO[c]} · {por(c).length}</h2>
                {por(c).map((p) => <Cartao key={p.id} p={p} agora={agora} ocupado={pendente} agir={agir} />)}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
