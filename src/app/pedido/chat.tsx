"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Bairro, Config, FormaPagamento, TipoPedido } from "@/lib/tipos";
import { alterarQuantidade, itensAgora, limparCarrinho } from "@/lib/carrinho";
import { formatBRL } from "@/lib/dinheiro";
import { ATRASO_MENSAGEM_MS, enderecoValido, formatTelefone, linhasDoResumo, nomeValido, primeiroNome, telefoneValido, validarTroco } from "@/lib/chat-pedido";
import { guardarUltimoPedido } from "@/components/ultimo-pedido";
import { conferirCupom, finalizarPedido } from "@/app/pedido/actions";

type Etapa = "confirma" | "remover" | "tipo" | "nome" | "telefone" | "endereco" | "bairro" | "cupom" | "cupom-texto" | "pagamento" | "troco" | "troco-texto" | "obs" | "obs-texto" | "resumo" | "enviando" | "fim";
type Conteudo = { texto?: string; resumo?: { linhas: [string, string][]; destaque?: [string, string] }; link?: { rotulo: string; href: string } };
type Msg = Conteudo & { id: number; de: "bot" | "eu"; etapa: Etapa; hora: string };
type Opcao = { id: string; rotulo: string; detalhe?: string; tom?: "principal" | "neutro"; href?: string };
type Bandeja = { etapa: Etapa; opcoes: Opcao[] };
type Entrada = "nome" | "telefone" | "endereco" | "cupom" | "troco" | "obs";

type Dados = { tipo: TipoPedido | null; nome: string; telefone: string; endereco: string; bairroId: string; cupom: { codigo: string; desconto_cents: number } | null; forma: FormaPagamento | null; trocoCents: number | null; obs: string };
const vazio = (): Dados => ({ tipo: null, nome: "", telefone: "", endereco: "", bairroId: "", cupom: null, forma: null, trocoCents: null, obs: "" });

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const reduzMovimento = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const horaAgora = () => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date());

function negrito(t: string): ReactNode[] {
  return t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p));
}

