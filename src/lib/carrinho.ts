"use client";

import { useSyncExternalStore } from "react";

export type ExtraCarrinho = { id: string; nome: string; preco_cents: number };

export type ItemCarrinho = {
  /** Identifica a combinação (sabor + meio a meio + adicionais + observação) para somar quantidades iguais. */
  chave: string;
  tamanhoId: string;
  /** Meio a meio: tamanho do outro sabor. */
  tamanho2Id?: string;
  produtoId: string;
  nome: string;
  tamanho: string;
  /** Preço de uma unidade, só para mostrar; o servidor recalcula tudo. */
  preco_cents: number;
  extras: ExtraCarrinho[];
  observacao?: string;
  quantidade: number;
};

export function chaveDoItem(i: { tamanhoId: string; tamanho2Id?: string; extras: { id: string }[]; observacao?: string }) {
  return [i.tamanhoId, i.tamanho2Id ?? "", i.extras.map((e) => e.id).sort().join(","), (i.observacao ?? "").trim().toLowerCase()].join("|");
}

const CHAVE = "pizzaria-carrinho-v2";
const VAZIO: ItemCarrinho[] = [];
let itens: ItemCarrinho[] = VAZIO;
let lido = false;
const ouvintes = new Set<() => void>();

function ler() {
  if (lido || typeof window === "undefined") return;
  lido = true;
  try {
    const bruto = localStorage.getItem(CHAVE);
    const dados = bruto ? JSON.parse(bruto) : [];
    if (Array.isArray(dados)) itens = dados.filter((i) => i && typeof i.tamanhoId === "string" && typeof i.chave === "string" && Array.isArray(i.extras) && i.quantidade > 0);
  } catch {
    itens = VAZIO;
  }
}

function gravar(novos: ItemCarrinho[]) {
  itens = novos.length ? novos : VAZIO;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {
    // modo privado: o carrinho vale só nesta aba
  }
  ouvintes.forEach((f) => f());
}

function assinar(f: () => void) {
  ler();
  ouvintes.add(f);
  const aoMudar = (e: StorageEvent) => {
    if (e.key === CHAVE) {
      lido = false;
      ler();
      f();
    }
  };
  window.addEventListener("storage", aoMudar);
  return () => {
    ouvintes.delete(f);
    window.removeEventListener("storage", aoMudar);
  };
}

const instantaneo = () => {
  ler();
  return itens;
};

/** Itens do carrinho (guardados no aparelho; no servidor devolve vazio para não divergir do HTML). */
export function useCarrinho() {
  const lista = useSyncExternalStore(assinar, instantaneo, () => VAZIO);
  const quantidade = lista.reduce((s, i) => s + i.quantidade, 0);
  const subtotal = lista.reduce((s, i) => s + i.quantidade * i.preco_cents, 0);
  return { itens: lista, quantidade, subtotal };
}

export function adicionarAoCarrinho(item: Omit<ItemCarrinho, "quantidade" | "chave" | "extras"> & { extras?: ExtraCarrinho[] }) {
  ler();
  const completo = { ...item, extras: item.extras ?? [] };
  const chave = chaveDoItem(completo);
  const existente = itens.find((i) => i.chave === chave);
  gravar(
    existente
      ? itens.map((i) => (i.chave === chave ? { ...i, quantidade: Math.min(20, i.quantidade + 1) } : i))
      : [...itens, { ...completo, chave, quantidade: 1 }],
  );
}

export function alterarQuantidade(chave: string, delta: number) {
  ler();
  gravar(itens.map((i) => (i.chave === chave ? { ...i, quantidade: Math.min(20, i.quantidade + delta) } : i)).filter((i) => i.quantidade > 0));
}

export function limparCarrinho() {
  gravar([]);
}

/** Leitura direta (fora do React), sempre atual: usada pelo chat de pedido. */
export function itensAgora(): ItemCarrinho[] {
  ler();
  return itens;
}
