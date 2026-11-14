"use client";

import { useSyncExternalStore } from "react";

export type ItemCarrinho = {
  tamanhoId: string;
  produtoId: string;
  nome: string;
  tamanho: string;
  preco_cents: number;
  quantidade: number;
};

const CHAVE = "pizzaria-carrinho-v1";
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
    if (Array.isArray(dados)) itens = dados.filter((i) => i && typeof i.tamanhoId === "string" && i.quantidade > 0);
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

export function adicionarAoCarrinho(item: Omit<ItemCarrinho, "quantidade">) {
  ler();
  const existente = itens.find((i) => i.tamanhoId === item.tamanhoId);
  gravar(
    existente
      ? itens.map((i) => (i.tamanhoId === item.tamanhoId ? { ...i, quantidade: Math.min(20, i.quantidade + 1) } : i))
      : [...itens, { ...item, quantidade: 1 }],
  );
}

export function alterarQuantidade(tamanhoId: string, delta: number) {
  ler();
  gravar(itens.map((i) => (i.tamanhoId === tamanhoId ? { ...i, quantidade: Math.min(20, i.quantidade + delta) } : i)).filter((i) => i.quantidade > 0));
}

export function limparCarrinho() {
  gravar([]);
}
