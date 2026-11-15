import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { listarCupons } from "@/lib/cardapio";
import { deCentavos } from "@/lib/dinheiro";
import { FormAcao } from "@/components/form-acao";
import { Cartao, Titulo } from "@/app/painel/ui";
import { excluirCupom, salvarCupom } from "@/app/painel/cupons/actions";

export const metadata: Metadata = { title: "Cupons" };

export default async function Page() {
  await exigirAdmin();
  const cupons = await listarCupons();
  const campos = (c?: (typeof cupons)[number]) => {
    const k = c?.id ?? "novo";
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {c ? <input type="hidden" name="id" value={c.id} /> : null}
        <div><label className="rotulo" htmlFor={`cc-${k}`}>Código</label><input id={`cc-${k}`} name="codigo" className="campo uppercase" defaultValue={c?.codigo} placeholder="BEMVINDO10" required /></div>
        <div><label className="rotulo" htmlFor={`ct-${k}`}>Tipo</label>
          <select id={`ct-${k}`} name="tipo" className="campo" defaultValue={c?.tipo ?? "percentual"}><option value="percentual">Porcentagem (%)</option><option value="valor">Valor fixo (R$)</option></select>
        </div>
        <div><label className="rotulo" htmlFor={`cv-${k}`}>Desconto</label><input id={`cv-${k}`} name="valor" inputMode="decimal" className="campo" defaultValue={c ? (c.tipo === "valor" ? deCentavos(c.valor) : c.valor) : ""} placeholder="10" required /></div>
        <div><label className="rotulo" htmlFor={`cm-${k}`}>Pedido mínimo (R$)</label><input id={`cm-${k}`} name="minimo" inputMode="decimal" className="campo" defaultValue={c ? deCentavos(c.minimo_cents) : ""} placeholder="40,00" /></div>
        <div><label className="rotulo" htmlFor={`cd-${k}`}>Válido até</label><input id={`cd-${k}`} type="date" name="validade" className="campo" defaultValue={c?.validade ?? ""} /></div>
        <div><label className="rotulo" htmlFor={`cu-${k}`}>Limite de usos</label><input id={`cu-${k}`} name="usos_max" inputMode="numeric" className="campo" defaultValue={c?.usos_max ?? ""} placeholder="sem limite" /></div>
        {c ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ativo" defaultChecked={c.ativo} /> Ativo · usado {c.usos}×</label> : null}
      </div>
    );
  };
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Titulo titulo="Cupons" descricao="O cliente digita o código no pedido e o desconto aparece antes de pagar." />
      {cupons.map((c) => (
        <Cartao key={c.id}>
          <FormAcao acao={salvarCupom}>{campos(c)}</FormAcao>
          <FormAcao acao={excluirCupom} rotulo="Excluir" classeBotao="btn btn-pequeno btn-contorno" confirmar={`Excluir o cupom ${c.codigo}?`}><input type="hidden" name="id" value={c.id} /></FormAcao>
        </Cartao>
      ))}
      <div className="rounded-3xl border-2 border-dashed border-linha p-5">
        <p className="mb-3 font-display text-xl">Novo cupom</p>
        <FormAcao acao={salvarCupom} rotulo="Criar cupom">{campos()}</FormAcao>
      </div>
    </div>
  );
}
