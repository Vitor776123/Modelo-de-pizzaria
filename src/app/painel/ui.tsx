import type { ReactNode } from "react";

export function Titulo({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl sm:text-5xl">{titulo}</h1>
        {descricao ? <p className="mt-2 max-w-2xl text-suave">{descricao}</p> : null}
      </div>
      {acao}
    </div>
  );
}

export function Indicador({ rotulo, valor, nota, destaque }: { rotulo: string; valor: string; nota?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${destaque ? "border-carvao bg-carvao text-white" : "border-linha bg-white"}`}>
      <p className={`text-sm font-semibold ${destaque ? "text-massa" : "text-suave"}`}>{rotulo}</p>
      <p className="tabular mt-2 whitespace-nowrap font-display text-[1.6rem] leading-none sm:text-4xl">{valor}</p>
      {nota ? <p className={`mt-2 text-xs ${destaque ? "text-massa/80" : "text-suave"}`}>{nota}</p> : null}
    </div>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-linha bg-white/60 p-8 text-center">
      <p className="font-display text-2xl">{titulo}</p>
      {children ? <div className="mx-auto mt-2 max-w-md text-suave">{children}</div> : null}
    </div>
  );
}

export function Cartao({ titulo, descricao, children }: { titulo?: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-linha bg-white p-5 shadow-suave sm:p-6">
      {titulo ? <h2 className="text-2xl">{titulo}</h2> : null}
      {descricao ? <p className="mt-1 text-sm text-suave">{descricao}</p> : null}
      <div className={titulo ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

export function EsqueletoPainel() {
  return (
    <div className="mx-auto max-w-5xl" aria-busy="true">
      <div className="mb-6 h-12 w-64 animate-pulse rounded-xl bg-creme-2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-creme-2" />)}
      </div>
      <div className="mt-6 h-64 animate-pulse rounded-3xl bg-creme-2" />
    </div>
  );
}
