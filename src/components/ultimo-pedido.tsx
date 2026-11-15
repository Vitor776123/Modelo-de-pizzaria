"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { IconeSetaDireita } from "@/components/icones";

const CHAVE = "pizzaria-ultimo-pedido";

export function guardarUltimoPedido(token: string, numero?: number) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ token, numero, em: Date.now() }));
  } catch {
    /* modo privado: sem atalho */
  }
}

function ler(): string {
  try {
    return localStorage.getItem(CHAVE) ?? "";
  } catch {
    return "";
  }
}
const assinar = (f: () => void) => {
  window.addEventListener("storage", f);
  return () => window.removeEventListener("storage", f);
};

/** Atalho "acompanhar meu pedido" para quem já pediu neste aparelho (válido por 12 horas). */
export function UltimoPedido({ className = "" }: { className?: string }) {
  const bruto = useSyncExternalStore(assinar, ler, () => "");
  if (!bruto) return null;
  let dados: { token: string; em: number } | null = null;
  try {
    dados = JSON.parse(bruto);
  } catch {
    return null;
  }
  // eslint-disable-next-line react-hooks/purity
  if (!dados?.token || Date.now() - dados.em > 12 * 3600_000) return null;
  return (
    <Link href={`/acompanhar/${dados.token}`} className={`flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left backdrop-blur ${className}`}>
      <span>
        <span className="block text-xs font-bold uppercase tracking-wider text-queijo">Pedido em andamento</span>
        <span className="font-semibold">Acompanhar meu pedido</span>
      </span>
      <IconeSetaDireita className="h-5 w-5 shrink-0 text-queijo" />
    </Link>
  );
}
