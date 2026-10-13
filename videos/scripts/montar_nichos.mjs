// Gera html/nicho-*/index.html: textos de cada nicho (abaixo) + tempos da narração (src/voz/nicho-*.json).
// Rode depois de `python scripts/gerar_voz.py nicho-`. Negócios do exemplo são fictícios.
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

const so = process.argv.slice(2)
for (const [nome, cfg] of Object.entries(NICHOS)) {
  if (so.length && !so.includes(nome)) continue
  const voz = JSON.parse(readFileSync(join(RAIZ, 'src', 'voz', `nicho-${nome}.json`), 'utf8'))
  const dir = join(RAIZ, 'html', `nicho-${nome}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Movitech · ${cfg.rotulo}</title><link rel="stylesheet" href="../_comum/nicho.css"></head>
<body><div id="palco"></div>
<script>window.NICHO = ${JSON.stringify({ ...cfg, voz: `nicho-${nome}` })}
window.VOZ = ${JSON.stringify(voz)}</script>
<script src="../_comum/nicho.js"></script></body></html>
`)
  console.log(`html/nicho-${nome}/index.html (${voz.duracao}s)`)
}
