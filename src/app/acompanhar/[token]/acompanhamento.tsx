"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Config, Pedido, StatusPedido } from "@/lib/tipos";
import { ROTULO_FORMA, ROTULO_STATUS } from "@/lib/tipos";
import { etapasDoPedido } from "@/lib/pedido-calculo";
import { formatBRL } from "@/lib/dinheiro";
import { inscrever, pushSuportado } from "@/lib/push-cliente";

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function PixCopiaECola({ codigo }: { codigo: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(codigo, { margin: 1, width: 240 }).then(setQr).catch(() => setQr(null));
  }, [codigo]);
  return (
    <div className="space-y-3">
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="QR Code do PIX" width={200} height={200} className="mx-auto rounded-2xl border border-linha bg-white p-2" />
      ) : null}
      <p className="break-all rounded-xl bg-creme p-3 text-xs text-suave">{codigo}</p>
      <button
        type="button"
        className="btn btn-principal w-full"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(codigo);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          } catch {
            /* o código já está visível para copiar à mão */
          }
        }}
      >
        {copiado ? "Código copiado ✓" : "Copiar código PIX"}
      </button>
    </div>
  );
}

export function Acompanhamento({ inicial, config }: { inicial: Pedido; config: Config }) {
  const [status, setStatus] = useState<StatusPedido>(inicial.status);
  const [pagamento, setPagamento] = useState(inicial.pagamento_status);
  const [pix, setPix] = useState(inicial.pix_copia_cola);
  const [eventos, setEventos] = useState(inicial.eventos);
  const [aviso, setAviso] = useState<"nao" | "ligado" | "negado">("nao");
  const encerrado = status === "entregue" || status === "cancelado";

  useEffect(() => {
    if (encerrado) return;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/pedido/${inicial.token}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        setStatus(d.status);
        setPagamento(d.pagamento_status);
        setPix(d.pix_copia_cola);
        setEventos(d.eventos);
      } catch {
        /* sem internet por um instante: tenta de novo no próximo ciclo */
      }
    }, 8000);
    return () => clearInterval(id);
  }, [inicial.token, encerrado]);

  const etapas = etapasDoPedido(inicial.tipo);
  const indiceAtual = status === "aguardando_pagamento" ? -1 : etapas.indexOf(status);
  const horaDe = (s: StatusPedido) => eventos.find((e) => e.status === s)?.criado_em;
  const aguardaPix = inicial.forma_pagamento === "pix_online" && pagamento === "pendente" && status === "aguardando_pagamento";
  const zap = config.whatsapp ? `https://wa.me/55${config.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Oi! Meu pedido #${inicial.numero} (${inicial.cliente_nome}).`)}` : null;

  async function ligarAvisos() {
    try {
      const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!chave) return setAviso("negado");
      const sub = await inscrever(chave);
      const r = await fetch("/api/push/cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inicial.token, subscription: sub.toJSON() }),
      });
      setAviso(r.ok ? "ligado" : "negado");
    } catch {
      setAviso("negado");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold text-suave">Pedido #{inicial.numero}</p>
        <h1 className="mt-1 text-4xl">{status === "cancelado" ? "Pedido cancelado" : status === "entregue" ? "Bom apetite!" : ROTULO_STATUS[status]}</h1>
        {!encerrado && status !== "aguardando_pagamento" ? (
          <p className="mt-2 text-suave">
            Previsão de cerca de {inicial.tempo_estimado_min ?? (inicial.tipo === "entrega" ? config.tempo_entrega_min : config.tempo_retirada_min)} minutos desde as {hora(inicial.criado_em)}.
          </p>
        ) : null}
      </header>

      {aguardaPix ? (
        <section className="rounded-3xl border-2 border-tomate bg-white p-5 shadow-suave" aria-labelledby="pix-t">
          <h2 id="pix-t" className="text-2xl">Pague com PIX para começar</h2>
          <p className="mt-1 text-sm text-suave">
            Total <strong className="tabular">{formatBRL(inicial.total_cents)}</strong>
            {inicial.pix_expira_em ? ` · vale até ${hora(inicial.pix_expira_em)}` : ""}. Assim que o pagamento cair, esta tela atualiza sozinha.
          </p>
          <div className="mt-4">
            {pix ? (
              <PixCopiaECola codigo={pix} />
            ) : (
              <div className="space-y-3 text-sm">
                {config.qr_pix_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={config.qr_pix_url} alt="QR Code do PIX da pizzaria" width={200} height={200} className="mx-auto rounded-2xl border border-linha bg-white p-2" />
                ) : null}
                {config.pix_chave ? (
                  <p className="rounded-xl bg-creme p-3">
                    Chave PIX: <strong className="break-all">{config.pix_chave}</strong>
                    {config.pix_favorecido ? <span className="block text-suave">Favorecido: {config.pix_favorecido}</span> : null}
                  </p>
                ) : null}
                <p className="text-suave">Depois de pagar, envie o comprovante pelo WhatsApp para a equipe confirmar o seu pedido.</p>
                {zap ? (
                  <a href={zap} target="_blank" rel="noopener noreferrer" className="btn btn-verde w-full">
                    Enviar comprovante no WhatsApp
                  </a>
                ) : null}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {status === "cancelado" ? (
        <p role="status" className="rounded-2xl bg-[#fbe3e1] p-4 font-semibold text-[#8c1d17]">Este pedido foi cancelado. Se foi um engano, fale com a pizzaria.</p>
      ) : (
        <ol className="space-y-0" aria-label="Etapas do pedido">
          {etapas.map((e, i) => {
            const feito = i <= indiceAtual;
            const atual = i === indiceAtual;
            const h = horaDe(e);
            return (
              <li key={e} className="relative flex gap-4 pb-6 last:pb-0" aria-current={atual ? "step" : undefined}>
                {i < etapas.length - 1 ? <span aria-hidden className={`absolute left-[0.95rem] top-8 h-[calc(100%-1.5rem)] w-0.5 ${i < indiceAtual ? "bg-manjericao" : "bg-linha"}`} /> : null}
                <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${feito ? "border-manjericao bg-manjericao text-white" : "border-linha bg-white text-suave"} ${atual && !encerrado ? "ring-4 ring-manjericao/25" : ""}`}>
                  {feito ? "✓" : i + 1}
                </span>
                <div>
                  <p className={`font-bold ${feito ? "" : "text-suave"}`}>{ROTULO_STATUS[e]}</p>
                  {h ? <p className="text-sm text-suave">{hora(h)}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!encerrado && pushSuportado() ? (
        <section className="rounded-2xl bg-white p-4">
          {aviso === "ligado" ? (
            <p className="text-sm font-semibold text-ok">Avisos ligados: você será notificado a cada etapa.</p>
          ) : (
            <>
              <button type="button" className="btn btn-contorno w-full" onClick={ligarAvisos}>
                Avisar no celular quando mudar
              </button>
              {aviso === "negado" ? <p className="ajuda">Não foi possível ligar os avisos neste aparelho. A tela continua atualizando sozinha.</p> : null}
            </>
          )}
        </section>
      ) : null}

      <section className="rounded-3xl bg-white p-5 shadow-suave" aria-labelledby="res-t">
        <h2 id="res-t" className="text-2xl">Seu pedido</h2>
        <ul className="mt-3 divide-y divide-linha text-[0.98rem]">
          {inicial.itens.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2">
              <span>
                {i.quantidade}× {i.nome} <span className="text-suave">({i.tamanho})</span>
                {i.extras?.length ? <span className="block text-xs text-suave">+ {i.extras.map((x) => x.nome).join(", ")}</span> : null}
                {i.observacao ? <span className="block text-xs text-suave">Obs.: {i.observacao}</span> : null}
              </span>
              <span className="tabular">{formatBRL(i.preco_unit_cents * i.quantidade)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-linha pt-3 text-sm">
          {inicial.desconto_cents > 0 ? <div className="flex justify-between text-ok"><dt>Desconto{inicial.cupom_codigo ? ` (${inicial.cupom_codigo})` : ""}</dt><dd className="tabular">− {formatBRL(inicial.desconto_cents)}</dd></div> : null}
          <div className="flex justify-between"><dt className="text-suave">Entrega</dt><dd className="tabular">{formatBRL(inicial.taxa_entrega_cents)}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd className="tabular">{formatBRL(inicial.total_cents)}</dd></div>
          <div className="flex justify-between"><dt className="text-suave">Pagamento</dt><dd>{ROTULO_FORMA[inicial.forma_pagamento]} · {pagamento === "pago" ? "pago" : "a pagar"}</dd></div>
        </dl>
        <p className="mt-3 text-sm text-suave">
          {inicial.tipo === "entrega" ? `Entrega em ${inicial.endereco} · ${inicial.bairro_nome}` : config.endereco ? `Retirada em ${config.endereco}` : "Retirada no balcão"}
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        {zap ? (
          <a href={zap} target="_blank" rel="noopener noreferrer" className="btn btn-contorno flex-1">
            Falar com a pizzaria
          </a>
        ) : null}
        <Link href="/" className="btn btn-contorno flex-1">
          Voltar ao cardápio
        </Link>
      </div>
    </div>
  );
}
