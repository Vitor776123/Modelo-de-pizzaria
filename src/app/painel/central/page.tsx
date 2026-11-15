import type { Metadata } from "next";
import { exigirMembro } from "@/lib/auth";
import { listarPedidosPainel, resumoHoje } from "@/lib/pedidos";
import { getConfig } from "@/lib/cardapio";
import { Central } from "@/app/painel/central/central";

export const metadata: Metadata = { title: "Central de pedidos" };

export default async function Page() {
  await exigirMembro();
  const [{ ativos }, config, resumo] = await Promise.all([listarPedidosPainel(), getConfig(), resumoHoje()]);
  return <Central ativos={ativos} nome={config.nome} aberto={config.aberto_manual} resumo={resumo} />;
}
