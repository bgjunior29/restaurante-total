# Restaurante Total — salão, cozinha e delivery (multi-restaurante)

Multi-sistema para restaurantes, construído sobre a estrutura do **Bar Total** (multi-tenant, QR code na mesa,
painel em tempo real, plataforma) e com as integrações do **sistema integrado de delivery** (WhatsApp, cupons,
CEP, estoque, avaliações e camada de inteligência em Python).

**Stack:** React + Vite + Tailwind CSS · Python (FastAPI) · Prisma (prisma-client-py) · PostgreSQL 17 (Docker no PC, Neon em produção) com migrações versionadas

## Rodando

Primeira vez (precisa do Docker Desktop aberto):

```bash
docker compose up -d              # PostgreSQL local (bancos restaurante e restaurante_test)
cd backendrestaurantetotal
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
copy .env.example .env
set PYTHONUTF8=1
.venv\Scripts\prisma migrate deploy   # cria as tabelas pelas migrações
.venv\Scripts\python -m prisma generate   # gera o client Prisma (com .venv\Scripts no PATH)
.venv\Scripts\python seed.py      # login da plataforma + restaurante de exemplo (cantina-da-nonna)
cd ../frontrestaurantetotal
npm install
```

No VS Code: **Ctrl+Shift+B** → "Rodar Restaurante Total". Ou em dois terminais:

```bash
cd backendrestaurantetotal && .venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
cd frontrestaurantetotal && npm run dev
```

| Endereço | O quê |
|---|---|
| http://localhost:5190/r/cantina-da-nonna/mesa/1 | Cardápio da mesa 1 (o que o QR code abre) |
| http://localhost:5190/r/cantina-da-nonna | Cardápio para retirada / delivery |
| http://localhost:5190/r/cantina-da-nonna/equipe | Pedidos (garçom / caixa) |
| http://localhost:5190/r/cantina-da-nonna/equipe/salao | Mapa do salão e fechamento de contas |
| http://localhost:5190/r/cantina-da-nonna/equipe/cozinha | Tela da cozinha (KDS) |
| http://localhost:5190/r/cantina-da-nonna/equipe/admin | Gestão do restaurante |
| http://localhost:5190/plataforma | **Seu painel**: criar, editar e suspender restaurantes |
| http://localhost:8000/docs | Documentação da API |

Logins locais: plataforma `admin` / `admin123`; admin do restaurante de exemplo `admin` / `admin123`.

## O que veio de cada sistema

| Recurso | Origem | Onde |
|---|---|---|
| Multi-restaurante (tenants), slug, suspensão, plano/MRR | Bar Total | `app/tenancy.py`, `routers/platform.py` |
| QR code por mesa, cardápio com adicionais (mín./máx.) | Bar Total | `pages/Customer.jsx`, `admin/Tables.jsx` |
| Tempo real por restaurante (WebSocket), som de novo pedido | Bar Total | `app/realtime.py`, `lib/useLive.js` |
| Temas e identidade editáveis | Bar Total | `lib/themes.js`, `IdentityForm.jsx` |
| Delivery e retirada: endereço, CEP (ViaCEP), taxa, grátis acima de, pedido mínimo, troco | Sistema integrado | `components/Checkout.jsx`, `routers/public.py` |
| Cupons (% ou R$, mínimo, limite de usos, validade; cancelado não queima) | Sistema integrado (`couponValidation.js`) | `app/coupons.py`, `admin/Coupons.jsx` |
| WhatsApp: botão com mensagem pronta + envio automático pela API da Meta | Sistema integrado (`whatsappService.js`) | `app/whatsapp.py`, `pages/Panel.jsx` |
| Estoque com baixa automática, esgota sozinho, devolve no cancelamento | Sistema integrado (`InventoryManager`) | `app/stock.py` |
| Status padronizado por tipo (mesa / retirada / delivery com "saiu para entrega") | Sistema integrado (`orderProgressionRules`) | `lib/format.js` (`FLOWS`), `routers/staff.py` (`ALLOWED`) |
| Avaliação do cliente depois de receber | Sistema integrado (`Review`) | `pages/Track.jsx` |
| Inteligência: previsão do dia, pico, tempo de preparo/atraso, combos, produtos parados, dicas | Sistema integrado (`analytics.py`, `automation.py`) — agora com dados reais | `app/insights.py`, `admin/Insights.jsx` |

