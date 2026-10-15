"""Gera a narração (voz neural pt-BR) e as legendas cronometradas dos vídeos da Movi.

Uso (na pasta videos):  python scripts/gerar_voz.py
Saída: public/voz/<id>.mp3 e src/voz/<id>.json  ({duracao, legendas:[{de, ate, texto}], cenas:[{cena, de, ate}]})

Cada roteiro é uma lista de cenas; cada cena, uma lista de falas. Uma fala é o texto falado ou um par
(falado, mostrado na legenda), para quando a legenda deve aparecer diferente da pronúncia.
O tempo de cada legenda vem das marcações de palavra que a própria voz devolve.
"""
import asyncio
import json
import re
from pathlib import Path

import edge_tts

VOZ = "pt-BR-ThalitaMultilingualNeural"
RAIZ = Path(__file__).resolve().parent.parent

ROTEIROS = {

    "nicho-clinicas": [
        ("abertura", ["Sua clínica perde paciente sem perceber?"]),
        ("problema", ["Agenda só no telefone,", "mensagem que demora pra responder", "e um site que ninguém acha."]),
        ("solucao", ["A Lexmovi resolve:", "agendamento online,", "WhatsApp em um toque", "e um site rápido e seguro."]),
        ("beneficio", ["O paciente escolhe o horário pelo celular", "e você recebe tudo organizado."]),
        ("cta", ["Chama a Movi no WhatsApp", "e peça o seu orçamento."]),
    ],
    "nicho-saloes": [
        ("abertura", ["Seu salão vive no vai e vem de mensagem pra marcar horário?"]),
        ("problema", ["Cliente esperando resposta,", "horário vago sem ninguém saber", "e só o Instagram pra mostrar o seu trabalho."]),
        ("solucao", ["Com a Lexmovi, você tem um link com o seu nome,", "agenda online", "e botão de WhatsApp."]),
        ("beneficio", ["O cliente marca sozinho, a qualquer hora,", "e você ganha tempo pra atender."]),
        ("cta", ["Chama a Movi no WhatsApp", "e peça o seu orçamento."]),
    ],
    "nicho-imobiliarias": [
        ("abertura", ["Seu site de imóveis demora pra abrir?"]),
        ("problema", ["Página lenta,", "foto que não carrega", "e nenhum jeito fácil de falar com o corretor."]),
        ("solucao", ["A Lexmovi faz um site de imóveis rápido,", "com busca, fotos", "e WhatsApp direto do corretor."]),
        ("beneficio", ["O interessado acha o imóvel", "e chama você na hora."]),
        ("cta", ["Chama a Movi no WhatsApp", "e peça o seu orçamento."]),
    ],
    "nicho-autoescolas": [
        ("abertura", ["Sua autoescola aparece bem pra quem procura a CNH?"]),
        ("problema", ["Site antigo,", "botão de WhatsApp que não funciona", "e matrícula só pessoalmente."]),
        ("solucao", ["A Lexmovi cria um site rápido,", "com pré-matrícula online", "e WhatsApp em um toque."]),
        ("beneficio", ["O aluno se inscreve pelo celular", "e você recebe o contato na hora."]),
        ("cta", ["Chama a Movi no WhatsApp", "e peça o seu orçamento."]),
    ],
    "nicho-oficinas": [
        ("abertura", ["Sua oficina ainda marca revisão só por telefone?"]),
        ("problema", ["Telefone que ninguém atende,", "cliente sem saber o horário livre", "e nenhum site com o seu nome."]),
        ("solucao", ["A Lexmovi faz um site com agendamento de revisão", "e pedido de orçamento", "pelo WhatsApp."]),
        ("beneficio", ["O cliente agenda pelo celular", "e chega na hora certa."]),
        ("cta", ["Chama a Movi no WhatsApp", "e peça o seu orçamento."]),
    ],
    "nicho-contabilidade": [
        ("abertura", ["Seu escritório passa confiança na internet?"]),
        ("problema", ["Site sem cadeado,", "visual antigo", "e formulário que não chega."]),
        ("solucao", ["A Lexmovi cria um site profissional e seguro,", "com pedido de orçamento", "e WhatsApp em um toque."]),
        ("beneficio", ["Quem procura contador encontra você", "e já manda a mensagem."]),
        ("cta", ["Chama a Movi no WhatsApp", "e peça o seu orçamento."]),
    ],
    "nicho-petshops": [
        ("abertura", ["Seu pet shop atende tudo pelo direct?"]),
        ("problema", ["Cliente perguntando preço,", "banho e tosa marcado no papel", "e nenhum catálogo online."]),
        ("solucao", ["Com a Lexmovi, você tem um catálogo com preços,", "agenda de banho e tosa", "e pedido pelo WhatsApp."]),
        ("beneficio", ["O cliente vê, escolhe e pede pelo celular,", "sem você parar o que está fazendo."]),
        ("cta", ["Chama a Movi no WhatsApp", "e peça o seu orçamento."]),
    ],
    "anuncio-negocios": [
        ("abertura", ["Oi! Eu sou a Movi, da Lexmovi."]),
        ("problema", ["Sabia que muita empresa perde cliente", "na internet sem perceber?"]),
        ("exemplos", ["Botão de WhatsApp que não abre,", "site que demora pra carregar,", "ou aquele aviso de \"não seguro\"."]),
        ("solucao", ["A gente analisa a sua presença online,", "mostra o que está errado", "e corrige pra você."]),
        ("cta", ["Chama a gente no WhatsApp", "e peça o seu diagnóstico."]),
    ],
    "anuncio-restaurantes": [
        ("abertura", ["Seu restaurante paga comissão", "em cada pedido do aplicativo?"]),
        ("link", ["Com a Lexmovi, você tem o seu próprio link de pedidos,", "com cardápio, Pix", "e aviso no WhatsApp."]),
        ("salao", ["No salão, o cliente pede pelo QR code da mesa", "e o pedido cai direto na cozinha."]),
        ("semcomissao", ["Sem comissão por pedido."]),
        ("cta", ["Chama a Movi no WhatsApp", "e peça o seu orçamento."]),
    ],
    "anuncio-comissao": [
        ("abertura", ["Quanto o aplicativo de entrega leva do seu restaurante?"]),
        ("conta", [("Com vinte mil reais em pedidos,", "Com R$ 20 mil em pedidos,"),
                   ("são quatro mil e seiscentos reais de comissão por mês.", "são R$ 4.600 de comissão por mês.")]),
        ("ano", ["Todo pedido, todo mês.", ("Em um ano, passa de cinquenta e cinco mil reais.", "Em um ano, passa de R$ 55 mil.")]),
        ("solucao", ["Com a Lexmovi, você tem o seu próprio cardápio online,", "com Pix, cupons", "e tela da cozinha."]),
        ("semcomissao", ["Preço fixo.", "Sem comissão por pedido."]),
        ("cta", ["Chama a Movi no WhatsApp", "e peça o seu orçamento."]),
    ],
    "apresentacao": [
        ("abertura", ["Oi! Eu sou a Movi,", "e vou te apresentar a Lexmovi, de Barueri.",
                      "A gente cria sistemas, sites e aplicativos", "que fazem o seu negócio vender mais", "e trabalhar menos."]),
        ("problema", ["Hoje, muito negócio bom perde cliente na internet.", "O site demora,", "o botão do WhatsApp não funciona,",
                      "o cardápio é um PDF,", "e cada pedido no aplicativo leva uma comissão."]),
        ("sistemas", ["A Lexmovi resolve isso em três frentes.", "Primeiro, sistemas por assinatura,", "como o nosso sistema para restaurantes:",
                      "QR code na mesa,", "delivery próprio", "e tela da cozinha."]),
        ("sites", ["Depois, sites e links rápidos e seguros,", "com agendamento", "e WhatsApp em um toque."]),
        ("apps", ["E aplicativos que abrem direto no celular,", "sem baixar nada."]),
        ("processo", ["Funciona assim:", "primeiro, a gente analisa a sua presença online", "e mostra o que está errado.",
                      "Depois, você recebe um orçamento", "só com o que precisa.", "E a gente coloca tudo no ar,", "com suporte de perto."]),
        ("cta", ["Quer ver o que dá pra melhorar no seu negócio?", "Chama no WhatsApp que está aqui na tela,",
                 ("ou acesse movitech sistemas ponto com ponto br.", "ou acesse movitechsistemas.com.br"), "Até já!"]),
    ],
}

