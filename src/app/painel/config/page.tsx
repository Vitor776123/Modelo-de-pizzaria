import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { getConfig } from "@/lib/cardapio";
import { FormAcao } from "@/components/form-acao";
import { deCentavos } from "@/lib/dinheiro";
import { mpAtivo } from "@/lib/mercadopago";
import { Titulo } from "@/app/painel/ui";
import { salvarConfig } from "@/app/painel/config/actions";

export const metadata: Metadata = { title: "Configurações" };

const Caixa = ({ nome, rotulo, marcado }: { nome: string; rotulo: string; marcado: boolean }) => (
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={nome} defaultChecked={marcado} /> {rotulo}</label>
);

export default async function Page() {
  await exigirAdmin();
  const c = await getConfig();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Titulo titulo="Configurações" descricao="Dados da pizzaria, formas de pedido e de pagamento." />
      <FormAcao acao={salvarConfig} rotulo="Salvar configurações" classeBotao="btn btn-principal" className="space-y-8">
        <section className="space-y-3 rounded-3xl border border-linha bg-white p-5 shadow-suave sm:p-6">
          <h2 className="text-2xl">A pizzaria</h2>
          <div><label className="rotulo" htmlFor="nome">Nome</label><input id="nome" name="nome" className="campo" defaultValue={c.nome} required /></div>
          <div><label className="rotulo" htmlFor="slogan">Frase de apresentação</label><input id="slogan" name="slogan" className="campo" defaultValue={c.slogan} /></div>
          <div><label className="rotulo" htmlFor="horario_texto">Horário (texto que o cliente lê)</label><input id="horario_texto" name="horario_texto" className="campo" defaultValue={c.horario_texto} required /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="rotulo" htmlFor="whatsapp">WhatsApp (com DDD)</label><input id="whatsapp" name="whatsapp" inputMode="tel" className="campo" defaultValue={c.whatsapp ?? ""} placeholder="11999998888" /></div>
            <div><label className="rotulo" htmlFor="instagram">Instagram (sem @)</label><input id="instagram" name="instagram" className="campo" defaultValue={c.instagram ?? ""} /></div>
          </div>
          <div><label className="rotulo" htmlFor="endereco">Endereço (aparece na retirada)</label><input id="endereco" name="endereco" className="campo" defaultValue={c.endereco ?? ""} /></div>
        </section>

        <section className="space-y-3 rounded-3xl border border-linha bg-white p-5 shadow-suave sm:p-6">
          <h2 className="text-2xl">Pedidos</h2>
          <div className="flex flex-wrap gap-5"><Caixa nome="aceita_entrega" rotulo="Entrega" marcado={c.aceita_entrega} /><Caixa nome="aceita_retirada" rotulo="Retirada no balcão" marcado={c.aceita_retirada} /></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="rotulo" htmlFor="pedido_minimo">Pedido mínimo (R$)</label><input id="pedido_minimo" name="pedido_minimo" inputMode="decimal" className="campo" defaultValue={deCentavos(c.pedido_minimo_cents)} /></div>
            <div><label className="rotulo" htmlFor="tempo_entrega_min">Tempo de entrega (min)</label><input id="tempo_entrega_min" name="tempo_entrega_min" type="number" min={5} className="campo" defaultValue={c.tempo_entrega_min} /></div>
            <div><label className="rotulo" htmlFor="tempo_retirada_min">Tempo de retirada (min)</label><input id="tempo_retirada_min" name="tempo_retirada_min" type="number" min={5} className="campo" defaultValue={c.tempo_retirada_min} /></div>
          </div>
        </section>

        <section className="space-y-3 rounded-3xl border border-linha bg-white p-5 shadow-suave sm:p-6">
          <h2 className="text-2xl">Pagamento</h2>
          <div className="flex flex-wrap gap-5">
            <Caixa nome="aceita_pix_online" rotulo="PIX online" marcado={c.aceita_pix_online} />
            <Caixa nome="aceita_dinheiro" rotulo="Dinheiro na entrega" marcado={c.aceita_dinheiro} />
            <Caixa nome="aceita_cartao_entrega" rotulo="Cartão na entrega" marcado={c.aceita_cartao_entrega} />
          </div>
          <p className={`selo ${mpAtivo() ? "selo-ok" : "selo-alerta"}`}>
            {mpAtivo() ? "Mercado Pago ligado: o PIX é gerado e confirmado automaticamente" : "Mercado Pago não configurado: o cliente paga pela chave/QR abaixo e a equipe confirma no painel"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="rotulo" htmlFor="pix_chave">Chave PIX</label><input id="pix_chave" name="pix_chave" className="campo" defaultValue={c.pix_chave ?? ""} /></div>
            <div><label className="rotulo" htmlFor="pix_favorecido">Nome do favorecido</label><input id="pix_favorecido" name="pix_favorecido" className="campo" defaultValue={c.pix_favorecido ?? ""} /></div>
          </div>
          <div>
            <label className="rotulo" htmlFor="qr_pix">QR Code do PIX (imagem)</label>
            <input id="qr_pix" name="qr_pix" type="file" accept="image/jpeg,image/png,image/webp" className="campo" />
            {c.qr_pix_url ? <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="remover_qr" /> Remover QR atual</label> : null}
          </div>
        </section>
      </FormAcao>
    </div>
  );
}
