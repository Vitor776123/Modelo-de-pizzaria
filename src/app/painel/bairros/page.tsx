import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { listarBairros } from "@/lib/cardapio";
import { FormAcao } from "@/components/form-acao";
import { deCentavos } from "@/lib/dinheiro";
import { excluirBairro, salvarBairro } from "@/app/painel/bairros/actions";

export const metadata: Metadata = { title: "Entrega" };

export default async function Page() {
  await exigirAdmin();
  const bairros = await listarBairros({ incluirInativos: true });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl">Bairros e taxas de entrega</h1>
        <p className="mt-1 text-suave">O cliente escolhe o bairro no pedido e a taxa é somada ao total automaticamente.</p>
      </header>
      {bairros.map((b) => (
        <div key={b.id} className="rounded-2xl bg-white p-4 shadow-suave">
          <FormAcao acao={salvarBairro} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={b.id} />
            <div className="min-w-48 flex-1"><label className="rotulo" htmlFor={`bn-${b.id}`}>Bairro</label><input id={`bn-${b.id}`} name="nome" className="campo" defaultValue={b.nome} required /></div>
            <div className="w-32"><label className="rotulo" htmlFor={`bt-${b.id}`}>Taxa (R$)</label><input id={`bt-${b.id}`} name="taxa" inputMode="decimal" className="campo" defaultValue={deCentavos(b.taxa_cents)} /></div>
            <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="ativo" defaultChecked={b.ativo} /> Atendemos</label>
          </FormAcao>
          <FormAcao acao={excluirBairro} rotulo="Excluir" classeBotao="btn btn-pequeno btn-contorno" confirmar={`Excluir ${b.nome}?`}>
            <input type="hidden" name="id" value={b.id} />
          </FormAcao>
        </div>
      ))}
      <div className="rounded-2xl border-2 border-dashed border-linha p-4">
        <FormAcao acao={salvarBairro} rotulo="Adicionar bairro" className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1"><label className="rotulo" htmlFor="b-novo">Novo bairro</label><input id="b-novo" name="nome" className="campo" required /></div>
          <div className="w-32"><label className="rotulo" htmlFor="b-taxa">Taxa (R$)</label><input id="b-taxa" name="taxa" inputMode="decimal" className="campo" placeholder="8,00" /></div>
        </FormAcao>
      </div>
    </div>
  );
}
