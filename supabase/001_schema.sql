-- Modelo de site de pizzaria (cardápio em feed, pedido online, acompanhamento e painel).
-- Schema próprio no projeto Leonidas: não mexe em beauty nem nos outros apps.
create schema if not exists modelo_pizzaria;

create table modelo_pizzaria.configuracoes (
  id boolean primary key default true check (id),
  nome text not null default 'Pizzaria Modelo',
  slogan text not null default 'Massa de fermentação lenta, forno a lenha e entrega quentinha.',
  whatsapp text,
  instagram text,
  endereco text,
  horario_texto text not null default 'Terça a domingo, das 18h às 23h30',
  aberto boolean not null default true,
  aceita_entrega boolean not null default true,
  aceita_retirada boolean not null default true,
  pedido_minimo_cents integer not null default 0 check (pedido_minimo_cents >= 0),
  tempo_entrega_min integer not null default 50 check (tempo_entrega_min > 0),
  tempo_retirada_min integer not null default 30 check (tempo_retirada_min > 0),
  aceita_pix_online boolean not null default true,
  aceita_dinheiro boolean not null default true,
  aceita_cartao_entrega boolean not null default true,
  pix_chave text,
  pix_favorecido text,
  qr_pix_url text,
  atualizado_em timestamptz not null default now()
);

create table modelo_pizzaria.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem integer not null default 0,
  ativo boolean not null default true
);

create table modelo_pizzaria.produtos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references modelo_pizzaria.categorias(id) on delete restrict,
  nome text not null,
  descricao text not null default '',
  foto_url text,
  destaque boolean not null default false,
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);
create index on modelo_pizzaria.produtos (categoria_id, ordem);

-- Tamanhos e preços: pizza tem Broto/Média/Grande; bebida tem um tamanho só.
create table modelo_pizzaria.tamanhos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references modelo_pizzaria.produtos(id) on delete cascade,
  nome text not null,
  preco_cents integer not null check (preco_cents > 0),
  ordem integer not null default 0,
  ativo boolean not null default true
);
create index on modelo_pizzaria.tamanhos (produto_id, ordem);

create table modelo_pizzaria.bairros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  taxa_cents integer not null default 0 check (taxa_cents >= 0),
  ativo boolean not null default true
);

create table modelo_pizzaria.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  cliente_nome text not null,
  cliente_telefone text not null,
  tipo text not null check (tipo in ('entrega', 'retirada')),
  endereco text,
  bairro_id uuid references modelo_pizzaria.bairros(id) on delete set null,
  bairro_nome text,
  observacao text,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  taxa_entrega_cents integer not null default 0 check (taxa_entrega_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  forma_pagamento text not null check (forma_pagamento in ('pix_online', 'dinheiro', 'cartao_entrega')),
  troco_para_cents integer check (troco_para_cents is null or troco_para_cents > 0),
  pagamento_status text not null default 'pendente' check (pagamento_status in ('pendente', 'pago', 'reembolsado')),
  mp_payment_id text,
  pix_copia_cola text,
  pix_expira_em timestamptz,
  status text not null default 'novo' check (status in (
    'aguardando_pagamento', 'novo', 'em_preparo', 'saiu_para_entrega', 'pronto_retirada', 'entregue', 'cancelado'
  )),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (tipo = 'retirada' or (endereco is not null and bairro_id is not null))
);
create index on modelo_pizzaria.pedidos (status, criado_em desc);
create index on modelo_pizzaria.pedidos (cliente_telefone);

create table modelo_pizzaria.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references modelo_pizzaria.pedidos(id) on delete cascade,
  produto_id uuid references modelo_pizzaria.produtos(id) on delete set null,
  nome text not null,
  tamanho text not null,
  quantidade integer not null check (quantidade between 1 and 50),
  preco_unit_cents integer not null check (preco_unit_cents > 0),
  observacao text
);
create index on modelo_pizzaria.pedido_itens (pedido_id);

-- Linha do tempo do pedido (o que o cliente vê no acompanhamento).
create table modelo_pizzaria.pedido_eventos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references modelo_pizzaria.pedidos(id) on delete cascade,
  status text not null,
  criado_em timestamptz not null default now()
);
create index on modelo_pizzaria.pedido_eventos (pedido_id, criado_em);

create table modelo_pizzaria.equipe (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null default 'atendente' check (papel in ('admin', 'atendente')),
  criado_em timestamptz not null default now()
);

