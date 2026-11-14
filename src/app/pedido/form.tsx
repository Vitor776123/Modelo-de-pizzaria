"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Bairro, Config, FormaPagamento, TipoPedido } from "@/lib/tipos";
import { limparCarrinho, useCarrinho } from "@/lib/carrinho";
import { formatBRL } from "@/lib/dinheiro";
import { finalizarPedido } from "@/app/pedido/actions";

export function FormPedido({ config, bairros }: { config: Config; bairros: Bairro[] }) {
  const router = useRouter();
  const { itens, subtotal } = useCarrinho();
  const tipos = [config.aceita_entrega && "entrega", config.aceita_retirada && "retirada"].filter(Boolean) as TipoPedido[];
  const formas = [
    config.aceita_pix_online && { v: "pix_online" as FormaPagamento, r: "PIX online", d: "Pague agora e o pedido já vai para o forno" },
    config.aceita_dinheiro && { v: "dinheiro" as FormaPagamento, r: "Dinheiro", d: "Pague ao receber ou retirar" },
    config.aceita_cartao_entrega && { v: "cartao_entrega" as FormaPagamento, r: "Cartão", d: "Maquininha na entrega ou no balcão" },
  ].filter(Boolean) as { v: FormaPagamento; r: string; d: string }[];

  const [tipo, setTipo] = useState<TipoPedido>(tipos[0] ?? "retirada");
  const [forma, setForma] = useState<FormaPagamento>(formas[0]?.v ?? "pix_online");
  const [bairroId, setBairroId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  const taxa = tipo === "entrega" ? (bairros.find((b) => b.id === bairroId)?.taxa_cents ?? 0) : 0;
  const total = subtotal + taxa;
  const abaixoDoMinimo = subtotal < config.pedido_minimo_cents;
  const prazo = tipo === "entrega" ? config.tempo_entrega_min : config.tempo_retirada_min;
  const resumo = useMemo(() => itens.map((i) => `${i.quantidade}× ${i.nome} (${i.tamanho})`).join(", "), [itens]);

  if (itens.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-4xl">Seu carrinho está vazio</h1>
        <p className="mt-3 text-suave">Escolha suas pizzas no cardápio.</p>
        <Link href="/" className="btn btn-principal mt-6">
          Ver o cardápio
        </Link>
      </div>
    );
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const f = new FormData(e.currentTarget);
    iniciar(async () => {
      const r = await finalizarPedido({
        nome: String(f.get("nome") ?? ""),
        telefone: String(f.get("telefone") ?? ""),
        tipo,
        endereco: String(f.get("endereco") ?? ""),
        bairroId: bairroId || undefined,
        forma,
        trocoPara: String(f.get("troco") ?? ""),
        observacao: String(f.get("observacao") ?? ""),
        itens: itens.map((i) => ({ tamanhoId: i.tamanhoId, quantidade: i.quantidade })),
      });
      if (!r.ok) return setErro(r.erro);
      limparCarrinho();
      router.push(`/acompanhar/${r.token}`);
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-8">
      <div>
        <Link href="/" className="text-sm font-bold text-suave underline-offset-4 hover:underline">
          ← Voltar ao cardápio
        </Link>
        <h1 className="mt-3 text-4xl">Finalizar pedido</h1>
        <p className="mt-2 text-sm text-suave">{resumo}</p>
      </div>

      {!config.aberto ? <p role="alert" className="rounded-2xl bg-[#fdebc8] p-4 font-semibold text-[#7a420a]">A pizzaria está fechada agora. {config.horario_texto}.</p> : null}

      <section className="space-y-4" aria-labelledby="s-dados">
        <h2 id="s-dados" className="text-2xl">Seus dados</h2>
        <div>
          <label htmlFor="nome" className="rotulo">Nome</label>
          <input id="nome" name="nome" className="campo" autoComplete="name" required maxLength={80} />
        </div>
        <div>
          <label htmlFor="telefone" className="rotulo">Telefone (WhatsApp)</label>
          <input id="telefone" name="telefone" className="campo" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 91234-5678" required />
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="s-tipo">
        <h2 id="s-tipo" className="text-2xl">Como você quer receber?</h2>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby="s-tipo">
          {tipos.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tipo === t} onClick={() => setTipo(t)} className={`rounded-2xl border-2 p-4 text-left transition ${tipo === t ? "border-tomate bg-white shadow-suave" : "border-linha bg-white/60"}`}>
              <span className="block font-bold">{t === "entrega" ? "Entrega" : "Retirada"}</span>
              <span className="text-sm text-suave">{t === "entrega" ? `cerca de ${config.tempo_entrega_min} min` : `pronto em ${config.tempo_retirada_min} min`}</span>
            </button>
          ))}
        </div>
        {tipo === "entrega" ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="endereco" className="rotulo">Rua, número e complemento</label>
              <input id="endereco" name="endereco" className="campo" autoComplete="street-address" required maxLength={200} />
            </div>
            <div>
              <label htmlFor="bairro" className="rotulo">Bairro</label>
              <select id="bairro" className="campo" value={bairroId} onChange={(e) => setBairroId(e.target.value)} required>
                <option value="">Escolha o bairro</option>
                {bairros.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome} · entrega {formatBRL(b.taxa_cents)}
                  </option>
                ))}
              </select>
              {bairros.length === 0 ? <p className="ajuda">Nenhum bairro cadastrado para entrega ainda.</p> : null}
            </div>
          </div>
        ) : config.endereco ? (
          <p className="rounded-2xl bg-white p-4 text-sm"><strong>Retire em:</strong> {config.endereco}</p>
        ) : null}
      </section>

      <section className="space-y-3" aria-labelledby="s-pag">
        <h2 id="s-pag" className="text-2xl">Pagamento</h2>
        <div className="space-y-2" role="radiogroup" aria-labelledby="s-pag">
          {formas.map((f) => (
            <button key={f.v} type="button" role="radio" aria-checked={forma === f.v} onClick={() => setForma(f.v)} className={`flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left transition ${forma === f.v ? "border-tomate bg-white shadow-suave" : "border-linha bg-white/60"}`}>
              <span>
                <span className="block font-bold">{f.r}</span>
                <span className="text-sm text-suave">{f.d}</span>
              </span>
              <span aria-hidden className={`h-5 w-5 rounded-full border-2 ${forma === f.v ? "border-tomate bg-tomate" : "border-linha"}`} />
            </button>
          ))}
        </div>
        {forma === "dinheiro" ? (
          <div>
            <label htmlFor="troco" className="rotulo">Troco para quanto? (opcional)</label>
            <input id="troco" name="troco" className="campo" inputMode="decimal" placeholder="Ex.: 100,00" />
          </div>
        ) : null}
        <div>
          <label htmlFor="observacao" className="rotulo">Observação (opcional)</label>
          <textarea id="observacao" name="observacao" className="campo" maxLength={300} placeholder="Sem cebola, campainha quebrada, sabor do refrigerante…" />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-suave" aria-label="Resumo">
        <dl className="space-y-2 text-[0.98rem]">
          <div className="flex justify-between"><dt className="text-suave">Itens</dt><dd className="tabular">{formatBRL(subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-suave">Entrega</dt><dd className="tabular">{tipo === "entrega" ? (bairroId ? formatBRL(taxa) : "escolha o bairro") : "grátis (retirada)"}</dd></div>
          <div className="flex justify-between border-t border-linha pt-3 text-xl font-bold"><dt>Total</dt><dd className="tabular font-display">{formatBRL(total)}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-suave">Previsão: cerca de {prazo} minutos depois da confirmação.</p>
        {abaixoDoMinimo ? <p className="mt-3 text-sm font-semibold text-alerta">O pedido mínimo é de {formatBRL(config.pedido_minimo_cents)} em itens.</p> : null}
        {erro ? <p role="alert" className="mt-3 rounded-xl bg-[#fbe3e1] p-3 text-sm font-semibold text-[#8c1d17]">{erro}</p> : null}
        <button type="submit" className="btn btn-principal mt-4 w-full" disabled={enviando || !config.aberto || abaixoDoMinimo || formas.length === 0 || tipos.length === 0}>
          {enviando ? "Enviando…" : forma === "pix_online" ? "Fazer pedido e pagar com PIX" : "Fazer pedido"}
        </button>
      </section>
    </form>
  );
}
