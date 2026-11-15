-- Pedido completo: meio a meio, borda/adicionais, cupons, horário automático e tempo por bairro.
alter table modelo_pizzaria.categorias add column permite_meio_a_meio boolean not null default false;
update modelo_pizzaria.categorias set permite_meio_a_meio = true where nome = 'Pizzas salgadas';

create table modelo_pizzaria.adicionais (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references modelo_pizzaria.categorias(id) on delete cascade, -- null = vale para todas as categorias
  nome text not null,
  preco_cents integer not null default 0 check (preco_cents >= 0),
  ordem integer not null default 0,
  ativo boolean not null default true
);

create table modelo_pizzaria.cupons (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo = upper(codigo)),
  tipo text not null check (tipo in ('percentual', 'valor')),
  valor integer not null check (valor > 0),
  minimo_cents integer not null default 0 check (minimo_cents >= 0),
  validade date,
  usos_max integer check (usos_max is null or usos_max > 0),
  usos integer not null default 0,
  ativo boolean not null default true,
  check (tipo <> 'percentual' or valor <= 100)
);

-- Uma janela de funcionamento por dia (0 = domingo ... 6 = sábado). Se fecha < abre, vira a madrugada.
create table modelo_pizzaria.horarios (
  dia_semana smallint primary key check (dia_semana between 0 and 6),
  abre time not null,
  fecha time not null,
  ativo boolean not null default true
);

alter table modelo_pizzaria.configuracoes add column usar_horarios boolean not null default false;
alter table modelo_pizzaria.bairros add column tempo_min integer check (tempo_min is null or tempo_min > 0);
alter table modelo_pizzaria.pedidos add column cupom_codigo text;
alter table modelo_pizzaria.pedidos add column desconto_cents integer not null default 0 check (desconto_cents >= 0);
alter table modelo_pizzaria.pedido_itens add column extras jsonb not null default '[]'::jsonb;

alter table modelo_pizzaria.adicionais enable row level security;
alter table modelo_pizzaria.cupons enable row level security;
alter table modelo_pizzaria.horarios enable row level security;
revoke all on modelo_pizzaria.adicionais, modelo_pizzaria.cupons, modelo_pizzaria.horarios from public, anon, authenticated;
grant all on modelo_pizzaria.adicionais, modelo_pizzaria.cupons, modelo_pizzaria.horarios to service_role;

-- Exemplos
insert into modelo_pizzaria.adicionais (categoria_id, nome, preco_cents, ordem)
select c.id, v.nome, v.preco, v.ordem
from modelo_pizzaria.categorias c
cross join (values ('Borda de catupiry', 800, 1), ('Borda de cheddar', 800, 2), ('Bacon extra', 600, 3), ('Queijo extra', 500, 4)) as v(nome, preco, ordem)
where c.nome = 'Pizzas salgadas';
insert into modelo_pizzaria.cupons (codigo, tipo, valor, minimo_cents) values ('BEMVINDO10', 'percentual', 10, 4000);
alter table modelo_pizzaria.pedidos add column tempo_estimado_min integer;

-- Uso de cupom contado de forma atômica (evita passar do limite com pedidos simultâneos).
create or replace function modelo_pizzaria.usar_cupom(p_id uuid) returns boolean language sql security invoker set search_path = '' as $$
  with u as (
    update modelo_pizzaria.cupons set usos = usos + 1
    where id = p_id and (usos_max is null or usos < usos_max)
    returning 1
  ) select exists(select 1 from u);
$$;
create or replace function modelo_pizzaria.devolver_cupom(p_id uuid) returns void language sql security invoker set search_path = '' as $$
  update modelo_pizzaria.cupons set usos = greatest(usos - 1, 0) where id = p_id;
$$;
revoke all on function modelo_pizzaria.usar_cupom(uuid), modelo_pizzaria.devolver_cupom(uuid) from public, anon, authenticated;
grant execute on function modelo_pizzaria.usar_cupom(uuid), modelo_pizzaria.devolver_cupom(uuid) to service_role;