create table modelo_pizzaria.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  pedido_id uuid references modelo_pizzaria.pedidos(id) on delete cascade,
  equipe_user_id uuid references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- Acesso só pelo servidor (service_role); o navegador nunca fala direto com as tabelas.
alter table modelo_pizzaria.configuracoes enable row level security;
alter table modelo_pizzaria.categorias enable row level security;
alter table modelo_pizzaria.produtos enable row level security;
alter table modelo_pizzaria.tamanhos enable row level security;
alter table modelo_pizzaria.bairros enable row level security;
alter table modelo_pizzaria.pedidos enable row level security;
alter table modelo_pizzaria.pedido_itens enable row level security;
alter table modelo_pizzaria.pedido_eventos enable row level security;
alter table modelo_pizzaria.equipe enable row level security;
alter table modelo_pizzaria.push_subscriptions enable row level security;

revoke all on schema modelo_pizzaria from public, anon, authenticated;
revoke all on all tables in schema modelo_pizzaria from public, anon, authenticated;
revoke all on all sequences in schema modelo_pizzaria from public, anon, authenticated;
grant usage on schema modelo_pizzaria to service_role;
grant all on all tables in schema modelo_pizzaria to service_role;
grant all on all sequences in schema modelo_pizzaria to service_role;
alter default privileges in schema modelo_pizzaria grant all on tables to service_role;
alter default privileges in schema modelo_pizzaria grant all on sequences to service_role;

-- Fotos do cardápio: bucket público só de leitura (envio só pelo servidor).
insert into storage.buckets (id, name, public) values ('modelo-pizzaria', 'modelo-pizzaria', true)
on conflict (id) do nothing;

-- Dados de exemplo (apague ou edite pelo painel).
insert into modelo_pizzaria.configuracoes (id) values (true);
insert into modelo_pizzaria.categorias (nome, ordem) values ('Pizzas salgadas', 1), ('Pizzas doces', 2), ('Bebidas', 3);
insert into modelo_pizzaria.bairros (nome, taxa_cents) values ('Centro', 600), ('Jardim das Flores', 800), ('Vila Nova', 1000);

with c as (select id, nome from modelo_pizzaria.categorias),
p as (
  insert into modelo_pizzaria.produtos (categoria_id, nome, descricao, destaque, ordem)
  select (select id from c where nome = 'Pizzas salgadas'), v.nome, v.descricao, v.destaque, v.ordem
  from (values
    ('Margherita', 'Molho de tomate artesanal, muçarela de búfala, manjericão fresco e azeite.', true, 1),
    ('Calabresa', 'Calabresa fatiada, cebola roxa, muçarela e orégano.', false, 2),
    ('Quatro Queijos', 'Muçarela, provolone, gorgonzola e parmesão.', true, 3),
    ('Portuguesa', 'Presunto, ovo, cebola, azeitona, pimentão e muçarela.', false, 4)
  ) as v(nome, descricao, destaque, ordem)
  returning id, nome
)
insert into modelo_pizzaria.tamanhos (produto_id, nome, preco_cents, ordem)
select p.id, t.nome, t.preco + case p.nome when 'Margherita' then 0 when 'Calabresa' then 0 when 'Quatro Queijos' then 400 else 200 end, t.ordem
from p cross join (values ('Broto', 2900, 1), ('Média', 4900, 2), ('Grande', 6500, 3)) as t(nome, preco, ordem);

with p as (
  insert into modelo_pizzaria.produtos (categoria_id, nome, descricao, ordem)
  select id, 'Chocolate com Morango', 'Chocolate ao leite derretido e morangos frescos.', 1 from modelo_pizzaria.categorias where nome = 'Pizzas doces'
  returning id
)
insert into modelo_pizzaria.tamanhos (produto_id, nome, preco_cents, ordem)
select p.id, t.nome, t.preco, t.ordem from p cross join (values ('Broto', 3200, 1), ('Média', 5200, 2), ('Grande', 6900, 3)) as t(nome, preco, ordem);

with p as (
  insert into modelo_pizzaria.produtos (categoria_id, nome, descricao, ordem)
  select id, 'Refrigerante 2L', 'Cola, guaraná ou laranja. Informe o sabor na observação.', 1 from modelo_pizzaria.categorias where nome = 'Bebidas'
  returning id
)
insert into modelo_pizzaria.tamanhos (produto_id, nome, preco_cents, ordem)
select id, 'Único', 1400, 1 from p;
