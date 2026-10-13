// Gera html/<video>/index.html: roteiro visual de cada vídeo (abaixo) + tempos da narração (src/voz/<voz>.json).
// Rode depois de `python scripts/gerar_voz.py`. Os negócios que aparecem nas telas são fictícios.
// Cada vídeo é uma lista de cenas; "cena" é o nome da cena no roteiro da voz e "tipo" é um dos tipos de html/_comum/motor.js.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')

const NICHOS = {
  clinicas: {
    rotulo: 'clínicas', icone: 'clinica', destaque: 'perde paciente',
    problemas: ['Agenda só no telefone', 'Mensagem sem resposta', 'Site que ninguém acha'],
    recursos: ['Agendamento online', 'WhatsApp em 1 toque', 'Site rápido e seguro'],
    tela: { url: 'clinicavivabem.com.br', nome: 'Clínica Viva Bem', titulo: 'Agende sua consulta', botao: 'Agendar consulta',
      linhas: [['Clínico geral', 'qui · 09h00'], ['Dermatologia', 'qui · 14h00'], ['Pediatria', 'sex · 10h30']] },
    notificacao: ['Nova consulta marcada', 'Ana Souza · quinta, 14h00'],
    beneficio: 'O paciente marca. | *Você* *só* *atende.*',
  },
  saloes: {
    rotulo: 'salões', icone: 'salao', destaque: 'vai vem',
    problemas: ['Cliente sem resposta', 'Horário vago', 'Só o Instagram'],
    recursos: ['Link com o seu nome', 'Agenda online', 'Botão de WhatsApp'],
    tela: { url: 'studiobella.com.br', nome: 'Studio Bella', titulo: 'Escolha seu horário', botao: 'Marcar horário',
      linhas: [['Corte + escova', 'sáb · 10h00'], ['Manicure', 'sáb · 11h30'], ['Coloração', 'sáb · 14h00']] },
    notificacao: ['Novo horário marcado', 'Júlia · corte + escova, sábado 10h'],
    beneficio: 'Agenda cheia, | *a* *qualquer* *hora.*',
  },
  imobiliarias: {
    rotulo: 'imobiliárias', icone: 'imovel', destaque: 'demora abrir',
    problemas: ['Página lenta', 'Foto que não carrega', 'Sem falar com corretor'],
    recursos: ['Site rápido', 'Busca e fotos', 'WhatsApp do corretor'],
    tela: { url: 'larimoveis.com.br', nome: 'Lar Imóveis', titulo: 'Encontre seu imóvel', botao: 'Falar com o corretor',
      linhas: [['Apto 2 dorms', 'Alphaville · 68 m²'], ['Casa 3 dorms', 'Barueri · 140 m²'], ['Studio', 'Tamboré · 34 m²']] },
    notificacao: ['Novo interessado', 'Apto 2 dorms · Alphaville'],
    beneficio: 'Achou o imóvel, | *já* *fala* *com* *você.*',
  },
  autoescolas: {
    rotulo: 'autoescolas', icone: 'volante', destaque: 'CNH?',
    problemas: ['Site antigo', 'WhatsApp que não abre', 'Matrícula só no balcão'],
    recursos: ['Site rápido', 'Pré-matrícula online', 'WhatsApp em 1 toque'],
    tela: { url: 'autoescolaviacerta.com.br', nome: 'Autoescola Via Certa', titulo: 'Tire sua CNH', botao: 'Fazer pré-matrícula',
      linhas: [['Categoria B', 'carro'], ['Categoria A', 'moto'], ['A + B', 'carro e moto']] },
    notificacao: ['Nova pré-matrícula', 'Lucas Lima · categoria B'],
    beneficio: 'Aluno inscrito | *pelo* *celular.*',
  },
  oficinas: {
    rotulo: 'oficinas', icone: 'oficina', destaque: 'só telefone?',
    problemas: ['Telefone sem resposta', 'Horário sem previsão', 'Nenhum site próprio'],
    recursos: ['Agendamento de revisão', 'Pedido de orçamento', 'Tudo pelo WhatsApp'],
    tela: { url: 'oficinamotorforte.com.br', nome: 'Oficina Motor Forte', titulo: 'Agende sua revisão', botao: 'Agendar revisão',
      linhas: [['Revisão completa', 'ter · 08h30'], ['Troca de óleo', 'ter · 10h00'], ['Freios', 'qua · 09h00']] },
    notificacao: ['Revisão agendada', 'Gol 2019 · terça, 8h30'],
    beneficio: 'O cliente agenda | e *chega* *na* *hora.*',
  },
  contabilidade: {
    rotulo: 'contadores', icone: 'contabil', destaque: 'confiança',
    problemas: ['Site sem cadeado', 'Visual antigo', 'Formulário perdido'],
    recursos: ['Site seguro', 'Pedido de orçamento', 'WhatsApp em 1 toque'],
    tela: { url: 'contabilprisma.com.br', nome: 'Contábil Prisma', titulo: 'Contabilidade sem dor de cabeça', botao: 'Pedir orçamento',
      linhas: [['Abertura de empresa', 'MEI · ME · LTDA'], ['Contabilidade mensal', 'simples nacional'], ['Imposto de renda', 'pessoa física']] },
    notificacao: ['Novo pedido de orçamento', 'Abertura de empresa · MEI'],
    beneficio: 'Quem procura contador | *encontra* *você.*',
  },
  petshops: {
    rotulo: 'pet shops', icone: 'pet', destaque: 'direct?',
    problemas: ['Perguntas de preço', 'Banho e tosa no papel', 'Sem catálogo online'],
    recursos: ['Catálogo com preços', 'Agenda de banho e tosa', 'Pedido pelo WhatsApp'],
    tela: { url: 'petamigo.com.br', nome: 'Pet Amigo', titulo: 'Banho, tosa e mais', botao: 'Fazer pedido',
      linhas: [['Banho + tosa', 'porte médio'], ['Ração 15 kg', 'entrega hoje'], ['Antipulgas', 'cães e gatos']] },
    notificacao: ['Novo pedido', 'Banho + tosa · Thor, sábado 9h'],
    beneficio: 'O cliente escolhe | *e* *pede* *sozinho.*',
  },
}

