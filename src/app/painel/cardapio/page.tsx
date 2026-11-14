import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { listarCardapio } from "@/lib/cardapio";
import { FormAcao } from "@/components/form-acao";
import { deCentavos } from "@/lib/dinheiro";
import type { Categoria, Produto } from "@/lib/tipos";
import { excluirCategoria, excluirProduto, excluirTamanho, salvarCategoria, salvarProduto, salvarTamanho } from "@/app/painel/cardapio/actions";

export const metadata: Metadata = { title: "Cardápio" };

function EditorProduto({ p, categorias }: { p?: Produto; categorias: Categoria[] }) {
  return (
    <FormAcao acao={salvarProduto} rotulo={p ? "Salvar produto" : "Adicionar produto"} className="space-y-3">
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor={`n-${p?.id ?? "novo"}`}>Nome</label>
          <input id={`n-${p?.id ?? "novo"}`} name="nome" className="campo" defaultValue={p?.nome} required maxLength={80} />
        </div>
        <div>
          <label className="rotulo" htmlFor={`c-${p?.id ?? "novo"}`}>Categoria</label>
          <select id={`c-${p?.id ?? "novo"}`} name="categoria_id" className="campo" defaultValue={p?.categoria_id ?? categorias[0]?.id} required>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="rotulo" htmlFor={`d-${p?.id ?? "novo"}`}>Descrição (ingredientes)</label>
        <textarea id={`d-${p?.id ?? "novo"}`} name="descricao" className="campo" defaultValue={p?.descricao} maxLength={400} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div>
          <label className="rotulo" htmlFor={`f-${p?.id ?? "novo"}`}>Foto (JPG, PNG ou WebP, até 5 MB)</label>
          <input id={`f-${p?.id ?? "novo"}`} name="foto" type="file" accept="image/jpeg,image/png,image/webp" className="campo" />
          <p className="ajuda">Prefira fotos verticais e bem iluminadas: elas aparecem em tela cheia no celular.</p>
        </div>
        <div>
          <label className="rotulo" htmlFor={`o-${p?.id ?? "novo"}`}>Ordem</label>
          <input id={`o-${p?.id ?? "novo"}`} name="ordem" type="number" min={0} className="campo" defaultValue={p?.ordem ?? 0} />
        </div>
      </div>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="destaque" defaultChecked={p?.destaque} /> Destaque (aparece primeiro)</label>
        {p ? <label className="flex items-center gap-2"><input type="checkbox" name="ativo" defaultChecked={p.ativo} /> Visível no cardápio</label> : null}
        {p?.foto_url ? <label className="flex items-center gap-2"><input type="checkbox" name="remover_foto" /> Remover foto atual</label> : null}
      </div>
    </FormAcao>
  );
}

