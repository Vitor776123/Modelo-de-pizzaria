import type { Horario } from "@/lib/tipos";

const FUSO = "America/Sao_Paulo";
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export const NOME_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** "18:30:00" → 1110 (minutos desde 00:00). */
export function minutosDoDia(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Dia da semana (0 = domingo) e minutos do dia em São Paulo. */
export function agoraEmSaoPaulo(data: Date): { dia: number; minutos: number } {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: FUSO, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(data);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { dia, minutos: Number(get("hour")) * 60 + Number(get("minute")) };
}

/**
 * A loja está dentro do horário? Se `usar` for falso (ou não houver nenhum horário cadastrado), vale sempre.
 * Janela que fecha depois da meia-noite (ex.: 18:00 → 01:00) continua valendo no dia seguinte.
 */
export function dentroDoHorario(usar: boolean, horarios: Horario[], data: Date = new Date()): boolean {
  if (!usar) return true;
  const ativos = horarios.filter((h) => h.ativo);
  if (ativos.length === 0) return false;
  const { dia, minutos } = agoraEmSaoPaulo(data);
  const hoje = ativos.find((h) => h.dia_semana === dia);
  if (hoje) {
    const a = minutosDoDia(hoje.abre);
    const f = minutosDoDia(hoje.fecha);
    if (f > a ? minutos >= a && minutos < f : minutos >= a) return true;
  }
  const ontem = ativos.find((h) => h.dia_semana === (dia + 6) % 7);
  if (ontem) {
    const a = minutosDoDia(ontem.abre);
    const f = minutosDoDia(ontem.fecha);
    if (f <= a && minutos < f) return true;
  }
  return false;
}

/** Texto curto: "Seg a dom, 18:00 às 23:30" não é inferido; mostramos dia a dia só quando preciso. */
export function resumoHorarios(horarios: Horario[]): string {
  const ativos = [...horarios].filter((h) => h.ativo).sort((a, b) => a.dia_semana - b.dia_semana);
  if (ativos.length === 0) return "";
  return ativos.map((h) => `${DIAS[h.dia_semana]} ${h.abre.slice(0, 5)}–${h.fecha.slice(0, 5)}`).join(" · ");
}
