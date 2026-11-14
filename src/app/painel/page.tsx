import { listarPedidosPainel } from "@/lib/pedidos";
import { getConfig } from "@/lib/cardapio";
import { exigirMembro } from "@/lib/auth";
import { Quadro } from "@/app/painel/quadro";

export default async function Page() {
  await exigirMembro();
  const [{ ativos, recentes }, config] = await Promise.all([listarPedidosPainel(), getConfig()]);
  return <Quadro ativos={ativos} recentes={recentes} aberto={config.aberto} vapid={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />;
}