## Novidades específicas de restaurante

- **Conta da mesa:** cada rodada pedida pelo QR entra na mesma conta. O cliente vê a conta no celular, com
  taxa de serviço opcional e divisão por pessoa, e pode **pedir a conta** ou **chamar o garçom**.
- **Salão:** mapa das mesas (livre / ocupada / pediu a conta), total em aberto e fechamento com forma de
  pagamento, serviço e divisão. Fechar a conta libera a mesa e encerra os chamados dela.
- **Tela da cozinha (KDS):** fila por estação (cozinha, bar, confeitaria, copa — definida na categoria),
  com cronômetro que fica amarelo/vermelho conforme o limite de atraso configurado.
- **Perfis de equipe:** administrador, atendente/garçom e cozinha (que só vê a tela da cozinha).
- **"Combina com seu pedido":** o cardápio sugere itens que costumam sair juntos (calculado dos pedidos).
- **Foto de produto** e aviso de "últimas unidades".

## Cadastros (Gestão)

| Aba | O que o dono configura |
|---|---|
| Cardápio | categorias (com estação de preparo) e produtos (foto, estoque, adicionais) |
| Adicionais | grupos com mínimo/máximo de escolhas |
| Cupons | códigos de desconto |
| Pagamentos | formas aceitas (Pix mostra a chave; Dinheiro pergunta o troco) |
| Mesas & QR | mesas e impressão dos QR codes (`/r/<slug>/mesa/N`) |
| Identidade | nome, slogan, logo, tema, cor, horário, telefone, WhatsApp, Instagram, endereço |
| Relatórios | faturamento, serviço, taxas de entrega, descontos, por canal, por pagamento, mais vendidos, nota |
| Inteligência | recomendações automáticas e análises |
| Equipe | usuários e perfis |
| Configurações | pedidos abertos, taxa de serviço, atraso, retirada/delivery, Pix, WhatsApp, endereço público |

## WhatsApp automático (opcional)

Sem configurar nada, cada pedido de retirada/delivery tem um botão **WhatsApp** no painel que abre a conversa
com a mensagem pronta. Para enviar sozinho a cada mudança de status, defina no servidor
`WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID` (API Cloud da Meta) e ligue
"Avisar clientes pelo WhatsApp" em Gestão → Configurações. O envio roda em segundo plano e nunca derruba o pedido.

## Publicação

Mesmo modelo do Bar Total: `render.yaml` (API no Render, `rootDir: backendrestaurantetotal`), banco PostgreSQL no Neon
(`backend\neon-setup.ps1`) e frontend no Vercel (`frontrestaurantetotal/vercel.json` e `.env.production` apontam para
`restaurante-total-api.onrender.com` — ajuste para o nome real do serviço).

## Segurança e proteção

- **Login com limite de tentativas** (equipe e plataforma): 5 senhas erradas do mesmo aparelho no mesmo usuário
  bloqueiam por 15 min; 20 erros no mesmo usuário vindos de qualquer lugar também bloqueiam. Acertar a senha zera os erros do aparelho.
- **Anti-spam de pedidos:** até 40 pedidos a cada 10 min e 30 chamados a cada 5 min por aparelho, em cada restaurante
  (generoso porque no Wi-Fi do restaurante todas as mesas saem pelo mesmo IP). Os limites estão em `app/ratelimit.py` e `routers/public.py`.
- **Fotos enviadas** (produto e logo) ficam no banco (`Image`), servidas em `/api/img/<chave>` com cache de 1 ano.
  O navegador reduz a foto para no máximo 1000 px antes de enviar (~100 KB); a API confere os primeiros bytes (só JPG, PNG e WebP, até 800 KB).
- **Termos de uso e política de privacidade (LGPD)** em `/termos` e `/privacidade`, com link no rodapé e no checkout.
  Preencha os dados do operador no topo de `pages/Legal.jsx` e peça para um advogado revisar antes de vender.
