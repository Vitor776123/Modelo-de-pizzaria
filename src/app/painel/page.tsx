import { listarPedidosPainel, resumoHoje } from "@/lib/pedidos";
import { getConfig } from "@/lib/cardapio";
import { exigirMembro } from "@/lib/auth";
import { Quadro } from "@/app/painel/quadro";

export default async function Page() {
  await exigirMembro();
  const [{ ativos, recentes }, config, resumo] = await Promise.all([listarPedidosPainel(), getConfig(), resumoHoje()]);
  return (
    <Quadro
      ativos={ativos}
      recentes={recentes}
      aberto={config.aberto_manual}
      fechadaPorHorario={config.fechada_por_horario}
      resumo={resumo}
      vapid={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
    />
  );
}
