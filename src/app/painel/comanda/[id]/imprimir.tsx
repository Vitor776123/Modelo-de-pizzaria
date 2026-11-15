"use client";

export function BotaoImprimir() {
  return (
    <div className="mb-4 flex gap-2 print:hidden">
      <button type="button" className="btn btn-principal btn-pequeno" onClick={() => window.print()}>Imprimir</button>
      <button type="button" className="btn btn-contorno btn-pequeno" onClick={() => window.close()}>Fechar</button>
    </div>
  );
}
