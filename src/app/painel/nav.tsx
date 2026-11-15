"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type ItemNav = { href: string; rotulo: string; icone: ReactNode; principal?: boolean };

const ativo = (caminho: string, href: string) => (href === "/painel" ? caminho === "/painel" : caminho.startsWith(href));

/** Menu lateral (computador). */
export function NavLateral({ itens }: { itens: ItemNav[] }) {
  const caminho = usePathname();
  return (
    <nav aria-label="Painel" className="flex flex-col gap-1">
      {itens.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={ativo(caminho, i.href) ? "page" : undefined}
          className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-[0.95rem] font-semibold transition ${ativo(caminho, i.href) ? "bg-queijo text-carvao" : "text-massa hover:bg-white/10 hover:text-white"}`}
        >
          {i.icone}
          {i.rotulo}
        </Link>
      ))}
    </nav>
  );
}

/** Barra inferior (celular): os atalhos principais e "Mais". */
export function NavInferior({ itens }: { itens: ItemNav[] }) {
  const caminho = usePathname();
  const principais = itens.filter((i) => i.principal);
  const emMais = !principais.some((i) => ativo(caminho, i.href));
  return (
    <nav aria-label="Painel" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-carvao pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {principais.map((i) => (
          <li key={i.href}>
            <Link href={i.href} aria-current={ativo(caminho, i.href) ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2.5 text-[0.7rem] font-bold ${ativo(caminho, i.href) ? "text-queijo" : "text-massa/80"}`}>
              {i.icone}
              {i.rotulo}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/painel/mais" aria-current={emMais ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2.5 text-[0.7rem] font-bold ${emMais ? "text-queijo" : "text-massa/80"}`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            Mais
          </Link>
        </li>
      </ul>
    </nav>
  );
}
