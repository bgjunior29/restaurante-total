import { interpolate, useCurrentFrame } from 'remotion'
import vozAutoescolas from '../voz/nicho-autoescolas.json'
import vozClinicas from '../voz/nicho-clinicas.json'
import vozContabilidade from '../voz/nicho-contabilidade.json'
import vozImobiliarias from '../voz/nicho-imobiliarias.json'
import vozOficinas from '../voz/nicho-oficinas.json'
import vozPetshops from '../voz/nicho-petshops.json'
import vozSaloes from '../voz/nicho-saloes.json'
import {
  Area, clamp, Cta, EASE, font, Ico, IconeAmpulheta, IconeCadeado, IconeChat, IconeCheck, IconeFoguete, IconeX, P, Revela, S, Sfx, Tile, usePop, Video,
} from './MG'

// Anúncios verticais em motion graphics para outros nichos (mesma linguagem do MG.jsx):
// gancho com o ícone do nicho → 3 problemas → os cartões viram para a solução → benefício no celular → CTA.

// ---------- ícones dos nichos ----------

const Dente = ({ size }) => (
  <Ico size={size}>
    <path d="M30 14 Q50 22 70 14 Q88 10 88 32 Q88 52 78 62 L72 90 Q70 96 64 90 L56 66 Q50 60 44 66 L36 90 Q30 96 28 90 L22 62 Q12 52 12 32 Q12 10 30 14 Z" fill={P.white} {...S} />
    <path d="M30 28 Q36 24 42 28" stroke={P.teal} strokeWidth="5" fill="none" strokeLinecap="round" />
  </Ico>
)
const Tesoura = ({ size }) => (
  <Ico size={size}>
    <path d="M40 58 L78 14 M60 58 L22 14" stroke={P.ink} strokeWidth="8" strokeLinecap="round" />
    <circle cx="34" cy="74" r="14" fill={P.coral} {...S} />
    <circle cx="66" cy="74" r="14" fill={P.coral} {...S} />
    <circle cx="50" cy="44" r="4" fill={P.ink} />
  </Ico>
)
const Casa = ({ size }) => (
  <Ico size={size}>
    <path d="M14 48 L50 16 L86 48" fill="none" {...S} strokeWidth="8" />
    <rect x="24" y="44" width="52" height="44" fill={P.white} {...S} />
    <rect x="42" y="62" width="16" height="26" fill={P.teal} {...S} />
    <rect x="62" y="20" width="10" height="16" fill={P.coral} {...S} />
  </Ico>
)
const Volante = ({ size }) => (
  <Ico size={size}>
    <circle cx="50" cy="50" r="38" fill="none" stroke={P.ink} strokeWidth="10" />
    <circle cx="50" cy="50" r="10" fill={P.gold} {...S} />
    <path d="M14 46 Q50 36 86 46 M50 60 V86" stroke={P.ink} strokeWidth="8" strokeLinecap="round" fill="none" />
  </Ico>
)
const Chave = ({ size }) => (
  <Ico size={size}>
    <path d="M62 14 a22 22 0 0 0 -20 30 L14 72 a8 8 0 0 0 0 12 l2 2 a8 8 0 0 0 12 0 L56 58 a22 22 0 0 0 30 -20 L72 50 L58 46 L54 32 Z" fill={P.white} {...S} />
  </Ico>
)
const Calculadora = ({ size }) => (
  <Ico size={size}>
    <rect x="20" y="8" width="60" height="84" rx="10" fill={P.white} {...S} />
    <rect x="30" y="18" width="40" height="18" rx="4" fill={P.teal} {...S} />
    {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={30 + c * 14} y={44 + r * 14} width="10" height="10" rx="3" fill={r === 2 && c === 2 ? P.coral : P.ink} />))}
  </Ico>
)
const Pata = ({ size }) => (
  <Ico size={size}>
    <ellipse cx="50" cy="66" rx="22" ry="18" fill={P.white} {...S} />
    {[[22, 42], [38, 26], [62, 26], [78, 42]].map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx="9" ry="11" fill={P.coral} {...S} />)}
  </Ico>
)

// ---------- ícones de problema / solução ----------

