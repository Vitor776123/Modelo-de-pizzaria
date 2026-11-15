"use client";

import { useMemo, useState } from "react";
import type { Adicional, Categoria, Produto } from "@/lib/tipos";
import { adicionarAoCarrinho } from "@/lib/carrinho";
import { precoUnitario } from "@/lib/pedido-calculo";
import { formatBRL } from "@/lib/dinheiro";

/** Folha "Personalizar": meio a meio, borda/adicionais e observação do item. */
export function Personalizar({
  produto,
  categoria,
  tamanhoId,
  adicionais,
  fechar,
  aoAdicionar,
}: {
  produto: Produto;
  categoria: Categoria;
  tamanhoId: string;
  adicionais: Adicional[];
  fechar: () => void;
  aoAdicionar: () => void;
}) {
  const tamanho = produto.tamanhos.find((t) => t.id === tamanhoId) ?? produto.tamanhos[0];
  const [meio, setMeio] = useState(false);
  const [segundoId, setSegundoId] = useState("");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [obs, setObs] = useState("");
  const [bordaId, setBordaId] = useState("");
  const bordas = adicionais.filter((a) => /^borda/i.test(a.nome));
  const outros = adicionais.filter((a) => !/^borda/i.test(a.nome));

  // outros sabores da categoria que têm o mesmo tamanho (mesmo nome) escolhido
  const parceiros = useMemo(
    () =>
      categoria.produtos
        .filter((p) => p.id !== produto.id)
        .map((p) => ({ p, t: p.tamanhos.find((t) => t.nome.trim().toLowerCase() === tamanho.nome.trim().toLowerCase()) }))
        .filter((x): x is { p: Produto; t: NonNullable<typeof x.t> } => Boolean(x.t)),
    [categoria.produtos, produto.id, tamanho.nome],
  );
  const segundo = parceiros.find((x) => x.p.id === segundoId);
  const extras = [...bordas.filter((b) => b.id === bordaId), ...outros.filter((a) => marcados.has(a.id))];
  const unit = precoUnitario(tamanho.preco_cents, meio && segundo ? segundo.t.preco_cents : null, extras.map((e) => e.preco_cents));
  const podeMeio = categoria.permite_meio_a_meio && parceiros.length > 0;
  const pronto = !meio || Boolean(segundo);

  function adicionar() {
    adicionarAoCarrinho({
      tamanhoId: tamanho.id,
      tamanho2Id: meio && segundo ? segundo.t.id : undefined,
      produtoId: produto.id,
      nome: meio && segundo ? `½ ${produto.nome} + ½ ${segundo.p.nome}` : produto.nome,
      tamanho: tamanho.nome,
      preco_cents: unit,
      extras: extras.map((e) => ({ id: e.id, nome: e.nome, preco_cents: e.preco_cents })),
      observacao: obs.trim() || undefined,
    });
    aoAdicionar();
    fechar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center" role="dialog" aria-modal="true" aria-label={`Personalizar ${produto.nome}`} onClick={fechar}>
      <div className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-creme p-5 text-carvao shadow-2xl md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl">{produto.nome}</h2>
            <p className="text-sm text-suave">Tamanho {tamanho.nome}</p>
          </div>
          <button type="button" onClick={fechar} className="btn btn-contorno btn-pequeno">Fechar</button>
        </div>

        {podeMeio ? (
          <section className="mb-5" aria-labelledby="p-meio">
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4">
              <span>
                <span id="p-meio" className="block font-bold">Meio a meio</span>
                <span className="text-sm text-suave">Metade {produto.nome}, metade outro sabor. Vale o preço do mais caro.</span>
              </span>
              <input type="checkbox" className="h-6 w-6 accent-[var(--color-tomate)]" checked={meio} onChange={(e) => setMeio(e.target.checked)} />
            </label>
            {meio ? (
              <div className="mt-3 space-y-2" role="radiogroup" aria-label="Outro sabor">
                {parceiros.map(({ p, t }) => (
                  <button key={p.id} type="button" role="radio" aria-checked={segundoId === p.id} onClick={() => setSegundoId(p.id)} className={`flex w-full items-center justify-between rounded-2xl border-2 p-3 text-left ${segundoId === p.id ? "border-tomate bg-white" : "border-linha bg-white/60"}`}>
                    <span>
                      <span className="block font-bold">{p.nome}</span>
                      <span className="text-sm text-suave">{p.descricao}</span>
                    </span>
                    <span className="tabular shrink-0 pl-3 text-sm">{formatBRL(t.preco_cents)}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {bordas.length > 0 ? (
          <section className="mb-5" aria-labelledby="p-borda">
            <h3 id="p-borda" className="mb-2 text-xl">Borda</h3>
            <div className="space-y-2" role="radiogroup" aria-label="Borda">
              {[{ id: "", nome: "Sem borda", preco_cents: 0 }, ...bordas].map((b) => (
                <button key={b.id || "sem"} type="button" role="radio" aria-checked={bordaId === b.id} onClick={() => setBordaId(b.id)} className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-3 text-left ${bordaId === b.id ? "border-tomate bg-white" : "border-linha bg-white/60"}`}>
                  <span className="font-semibold">{b.nome}</span>
                  <span className="tabular text-sm text-suave">{b.preco_cents > 0 ? `+ ${formatBRL(b.preco_cents)}` : "grátis"}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {outros.length > 0 ? (
          <section className="mb-5" aria-labelledby="p-ad">
            <h3 id="p-ad" className="mb-2 text-xl">Adicionais</h3>
            <div className="space-y-2">
              {outros.map((a) => (
                <label key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3">
                  <span className="font-semibold">{a.nome}</span>
                  <span className="flex items-center gap-3">
                    <span className="tabular text-sm text-suave">{a.preco_cents > 0 ? `+ ${formatBRL(a.preco_cents)}` : "grátis"}</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[var(--color-tomate)]"
                      checked={marcados.has(a.id)}
                      onChange={(e) =>
                        setMarcados((m) => {
                          const n = new Set(m);
                          if (e.target.checked) n.add(a.id);
                          else n.delete(a.id);
                          return n;
                        })
                      }
                    />
                  </span>
                </label>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mb-5">
          <label htmlFor="p-obs" className="rotulo">Observação deste item (opcional)</label>
          <input id="p-obs" className="campo" maxLength={120} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: sem cebola" />
        </div>

        <button type="button" onClick={adicionar} disabled={!pronto} className="btn btn-principal w-full justify-between">
          <span>{pronto ? "Adicionar ao pedido" : "Escolha o outro sabor"}</span>
          <span className="tabular">{formatBRL(unit)}</span>
        </button>
      </div>
    </div>
  );
}
