import "server-only";
import { db } from "@/lib/supabase/admin";
import type { Bairro, Categoria, Config, Produto, Tamanho } from "@/lib/tipos";

function falhou(contexto: string, erro: { message: string; code?: string } | null): never {
  const dica =
    erro?.code === "PGRST106" || /schema/i.test(erro?.message ?? "")
      ? " (o schema 'modelo_pizzaria' precisa estar em Settings > API > Exposed schemas no Supabase)"
      : "";
  throw new Error(`${contexto}: ${erro?.message ?? "erro desconhecido"}${dica}`);
}

export async function getConfig(): Promise<Config> {
  const { data, error } = await db().from("configuracoes").select("*").eq("id", true).single();
  if (error || !data) falhou("Falha ao ler configurações", error);
  return data as Config;
}

type LinhaProduto = Omit<Produto, "tamanhos"> & { tamanhos: Tamanho[] | null };

/** Cardápio agrupado por categoria. No site público só entra o que está ativo e tem ao menos um tamanho. */
export async function listarCardapio(opts: { incluirInativos?: boolean } = {}): Promise<Categoria[]> {
  let qc = db().from("categorias").select("*").order("ordem").order("nome");
  if (!opts.incluirInativos) qc = qc.eq("ativo", true);
  const [cats, prods] = await Promise.all([
    qc,
    db().from("produtos").select("*, tamanhos(*)").order("ordem").order("nome"),
  ]);
  if (cats.error) falhou("Falha ao ler categorias", cats.error);
  if (prods.error) falhou("Falha ao ler produtos", prods.error);

  const produtos = (prods.data as unknown as LinhaProduto[]).map((p) => ({
    ...p,
    tamanhos: (p.tamanhos ?? []).filter((t) => opts.incluirInativos || t.ativo).sort((a, b) => a.ordem - b.ordem),
  }));

  return (cats.data as Omit<Categoria, "produtos">[])
    .map((c) => ({
      ...c,
      produtos: produtos.filter(
        (p) => p.categoria_id === c.id && (opts.incluirInativos || (p.ativo && p.tamanhos.length > 0)),
      ),
    }))
    .filter((c) => opts.incluirInativos || c.produtos.length > 0);
}

export async function listarBairros(opts: { incluirInativos?: boolean } = {}): Promise<Bairro[]> {
  let q = db().from("bairros").select("*").order("nome");
  if (!opts.incluirInativos) q = q.eq("ativo", true);
  const { data, error } = await q;
  if (error) falhou("Falha ao ler bairros", error);
  return data as Bairro[];
}

export { falhou };
