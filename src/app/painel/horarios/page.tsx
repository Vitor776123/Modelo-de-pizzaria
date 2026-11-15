import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { getConfig, listarHorarios } from "@/lib/cardapio";
import { NOME_DIA } from "@/lib/horario";
import { FormAcao } from "@/components/form-acao";
import { Cartao, Titulo } from "@/app/painel/ui";
import { salvarHorarios } from "@/app/painel/horarios/actions";

export const metadata: Metadata = { title: "Horários" };

export default async function Page() {
  await exigirAdmin();
  const [horarios, config] = await Promise.all([listarHorarios(), getConfig()]);
  const por = new Map(horarios.map((h) => [h.dia_semana, h]));
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Titulo titulo="Horários" descricao="Com o horário automático ligado, o site abre e fecha sozinho. Se fechar depois da meia-noite, é só colocar a hora final menor (ex.: 18:00 → 01:00)." />
      <Cartao>
        <FormAcao acao={salvarHorarios}>
          <label className="mb-4 flex items-center gap-3 rounded-2xl bg-creme-2 p-4 font-semibold"><input type="checkbox" name="usar_horarios" defaultChecked={config.usar_horarios} className="h-5 w-5" /> Abrir e fechar automaticamente pelo horário</label>
          <ul className="space-y-3">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => {
              const h = por.get(d);
              return (
                <li key={d} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 sm:grid-cols-[9rem_auto_6rem_6rem]">
                  <span className="font-semibold">{NOME_DIA[d]}</span>
                  <label className="flex items-center gap-2 text-sm sm:order-2"><input type="checkbox" name={`ativo_${d}`} defaultChecked={h?.ativo ?? false} /> Aberto</label>
                  <input aria-label={`${NOME_DIA[d]}: abre`} type="time" name={`abre_${d}`} className="campo sm:order-3" defaultValue={h?.abre?.slice(0, 5) ?? "18:00"} />
                  <input aria-label={`${NOME_DIA[d]}: fecha`} type="time" name={`fecha_${d}`} className="campo col-start-3 sm:order-4 sm:col-start-auto" defaultValue={h?.fecha?.slice(0, 5) ?? "23:00"} />
                </li>
              );
            })}
          </ul>
        </FormAcao>
      </Cartao>
    </div>
  );
}
