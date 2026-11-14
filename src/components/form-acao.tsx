"use client";

import { useActionState } from "react";

type Resp = { ok: true } | { ok: false; erro: string };

/** Formulário que chama uma Server Action e mostra o erro (ou "Salvo") sem recarregar a página. */
export function FormAcao({
  acao,
  children,
  className,
  rotulo = "Salvar",
  classeBotao = "btn btn-pequeno btn-principal",
  confirmar,
}: {
  acao: (fd: FormData) => Promise<Resp>;
  children: React.ReactNode;
  className?: string;
  rotulo?: string;
  classeBotao?: string;
  confirmar?: string;
}) {
  const [estado, executar, pendente] = useActionState<Resp | null, FormData>(async (_a, fd) => acao(fd), null);
  return (
    <form
      action={executar}
      className={className}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      {children}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" className={classeBotao} disabled={pendente}>
          {pendente ? "Salvando…" : rotulo}
        </button>
        {estado?.ok ? <span role="status" className="text-sm font-semibold text-ok">Salvo ✓</span> : null}
        {estado && !estado.ok ? <span role="alert" className="text-sm font-semibold text-[#8c1d17]">{estado.erro}</span> : null}
      </div>
    </form>
  );
}
