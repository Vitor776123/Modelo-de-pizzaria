import type { ItemNav } from "@/app/painel/nav";
import { IconeEngrenagem, IconeEtiqueta, IconeGrafico, IconeLista, IconeMoto, IconePizza, IconeRelogio, IconeSacola } from "@/components/icones";

export function itensDoMenu(admin: boolean): ItemNav[] {
  return [
    { href: "/painel", rotulo: "Pedidos", icone: <IconeSacola />, principal: true },
    { href: "/painel/central", rotulo: "Central (tela cheia)", icone: <IconeRelogio /> },
    { href: "/painel/historico", rotulo: "Histórico", icone: <IconeLista />, principal: true },
    ...(admin
      ? [
          { href: "/painel/vendas", rotulo: "Vendas", icone: <IconeGrafico />, principal: true },
          { href: "/painel/cardapio", rotulo: "Cardápio", icone: <IconePizza /> },
          { href: "/painel/adicionais", rotulo: "Bordas e adicionais", icone: <IconePizza /> },
          { href: "/painel/cupons", rotulo: "Cupons", icone: <IconeEtiqueta /> },
          { href: "/painel/bairros", rotulo: "Entrega", icone: <IconeMoto /> },
          { href: "/painel/horarios", rotulo: "Horários", icone: <IconeRelogio /> },
          { href: "/painel/config", rotulo: "Configurações", icone: <IconeEngrenagem /> },
        ]
      : []),
  ];
}
