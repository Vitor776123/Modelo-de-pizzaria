import "server-only";
import { db } from "@/lib/supabase/admin";
import type { Adicional, Bairro, Categoria, Config, Cupom, Horario, Produto, Tamanho } from "@/lib/tipos";
import { dentroDoHorario } from "@/lib/horario";

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
  const base = data as Omit<Config, "aberto_manual" | "fechada_por_horario">;
  // `aberto` = chave manual ligada E dentro do horário (quando o horário automático está ligado).
  const horarios = base.usar_horarios ? await listarHorarios() : [];
  const noHorario = dentroDoHorario(base.usar_horarios, horarios);
  return { ...base, aberto_manual: base.aberto, fechada_por_horario: base.aberto && !noHorario, aberto: base.aberto && noHorario };
}

export async function listarHorarios(): Promise<Horario[]> {
  const { data, error } = await db().from("horarios").select("*").order("dia_semana");
  if (error) falhou("Falha ao ler horários", error);
  return data as Horario[];
}

export async function listarAdicionais(opts: { incluirInativos?: boolean } = {}): Promise<Adicional[]> {
  let q = db().from("adicionais").select("*").order("ordem").order("nome");
  if (!opts.incluirInativos) q = q.eq("ativo", true);
  const { data, error } = await q;
  if (error) falhou("Falha ao ler adicionais", error);
  return data as Adicional[];
}

export async function listarCupons(): Promise<Cupom[]> {
  const { data, error } = await db().from("cupons").select("*").order("codigo");
  if (error) falhou("Falha ao ler cupons", error);
  return data as Cupom[];
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
