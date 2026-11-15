import Link from "next/link";
import type { ReactNode } from "react";
import type { Categoria, Config, Produto } from "@/lib/tipos";
import { formatBRL } from "@/lib/dinheiro";
import { PizzaDesenho } from "@/components/pizza-desenho";
import { UltimoPedido } from "@/components/ultimo-pedido";
import { IconeCheck, IconeInstagram, IconeMoto, IconePino, IconePix, IconePizza, IconeRelogio, IconeSacola, IconeSetaDireita, IconeZap } from "@/components/icones";

function aPartirDe(p: Produto) {
  return Math.min(...p.tamanhos.map((t) => t.preco_cents));
}

function Destaque({ p, doce }: { p: Produto; doce: boolean }) {
  return (
    <Link href={`/cardapio?p=${p.id}`} className="block w-64 overflow-hidden rounded-3xl bg-white shadow-suave transition active:scale-[0.98]">
      <div className="relative h-40 bg-carvao">
        {p.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.foto_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <PizzaDesenho nome={p.nome} doce={doce} cobrir />
        )}
      </div>
      <div className="p-4">
        <h3 className="text-xl">{p.nome}</h3>
        <p className="mt-1 line-clamp-2 min-h-[2.6rem] text-sm text-suave">{p.descricao}</p>
        <p className="mt-2 flex items-baseline justify-between">
          <span className="text-xs text-suave">a partir de</span>
          <span className="tabular font-display text-xl font-bold">{formatBRL(aPartirDe(p))}</span>
        </p>
      </div>
    </Link>
  );
}

function Passo({ n, titulo, texto, icone }: { n: number; titulo: string; texto: string; icone: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-carvao text-queijo">{icone}</span>
      <div>
        <h3 className="text-xl"><span className="text-tomate">{n}.</span> {titulo}</h3>
        <p className="mt-0.5 text-suave">{texto}</p>
      </div>
    </li>
  );
}