function Balao({ m }: { m: Msg }) {
  const meu = m.de === "eu";
  return (
    <div data-balao className={`balao-entra flex ${meu ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] rounded-2xl px-3 pb-1.5 pt-2 text-[0.97rem] leading-snug shadow-sm ${meu ? "rounded-tr-md bg-tomate text-white" : "rounded-tl-md bg-white text-carvao"}`}>
        {m.texto ? <p className="whitespace-pre-line">{negrito(m.texto)}</p> : null}
        {m.resumo ? (
          <dl className="mt-2 space-y-1.5 rounded-xl bg-creme px-3 py-2.5 text-sm">
            {m.resumo.linhas.map(([k, v], i) => (
              <div key={`${k}-${i}`} className="flex justify-between gap-4">
                <dt className="text-suave">{k}</dt>
                <dd className="tabular whitespace-nowrap text-right font-semibold">{v}</dd>
              </div>
            ))}
            {m.resumo.destaque ? (
              <div className="flex justify-between gap-4 border-t border-linha pt-2 text-base font-bold">
                <dt>{m.resumo.destaque[0]}</dt>
                <dd className="tabular">{m.resumo.destaque[1]}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {m.link ? (
          <Link href={m.link.href} className="mt-2 flex min-h-11 items-center justify-center rounded-xl border border-tomate/30 bg-white px-4 text-sm font-semibold text-tomate">
            {m.link.rotulo}
          </Link>
        ) : null}
        <span className={`mt-0.5 block text-right text-[0.68rem] ${meu ? "text-white/80" : "text-suave"}`}>{m.hora}</span>
      </div>
    </div>
  );
}

function Digitando() {
  return (
    <div className="flex justify-start" role="status">
      <span className="sr-only">A atendente está digitando</span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-white px-4 py-3.5 shadow-sm" aria-hidden>
        <span className="ponto-digitando h-2 w-2 rounded-full bg-suave/60" />
        <span className="ponto-digitando h-2 w-2 rounded-full bg-suave/60" />
        <span className="ponto-digitando h-2 w-2 rounded-full bg-suave/60" />
      </div>
    </div>
  );
}

function classeOpcao(o: Opcao): string {
  const base = "flex min-h-12 w-full items-center rounded-2xl border-[1.5px] px-4 py-2 text-left transition active:translate-y-px";
  if (o.tom === "principal") return `${base} border-tomate bg-tomate font-semibold text-white shadow-suave`;
  if (o.tom === "neutro") return `${base} border-linha bg-white/70 text-[0.93rem] font-medium text-suave`;
  return `${base} border-tomate/30 bg-white font-semibold text-tomate`;
}

export function ChatPedido({ config, bairros }: { config: Config; bairros: Bairro[] }) {
  const router = useRouter();
  const subtotalAgora = () => itensAgora().reduce((s, i) => s + i.quantidade * i.preco_cents, 0);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [bandeja, setBandeja] = useState<Bandeja | null>(null);
  const [digitando, setDigitando] = useState(false);
  const [entrada, setEntrada] = useState<Entrada | null>(null);
  const [texto, setTexto] = useState("");
  const [viewport, setViewport] = useState<{ h: number; top: number } | null>(null);
  const gen = useRef(0);
  const seq = useRef(0);
  const dados = useRef<Dados>(vazio());
  const rolagem = useRef<HTMLDivElement>(null);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  const tipos = [config.aceita_entrega && "entrega", config.aceita_retirada && "retirada"].filter(Boolean) as TipoPedido[];
  const formas = [
    config.aceita_pix_online && { id: "pix_online", rotulo: "💠 PIX online", detalhe: "Pague agora e o pedido já vai para o forno" },
    config.aceita_dinheiro && { id: "dinheiro", rotulo: "💵 Dinheiro", detalhe: "Pague ao receber ou retirar" },
    config.aceita_cartao_entrega && { id: "cartao_entrega", rotulo: "💳 Cartão", detalhe: "Maquininha na entrega ou no balcão" },
  ].filter(Boolean) as { id: FormaPagamento; rotulo: string; detalhe: string }[];

  const bairro = () => bairros.find((b) => b.id === dados.current.bairroId);
  const taxa = () => (dados.current.tipo === "entrega" ? (bairro()?.taxa_cents ?? 0) : 0);
  const desconto = () => Math.min(dados.current.cupom?.desconto_cents ?? 0, subtotalAgora());
  const total = () => subtotalAgora() - desconto() + taxa();
  const prazo = () => (dados.current.tipo === "entrega" ? (bairro()?.tempo_min ?? config.tempo_entrega_min) : config.tempo_retirada_min);

  function adicionar(m: Omit<Msg, "id" | "hora">) {
    setMsgs((a) => [...a, { ...m, id: ++seq.current, hora: horaAgora() }]);
  }
  const eu = (etapa: Etapa, t: string) => adicionar({ de: "eu", etapa, texto: t });

  async function falar(etapa: Etapa, ...partes: Conteudo[]): Promise<boolean> {
    const minha = gen.current;
    setBandeja(null);
    setEntrada(null);
    for (const p of partes) {
      setDigitando(true);
      await dormir(reduzMovimento() ? 0 : ATRASO_MENSAGEM_MS);
      if (minha !== gen.current) return false;
      setDigitando(false);
      adicionar({ de: "bot", etapa, ...p });
    }
    return true;
  }
  const mostrar = (etapa: Etapa, opcoes: Opcao[]) => {
    setEntrada(null);
    setBandeja({ etapa, opcoes });
  };
  function pedirTexto(e: Entrada) {
    setBandeja(null);
    setTexto("");
    setEntrada(e);
  }

  /* ----- roteiro ----- */
  async function comecar() {
    gen.current += 1;
    setMsgs([]);
    setBandeja(null);
    setEntrada(null);
    setTexto("");
    dados.current = vazio();
    if (itensAgora().length === 0) {
      await falar("fim", { texto: "Oi! 🍕 Seu carrinho está vazio por enquanto. Escolha suas pizzas no cardápio e volte aqui pra gente fechar o pedido.", link: { rotulo: "🍕 Ver o cardápio", href: "/cardapio" } });
      return;
    }
    if (!config.aberto) {
      await falar("fim", { texto: `Oi! 🍕 A pizzaria está fechada agora. ${config.horario_texto}.\nSeu carrinho fica guardado — é só voltar no horário.`, link: { rotulo: "Voltar ao cardápio", href: "/cardapio" } });
      return;
    }
    await perguntar("confirma", true);
  }

  async function perguntar(etapa: Etapa, primeira = false): Promise<void> {
    const d = dados.current;
    switch (etapa) {
      case "confirma": {
        const it = itensAgora();
        if (it.length === 0) {
          await falar("fim", { texto: "Seu carrinho ficou vazio. Quer escolher outra pizza?", link: { rotulo: "🍕 Ver o cardápio", href: "/cardapio" } });
          return;
        }
        const ok = await falar(
          "confirma",
          ...(primeira ? [{ texto: `Oi! 🍕 Aqui é a atendente da **${config.nome}**.` }] : []),
          { texto: primeira ? "Vi que seu pedido está assim:" : "Seu pedido ficou assim:", resumo: { linhas: linhasDoResumo(it), destaque: ["Itens", formatBRL(subtotalAgora())] } },
          { texto: "Está tudo certo?" },
        );
        if (!ok) return;
        mostrar("confirma", [
          { id: "ok", rotulo: "✅ Confirmar, está certo", tom: "principal" },
          { id: "mais", rotulo: "➕ Adicionar mais pizzas ou bebidas" },
          { id: "tirar", rotulo: "🗑️ Tirar algum item", tom: "neutro" },
          { id: "form", rotulo: "📝 Prefiro preencher o formulário", tom: "neutro" },
        ]);
        return;
      }
      case "remover": {
        if (!(await falar("remover", { texto: "Qual item você quer tirar?" }))) return;
        mostrar("remover", [
          ...itensAgora().map((i) => ({ id: i.chave, rotulo: `${i.quantidade}× ${i.nome} (${i.tamanho})`, detalhe: "Toque para tirar 1" })),
          { id: "voltar", rotulo: "↩︎ Voltar", tom: "neutro" as const },
        ]);
        return;
      }
      case "tipo": {
        if (subtotalAgora() < config.pedido_minimo_cents) {
          await falar("confirma", { texto: `O pedido mínimo é de **${formatBRL(config.pedido_minimo_cents)}** em itens. Faltam **${formatBRL(config.pedido_minimo_cents - subtotalAgora())}** — que tal mais uma pizza ou uma bebida?`, link: { rotulo: "➕ Adicionar mais", href: "/cardapio" } });
          mostrar("confirma", [{ id: "tirar", rotulo: "🗑️ Tirar algum item", tom: "neutro" }]);
          return;
        }
        if (tipos.length === 0) {
          await falar("fim", { texto: "No momento não estamos aceitando entrega nem retirada. Tente de novo mais tarde." });
          return;
        }
        if (tipos.length === 1) {
          d.tipo = tipos[0] ?? null;
          if (!(await falar("tipo", { texto: d.tipo === "entrega" ? "Só estamos fazendo **entrega** agora 🛵" : "Só estamos com **retirada no balcão** agora 🏪" }))) return;
          return perguntar("nome");
        }
        if (!(await falar("tipo", { texto: "Perfeito! Vai ser entrega ou você retira no balcão?" }))) return;
        mostrar("tipo", [
          { id: "entrega", rotulo: "🛵 Entrega", detalhe: `cerca de ${config.tempo_entrega_min} min` },
          { id: "retirada", rotulo: "🏪 Retirada no balcão", detalhe: `pronto em ${config.tempo_retirada_min} min` },
        ]);
        return;
      }
      case "nome":
        if (!(await falar("nome", { texto: "Como posso te chamar? Digite seu **nome**." }))) return;
        pedirTexto("nome");
        return;
      case "telefone":
        if (!(await falar("telefone", { texto: `Prazer, ${primeiroNome(d.nome)}! 😊 Qual o seu **WhatsApp** com DDD? Avisamos por lá se precisar.` }))) return;
        pedirTexto("telefone");
        return;
      case "endereco":
        if (d.tipo !== "entrega") return perguntar("cupom");
        if (!(await falar("endereco", { texto: "Qual o **endereço** de entrega? Rua, número e complemento." }))) return;
        pedirTexto("endereco");
        return;
      case "bairro":
        if (!(await falar("bairro", { texto: bairros.length ? "E o **bairro**?" : "Ainda não temos bairros cadastrados para entrega. Fale com a pizzaria pelo WhatsApp." }))) return;
        mostrar("bairro", bairros.map((b) => ({ id: b.id, rotulo: b.nome, detalhe: `entrega ${formatBRL(b.taxa_cents)}${b.tempo_min ? ` · ${b.tempo_min} min` : ""}` })));
        return;
      case "cupom":
        if (!(await falar("cupom", { texto: "Você tem **cupom de desconto**? 🎟️" }))) return;
        mostrar("cupom", [
          { id: "nao", rotulo: "Não tenho" },
          { id: "sim", rotulo: "🎟️ Tenho um cupom" },
        ]);
        return;
      case "cupom-texto":
        if (!(await falar("cupom-texto", { texto: "Digite o **código** do cupom." }))) return;
        pedirTexto("cupom");
        return;
      case "pagamento":
        if (!(await falar("pagamento", { texto: "Como você prefere **pagar**?" }))) return;
        mostrar("pagamento", formas.map((f) => ({ id: f.id, rotulo: f.rotulo, detalhe: f.detalhe })));
        return;
      case "troco":
        if (!(await falar("troco", { texto: `O total é **${formatBRL(total())}**. Vai precisar de **troco**?` }))) return;
        mostrar("troco", [
          { id: "nao", rotulo: "Não preciso de troco" },
          { id: "sim", rotulo: "Preciso de troco" },
        ]);
        return;
      case "troco-texto":
        if (!(await falar("troco-texto", { texto: "Troco para quanto? Digite o valor da nota, por exemplo **100,00**." }))) return;
        pedirTexto("troco");
        return;
      case "obs":
        if (!(await falar("obs", { texto: "Quer deixar alguma **observação**? Ex.: sem cebola, campainha quebrada, sabor do refrigerante…" }))) return;
        mostrar("obs", [
          { id: "nao", rotulo: "Sem observações" },
          { id: "sim", rotulo: "✍️ Escrever observação" },
        ]);
        return;
      case "obs-texto":
        if (!(await falar("obs-texto", { texto: "Pode escrever." }))) return;
        pedirTexto("obs");
        return;
      case "resumo": {
        const linhas: [string, string][] = [["Itens", formatBRL(subtotalAgora())]];
        if (desconto() > 0) linhas.push([`Desconto (${d.cupom?.codigo})`, `− ${formatBRL(desconto())}`]);
        linhas.push(["Entrega", d.tipo === "entrega" ? formatBRL(taxa()) : "grátis (retirada)"]);
        linhas.push(["Pagamento", formas.find((f) => f.id === d.forma)?.rotulo.replace(/^\S+\s/, "") ?? ""]);
        if (d.trocoCents) linhas.push(["Troco para", formatBRL(d.trocoCents)]);
        linhas.push([d.tipo === "entrega" ? "Entregar em" : "Retirar em", d.tipo === "entrega" ? `${d.endereco} · ${bairro()?.nome ?? ""}` : (config.endereco ?? "no balcão")]);
        if (d.obs) linhas.push(["Observação", d.obs]);
        const ok = await falar(
          "resumo",
          { texto: `Prontinho, ${primeiroNome(d.nome)}! Confere o pedido completo:`, resumo: { linhas, destaque: ["Total", formatBRL(total())] } },
          { texto: `Previsão: cerca de **${prazo()} minutos** depois da confirmação. Posso enviar?` },
        );
        if (!ok) return;
        mostrar("resumo", [
          { id: "enviar", rotulo: d.forma === "pix_online" ? "✅ Fazer pedido e pagar com PIX" : "✅ Fazer pedido", tom: "principal" },
          { id: "corrigir", rotulo: "✏️ Corrigir meus dados" },
          { id: "cancelar", rotulo: "Cancelar", tom: "neutro" },
        ]);
        return;
      }
      default:
        return;
    }
  }

  async function enviar() {
    const d = dados.current;
    const minha = gen.current;
    setBandeja(null);
    const r = await finalizarPedido({
      nome: d.nome,
      telefone: d.telefone,
      tipo: d.tipo ?? "retirada",
      endereco: d.endereco,
      bairroId: d.bairroId || undefined,
      forma: d.forma ?? "dinheiro",
      trocoPara: d.trocoCents ? String(d.trocoCents / 100).replace(".", ",") : "",
      observacao: d.obs,
      cupom: d.cupom?.codigo,
      itens: itensAgora().map((i) => ({ tamanhoId: i.tamanhoId, tamanho2Id: i.tamanho2Id, adicionaisIds: i.extras.map((x) => x.id), quantidade: i.quantidade, observacao: i.observacao })),
    });
    if (minha !== gen.current) return;
    if (!r.ok) {
      await falar("resumo", { texto: `Ops 😕 ${r.erro}` });
      mostrar("resumo", [
        { id: "enviar", rotulo: "🔄 Tentar de novo", tom: "principal" },
        { id: "corrigir", rotulo: "✏️ Corrigir meus dados" },
      ]);
      return;
    }
    limparCarrinho();
    guardarUltimoPedido(r.token);
    await falar("fim", { texto: d.forma === "pix_online" ? "Pedido feito! 🎉 Agora é só pagar o PIX na próxima tela." : "Pedido feito! 🎉 Já avisamos a cozinha. Vou te mostrar o acompanhamento." });
    await dormir(900);
    router.push(`/acompanhar/${r.token}`);
  }

  async function escolher(etapa: Etapa, o: Opcao) {
    const d = dados.current;
    setBandeja(null);
    eu(etapa, o.rotulo.replace(/^[^\p{L}\p{N}]+/u, "") || o.rotulo);
    switch (etapa) {
      case "confirma":
        if (o.id === "ok") return perguntar("tipo");
        if (o.id === "mais") return void router.push("/cardapio");
        if (o.id === "form") return void router.push("/pedido/formulario");
        return perguntar("remover");
      case "remover":
        if (o.id !== "voltar") alterarQuantidade(o.id, -1);
        await dormir(0);
        return perguntar("confirma");
      case "tipo":
        d.tipo = o.id as TipoPedido;
        return perguntar("nome");
      case "bairro":
        d.bairroId = o.id;
        return perguntar("cupom");
      case "cupom":
        return o.id === "sim" ? perguntar("cupom-texto") : perguntar("pagamento");
      case "pagamento":
        d.forma = o.id as FormaPagamento;
        return d.forma === "dinheiro" ? perguntar("troco") : perguntar("obs");
      case "troco":
        if (o.id === "nao") {
          d.trocoCents = null;
          return perguntar("obs");
        }
        return perguntar("troco-texto");
      case "obs":
        if (o.id === "nao") {
          d.obs = "";
          return perguntar("resumo");
        }
        return perguntar("obs-texto");
      case "resumo":
        if (o.id === "enviar") return enviar();
        if (o.id === "corrigir") {
          dados.current = vazio();
          if (!(await falar("tipo", { texto: "Sem problema, vamos refazer os dados. O carrinho continua o mesmo 😉" }))) return;
          return perguntar("tipo");
        }
        gen.current += 1;
        await falar("fim", { texto: "Pedido cancelado. Seu carrinho continua guardado se quiser voltar.", link: { rotulo: "Voltar ao cardápio", href: "/cardapio" } });
        return;
      default:
        return;
    }
  }

  async function enviarTexto() {
    const t = texto.trim();
    const e = entrada;
    if (!e || !t) return;
    const d = dados.current;
    setTexto("");
    setEntrada(null);
    switch (e) {
      case "nome":
        eu("nome", t);
        if (!nomeValido(t)) {
          if (await falar("nome", { texto: "Hmm, não consegui entender o nome. Pode digitar de novo?" })) pedirTexto("nome");
          return;
        }
        d.nome = t;
        return perguntar("telefone");
      case "telefone":
        eu("telefone", t);
        if (!telefoneValido(t)) {
          if (await falar("telefone", { texto: "Esse número parece incompleto. Digite com DDD, por exemplo (11) 91234-5678." })) pedirTexto("telefone");
          return;
        }
        d.telefone = t;
        return d.tipo === "entrega" ? perguntar("endereco") : perguntar("cupom");
      case "endereco":
        eu("endereco", t);
        if (!enderecoValido(t)) {
          if (await falar("endereco", { texto: "Preciso da rua **e do número**, por exemplo: Rua das Flores, 120 apto 4." })) pedirTexto("endereco");
          return;
        }
        d.endereco = t;
        return perguntar("bairro");
      case "cupom": {
        eu("cupom-texto", t.toUpperCase());
        setDigitando(true);
        const r = await conferirCupom(t, subtotalAgora());
        setDigitando(false);
        if (!r.ok) {
          if (await falar("cupom", { texto: `${r.erro}` })) mostrar("cupom", [{ id: "sim", rotulo: "🎟️ Tentar outro cupom" }, { id: "nao", rotulo: "Seguir sem cupom", tom: "neutro" }]);
          return;
        }
        d.cupom = { codigo: r.codigo, desconto_cents: r.desconto_cents };
        if (!(await falar("cupom", { texto: `Cupom **${r.codigo}** aplicado! 🎉 Você economiza **${formatBRL(r.desconto_cents)}**.` }))) return;
        return perguntar("pagamento");
      }
      case "troco": {
        eu("troco-texto", t);
        const v = validarTroco(t, total());
        if (!v.ok) {
          if (await falar("troco-texto", { texto: v.erro })) pedirTexto("troco");
          return;
        }
        d.trocoCents = v.cents;
        return perguntar("obs");
      }
      case "obs":
        eu("obs-texto", t);
        d.obs = t.slice(0, 300);
        return perguntar("resumo");
    }
  }

  /* ----- efeitos ----- */
  useEffect(() => {
    void comecar();
    return () => {
      gen.current += 1;
    };
    // roda uma vez; o carrinho é lido de refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cont = rolagem.current;
    if (!cont) return;
    fim.current?.scrollIntoView({ behavior: reduzMovimento() ? "auto" : "smooth", block: "end" });
  }, [msgs, digitando, bandeja]);

  useEffect(() => {
    if (entrada && !digitando) campo.current?.focus({ preventScroll: true });
  }, [entrada, digitando]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const atualizar = () => setViewport(mq.matches ? { h: Math.round(vv.height), top: Math.round(vv.offsetTop) } : null);
    atualizar();
    vv.addEventListener("resize", atualizar);
    vv.addEventListener("scroll", atualizar);
    return () => {
      vv.removeEventListener("resize", atualizar);
      vv.removeEventListener("scroll", atualizar);
    };
  }, []);

  const rotuloEntrada: Record<Entrada, string> = { nome: "Digite o seu nome", telefone: "(11) 91234-5678", endereco: "Rua, número e complemento", cupom: "Código do cupom", troco: "Ex.: 100,00", obs: "Escreva a observação" };

  return (
    <section
      aria-label="Pedido por conversa"
      style={viewport ? { height: viewport.h, top: viewport.top, bottom: "auto" } : undefined}
      className="fixed inset-0 z-50 flex flex-col bg-creme-2 md:static md:z-auto md:mx-auto md:h-[min(46rem,calc(100dvh-4rem))] md:w-full md:max-w-md md:overflow-hidden md:rounded-[2rem] md:border md:border-linha md:shadow-suave"
    >
      <header className="flex items-center gap-2.5 bg-carvao px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] text-white">
        <Link href="/cardapio" aria-label="Voltar ao cardápio" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
          <span aria-hidden>←</span>
        </Link>
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-queijo text-xl">🍕</span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-semibold">{config.nome}</p>
          <p className="truncate text-xs text-white/70" aria-live="polite">{digitando ? "digitando…" : "atendimento · online"}</p>
        </div>
        <button type="button" onClick={() => void comecar()} aria-label="Recomeçar a conversa" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
          <span aria-hidden>↻</span>
        </button>
      </header>

      <div ref={rolagem} className="chat-fundo min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        <div role="log" aria-live="polite" aria-relevant="additions" className="flex flex-col gap-1.5">
          {msgs.map((m) => <Balao key={m.id} m={m} />)}
          {digitando ? <Digitando /> : null}
        </div>
        {bandeja && !digitando ? (
          <ul className="balao-entra mt-2 grid gap-2" role="group" aria-label="Opções de resposta">
            {bandeja.opcoes.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => void escolher(bandeja.etapa, o)} className={classeOpcao(o)}>
                  <span className="block">
                    <span className="block leading-tight">{o.rotulo}</span>
                    {o.detalhe ? <span className="mt-0.5 block text-[0.8rem] font-normal opacity-70">{o.detalhe}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div ref={fim} aria-hidden />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enviarTexto();
        }}
        className="flex items-center gap-2 border-t border-linha bg-creme px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
      >
        <input
          ref={campo}
          value={texto}
          onChange={(e) => setTexto(entrada === "telefone" ? formatTelefone(e.target.value) : e.target.value)}
          disabled={!entrada || digitando}
          placeholder={entrada ? rotuloEntrada[entrada] : "Toque em uma das opções 👆"}
          aria-label="Campo de resposta"
          inputMode={entrada === "telefone" ? "tel" : entrada === "troco" ? "decimal" : "text"}
          autoComplete={entrada === "nome" ? "name" : entrada === "telefone" ? "tel" : entrada === "endereco" ? "street-address" : "off"}
          enterKeyHint="send"
          maxLength={entrada === "obs" ? 300 : 120}
          className="campo min-h-11 flex-1 rounded-full px-4 py-2 disabled:bg-white/60"
        />
        <button type="submit" aria-label="Enviar" disabled={!entrada || !texto.trim() || digitando} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tomate text-white disabled:opacity-40">
          <span aria-hidden>➤</span>
        </button>
      </form>
    </section>
  );
}
