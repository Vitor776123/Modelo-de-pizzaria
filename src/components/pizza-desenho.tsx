/** Pizza desenhada em SVG: aparece quando o produto ainda não tem foto. A mesma pizza sempre sai igual (varia pelo nome). */
function semente(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
}

function aleatorio(s: number) {
  let t = s;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function PizzaDesenho({ nome, doce = false }: { nome: string; doce?: boolean }) {
  const rnd = aleatorio(semente(nome));
  const cobertura = Array.from({ length: 11 }, () => {
    const ang = rnd() * Math.PI * 2;
    const dist = Math.sqrt(rnd()) * 150;
    return { x: 200 + Math.cos(ang) * dist, y: 200 + Math.sin(ang) * dist, r: 14 + rnd() * 8, tipo: rnd() };
  });
  const verdes = Array.from({ length: 7 }, () => {
    const ang = rnd() * Math.PI * 2;
    const dist = Math.sqrt(rnd()) * 150;
    return { x: 200 + Math.cos(ang) * dist, y: 200 + Math.sin(ang) * dist, rot: rnd() * 180 };
  });
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label={`Ilustração da pizza ${nome}`}>
      <defs>
        <radialGradient id="queijo" cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor={doce ? "#6b3a24" : "#ffd96b"} />
          <stop offset="1" stopColor={doce ? "#4a2515" : "#f0a93a"} />
        </radialGradient>
        <radialGradient id="fundo" cx="50%" cy="50%" r="70%">
          <stop offset="0" stopColor="#3a2619" />
          <stop offset="1" stopColor="#14100d" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="url(#fundo)" />
      <circle cx="200" cy="204" r="184" fill="#000" opacity=".35" />
      <circle cx="200" cy="200" r="182" fill="#c98a45" />
      <circle cx="200" cy="200" r="168" fill={doce ? "#8a4a2c" : "#d6401f"} />
      <circle cx="200" cy="200" r="160" fill="url(#queijo)" />
      {cobertura.map((c, i) =>
        doce ? (
          <circle key={i} cx={c.x} cy={c.y} r={c.r * 0.8} fill={c.tipo > 0.5 ? "#d6203a" : "#f6dfc0"} />
        ) : (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={c.r} fill={c.tipo > 0.35 ? "#b3261e" : "#7a2418"} />
            <circle cx={c.x - c.r * 0.3} cy={c.y - c.r * 0.3} r={c.r * 0.25} fill="#fff" opacity=".18" />
          </g>
        ),
      )}
      {verdes.map((v, i) => (
        <ellipse key={i} cx={v.x} cy={v.y} rx="13" ry="7" fill="#4f9a43" transform={`rotate(${v.rot} ${v.x} ${v.y})`} opacity=".95" />
      ))}
      {[0, 60, 120].map((a) => (
        <line key={a} x1="200" y1="40" x2="200" y2="360" stroke="#14100d" strokeOpacity=".35" strokeWidth="3" transform={`rotate(${a} 200 200)`} />
      ))}
    </svg>
  );
}
