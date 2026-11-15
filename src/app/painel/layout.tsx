import { Suspense } from "react";
import type { Metadata } from "next";
import { exigirMembro } from "@/lib/auth";
import { sair } from "@/app/entrar/actions";
import { NavInferior, NavLateral } from "@/app/painel/nav";
import { EsqueletoPainel } from "@/app/painel/ui";
import { itensDoMenu } from "@/app/painel/menu";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel" }, robots: { index: false, follow: false } };

async function Moldura({ children }: { children: React.ReactNode }) {
  const m = await exigirMembro();
  const itens = itensDoMenu(m.papel === "admin");
  return (
    <div className="min-h-dvh bg-creme md:grid md:grid-cols-[16.5rem_1fr]">
      <aside className="escuro sticky top-0 hidden h-dvh flex-col justify-between gap-8 bg-carvao p-6 md:flex">
        <div className="space-y-8">
          <p className="font-display text-2xl font-bold text-white">🍕 Painel</p>
          <NavLateral itens={itens} />
        </div>
        <div className="border-t border-white/15 pt-4 text-sm">
          <p className="truncate font-semibold text-white">{m.nome}</p>
          <p className="text-massa/80">{m.papel === "admin" ? "Administrador" : "Atendente"}</p>
          <form action={sair} className="mt-3">
            <button type="submit" className="text-massa underline-offset-4 hover:text-white hover:underline">Sair</button>
          </form>
        </div>
      </aside>

      <header className="escuro sticky top-0 z-30 flex items-center justify-between bg-carvao px-5 pb-3 pt-seguro text-white md:hidden">
        <p className="font-display text-xl font-bold">🍕 Painel</p>
        <form action={sair}><button type="submit" className="text-sm font-semibold text-massa">Sair</button></form>
      </header>

      <main className="min-w-0 overflow-x-clip px-4 pb-28 pt-6 md:px-10 md:pb-10 md:pt-10">{children}</main>
      <NavInferior itens={itens} />
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center bg-creme" aria-busy><EsqueletoPainel /></div>}>
      <Moldura>
        <Suspense fallback={<EsqueletoPainel />}>{children}</Suspense>
      </Moldura>
    </Suspense>
  );
}
