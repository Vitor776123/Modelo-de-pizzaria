import { Suspense } from "react";
import type { Metadata } from "next";
import { getConfig, listarBairros } from "@/lib/cardapio";
import { FormPedido } from "@/app/pedido/form";

export const metadata: Metadata = { title: "Finalizar pedido", robots: { index: false } };

async function Conteudo() {
  const [config, bairros] = await Promise.all([getConfig(), listarBairros()]);
  return <FormPedido config={config} bairros={bairros} />;
}

export default function Pagina() {
  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 py-8">
      <Suspense fallback={<p aria-busy="true" className="py-20 text-center text-suave">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
