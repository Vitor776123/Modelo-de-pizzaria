import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { listarBairros } from "@/lib/cardapio";
import { FormAcao } from "@/components/form-acao";
import { deCentavos } from "@/lib/dinheiro";
import { Cartao, Titulo } from "@/app/painel/ui";
import { excluirBairro, salvarBairro } from "@/app/painel/bairros/actions";

export const metadata: Metadata = { title: "Entrega" };

export default async function Page() {
  await exigirAdmin();
  const bairros = await listarBairros({ incluirInativos: true });
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Titulo titulo="Entrega" descricao="O cliente escolhe o bairro no pedido; a taxa é somada ao total e o tempo estimado aparece no acompanhamento." />
      {bairros.map((b) => (
        <Cartao key={b.id}>
          <FormAcao acao={salvarBairro} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={b.id} />
            <div className="min-w-48 flex-1"><label className="rotulo" htmlFor={`bn-${b.id}`}>Bairro</label><input id={`bn-${b.id}`} name="nome" className="campo" defaultValue={b.nome} required /></div>
            <div className="w-28"><label className="rotulo" htmlFor={`bt-${b.id}`}>Taxa (R$)</label><input id={`bt-${b.id}`} name="taxa" inputMode="decimal" className="campo" defaultValue={deCentavos(b.taxa_cents)} /></div>
            <div className="w-28"><label className="rotulo" htmlFor={`bm-${b.id}`}>Tempo (min)</label><input id={`bm-${b.id}`} name="tempo_min" inputMode="numeric" className="campo" defaultValue={b.tempo_min ?? ""} placeholder="padrão" /></div>
            <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="ativo" defaultChecked={b.ativo} /> Atendemos</label>
          </FormAcao>
          <FormAcao acao={excluirBairro} rotulo="Excluir" classeBotao="btn btn-pequeno btn-contorno" confirmar={`Excluir ${b.nome}?`}>
            <input type="hidden" name="id" value={b.id} />
          </FormAcao>
        </Cartao>
      ))}
      <div className="rounded-3xl border-2 border-dashed border-linha p-5">
        <FormAcao acao={salvarBairro} rotulo="Adicionar bairro" className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1"><label className="rotulo" htmlFor="b-novo">Novo bairro</label><input id="b-novo" name="nome" className="campo" required /></div>
          <div className="w-28"><label className="rotulo" htmlFor="b-taxa">Taxa (R$)</label><input id="b-taxa" name="taxa" inputMode="decimal" className="campo" placeholder="8,00" /></div>
          <div className="w-28"><label className="rotulo" htmlFor="b-tempo">Tempo (min)</label><input id="b-tempo" name="tempo_min" inputMode="numeric" className="campo" placeholder="padrão" /></div>
        </FormAcao>
      </div>
    </div>
  );
}
