import { Suspense } from "react";
import { getConfig, listarCardapio } from "@/lib/cardapio";
import { Inicio } from "@/components/inicio";

async function Conteudo() {
  const [config, categorias] = await Promise.all([getConfig(), listarCardapio()]);
  return <Inicio config={config} categorias={categorias} />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="grid h-dvh place-items-center bg-carvao text-queijo" aria-busy="true">Acendendo o forno…</div>}>
      <Conteudo />
    </Suspense>
  );
}
