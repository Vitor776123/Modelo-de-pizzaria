export type Config = {
  nome: string;
  slogan: string;
  whatsapp: string | null;
  instagram: string | null;
  endereco: string | null;
  horario_texto: string;
  aberto: boolean;
  aceita_entrega: boolean;
  aceita_retirada: boolean;
  pedido_minimo_cents: number;
  tempo_entrega_min: number;
  tempo_retirada_min: number;
  aceita_pix_online: boolean;
  aceita_dinheiro: boolean;
  aceita_cartao_entrega: boolean;
  pix_chave: string | null;
  pix_favorecido: string | null;
  qr_pix_url: string | null;
  usar_horarios: boolean;
  /** Chave manual do painel (pausar/abrir). `aberto` já considera também o horário automático. */
  aberto_manual: boolean;
  fechada_por_horario: boolean;
};

export type Tamanho = { id: string; produto_id: string; nome: string; preco_cents: number; ordem: number; ativo: boolean };

export type Produto = {
  id: string;
  categoria_id: string;
  nome: string;
  descricao: string;
  foto_url: string | null;
  destaque: boolean;
  ativo: boolean;
  ordem: number;
  tamanhos: Tamanho[];
};

export type Categoria = { id: string; nome: string; ordem: number; ativo: boolean; permite_meio_a_meio: boolean; produtos: Produto[] };

export type Adicional = { id: string; categoria_id: string | null; nome: string; preco_cents: number; ordem: number; ativo: boolean };

export type Cupom = {
  id: string;
  codigo: string;
  tipo: "percentual" | "valor";
  valor: number;
  minimo_cents: number;
  validade: string | null;
  usos_max: number | null;
  usos: number;
  ativo: boolean;
};

export type Horario = { dia_semana: number; abre: string; fecha: string; ativo: boolean };

export type ExtraItem = { nome: string; preco_cents: number };

export type Bairro = { id: string; nome: string; taxa_cents: number; tempo_min: number | null; ativo: boolean };

export type TipoPedido = "entrega" | "retirada";
export type FormaPagamento = "pix_online" | "dinheiro" | "cartao_entrega";
export type StatusPedido =
  | "aguardando_pagamento"
  | "novo"
  | "em_preparo"
  | "saiu_para_entrega"
  | "pronto_retirada"
  | "entregue"
  | "cancelado";

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  novo: "Pedido recebido",
  em_preparo: "Em preparo",
  saiu_para_entrega: "Saiu para entrega",
  pronto_retirada: "Pronto para retirar",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const ROTULO_FORMA: Record<FormaPagamento, string> = {
  pix_online: "PIX online",
  dinheiro: "Dinheiro na entrega",
  cartao_entrega: "Cartão na entrega",
};

export type ItemPedido = {
  id: string;
  produto_id: string | null;
  nome: string;
  tamanho: string;
  quantidade: number;
  preco_unit_cents: number;
  observacao: string | null;
  extras: ExtraItem[];
};

export type Pedido = {
  id: string;
  numero: number;
  token: string;
  cliente_nome: string;
  cliente_telefone: string;
  tipo: TipoPedido;
  endereco: string | null;
  bairro_nome: string | null;
  observacao: string | null;
  subtotal_cents: number;
  taxa_entrega_cents: number;
  desconto_cents: number;
  cupom_codigo: string | null;
  tempo_estimado_min: number | null;
  total_cents: number;
  forma_pagamento: FormaPagamento;
  troco_para_cents: number | null;
  pagamento_status: "pendente" | "pago" | "reembolsado";
  pix_copia_cola: string | null;
  pix_expira_em: string | null;
  status: StatusPedido;
  criado_em: string;
  itens: ItemPedido[];
  eventos: { status: StatusPedido; criado_em: string }[];
};
