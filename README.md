# Modelo de site de pizzaria

Cardápio em feed vertical (estilo Shorts) com zoom nas fotos, pedido online (entrega ou retirada), pagamento por PIX/Mercado Pago ou na entrega, acompanhamento do pedido estilo iFood e painel da equipe.

Stack: Next.js 16 (App Router), Tailwind v4, Supabase (schema `modelo_pizzaria`), Vercel.

## Rotas
- `/` feed do cardápio · `/pedido` finalização · `/acompanhar/[token]` acompanhamento (o link é o "login" do cliente)
- `/entrar` login da equipe · `/painel` pedidos · `/painel/cardapio` · `/painel/bairros` · `/painel/config`

## Colocar no ar
1. Rode `supabase/001_schema.sql` no projeto Supabase (já aplicado no Leonidas). Ele cria o schema, o bucket `modelo-pizzaria` e dados de exemplo.
2. Supabase > Settings > API > **Exposed schemas**: adicione `modelo_pizzaria`.
3. Crie o login da equipe em Authentication > Users e vincule: `insert into modelo_pizzaria.equipe (user_id, nome, papel) values ('<uuid>', 'Nome', 'admin');`
4. Copie `.env.example` para `.env.local` e preencha. Chaves de aviso: `npm run gerar-chaves`.
5. Mercado Pago (opcional): crie o webhook apontando para `https://SEU-SITE/api/mp/webhook` (evento de pagamentos).
6. `npm install && npm run dev`. Deploy na Vercel com as mesmas variáveis.

## Para vender para outra pizzaria
Troque nome/WhatsApp/horário em `/painel/config`, suba as fotos reais em `/painel/cardapio`, ajuste bairros e taxas. Fotos verticais e bem iluminadas rendem mais no feed.

## Verificações
`npm run typecheck && npm run lint && npm test`