export default async function Page() {
  await exigirAdmin();
  const categorias = await listarCardapio({ incluirInativos: true });
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl">Cardápio</h1>
        <p className="mt-1 text-suave">Tudo o que você salvar aqui aparece na hora no site.</p>
      </header>

      <section aria-labelledby="cat-t" className="space-y-3">
        <h2 id="cat-t" className="text-2xl">Categorias</h2>
        {categorias.map((c) => (
          <div key={c.id} className="rounded-2xl bg-white p-4 shadow-suave">
            <FormAcao acao={salvarCategoria} rotulo="Salvar" className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={c.id} />
              <div className="min-w-48 flex-1"><label className="rotulo" htmlFor={`cn-${c.id}`}>Nome</label><input id={`cn-${c.id}`} name="nome" className="campo" defaultValue={c.nome} required /></div>
              <div className="w-24"><label className="rotulo" htmlFor={`co-${c.id}`}>Ordem</label><input id={`co-${c.id}`} name="ordem" type="number" min={0} className="campo" defaultValue={c.ordem} /></div>
              <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="ativo" defaultChecked={c.ativo} /> Visível</label>
            </FormAcao>
            <FormAcao acao={excluirCategoria} rotulo="Excluir categoria" classeBotao="btn btn-pequeno btn-contorno" confirmar={`Excluir a categoria "${c.nome}"?`}>
              <input type="hidden" name="id" value={c.id} />
            </FormAcao>
          </div>
        ))}
        <div className="rounded-2xl border-2 border-dashed border-linha p-4">
          <FormAcao acao={salvarCategoria} rotulo="Adicionar categoria" className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1"><label className="rotulo" htmlFor="cat-nova">Nova categoria</label><input id="cat-nova" name="nome" className="campo" placeholder="Ex.: Pizzas especiais" required /></div>
            <div className="w-24"><label className="rotulo" htmlFor="cat-ordem">Ordem</label><input id="cat-ordem" name="ordem" type="number" min={0} className="campo" defaultValue={categorias.length + 1} /></div>
          </FormAcao>
        </div>
      </section>

      {categorias.map((c) => (
        <section key={c.id} aria-labelledby={`s-${c.id}`} className="space-y-4">
          <h2 id={`s-${c.id}`} className="text-2xl">{c.nome}</h2>
          {c.produtos.length === 0 ? <p className="text-suave">Nenhum produto nesta categoria.</p> : null}
          {c.produtos.map((p) => (
            <details key={p.id} className="rounded-2xl bg-white shadow-suave">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4">
                {p.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.foto_url} alt="" width={56} height={56} className="h-14 w-14 rounded-xl object-cover" />
                ) : <span aria-hidden className="grid h-14 w-14 place-items-center rounded-xl bg-creme text-2xl">🍕</span>}
                <span className="font-bold">{p.nome}</span>
                {!p.ativo ? <span className="selo selo-neutro">Oculto</span> : null}
                {p.destaque ? <span className="selo selo-alerta">Destaque</span> : null}
                <span className="ml-auto text-sm text-suave">{p.tamanhos.map((t) => `${t.nome} ${deCentavos(t.preco_cents)}`).join(" · ") || "Sem tamanhos"}</span>
              </summary>
              <div className="space-y-5 border-t border-linha p-4">
                <EditorProduto p={p} categorias={categorias} />
                <div>
                  <h3 className="text-lg">Tamanhos e preços</h3>
                  <div className="mt-2 space-y-3">
                    {p.tamanhos.map((t) => (
                      <div key={t.id} className="rounded-xl bg-creme p-3">
                        <FormAcao acao={salvarTamanho} rotulo="Salvar" className="flex flex-wrap items-end gap-3">
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="produto_id" value={p.id} />
                          <div className="w-36"><label className="rotulo" htmlFor={`tn-${t.id}`}>Tamanho</label><input id={`tn-${t.id}`} name="nome" className="campo" defaultValue={t.nome} required /></div>
                          <div className="w-32"><label className="rotulo" htmlFor={`tp-${t.id}`}>Preço (R$)</label><input id={`tp-${t.id}`} name="preco" inputMode="decimal" className="campo" defaultValue={deCentavos(t.preco_cents)} required /></div>
                          <div className="w-20"><label className="rotulo" htmlFor={`to-${t.id}`}>Ordem</label><input id={`to-${t.id}`} name="ordem" type="number" min={0} className="campo" defaultValue={t.ordem} /></div>
                          <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="ativo" defaultChecked={t.ativo} /> Disponível</label>
                        </FormAcao>
                        <FormAcao acao={excluirTamanho} rotulo="Excluir tamanho" classeBotao="btn btn-pequeno btn-contorno" confirmar="Excluir este tamanho?">
                          <input type="hidden" name="id" value={t.id} />
                        </FormAcao>
                      </div>
                    ))}
                    <FormAcao acao={salvarTamanho} rotulo="Adicionar tamanho" className="flex flex-wrap items-end gap-3 rounded-xl border-2 border-dashed border-linha p-3">
                      <input type="hidden" name="produto_id" value={p.id} />
                      <div className="w-36"><label className="rotulo" htmlFor={`nt-${p.id}`}>Novo tamanho</label><input id={`nt-${p.id}`} name="nome" className="campo" placeholder="Grande" required /></div>
                      <div className="w-32"><label className="rotulo" htmlFor={`np-${p.id}`}>Preço (R$)</label><input id={`np-${p.id}`} name="preco" inputMode="decimal" className="campo" placeholder="59,90" required /></div>
                      <div className="w-20"><label className="rotulo" htmlFor={`no-${p.id}`}>Ordem</label><input id={`no-${p.id}`} name="ordem" type="number" min={0} className="campo" defaultValue={p.tamanhos.length + 1} /></div>
                    </FormAcao>
                  </div>
                </div>
                <FormAcao acao={excluirProduto} rotulo="Excluir produto" classeBotao="btn btn-pequeno btn-contorno" confirmar={`Excluir "${p.nome}" do cardápio? Para só esconder, desmarque "Visível".`}>
                  <input type="hidden" name="id" value={p.id} />
                </FormAcao>
              </div>
            </details>
          ))}
        </section>
      ))}

      {categorias.length > 0 ? (
        <section aria-labelledby="novo-prod" className="rounded-2xl bg-white p-5 shadow-suave">
          <h2 id="novo-prod" className="mb-3 text-2xl">Novo produto</h2>
          <EditorProduto categorias={categorias} />
          <p className="ajuda">Depois de adicionar, abra o produto na lista para cadastrar tamanhos e preços. Sem tamanho, ele não aparece no site.</p>
        </section>
      ) : null}
    </div>
  );
}
