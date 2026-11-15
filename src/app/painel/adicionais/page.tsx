import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { listarAdicionais, listarCardapio } from "@/lib/cardapio";
import { deCentavos } from "@/lib/dinheiro";
import { FormAcao } from "@/components/form-acao";
import { Cartao, Titulo } from "@/app/painel/ui";
import { excluirAdicional, salvarAdicional } from "@/app/painel/adicionais/actions";

export const metadata: Metadata = { title: "Bordas e adicionais" };

export default async function Page() {
  await exigirAdmin();
  const [adicionais, categorias] = await Promise.all([listarAdicionais({ incluirInativos: true }), listarCardapio({ incluirInativos: true })]);
  const campos = (a?: (typeof adicionais)[number]) => (
    <>
      {a ? <input type="hidden" name="id" value={a.id} /> : null}
      <div className="min-w-44 flex-1"><label className="rotulo" htmlFor={`an-${a?.id ?? "novo"}`}>Nome</label><input id={`an-${a?.id ?? "novo"}`} name="nome" className="campo" defaultValue={a?.nome} placeholder="Borda de catupiry" required /></div>
      <div className="w-28"><label className="rotulo" htmlFor={`ap-${a?.id ?? "novo"}`}>Preço (R$)</label><input id={`ap-${a?.id ?? "novo"}`} name="preco" inputMode="decimal" className="campo" defaultValue={a ? deCentavos(a.preco_cents) : ""} placeholder="8,00" /></div>
      <div className="w-48"><label className="rotulo" htmlFor={`ac-${a?.id ?? "novo"}`}>Vale para</label>
        <select id={`ac-${a?.id ?? "novo"}`} name="categoria_id" className="campo" defaultValue={a?.categoria_id ?? ""}>
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      {a ? <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="ativo" defaultChecked={a.ativo} /> Disponível</label> : null}
    </>
  );
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Titulo titulo="Bordas e adicionais" descricao="Extras que o cliente escolhe ao pedir: borda recheada, bacon extra, queijo extra…" />
      {adicionais.map((a) => (
        <Cartao key={a.id}>
          <FormAcao acao={salvarAdicional} className="flex flex-wrap items-end gap-3">{campos(a)}</FormAcao>
          <FormAcao acao={excluirAdicional} rotulo="Excluir" classeBotao="btn btn-pequeno btn-contorno" confirmar={`Excluir ${a.nome}?`}><input type="hidden" name="id" value={a.id} /></FormAcao>
        </Cartao>
      ))}
      <div className="rounded-3xl border-2 border-dashed border-linha p-5">
        <FormAcao acao={salvarAdicional} rotulo="Adicionar" className="flex flex-wrap items-end gap-3">{campos()}</FormAcao>
      </div>
    </div>
  );
}