PALAVRA = re.compile(r"[\wÀ-ÿ]+")


def falas(roteiro):
    for cena, linhas in roteiro:
        for linha in linhas:
            falado, mostrado = linha if isinstance(linha, tuple) else (linha, linha)
            yield cena, falado, mostrado


async def gerar(nome, roteiro):
    texto = " ".join(f for _, f, _ in falas(roteiro))
    com = edge_tts.Communicate(texto, VOZ, rate="+4%", boundary="WordBoundary")
    audio, marcas = bytearray(), []
    async for parte in com.stream():
        if parte["type"] == "audio":
            audio += parte["data"]
        elif parte["type"] == "WordBoundary":
            marcas.append((parte["offset"] / 1e7, (parte["offset"] + parte["duration"]) / 1e7, parte["text"]))

    (RAIZ / "public" / "voz").mkdir(parents=True, exist_ok=True)
    (RAIZ / "public" / "voz" / f"{nome}.mp3").write_bytes(audio)

    legendas, cenas, i = [], [], 0
    esperado = sum(len(PALAVRA.findall(f)) for _, f, _ in falas(roteiro))
    if esperado != len(marcas):
        print(f"  aviso: {nome}: {esperado} palavras no roteiro, {len(marcas)} marcadas pela voz")
    for cena, falado, mostrado in falas(roteiro):
        n = len(PALAVRA.findall(falado))
        bloco = marcas[i:i + n] or marcas[-1:]
        i += n
        legenda = {"de": round(bloco[0][0], 3), "ate": round(bloco[-1][1], 3), "texto": mostrado.strip()}
        if falado == mostrado:  # karaokê: cada palavra acende no tempo em que é falada
            legenda["palavras"] = [{"de": round(m[0], 3), "ate": round(m[1], 3), "t": m[2]} for m in bloco]
        legendas.append(legenda)
        if cenas and cenas[-1]["cena"] == cena:
            cenas[-1]["ate"] = legendas[-1]["ate"]
        else:
            cenas.append({"cena": cena, "de": legendas[-1]["de"], "ate": legendas[-1]["ate"]})
    duracao = marcas[-1][1] + 0.8
    (RAIZ / "src" / "voz").mkdir(parents=True, exist_ok=True)
    (RAIZ / "src" / "voz" / f"{nome}.json").write_text(
        json.dumps({"duracao": round(duracao, 2), "legendas": legendas, "cenas": cenas}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{nome}: {duracao:.1f}s, {len(legendas)} legendas, {len(cenas)} cenas")


async def main():
    import sys
    filtro = sys.argv[1:]
    for nome, roteiro in ROTEIROS.items():
        if filtro and not any(nome.startswith(f) for f in filtro):
            continue
        await gerar(nome, roteiro)


asyncio.run(main())