function Telefone({ size }) {
  const frame = useCurrentFrame()
  const t = Math.sin(frame / 2) * (frame % 30 < 12 ? 10 : 0)
  return (
    <Ico size={size}>
      <g transform={`rotate(${t} 50 50)`}>
        <path d="M24 18 h14 l6 18 -10 8 q8 16 20 22 l8 -10 18 6 v14 q0 8 -10 8 Q20 80 18 28 q0 -10 6 -10 Z" fill={P.coral} {...S} />
      </g>
      <text x="78" y="30" textAnchor="middle" fontFamily={font} fontWeight="800" fontSize="28" fill={P.ink}>?</text>
    </Ico>
  )
}
const Relogio = ({ size }) => {
  const frame = useCurrentFrame()
  return (
    <Ico size={size}>
      <circle cx="50" cy="52" r="36" fill={P.white} {...S} />
      <line x1="50" y1="52" x2="50" y2="30" stroke={P.ink} strokeWidth="6" strokeLinecap="round" transform={`rotate(${frame * 6} 50 52)`} />
      <line x1="50" y1="52" x2="66" y2="52" stroke={P.coral} strokeWidth="6" strokeLinecap="round" transform={`rotate(${frame * 0.5} 50 52)`} />
      <circle cx="50" cy="52" r="5" fill={P.ink} />
    </Ico>
  )
}
const Papel = ({ size }) => (
  <Ico size={size}>
    <path d="M22 10 H66 L80 24 V90 H22 Z" fill={P.white} {...S} />
    {[34, 48, 62].map((y, i) => <path key={y} d={`M32 ${y} q8 -6 16 0 t16 0`} stroke={P.ink} strokeWidth="4" fill="none" strokeLinecap="round" opacity={i === 2 ? 0.4 : 1} />)}
  </Ico>
)
const Camera = ({ size }) => (
  <Ico size={size}>
    <rect x="14" y="14" width="72" height="72" rx="22" fill={P.violet} {...S} />
    <circle cx="50" cy="50" r="16" fill="none" stroke={P.white} strokeWidth="7" />
    <circle cx="70" cy="30" r="5" fill={P.white} />
  </Ico>
)
const FotoQuebrada = ({ size }) => (
  <Ico size={size}>
    <rect x="12" y="18" width="76" height="64" rx="10" fill="#b9b4c9" {...S} />
    <path d="M12 70 L36 46 L52 62 L62 52 L88 74" fill="none" stroke={P.ink} strokeWidth="5" strokeLinejoin="round" />
    <path d="M60 18 L52 40 L64 48 L56 82" fill="none" stroke={P.coral} strokeWidth="5" strokeLinejoin="round" />
  </Ico>
)
const Formulario = ({ size, ok = false }) => (
  <Ico size={size}>
    <rect x="18" y="10" width="64" height="80" rx="10" fill={P.white} {...S} />
    {[26, 44].map((y) => <rect key={y} x="28" y={y} width="44" height="10" rx="4" fill="none" stroke={P.ink} strokeWidth="4" />)}
    <rect x="28" y="64" width="44" height="14" rx="7" fill={ok ? P.teal : '#b9b4c9'} {...S} strokeWidth="4" />
  </Ico>
)
const Etiqueta = ({ size }) => (
  <Ico size={size}>
    <path d="M14 46 V18 a4 4 0 0 1 4 -4 H46 L88 56 L56 88 Z" fill={P.gold} {...S} />
    <circle cx="30" cy="30" r="6" fill={P.ink} />
    <text x="60" y="66" textAnchor="middle" fontFamily={font} fontWeight="800" fontSize="26" fill={P.ink} transform="rotate(45 60 60)">?</text>
  </Ico>
)
const Calendario = ({ size }) => (
  <Ico size={size}>
    <rect x="14" y="20" width="72" height="68" rx="10" fill={P.white} {...S} />
    <rect x="14" y="20" width="72" height="20" rx="10" fill={P.coral} {...S} />
    {[30, 50, 70].map((x) => <rect key={x} x={x - 3} y="12" width="6" height="16" rx="3" fill={P.ink} />)}
    <path d="M34 62 L46 72 L68 50" stroke={P.teal} strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Ico>
)
const Elo = ({ size }) => (
  <Ico size={size}>
    <rect x="10" y="36" width="48" height="28" rx="14" fill="none" stroke={P.ink} strokeWidth="9" transform="rotate(-30 34 50)" />
    <rect x="42" y="36" width="48" height="28" rx="14" fill="none" stroke={P.gold} strokeWidth="9" transform="rotate(-30 66 50)" />
  </Ico>
)
const Catalogo = ({ size }) => (
  <Ico size={size}>
    {[[16, 16, P.coral], [54, 16, P.gold], [16, 54, P.teal], [54, 54, P.violet]].map(([x, y, c]) => <rect key={`${x}${y}`} x={x} y={y} width="30" height="30" rx="8" fill={c} {...S} />)}
  </Ico>
)

