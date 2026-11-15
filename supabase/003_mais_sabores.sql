-- Mais sabores, bordas e adicionais (rode depois da 002). Seguro para rodar uma vez.
with c as (select id, nome from modelo_pizzaria.categorias),
novos as (
  insert into modelo_pizzaria.produtos (categoria_id, nome, descricao, destaque, ordem)
  select (select id from c where nome = v.cat), v.nome, v.descricao, v.destaque, v.ordem
  from (values
    ('Pizzas salgadas','Mussarela','Muçarela cremosa, tomate fatiado e orégano.',false,5),
    ('Pizzas salgadas','Frango com Catupiry','Frango desfiado temperado coberto com catupiry original.',true,6),
    ('Pizzas salgadas','Calabresa Acebolada','Calabresa fatiada, muita cebola e azeitonas pretas.',false,7),
    ('Pizzas salgadas','Napolitana','Muçarela, tomate fatiado, parmesão e manjericão.',false,8),
    ('Pizzas salgadas','Bacon com Cheddar','Bacon crocante, cheddar cremoso e muçarela.',false,9),
    ('Pizzas salgadas','Lombo com Catupiry','Lombo canadense fatiado, catupiry e cebola.',false,10),
    ('Pizzas salgadas','Atum','Atum sólido, cebola, azeitona e muçarela.',false,11),
    ('Pizzas salgadas','Brócolis com Bacon','Brócolis, bacon, alho dourado e muçarela.',false,12),
    ('Pizzas salgadas','Pepperoni','Pepperoni fatiado fino sobre muçarela e molho especial.',true,13),
    ('Pizzas salgadas','Strogonoff de Frango','Strogonoff cremoso de frango com batata palha.',false,14),
    ('Pizzas salgadas','Escarola','Escarola refogada no alho, bacon e muçarela.',false,15),
    ('Pizzas doces','Banana com Canela','Banana fatiada, açúcar, canela e leite condensado.',false,2),
    ('Pizzas doces','Romeu e Julieta','Muçarela com goiabada cremosa.',true,3),
    ('Pizzas doces','Prestígio','Chocolate ao leite com coco ralado.',false,4),
    ('Pizzas doces','Brigadeiro','Brigadeiro cremoso com granulado de chocolate.',false,5),
    ('Bebidas','Refrigerante Lata','Cola, guaraná ou laranja. Informe o sabor na observação.',false,2),
    ('Bebidas','Suco Natural 500 ml','Laranja, limão ou maracujá. Informe o sabor na observação.',false,3),
    ('Bebidas','Água Mineral','Com ou sem gás.',false,4)
  ) as v(cat, nome, descricao, destaque, ordem)
  where not exists (select 1 from modelo_pizzaria.produtos p where p.nome = v.nome)
  returning id, nome, categoria_id
)
insert into modelo_pizzaria.tamanhos (produto_id, nome, preco_cents, ordem)
select n.id, case when c.nome = 'Bebidas' then 'Único' else t.nome end,
  case
    when n.nome in ('Refrigerante Lata') then 600
    when n.nome = 'Suco Natural 500 ml' then 900
    when n.nome = 'Água Mineral' then 400
    else t.preco + case n.nome
      when 'Mussarela' then -400 when 'Calabresa Acebolada' then 0 when 'Napolitana' then 200
      when 'Bacon com Cheddar' then 400 when 'Lombo com Catupiry' then 400 when 'Atum' then 400
      when 'Brócolis com Bacon' then 200 when 'Pepperoni' then 600 when 'Strogonoff de Frango' then 400
      when 'Escarola' then 200 when 'Frango com Catupiry' then 400
      else 0 end
  end, t.ordem
from novos n
join modelo_pizzaria.categorias c on c.id = n.categoria_id
cross join lateral (
  select * from (values ('Broto', 2900, 1), ('Média', 4900, 2), ('Grande', 6500, 3), ('Família', 7900, 4)) as x(nome, preco, ordem)
  where c.nome <> 'Bebidas' or x.ordem = 1
) t
where c.nome <> 'Bebidas' or t.ordem = 1;

-- doces: preço um pouco acima
update modelo_pizzaria.tamanhos t set preco_cents = preco_cents + 300
from modelo_pizzaria.produtos p join modelo_pizzaria.categorias c on c.id = p.categoria_id
where t.produto_id = p.id and c.nome = 'Pizzas doces' and p.nome in ('Banana com Canela','Romeu e Julieta','Prestígio','Brigadeiro');

-- bordas e adicionais comuns de pizzaria
insert into modelo_pizzaria.adicionais (categoria_id, nome, preco_cents, ordem)
select (select id from modelo_pizzaria.categorias where nome = 'Pizzas salgadas'), v.nome, v.preco, v.ordem
from (values
  ('Borda de cream cheese', 900, 3), ('Borda de chocolate', 900, 4), ('Borda de mussarela', 700, 5),
  ('Borda de cheddar com bacon', 1000, 6), ('Calabresa extra', 500, 8), ('Catupiry extra', 600, 9),
  ('Azeitonas', 300, 10), ('Cebola', 200, 11), ('Orégano e azeite extra', 0, 12)
) as v(nome, preco, ordem)
where not exists (select 1 from modelo_pizzaria.adicionais a where a.nome = v.nome);

insert into modelo_pizzaria.adicionais (categoria_id, nome, preco_cents, ordem)
select (select id from modelo_pizzaria.categorias where nome = 'Pizzas doces'), v.nome, v.preco, v.ordem
from (values ('Borda de chocolate (doce)', 900, 1), ('Borda de doce de leite', 900, 2), ('Granulado extra', 300, 3), ('Leite condensado extra', 400, 4)) as v(nome, preco, ordem)
where not exists (select 1 from modelo_pizzaria.adicionais a where a.nome = v.nome);

-- tamanho Família também nos sabores antigos (meio a meio exige o mesmo nome de tamanho)
insert into modelo_pizzaria.tamanhos (produto_id, nome, preco_cents, ordem)
select p.id, 'Família', (select max(preco_cents) from modelo_pizzaria.tamanhos g where g.produto_id = p.id and g.nome = 'Grande') + 1400, 4
from modelo_pizzaria.produtos p join modelo_pizzaria.categorias c on c.id = p.categoria_id
where c.nome <> 'Bebidas'
  and not exists (select 1 from modelo_pizzaria.tamanhos t where t.produto_id = p.id and t.nome = 'Família');
