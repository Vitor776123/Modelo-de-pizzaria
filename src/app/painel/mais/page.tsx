import Link from "next/link";
import type { Metadata } from "next";
import { exigirMembro } from "@/lib/auth";
import { itensDoMenu } from "@/app/painel/menu";
import { IconeSetaDireita } from "@/components/icones";
import { Titulo } from "@/app/painel/ui";

export const metadata: Metadata = { title: "Mais" };

export default async function Page() {
  const m = await exigirMembro();
  const itens = itensDoMenu(m.papel === "admin").filter((i) => !i.principal);
  return (
    <div className="mx-auto max-w-xl">
      <Titulo titulo="Mais" descricao="Cardápio, entrega, horários e ajustes da pizzaria." />
      {itens.length === 0 ? <p className="text-suave">Seu acesso é de atendente: pedidos e histórico.</p> : null}
      <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-white shadow-suave">
        {itens.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="flex items-center gap-4 px-5 py-4 font-semibold active:bg-creme-2">
              <span className="text-tomate">{i.icone}</span>
              <span className="flex-1">{i.rotulo}</span>
              <IconeSetaDireita className="h-5 w-5 text-suave" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