- **Calculadora de economia** em `/economia`: quanto o restaurante paga de comissão nos aplicativos e quanto economiza no canal próprio.

## Testes

```bash
cd backendrestaurantetotal
.venv\Scripts\pip install -r requirements-dev.txt
.venv\Scripts\python -m pytest
```

Sobem a API inteira contra o Postgres `restaurante_test` do `docker compose`, recriado pelas migrações a cada execução, e cobrem: isolamento entre restaurantes,
preço calculado no servidor, limite de login e de pedidos, upload de fotos e restaurante suspenso.
O GitHub roda os testes e o build do site a cada push (`.github/workflows/testes.yml`).

## Mudando o banco (migrações)

A estrutura do banco é versionada em `backendrestaurantetotal/prisma/migrations`. Nunca use `prisma db push` na produção.

1. Altere `prisma/schema.prisma`.
2. Gere a migração: `.venv\Scripts\prisma migrate dev --name o-que-mudou` (aplica no Postgres local e cria a pasta da migração).
3. Confira o `migration.sql` gerado. Renomear ou apagar coluna perde dados: escreva a migração na mão quando for o caso.
4. Faça o commit da pasta junto com o schema. No deploy, o Render roda `prisma migrate deploy`, que só aplica o que é novo.

O banco de produção foi criado antes das migrações; no primeiro deploy com elas, o `render-start.sh` registra a `0_init`
como já aplicada (sem tocar nos dados) e daí em diante segue só pelas migrações.

## Backup e restauração

`.github/workflows/backup.yml` faz um backup do banco de produção todo dia às 4h (Brasília), criptografado com AES-256,
guardado 30 dias em **Actions → Backup do banco → Artifacts**. Configure uma vez em
**Settings → Secrets and variables → Actions**: `BACKUP_DATABASE_URL` (a URL do Neon) e `BACKUP_PASSPHRASE`
(senha longa, guardada fora do GitHub; sem ela o backup não abre). Para testar, rode o workflow na mão (Run workflow).

Restaurar (num banco vazio do Neon, com Docker e GnuPG instalados):

```bash
gpg --decrypt restaurante-total-AAAA-MM-DD.dump.gpg > backup.dump
docker run --rm -i -e DB="<URL do banco novo>" postgres:17 sh -c 'pg_restore --no-owner --no-privileges -d "$DB"' < backup.dump
```

## Estrutura

```
backendrestaurantetotal/
  prisma/schema.prisma      Tenant, User, Category (estação), Product (foto, estoque), OptionGroup, Option,
                            PaymentMethod, Coupon, Table, TableSession (conta), ServiceCall (chamados),
                            Order (mesa/retirada/delivery), OrderItem, Review
  app/routers/public.py     cardápio, pedidos, cupom, conta da mesa, chamados, avaliação   /api/t/<slug>/...
  app/routers/staff.py      login, pedidos, cozinha, salão, fechamento, chamados           /api/t/<slug>/...
  app/routers/admin.py      gestão (CRUDs, cupons, estoque, relatório, inteligência)       /api/t/<slug>/admin/...
  app/routers/platform.py   painel da plataforma                                           /api/platform/...
  app/coupons.py · stock.py · whatsapp.py · bill.py · insights.py
frontrestaurantetotal/src/
  pages/Customer.jsx        cardápio + sugestões + chamar garçom
  components/Checkout.jsx   mesa / retirada / delivery, CEP, cupom, troco
  pages/Track.jsx           acompanhamento + avaliação
  pages/Bill.jsx            conta da mesa (cliente)
  pages/Panel.jsx           pedidos + chamados
  pages/Floor.jsx           salão e fechamento de conta
  pages/Kitchen.jsx         tela da cozinha
  pages/admin/              gestão (Cupons, Inteligência e as demais abas)
```

## Limitações conhecidas

- O status é por pedido, não por item: na tela da cozinha filtrada por estação, "Pronto" marca o pedido inteiro.
- Pagamento online (Stripe) do sistema integrado não foi trazido: o pagamento é na mesa/entrega/Pix manual.
- A taxa de entrega é fixa (com regra de grátis acima de um valor), não calculada por distância.
