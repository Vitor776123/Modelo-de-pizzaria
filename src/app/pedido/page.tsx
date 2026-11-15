import { Suspense } from "react";
import type { Metadata } from "next";
import { getConfig, listarBairros } from "@/lib/cardapio";
import { ChatPedido } from "@/app/pedido/chat";

export const metadata: Metadata = { title: "Finalizar pedido", robots: { index: false } };

async function Conteudo() {
  const [config, bairros] = await Promise.all([getConfig(), listarBairros()]);
  return <ChatPedido config={config} bairros={bairros} />;
}

export default function Pagina() {
  return (
    <Suspense fallback={<p aria-busy="true" className="grid min-h-dvh place-items-center text-suave">Abrindo o atendimento…</p>}>
      <Conteudo />
    </Suspense>
  );
}
