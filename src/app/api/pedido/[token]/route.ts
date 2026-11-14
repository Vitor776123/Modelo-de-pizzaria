import { pedidoPorToken } from "@/lib/pedidos";

/** Estado do pedido para a tela de acompanhamento atualizar sozinha. */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const p = await pedidoPorToken(token);
  if (!p) return Response.json({ ok: false }, { status: 404 });
  return Response.json(
    { ok: true, status: p.status, pagamento_status: p.pagamento_status, pix_copia_cola: p.pix_copia_cola, eventos: p.eventos },
    { headers: { "Cache-Control": "no-store" } },
  );
}
