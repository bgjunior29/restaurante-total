# Contratos · Lexmovi Sistemas

Modelos comerciais da Lexmovi: orçamento, contratos e anexos. Tudo que está entre `[colchetes]` é para preencher em cada cliente.

> **Antes de usar com cliente:** preencha os dados da Lexmovi (seção abaixo) e peça para um advogado revisar uma vez. Os modelos seguem o Código Civil, a LGPD e a Lei 14.063/2020 (assinatura eletrônica), mas não substituem essa revisão.

## Fluxo comercial

```
1. Diagnóstico gratuito   →  2. Orçamento           →  3. Contrato + anexos     →  4. Implantação      →  5. Termo de aceite
   (Google, site, Insta,      orcamento.html            assinatura eletrônica       cardápio, QR, equipe    início da cobrança
    como recebe pedidos)      validade 15 dias          (gov.br, Autentique…)       prazo do contrato       mensal
```

**Baixar em PDF:** abra [index.html](index.html) no navegador. Cada documento tem **Baixar PDF** (modelo em branco, pasta [pdf/](pdf/)) e **Preencher e baixar** (abre em [html/](html/), você clica no texto, preenche os campos amarelos e baixa o PDF já preenchido). Depois de mudar um `.md`, rode `node contratos/gerar_pdfs.mjs` para atualizar PDFs e HTMLs (usa o Opera GX, como o render dos vídeos).

| Arquivo | Quando usar |
|---|---|
| [orcamento.html](orcamento.html) | **Gerador de orçamento.** Abra no navegador, preencha, clique em "Salvar PDF" e mande no WhatsApp. Guarda o rascunho no próprio navegador. |
| [01-contrato-assinatura-sistema.md](01-contrato-assinatura-sistema.md) | Cliente vai usar o **sistema por assinatura** (restaurantes e futuros sistemas). Mensalidade + implantação. |
| [02-contrato-site-e-links.md](02-contrato-site-e-links.md) | Cliente quer **site, vitrine, link na bio ou app sem download** (projeto com entrega + manutenção opcional). |
| [03-anexo-protecao-de-dados.md](03-anexo-protecao-de-dados.md) | **Sempre** junto do contrato 01 (e do 02 quando o site coletar dados de clientes). A Lexmovi é operadora, o cliente é controlador. |
| [04-anexo-suporte-e-disponibilidade.md](04-anexo-suporte-e-disponibilidade.md) | Junto do 01 e do 02 com manutenção. Diz o que é suporte, em quanto tempo responde e o que não está incluso. |
| [05-termo-de-aceite.md](05-termo-de-aceite.md) | No dia da entrega/implantação. É o que dispara o início da cobrança mensal e a garantia. |
| [06-termo-de-cancelamento.md](06-termo-de-cancelamento.md) | Quando o cliente sai. Fecha valores, exportação de dados e prazo de exclusão. |
| [07-termo-de-indicacao.md](07-termo-de-indicacao.md) | Programa de indicação: cliente ou parceiro que traz cliente novo ganha bônus. |
| [melhorias-e-sugestoes.md](melhorias-e-sugestoes.md) | O que precisa ser corrigido (no site, no sistema e na empresa) para os contratos valerem na prática, e sugestões. |

## Dados da Lexmovi (preencha uma vez e use em todos)

| Campo | Valor |
|---|---|
| Razão social / nome | `[Lexmovi Sistemas ou nome completo do titular]` |
| CNPJ (ou CPF) | `[00.000.000/0001-00]` |
| Endereço | `[rua, número, bairro], Barueri/SP, CEP [00000-000]` |
| Representante | John `[sobrenome]`, `[CPF]` |
| E-mail | `[contato@...]` |
| WhatsApp | (11) 96445-2878 |
| Site | https://movitechsistemas.com.br |
| Foro | Barueri/SP |

Esses mesmos dados faltam em `frontrestaurantetotal/src/pages/Legal.jsx` (`OPERATOR`). Ver [melhorias-e-sugestoes.md](melhorias-e-sugestoes.md).

## Como assinar

- **gov.br (grátis):** assinador.iti.br aceita PDF; vale como assinatura eletrônica avançada para quem tem conta prata/ouro.
- **Autentique, ZapSign, Clicksign:** mandam o link pelo WhatsApp/e-mail e geram o relatório de assinaturas. Autentique e ZapSign têm plano grátis com poucos documentos por mês.
- Para gerar o PDF de um contrato `.md`: abra no VS Code → "Markdown: Open Preview" → imprimir, ou cole no Google Docs/Word e exporte.

## Numeração

Use o mesmo número no orçamento e no contrato: `MVT-AAAA-NNN` (ex.: `MVT-2026-001`). O gerador de orçamento sugere o número automaticamente; anote o último usado aqui:

- Último número: `MVT-2026-000`
