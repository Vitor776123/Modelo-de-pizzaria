import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { exigirMembro } from "@/lib/auth";
import { sair } from "@/app/entrar/actions";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel" }, robots: { index: false, follow: false } };

async function Topo() {
  const m = await exigirMembro();
  const links = [
    { href: "/painel", t: "Pedidos" },
    ...(m.papel === "admin"
      ? [
          { href: "/painel/cardapio", t: "Cardápio" },
          { href: "/painel/bairros", t: "Entrega" },
          { href: "/painel/config", t: "Configurações" },
        ]
      : []),
  ];
  return (
    <header className="sticky top-0 z-20 border-b border-linha bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <strong className="text-lg">🍕 Painel</strong>
        <nav aria-label="Painel" className="flex flex-1 flex-wrap gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="btn btn-pequeno btn-contorno">{l.t}</Link>
          ))}
        </nav>
        <form action={sair}>
          <button className="btn btn-pequeno btn-contorno" type="submit">Sair ({m.nome})</button>
        </form>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-creme">
      <Suspense fallback={<div className="h-14" />}><Topo /></Suspense>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Suspense fallback={<p aria-busy="true" className="py-16 text-center text-suave">Carregando…</p>}>{children}</Suspense>
      </main>
    </div>
  );
}