// Os 7 nichos seguem a mesma estrutura.
const nicho = (nome, n) => ({
  voz: `nicho-${nome}`, rotulo: `para ${n.rotulo}`,
  cenas: [
    { cena: 'abertura', tipo: 'pergunta', icone: n.icone, destaque: n.destaque },
    { cena: 'problema', tipo: 'lista', itens: n.problemas },
    { cena: 'solucao', tipo: 'celular', tela: n.tela, recursos: n.recursos },
    { cena: 'beneficio', tipo: 'notificacao', notificacao: n.notificacao, beneficio: n.beneficio },
    { cena: 'cta', tipo: 'cta' },
  ],
})

const CARDAPIO = { url: 'burgerdavila.com.br/pedir', nome: 'Burger da Vila', titulo: 'Peça direto com a gente', botao: 'Finalizar · Pix',
  linhas: [['X-Burger da casa', 'brioche, cheddar', 'R$ 32'], ['Smash duplo', 'bacon, cebola', 'R$ 38'], ['Fritas rústicas', 'porção grande', 'R$ 19']] }

const VIDEOS = {
  ...Object.fromEntries(Object.entries(NICHOS).map(([nome, n]) => [`nicho-${nome}`, nicho(nome, n)])),

  'movitech-restaurantes': {
    voz: 'anuncio-restaurantes', rotulo: 'para restaurantes',
    cenas: [
      { cena: 'abertura', tipo: 'comissao', destaque: 'comissão' },
      { cena: 'link', tipo: 'celular', titulo: 'Seu <em>próprio</em> link', tela: CARDAPIO,
        recursos: [{ txt: 'Cardápio online', palavra: 'cardápio' }, { txt: 'Pix na hora', palavra: 'Pix' }, { txt: 'Aviso no WhatsApp', palavra: 'WhatsApp' }] },
      { cena: 'salao', tipo: 'qr' },
      { cena: 'semcomissao', tipo: 'frase', texto: 'Sem comissão | *por* *pedido.*', sub: 'O pedido é seu. O cliente é seu.', etiquetas: ['−23%', '−R$ 20,13', '−23%', '−R$ 14,72', '−R$ 25,97'] },
      { cena: 'cta', tipo: 'cta' },
    ],
  },

  'movitech-negocios': {
    voz: 'anuncio-negocios', rotulo: 'para empresas',
    cenas: [
      { cena: 'abertura', tipo: 'falas', logo: true, destaque: 'Movi' },
      { cena: 'problema', tipo: 'pergunta', icone: 'lupa', destaque: 'perde cliente' },
      { cena: 'exemplos', tipo: 'lista', titulo: 'Acontece muito', itens: ['WhatsApp que não abre', 'Site que demora', 'Aviso de “não seguro”'] },
      { cena: 'solucao', tipo: 'diagnostico' },
      { cena: 'cta', tipo: 'cta', titulo: 'Peça seu | *diagnóstico*' },
    ],
  },

  'movitech-apresentacao': {
    voz: 'apresentacao', rotulo: 'de Barueri/SP',
    cenas: [
      { cena: 'abertura', tipo: 'falas', logo: true, destaque: 'Movi Movitech vender mais trabalhar menos' },
      { cena: 'problema', tipo: 'lista', intro: 'Negócio bom | perdendo | *cliente.*', itens: ['Site que demora', 'WhatsApp que não abre', 'Cardápio em PDF', 'Comissão em cada pedido'] },
      { cena: 'sistemas', tipo: 'celular', titulo: 'Sistemas por <em>assinatura</em>', tamTitulo: 88, tela: CARDAPIO,
        recursos: [{ txt: 'QR code na mesa', palavra: 'QR' }, { txt: 'Delivery próprio', palavra: 'delivery' }, { txt: 'Tela da cozinha', palavra: 'tela' }] },
      { cena: 'sites', tipo: 'celular', titulo: 'Sites <em>rápidos</em> e seguros', tamTitulo: 88,
        tela: { url: 'seunegocio.com.br', nome: 'Seu Negócio', titulo: 'Agende pelo celular', botao: 'Agendar agora',
          linhas: [['Atendimento', 'seg · 09h00'], ['Retorno', 'ter · 15h30'], ['Orçamento', 'pelo WhatsApp']] },
        recursos: [{ txt: 'Agendamento online', palavra: 'agendamento' }, { txt: 'WhatsApp em 1 toque', palavra: 'WhatsApp' }] },
      { cena: 'apps', tipo: 'frase', texto: 'Apps que abrem | *direto* *no* | *celular.*', tamanho: 136, top: 600, sub: 'Sem baixar nada.' },
      { cena: 'processo', tipo: 'lista', modo: 'check', titulo: 'Como funciona',
        itens: [{ txt: 'Analisamos tudo', fala: 1 }, { txt: 'Orçamento sob medida', fala: 3 }, { txt: 'No ar, com suporte', fala: 5 }] },
      { cena: 'cta', tipo: 'cta', titulo: 'Chama no | *WhatsApp*' },
    ],
  },
}

const so = process.argv.slice(2)
for (const [nome, cfg] of Object.entries(VIDEOS)) {
  if (so.length && !so.some((s) => nome === s || (s.endsWith('-') && nome.startsWith(s)))) continue
  const voz = JSON.parse(readFileSync(join(RAIZ, 'src', 'voz', `${cfg.voz}.json`), 'utf8'))
  const dir = join(RAIZ, 'html', nome)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Movitech · ${nome}</title><link rel="stylesheet" href="../_comum/estilo.css"></head>
<body><div id="palco"></div>
<script>window.VIDEO = ${JSON.stringify(cfg)}
window.VOZ = ${JSON.stringify(voz)}</script>
<script src="../_comum/motor.js"></script></body></html>
`)
  console.log(`html/${nome}/index.html (${voz.duracao}s)`)
}
