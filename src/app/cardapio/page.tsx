import { Suspense } from "react";
import { getConfig, listarAdicionais, listarCardapio } from "@/lib/cardapio";
import { Feed } from "@/components/feed";

async function Cardapio() {
  const [config, categorias, adicionais] = await Promise.all([getConfig(), listarCardapio(), listarAdicionais()]);
  return <Feed config={config} categorias={categorias} adicionais={adicionais} />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="grid h-dvh place-items-center bg-carvao text-queijo" aria-busy="true">Preparando o forno…</div>}>
      <Cardapio />
    </Suspense>
  );
}
