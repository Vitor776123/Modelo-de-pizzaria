import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { pedidoPorToken } from "@/lib/pedidos";

const schema = z.object({
  token: z.string().regex(/^[a-f0-9]{36}$/),
  subscription: z.object({
    endpoint: z.url().max(1000),
    keys: z.object({ p256dh: z.string().max(300), auth: z.string().max(100) }),
  }),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  const { token, subscription } = parsed.data;
  const ped = await pedidoPorToken(token);
  if (!ped) return Response.json({ ok: false }, { status: 404 });
  const { error } = await db().from("push_subscriptions").upsert(
    { endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, pedido_id: ped.id, equipe_user_id: null },
    { onConflict: "endpoint" },
  );
  if (error) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true });
}