export function Inicio({ config, categorias }: { config: Config; categorias: Categoria[] }) {
  const destaques = categorias.flatMap((c) => c.produtos.filter((p) => p.destaque).map((p) => ({ p, doce: /doce/i.test(c.nome) })));
  const lista = destaques.length > 0 ? destaques : categorias.flatMap((c) => c.produtos.slice(0, 2).map((p) => ({ p, doce: /doce/i.test(c.nome) }))).slice(0, 6);
  const pagamentos = [config.aceita_pix_online && "PIX", config.aceita_dinheiro && "dinheiro", config.aceita_cartao_entrega && "cartão"].filter(Boolean).join(", ");
  const zap = config.whatsapp ? `https://wa.me/55${config.whatsapp.replace(/\D/g, "")}` : null;

  return (
    <div className="bg-creme text-carvao">
      {/* Abertura */}
      <section className="escuro relative isolate flex min-h-dvh flex-col overflow-hidden bg-carvao px-5 pb-seguro pt-seguro text-white">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_38%,#5a2f18_0%,#2a1710_38%,#14100d_72%)]" />
        <header className="flex items-center justify-between gap-3">
          <p className="font-display text-xl font-bold">{config.nome}</p>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${config.aberto ? "border-manjericao/60 bg-manjericao/15 text-[#a8e09c]" : "border-white/20 bg-white/10 text-white/80"}`}>
            <span aria-hidden className={`h-2 w-2 rounded-full ${config.aberto ? "ponto-aberto bg-manjericao" : "bg-white/50"}`} />
            {config.aberto ? "Aberto agora" : config.fechada_por_horario ? "Fora do horário" : "Fechado no momento"}
          </span>
        </header>

        <div className="relative my-auto flex flex-col items-center py-6 text-center">
          <div className="relative h-[17.5rem] w-[17.5rem] sm:h-[24rem] sm:w-[24rem]">
            <div aria-hidden className="absolute inset-4 rounded-full bg-brasa/25 blur-3xl" />
            <div className="girar-lento relative h-full w-full overflow-hidden rounded-full shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)]">
              <div className="h-full w-full scale-[1.1]"><PizzaDesenho nome={config.nome} /></div>
            </div>
          </div>
          <h1 className="relative mt-8 text-[2.15rem] leading-[1.05] sombra-texto sm:text-6xl">Pizza quente,<br />do forno à sua porta.</h1>
          <p className="mt-3 max-w-sm text-white/80">{config.slogan}</p>
        </div>

        <div className="mx-auto w-full max-w-md space-y-3">
          <UltimoPedido />
          <Link href="/cardapio" className="btn btn-queijo w-full justify-between text-lg">
            <span>Ver cardápio</span>
            <IconeSetaDireita className="h-6 w-6" />
          </Link>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 pt-1 text-xs font-semibold text-white/70">
            {config.aceita_entrega ? <li className="flex items-center gap-1.5"><IconeMoto className="h-4 w-4" /> Entrega {config.tempo_entrega_min} min</li> : null}
            {config.aceita_retirada ? <li className="flex items-center gap-1.5"><IconeSacola className="h-4 w-4" /> Retirada {config.tempo_retirada_min} min</li> : null}
            {config.aceita_pix_online ? <li className="flex items-center gap-1.5"><IconePix className="h-4 w-4" /> PIX na hora</li> : null}
          </ul>
        </div>
      </section>

      {/* Mais pedidas */}
      {lista.length > 0 ? (
        <section className="py-12" aria-labelledby="h-destaques">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-end justify-between gap-4 px-5">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-tomate">As queridinhas</p>
                <h2 id="h-destaques" className="mt-1 text-4xl">Mais pedidas</h2>
              </div>
              <Link href="/cardapio" className="shrink-0 pb-1 text-sm font-bold underline underline-offset-4">Ver todas</Link>
            </div>
            <div className="rolagem-x mt-6 pb-2">
              {lista.map(({ p, doce }) => <Destaque key={p.id} p={p} doce={doce} />)}
            </div>
          </div>
        </section>
      ) : null}

      {/* Como funciona */}
      <section className="bg-creme-2 px-5 py-12" aria-labelledby="h-como">
        <div className="mx-auto max-w-xl">
          <h2 id="h-como" className="text-4xl">Pedir é simples</h2>
          <ol className="mt-7 space-y-6">
            <Passo n={1} titulo="Escolha rolando" texto="Veja cada pizza de pertinho, com zoom, e monte do seu jeito: meio a meio, borda recheada e adicionais." icone={<IconePizza className="h-6 w-6" />} />
            <Passo n={2} titulo="Peça e pague" texto={`Entrega ou retirada. Pagamento por ${pagamentos || "PIX"}${config.aceita_pix_online ? ", com confirmação na hora" : ""}.`} icone={<IconePix className="h-6 w-6" />} />
            <Passo n={3} titulo="Acompanhe ao vivo" texto="Do forno até a sua porta, com avisos a cada etapa, sem precisar ligar." icone={<IconeCheck className="h-6 w-6" />} />
          </ol>
          <Link href="/cardapio" className="btn btn-principal mt-8 w-full">Quero pedir agora</Link>
        </div>
      </section>

      {/* Informações */}
      <footer className="escuro bg-carvao px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-12 text-white">
        <div className="mx-auto max-w-xl space-y-5">
          <p className="font-display text-3xl font-bold">{config.nome}</p>
          <ul className="space-y-3 text-white/85">
            <li className="flex gap-3"><IconeRelogio className="mt-0.5 h-5 w-5 shrink-0 text-queijo" /> {config.horario_texto}</li>
            {config.endereco ? <li className="flex gap-3"><IconePino className="mt-0.5 h-5 w-5 shrink-0 text-queijo" /> {config.endereco}</li> : null}
          </ul>
          <div className="flex flex-wrap gap-3">
            {zap ? <a href={zap} target="_blank" rel="noopener noreferrer" className="btn btn-claro btn-pequeno"><IconeZap className="h-4 w-4" /> WhatsApp</a> : null}
            {config.instagram ? <a href={`https://instagram.com/${config.instagram}`} target="_blank" rel="noopener noreferrer" className="btn btn-claro btn-pequeno"><IconeInstagram className="h-4 w-4" /> @{config.instagram}</a> : null}
          </div>
          <p className="pt-4 text-xs text-white/40">Feito por Forja de inSITES</p>
        </div>
      </footer>
    </div>
  );
}
