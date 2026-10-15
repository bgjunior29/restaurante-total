# Motion graphics com Opus 5.5 — aprendizados para os anúncios

Fonte: aula "Como Fazer Motion Graphics INSANOS com Opus 5.5" — Felipe Borges (Fala IA!)
https://www.youtube.com/watch?v=4wk7nTZler4 (assistida em 13/10/2026)

## A ideia central
- O prompt é ~10% do resultado; os outros 90% são execução: referências, regras fixas, revisão.
- "Fiz com um único prompt" esconde o resto do processo. Prompt cru sem referência = cara de IA genérica.

## Como o Opus 5.5 gera vídeo (4 caminhos, sempre termina em render MP4)
1. **Código puro**: um `index.html` sem dependências, renderizado quadro a quadro em Chrome headless (Playwright) e montado com FFmpeg. **É o caminho preferido do modelo e o que dá o melhor resultado.**
2. Frameworks (Remotion, Hyperframes): ajudavam modelos antigos, hoje tendem a deixar o resultado mais simples.
3. Pipeline misto (imagens + modelo de vídeo, Opus compõe).
4. Edição de vídeo existente (cortes, legendas, PiP).

Se Remotion/Hyperframes estiverem instalados, o modelo pode ir direto para eles; na aula ele precisou dizer explicitamente "não use Hyperframes nem skill, faça do seu jeito natural".

## Regras fixas num CLAUDE.md da pasta de vídeos ("motion studio rules")
- Regras de render (qualidade).
- Regras de aparência para fugir do visual genérico de IA (paleta padrão, grade de quadrados, etc.).
- Diretrizes de som, com a música sincronizada aos cortes e movimentos.
- **Loop de autocrítica antes de mostrar**: renderizar, dar nota de 1 a 10 por critério, corrigir os 3 piores problemas e repetir até tudo passar de 8. Só depois entregar o render final.

## Referências: o maior salto de qualidade
- Começar o prompt pelo vídeo de referência (baixar e analisar movimentos e design), depois pedir a adaptação para o nosso produto.
- Mandar o modelo visitar o site real, tirar screenshots reais com Playwright e usar logo, cores e fontes reais. Pedir para salvar em `assets/` e **listar o que encontrou antes de animar**.
- Fonte de referências: vídeos feitos com Opus 5.5 postados no X (o link da galeria fica na comunidade gratuita dele).

## Estrutura do prompt completo (o que deu resultado mais estável)
- **Entradas**: produto, frase principal (título do site), logo, cores e fontes reais.
- **História**: roteiro cena a cena. Dica: criar a história numa conversa separada com o Claude e colar depois.
- **Som**: música original, batida definida (ex.: 120 BPM), efeitos no tempo da batida.
- **Formatos**: 16:9 e 9:16 (ou só um).
- **Direção**: emoção, ritmo e estilo. Também vale montar com o Claude numa conversa à parte.
- **Aprovação antes do render**: "mostre a lista de estados na grade da batida, em tabela, antes de escrever código; quando eu aprovar, renderize". Ajustar a tabela sai mais barato que re-renderizar.

## Consistência entre vídeos
- Depois de aprovar um vídeo, pedir para salvar um arquivo de marca (`.md`) com logo, tipografia, cores e sistema de design. Assim todo vídeo novo do mesmo cliente sai no mesmo padrão (é diferente do CLAUDE.md de regras).

## O que aplicar na Lexmovi
- [ ] Criar `videos/CLAUDE.md` com as regras de render, anti-visual-genérico, som e o loop de nota ≥ 8.
- [ ] Criar `videos/marca-movitech.md` (logo, cores, fontes, tom) e um por restaurante/nicho quando houver.
- [ ] Antes de cada anúncio: escolher 1 vídeo de referência + capturar telas reais do sistema (cardápio, pedidos, painel admin).
- [ ] Fluxo de aprovação: tabela de cenas na batida → aprovar → render.
- [ ] Testar o caminho "HTML puro + Playwright + FFmpeg" no lugar do Remotion. Pode inclusive contornar o bloqueio do Smart App Control no PC (a confirmar).
- [ ] Exemplo da aula que encaixa direto: vídeo de 10 s de app de delivery (pedido confirmado → moto sai do restaurante → cruza o mapa).
