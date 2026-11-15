"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Adicional, Categoria, Config, Produto } from "@/lib/tipos";
import { Personalizar } from "@/components/personalizar";
import { IconeCarrinho, IconeSeta } from "@/components/icones";
import { adicionarAoCarrinho, alterarQuantidade, useCarrinho } from "@/lib/carrinho";
import { formatBRL } from "@/lib/dinheiro";
import { PizzaDesenho } from "@/components/pizza-desenho";
import { ZoomFoto } from "@/components/zoom-foto";

function tamanhoPadrao(p: Produto) {
  return p.tamanhos[p.tamanhos.length > 1 ? 1 : 0]?.id ?? "";
}

function Slide({ produto, categoria, aberto, primeiro, adicionais, reserva }: { produto: Produto; categoria: Categoria; aberto: boolean; primeiro: boolean; adicionais: Adicional[]; reserva: boolean }) {
  const [folha, setFolha] = useState(false);
  const extrasDaCategoria = adicionais.filter((a) => !a.categoria_id || a.categoria_id === categoria.id);
  const podePersonalizar = extrasDaCategoria.length > 0 || (categoria.permite_meio_a_meio && categoria.produtos.length > 1);
  const [escolhido, setEscolhido] = useState(tamanhoPadrao(produto));
  const [zoom, setZoom] = useState(false);
  const [feito, setFeito] = useState(false);
  const tamanho = produto.tamanhos.find((t) => t.id === escolhido) ?? produto.tamanhos[0];
  const doce = /doce/i.test(categoria.nome);
  const ehBebida = /bebida/i.test(categoria.nome);

  function adicionar() {
    adicionarAoCarrinho({
      tamanhoId: tamanho.id,
      produtoId: produto.id,
      nome: produto.nome,
      tamanho: tamanho.nome,
      preco_cents: tamanho.preco_cents,
    });
    setFeito(true);
    setTimeout(() => setFeito(false), 1300);
    navigator.vibrate?.(15);
  }

  return (
    <article className="slide flex flex-col bg-carvao text-white" data-cat={categoria.id} data-pid={produto.id} aria-label={produto.nome}>
      {/* foto: ocupa o alto da tela e fica livre de texto; ao dar zoom, toma a tela toda */}
      <div className={`relative z-10 min-h-0 transition-[flex-grow] duration-300 ${zoom ? "flex-[1_1_100%]" : "flex-[1_1_0%]"}`}>
        <ZoomFoto aoMudar={setZoom}>
          {produto.foto_url ? (
            <Image src={produto.foto_url} alt={`Foto da ${produto.nome}`} fill sizes="100vw" priority={primeiro} className="object-cover" draggable={false} />
          ) : (
            <div className={ehBebida ? "grid h-full place-items-center bg-forno text-8xl" : "h-full px-8 pb-4 pt-20"}>
              {ehBebida ? <span aria-hidden>🥤</span> : <PizzaDesenho nome={produto.nome} doce={doce} />}
            </div>
          )}
        </ZoomFoto>
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-carvao to-transparent transition-opacity ${zoom ? "opacity-0" : "opacity-100"}`} />
        <p className={`pointer-events-none absolute bottom-2 right-3 rounded-full bg-black/45 px-2.5 py-1 text-[0.7rem] font-semibold text-white/80 backdrop-blur transition-opacity ${zoom ? "opacity-0" : "opacity-100"}`}>🔍 toque para ampliar</p>
      </div>

      {/* painel de informações: compacto, abaixo da foto */}
      <div className={`relative z-20 shrink-0 overflow-hidden px-4 pt-1 transition-all duration-300 md:mx-auto md:w-full md:max-w-xl ${zoom ? "max-h-0 pb-0 opacity-0" : `-mt-8 max-h-[22rem] bg-gradient-to-b from-transparent via-carvao/90 to-carvao pt-6 opacity-100 ${reserva ? "pb-[4.75rem]" : "pb-4"}`}`}>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-queijo">
          {categoria.nome}
          {produto.destaque ? <span className="rounded-full bg-queijo px-2 py-0.5 text-[0.65rem] normal-case tracking-normal text-carvao">Queridinha da casa</span> : null}
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h2 className="min-w-0 text-[1.65rem] leading-tight">{produto.nome}</h2>
          <p className="tabular shrink-0 font-display text-2xl font-bold text-queijo">{formatBRL(tamanho.preco_cents)}</p>
        </div>
        {produto.descricao ? <p className="mt-1 line-clamp-2 text-[0.85rem] leading-snug text-white/65">{produto.descricao}</p> : null}

        {produto.tamanhos.length > 1 ? (
          <div className="mt-3 grid gap-1 rounded-full bg-white/10 p-1" style={{ gridTemplateColumns: `repeat(${produto.tamanhos.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label={`Tamanho de ${produto.nome}`}>
            {produto.tamanhos.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={t.id === escolhido} onClick={() => setEscolhido(t.id)} className={`rounded-full px-1 py-1.5 text-[0.82rem] font-bold transition ${t.id === escolhido ? "bg-queijo text-carvao" : "text-white/80"}`}>
                {t.nome}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex gap-2">
          {podePersonalizar && aberto ? (
            <button type="button" onClick={() => setFolha(true)} className="btn btn-claro btn-pequeno shrink-0">
              {categoria.permite_meio_a_meio ? "+ Personalizar" : "+ Adicionais"}
            </button>
          ) : null}
          <button type="button" onClick={adicionar} disabled={!aberto} className={`btn btn-pequeno min-w-0 flex-1 ${feito ? "btn-verde" : "btn-principal"}`}>
            {!aberto ? "Fechado agora" : feito ? "Adicionado ✓" : "Adicionar"}
          </button>
        </div>
      </div>
      {folha ? (
        <Personalizar produto={produto} categoria={categoria} tamanhoId={escolhido} adicionais={extrasDaCategoria} fechar={() => setFolha(false)} aoAdicionar={() => { setFeito(true); setTimeout(() => setFeito(false), 1300); navigator.vibrate?.(15); }} />
      ) : null}
    </article>
  );
}

function Gaveta({ aberta, fechar, aberto }: { aberta: boolean; fechar: () => void; aberto: boolean }) {
  const { itens, subtotal } = useCarrinho();
  if (!aberta) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center" role="dialog" aria-modal="true" aria-label="Seu pedido" onClick={fechar}>
      <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-creme p-5 text-carvao shadow-2xl md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-3xl">Seu pedido</h2>
          <button type="button" onClick={fechar} className="btn btn-contorno btn-pequeno">
            Fechar
          </button>
        </div>
        {itens.length === 0 ? (
          <p className="py-8 text-center text-suave">Seu carrinho está vazio. Role o cardápio e toque em “Adicionar ao pedido”.</p>
        ) : (
          <>
            <ul className="divide-y divide-linha">
              {itens.map((i) => (
                <li key={i.chave} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{i.nome}</p>
                    <p className="text-sm text-suave">
                      {i.tamanho} · <span className="tabular">{formatBRL(i.preco_cents)}</span>
                    </p>
                    {i.extras.length > 0 ? <p className="text-xs text-suave">+ {i.extras.map((x) => x.nome).join(", ")}</p> : null}
                    {i.observacao ? <p className="text-xs text-suave">Obs.: {i.observacao}</p> : null}
                  </div>
                  <div className="flex items-center gap-1 rounded-full border-2 border-carvao">
                    <button type="button" aria-label={`Menos um ${i.nome}`} onClick={() => alterarQuantidade(i.chave, -1)} className="grid h-9 w-9 place-items-center text-xl font-bold">
                      −
                    </button>
                    <span className="tabular w-6 text-center font-bold" aria-live="polite">
                      {i.quantidade}
                    </span>
                    <button type="button" aria-label={`Mais um ${i.nome}`} onClick={() => alterarQuantidade(i.chave, 1)} className="grid h-9 w-9 place-items-center text-xl font-bold">
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-linha pt-4">
              <span className="text-suave">Subtotal (a entrega é calculada depois)</span>
              <span className="tabular font-display text-2xl font-bold">{formatBRL(subtotal)}</span>
            </div>
            {aberto ? (
              <Link href="/pedido" className="btn btn-principal mt-4 w-full">
                Finalizar pedido
              </Link>
            ) : (
              <p className="mt-4 rounded-2xl bg-[#fdebc8] p-3 text-center text-sm font-semibold text-[#7a420a]">A pizzaria está fechada agora. Volte no horário de atendimento.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function Feed({ config, categorias, adicionais }: { config: Config; categorias: Categoria[]; adicionais: Adicional[] }) {
  const feed = useRef<HTMLDivElement>(null);
  const [ativa, setAtiva] = useState<string | null>(null);
  const [gaveta, setGaveta] = useState(false);
  const { quantidade, subtotal } = useCarrinho();
  const temItens = categorias.some((c) => c.produtos.length > 0);

  useEffect(() => {
    const raiz = feed.current;
    if (!raiz) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) setAtiva((e.target as HTMLElement).dataset.cat ?? null);
        }
      },
      { root: raiz, threshold: 0.6 },
    );
    raiz.querySelectorAll("[data-cat]").forEach((el) => obs.observe(el));
    const hero = raiz.querySelector("[data-hero]");
    const obsHero = new IntersectionObserver((en) => en[0]?.isIntersecting && setAtiva(null), { root: raiz, threshold: 0.6 });
    if (hero) obsHero.observe(hero);
    return () => {
      obs.disconnect();
      obsHero.disconnect();
    };
  }, [categorias]);

  useEffect(() => {
    const pid = new URLSearchParams(window.location.search).get("p");
    if (!pid) return;
    feed.current?.querySelector(`[data-pid="${CSS.escape(pid)}"]`)?.scrollIntoView({ block: "start" });
  }, []);

  function irPara(catId: string) {
    feed.current?.querySelector(`[data-cat="${catId}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="escuro relative bg-carvao text-white">
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30">
        <div className="pointer-events-auto bg-gradient-to-b from-black/80 to-transparent px-4 pb-6 pt-3 md:px-8">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <Link href="/" aria-label="Voltar ao início" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/25 bg-black/30 backdrop-blur">
              <IconeSeta className="h-5 w-5" />
            </Link>
            <nav aria-label="Categorias" className="-mr-2 flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
              {categorias.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => irPara(c.id)}
                  aria-current={ativa === c.id ? "true" : undefined}
                  className={`shrink-0 rounded-full border px-3.5 py-1 text-sm font-bold transition ${
                    ativa === c.id ? "border-queijo bg-queijo text-carvao" : "border-white/30 bg-black/30 text-white backdrop-blur"
                  }`}
                >
                  {c.nome}
                </button>
              ))}
            </nav>
            <button type="button" onClick={() => setGaveta(true)} className="btn btn-claro btn-pequeno shrink-0" aria-label={`Abrir pedido, ${quantidade} itens`}>
              <IconeCarrinho className="h-5 w-5" /> <span className="tabular">{quantidade}</span>
            </button>
          </div>
        </div>
      </header>

      <div ref={feed} className="feed">
        {categorias.flatMap((c) => c.produtos.map((p) => ({ c, p }))).map(({ c, p }, i) => (
          <Slide key={p.id} produto={p} categoria={c} aberto={config.aberto} primeiro={i === 0} adicionais={adicionais} reserva={quantidade > 0} />
        ))}

        <section className="slide grid place-items-center bg-carvao-2 px-6 text-center">
          <div className="max-w-md">
            <h2 className="text-4xl">{temItens ? "Bateu a fome?" : "Cardápio em breve"}</h2>
            <p className="mt-3 text-white/75">
              {temItens ? "Revise o pedido e escolha entrega ou retirada." : "Estamos preparando o cardápio. Volte daqui a pouco."}
            </p>
            {temItens ? (
              <button type="button" onClick={() => setGaveta(true)} className="btn btn-queijo mt-6">
                Ver meu pedido
              </button>
            ) : null}
            {config.endereco ? <p className="mt-8 text-sm text-white/55">{config.endereco}</p> : null}
          </div>
        </section>
      </div>

      {quantidade > 0 && !gaveta ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 p-4">
          <button type="button" onClick={() => setGaveta(true)} className="btn btn-queijo pointer-events-auto mx-auto flex w-full max-w-md justify-between shadow-2xl">
            <span>
              Ver pedido · <span className="tabular">{quantidade}</span> {quantidade === 1 ? "item" : "itens"}
            </span>
            <span className="tabular">{formatBRL(subtotal)}</span>
          </button>
        </div>
      ) : null}

      <Gaveta aberta={gaveta} fechar={() => setGaveta(false)} aberto={config.aberto} />
    </div>
  );
}
