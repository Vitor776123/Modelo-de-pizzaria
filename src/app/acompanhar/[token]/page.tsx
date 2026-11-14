import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getConfig } from "@/lib/cardapio";
import { pedidoPorToken } from "@/lib/pedidos";
import { Acompanhamento } from "@/app/acompanhar/[token]/acompanhamento";

export const metadata: Metadata = { title: "Acompanhar pedido", robots: { index: false, follow: false } };

async function Conteudo({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [pedido, config] = await Promise.all([pedidoPorToken(token), getConfig()]);
  if (!pedido) notFound();
  return <Acompanhamento inicial={pedido} config={config} />;
}

export default function Pagina({ params }: { params: Promise<{ token: string }> }) {
  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 py-8">
      <Suspense fallback={<p aria-busy="true" className="py-20 text-center text-suave">Buscando o seu pedido…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}
