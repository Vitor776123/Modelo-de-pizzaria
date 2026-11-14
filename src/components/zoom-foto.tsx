"use client";

import { useRef, useState, type ReactNode } from "react";

type Pt = { x: number; y: number };

/**
 * Zoom na pizza, como numa rede social: toque para aproximar no ponto tocado, arraste para passear
 * pela foto e use dois dedos para fechar ou abrir o zoom. Sem zoom, a rolagem vertical segue livre (feed).
 */
export function ZoomFoto({ children, aoMudar }: { children: ReactNode; aoMudar?: (zoom: boolean) => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  const ponteiros = useRef(new Map<number, Pt>());
  const gesto = useRef({ inicio: 0, moveu: 0, distIni: 0, zoomIni: 1 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pt>({ x: 0, y: 0 });
  const [arrastando, setArrastando] = useState(false);

  function limitar(p: Pt, z: number): Pt {
    const r = caixa.current?.getBoundingClientRect();
    if (!r) return p;
    const mx = ((z - 1) * r.width) / 2;
    const my = ((z - 1) * r.height) / 2;
    return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
  }

  function definir(z: number, p: Pt) {
    const zz = Math.max(1, Math.min(4, z));
    setZoom(zz);
    setPan(zz === 1 ? { x: 0, y: 0 } : limitar(p, zz));
    aoMudar?.(zz > 1);
  }

  function aoPressionar(e: React.PointerEvent) {
    caixa.current?.setPointerCapture(e.pointerId);
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ponteiros.current.size === 1) gesto.current = { ...gesto.current, inicio: Date.now(), moveu: 0 };
    if (ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()];
      gesto.current = { ...gesto.current, distIni: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoomIni: zoom, moveu: 99 };
    }
    setArrastando(true);
  }

  function aoMover(e: React.PointerEvent) {
    const antes = ponteiros.current.get(e.pointerId);
    if (!antes) return;
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      definir(gesto.current.zoomIni * (d / gesto.current.distIni), pan);
      return;
    }
    const dx = e.clientX - antes.x;
    const dy = e.clientY - antes.y;
    gesto.current.moveu += Math.abs(dx) + Math.abs(dy);
    if (zoom > 1) setPan((p) => limitar({ x: p.x + dx, y: p.y + dy }, zoom));
  }

  function aoSoltar(e: React.PointerEvent) {
    const eraUm = ponteiros.current.size === 1;
    ponteiros.current.delete(e.pointerId);
    if (ponteiros.current.size === 0) setArrastando(false);
    const g = gesto.current;
    if (eraUm && g.moveu < 8 && Date.now() - g.inicio < 400) {
      if (zoom > 1) return definir(1, { x: 0, y: 0 });
      const r = caixa.current!.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      definir(2.6, { x: -dx * 2.6, y: -dy * 2.6 });
    }
  }

  return (
    <div
      ref={caixa}
      className="absolute inset-0 select-none overflow-hidden"
      style={{ touchAction: zoom > 1 ? "none" : "pan-y", cursor: zoom > 1 ? "zoom-out" : "zoom-in" }}
      onPointerDown={aoPressionar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
    >
      <div
        className="h-full w-full will-change-transform"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: arrastando ? "none" : "transform 0.28s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        {children}
      </div>
      {zoom > 1 ? (
        <button
          type="button"
          className="btn btn-claro btn-pequeno absolute left-1/2 top-20 -translate-x-1/2"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            definir(1, { x: 0, y: 0 });
          }}
        >
          Fechar zoom
        </button>
      ) : null}
    </div>
  );
}