// ---------- benefícios no celular ----------

function CascaCelular({ h, children, delay = 0 }) {
  const p = usePop(delay, 11)
  return (
    <div style={{ width: h * 0.62, height: h, transform: `translateY(${(1 - p) * 300}px) rotate(${(1 - p) * 10}deg)`, borderRadius: h * 0.09, background: P.ink, padding: h * 0.03 }}>
      <div style={{ height: '100%', borderRadius: h * 0.07, background: P.cream, padding: h * 0.045, display: 'flex', flexDirection: 'column', gap: h * 0.024, overflow: 'hidden' }}>{children}</div>
    </div>
  )
}

/** Agenda: dias, horários; um horário é tocado e aparece "Horário confirmado". */
function Agenda({ h = 680, titulo, servico }) {
  const frame = useCurrentFrame()
  const horarios = ['09:00', '10:30', '11:00', '14:00', '14:30', '16:00']
  const escolhido = 4
  const toque = interpolate(frame, [26, 32], [0, 1], { ...clamp, easing: EASE })
  const confirma = usePop(40, 9)
  return (
    <div style={{ position: 'relative' }}>
      <CascaCelular h={h}>
        <p style={{ margin: 0, fontFamily: font, fontWeight: 800, fontSize: h * 0.045, color: P.ink }}>{titulo}</p>
        <p style={{ margin: 0, fontFamily: font, fontWeight: 600, fontSize: h * 0.028, color: '#6b6580' }}>{servico}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {['Seg', 'Ter', 'Qua', 'Qui'].map((d, i) => (
            <div key={d} style={{ flex: 1, padding: '10px 0', borderRadius: 14, textAlign: 'center', background: i === 1 ? P.ink : P.white, color: i === 1 ? P.gold : P.ink, border: `4px solid ${P.ink}`, fontFamily: font, fontWeight: 800, fontSize: h * 0.026 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {horarios.map((hr, i) => {
            const k = interpolate(frame, [8 + i * 3, 18 + i * 3], [0, 1], { ...clamp, easing: EASE })
            const sel = i === escolhido && toque > 0.5
            return <div key={hr} style={{ padding: '14px 0', borderRadius: 16, textAlign: 'center', background: sel ? P.teal : P.white, border: `4px solid ${P.ink}`, fontFamily: font, fontWeight: 800, fontSize: h * 0.032, color: P.ink, transform: `scale(${k * (sel ? 1.06 : 1)})` }}>{hr}</div>
          })}
        </div>
        <div style={{ marginTop: 'auto', transform: `scale(${confirma})`, display: 'flex', alignItems: 'center', gap: 14, padding: h * 0.02, borderRadius: 20, background: P.teal, border: `4px solid ${P.ink}` }}>
          <IconeCheck size={h * 0.07} cor={P.ink} />
          <span style={{ fontFamily: font, fontWeight: 800, fontSize: h * 0.032, color: P.ink }}>Horário confirmado!</span>
        </div>
      </CascaCelular>
      <div style={{ position: 'absolute', left: h * 0.42, top: h * 0.63, width: 60, height: 60, borderRadius: '50%', background: 'rgba(21,19,43,.35)', border: `5px solid ${P.ink}`, transform: `scale(${toque > 0 && toque < 1 ? 1.3 - toque * 0.3 : toque >= 1 ? 0 : 1})`, opacity: frame < 34 ? 1 : 0 }} />
      <Sfx at={28} name="pop" volume={0.32} />
      <Sfx at={40} name="ding" volume={0.25} />
    </div>
  )
}

/** Lista (imóveis, produtos) com botão de WhatsApp que pulsa. */
function Lista({ h = 680, titulo, itens, botao }) {
  const frame = useCurrentFrame()
  const zap = usePop(34, 8)
  return (
    <div style={{ position: 'relative' }}>
      <CascaCelular h={h}>
        <p style={{ margin: 0, fontFamily: font, fontWeight: 800, fontSize: h * 0.045, color: P.ink }}>{titulo}</p>
        {itens.map(([Ic, nome, detalhe], i) => {
          const k = interpolate(frame, [8 + i * 6, 22 + i * 6], [0, 1], { ...clamp, easing: EASE })
          return (
            <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: h * 0.018, borderRadius: 18, background: P.white, border: `4px solid ${P.ink}`, transform: `translateX(${(1 - k) * 120}%)` }}>
              <div style={{ width: h * 0.1, height: h * 0.1, borderRadius: 16, background: [P.gold, P.teal, P.coral][i % 3], border: `4px solid ${P.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic size={h * 0.075} /></div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontFamily: font, fontWeight: 800, fontSize: h * 0.03, color: P.ink }}>{nome}</p>
                <p style={{ margin: '2px 0 0', fontFamily: font, fontWeight: 600, fontSize: h * 0.024, color: '#6b6580' }}>{detalhe}</p>
              </div>
            </div>
          )
        })}
        <div style={{ marginTop: 'auto', transform: `scale(${zap * (1 + Math.sin(frame / 4) * 0.03)})`, padding: h * 0.024, borderRadius: 999, background: P.zap, border: `4px solid ${P.ink}`, textAlign: 'center', fontFamily: font, fontWeight: 800, fontSize: h * 0.034, color: P.ink }}>{botao}</div>
      </CascaCelular>
      <Sfx at={34} name="pop" volume={0.3} />
    </div>
  )
}

/** Formulário que se preenche sozinho e é enviado. */
function Form({ h = 680, titulo, campos, botao }) {
  const frame = useCurrentFrame()
  const enviado = usePop(campos.length * 14 + 16, 9)
  return (
    <CascaCelular h={h}>
      <p style={{ margin: 0, fontFamily: font, fontWeight: 800, fontSize: h * 0.045, color: P.ink }}>{titulo}</p>
      {campos.map(([rotulo, valor], i) => {
        const n = Math.floor(interpolate(frame, [10 + i * 14, 22 + i * 14], [0, valor.length], clamp))
        return (
          <div key={rotulo}>
            <p style={{ margin: '0 0 6px', fontFamily: font, fontWeight: 700, fontSize: h * 0.024, color: '#6b6580' }}>{rotulo}</p>
            <div style={{ padding: '12px 16px', borderRadius: 14, background: P.white, border: `4px solid ${P.ink}`, fontFamily: font, fontWeight: 700, fontSize: h * 0.03, color: P.ink, minHeight: h * 0.05 }}>{valor.slice(0, n)}{n < valor.length && n > 0 ? '|' : ''}</div>
          </div>
        )
      })}
      <div style={{ marginTop: 'auto', padding: h * 0.024, borderRadius: 999, background: enviado > 0.5 ? P.teal : P.gold, border: `4px solid ${P.ink}`, textAlign: 'center', fontFamily: font, fontWeight: 800, fontSize: h * 0.034, color: P.ink, transform: `scale(${1 + enviado * 0.04})` }}>
        {enviado > 0.5 ? '✓ Enviado!' : botao}
      </div>
      <Sfx at={campos.length * 14 + 16} name="ding" volume={0.25} />
    </CascaCelular>
  )
}

// ---------- cena de problemas que viram solução ----------

function Cartoes({ itens, virar = false, corLabel = P.white }) {
  const w = 280
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 40 }}>
      {itens.map(([Prob, labelProb, Sol, labelSol], k) => (
        <div key={k} style={{ position: 'relative' }}>
          <Tile delay={virar ? 0 : k * 9} w={w} label={[labelProb, labelSol]} rot={k === 1 ? 3 : -3} virar={virar ? 6 + k * 8 : null} verso={<Sol size={w * 0.6} />} corLabel={corLabel}>
            <Prob size={w * 0.6} />
          </Tile>
          <div style={{ position: 'absolute', right: -14, top: -14, transform: `scale(${usePop(virar ? 12 + k * 8 : 8 + k * 9, 8)})` }}>
            {virar ? <IconeCheck size={w * 0.34} /> : <IconeX size={w * 0.34} />}
          </div>
          <Sfx at={virar ? 6 + k * 8 : k * 9} name="pop" volume={0.3} />
        </div>
      ))}
    </div>
  )
}

function Gancho({ Icone, texto, destaque, cor }) {
  const frame = useCurrentFrame()
  const p = usePop(0, 8)
  return (
    <Area top={250}>
      <div style={{ position: 'relative', transform: `scale(${p}) rotate(${Math.sin(frame / 10) * 4}deg)` }}>
        <div style={{ position: 'absolute', inset: -40, borderRadius: '50%', background: cor, border: `8px solid ${P.ink}` }} />
        <div style={{ position: 'relative' }}><Icone size={300} /></div>
      </div>
      <div style={{ height: 90 }} />
      <Revela texto={texto} destaque={destaque} size={100} delay={10} cor={P.white} fundoDestaque={P.ink} corDestaque={P.gold} maxWidth={960} />
      <Sfx at={0} name="impacto" volume={0.3} />
    </Area>
  )
}

// ---------- configuração dos nichos ----------

const NICHOS = {
  clinicas: {
    voz: vozClinicas, audio: 'voz/nicho-clinicas.mp3', cores: [P.teal, P.coral],
    gancho: [Dente, 'Sua clínica perde paciente sem perceber?', ['perde', 'paciente']],
    cartoes: [[Telefone, 'Agenda no telefone', Calendario, 'Agenda online'], [Relogio, 'Demora pra responder', IconeChat, 'WhatsApp em 1 toque'], [IconeCadeado, 'Site que ninguém acha', IconeFoguete, 'Site rápido e seguro']],
    beneficio: () => <Agenda titulo="Clínica Sorriso" servico="Avaliação · 30 min" />,
  },
  saloes: {
    voz: vozSaloes, audio: 'voz/nicho-saloes.mp3', cores: [P.coral, P.violet],
    gancho: [Tesoura, 'Marcar horário vira um vai e vem de mensagem?', ['vai', 'e', 'vem']],
    cartoes: [[Relogio, 'Cliente esperando', Calendario, 'Agenda online'], [Papel, 'Horário vago', Elo, 'Link com seu nome'], [Camera, 'Só o Instagram', IconeChat, 'WhatsApp em 1 toque']],
    beneficio: () => <Agenda titulo="Studio Beleza" servico="Corte + escova · 1h" />,
  },
  imobiliarias: {
    voz: vozImobiliarias, audio: 'voz/nicho-imobiliarias.mp3', cores: [P.violet, P.teal],
    gancho: [Casa, 'Seu site de imóveis demora pra abrir?', ['demora']],
    cartoes: [[IconeAmpulheta, 'Página lenta', IconeFoguete, 'Site rápido'], [FotoQuebrada, 'Foto não carrega', Catalogo, 'Busca e fotos'], [IconeChat, 'Difícil de chamar', IconeChat, 'WhatsApp do corretor']],
    beneficio: () => <Lista titulo="Imóveis à venda" itens={[[Casa, 'Casa 3 dorm.', 'Jardim · 2 vagas'], [Casa, 'Apto 2 dorm.', 'Centro · varanda'], [Casa, 'Sobrado', 'Vila · quintal']]} botao="Falar com o corretor" />,
  },
  autoescolas: {
    voz: vozAutoescolas, audio: 'voz/nicho-autoescolas.mp3', cores: [P.teal, P.coral],
    gancho: [Volante, 'Sua autoescola aparece pra quem procura a CNH?', ['CNH']],
    cartoes: [[IconeAmpulheta, 'Site antigo', IconeFoguete, 'Site rápido'], [IconeChat, 'WhatsApp quebrado', IconeChat, 'WhatsApp em 1 toque'], [Papel, 'Matrícula só no balcão', (p) => <Formulario {...p} ok />, 'Pré-matrícula online']],
    beneficio: () => <Form titulo="Pré-matrícula" campos={[['Nome', 'Ana Souza'], ['Categoria', 'Carro (B)'], ['WhatsApp', '(11) 9 8765-4321']]} botao="Quero me matricular" />,
  },
  oficinas: {
    voz: vozOficinas, audio: 'voz/nicho-oficinas.mp3', cores: [P.coral, P.gold],
    gancho: [Chave, 'Sua oficina ainda marca revisão só por telefone?', ['telefone']],
    cartoes: [[Telefone, 'Ninguém atende', Calendario, 'Agendamento online'], [Relogio, 'Horário incerto', IconeChat, 'Orçamento no WhatsApp'], [IconeCadeado, 'Sem site', IconeFoguete, 'Site com seu nome']],
    beneficio: () => <Agenda titulo="Auto Center" servico="Revisão completa" />,
  },
  contabilidade: {
    voz: vozContabilidade, audio: 'voz/nicho-contabilidade.mp3', cores: [P.teal, P.violet],
    gancho: [Calculadora, 'Seu escritório passa confiança na internet?', ['confiança']],
    cartoes: [[IconeCadeado, 'Sem cadeado', (p) => <IconeCadeado {...p} aberto={false} cor={P.gold} />, 'Site seguro'], [IconeAmpulheta, 'Visual antigo', IconeFoguete, 'Site profissional'], [Formulario, 'Formulário não chega', (p) => <Formulario {...p} ok />, 'Orçamento que chega']],
    beneficio: () => <Form titulo="Peça um orçamento" campos={[['Empresa', 'Padaria Bom Pão'], ['Serviço', 'Abertura de empresa'], ['WhatsApp', '(11) 9 1234-5678']]} botao="Enviar" />,
  },
  petshops: {
    voz: vozPetshops, audio: 'voz/nicho-petshops.mp3', cores: [P.violet, P.coral],
    gancho: [Pata, 'Seu pet shop atende tudo pelo direct?', ['direct']],
    cartoes: [[Etiqueta, 'Pergunta de preço', Catalogo, 'Catálogo com preços'], [Papel, 'Agenda no papel', Calendario, 'Banho e tosa online'], [Camera, 'Sem catálogo', IconeChat, 'Pedido no WhatsApp']],
    beneficio: () => <Lista titulo="Pet Shop Amigo" itens={[[Pata, 'Ração premium 15kg', 'Pronta entrega'], [Pata, 'Banho e tosa', 'Agende online'], [Pata, 'Petiscos', 'Vários sabores']]} botao="Pedir no WhatsApp" />,
  },
}

export const NICHOS_MG = Object.fromEntries(Object.entries(NICHOS).map(([k, n]) => [k, n.voz]))

export function NichoMG({ nicho }) {
  const n = NICHOS[nicho]
  const [Icone, texto, destaque] = n.gancho
  return (
    <Video
      voz={n.voz}
      audio={n.audio}
      vertical
      cenas={{
        abertura: { fundo: n.cores[0], formas: [P.gold, P.white, P.ink], Comp: () => <Gancho Icone={Icone} texto={texto} destaque={destaque} cor={P.gold} /> },
        problema: { fundo: P.ink, formas: [P.coral, P.gold, P.teal], apontar: 'right', Comp: () => <Area top={330}><Cartoes itens={n.cartoes} /></Area> },
        solucao: { fundo: n.cores[1], formas: [P.gold, P.white], apontar: 'right', Comp: () => <Area top={220}><Revela texto="A Movitech resolve!" destaque={['resolve!']} size={96} cor={P.white} fundoDestaque={P.ink} corDestaque={P.mint} /><div style={{ height: 50 }} /><Cartoes itens={n.cartoes} virar corLabel={P.ink} /></Area> },
        beneficio: { fundo: n.cores[1] === P.violet ? P.teal : P.violet, formas: [P.gold, P.mint, P.white], apontar: 'right', Comp: () => <Area top={250}>{n.beneficio()}</Area> },
        cta: { fundo: P.cream, formas: [P.coral, P.teal, P.gold], apontar: 'right', Comp: () => <Area top={230}><Cta frase="Peça seu orçamento" escala={0.95} /></Area> },
      }}
    />
  )
}
