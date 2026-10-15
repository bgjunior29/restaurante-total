import { loadFont as loadInter } from '@remotion/google-fonts/Inter'
import { loadFont as loadSerif } from '@remotion/google-fonts/InstrumentSerif'
import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'

// Anúncio da Lexmovi para donos de restaurante (ângulo "comissão"), 9:16, sem música.
// Os pratos do celular vêm do cardápio baixado (cardapio.json): rode `npm run dados` antes.

const { fontFamily: serif } = loadSerif()
const { fontFamily: sans } = loadInter('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] })

// Cores da Lexmovi (as mesmas do site).
const C = {
  bg: '#0f0e0c',
  dark: '#141310',
  panel: '#1f1d19',
  line: '#2e2b26',
  ink: '#f2efe8',
  muted: '#9a958b',
  gold: '#d4b483',
  loss: '#e2786a',
}

// Exemplo da conta (o mesmo da página de vendas).
const VENDAS = 20000
const COMISSAO = 0.23
const PRECO = 'R$ 199'

const SCENES = [3.5, 3.2, 5, 4.5] // segundos: gancho, todo mês, solução, preço
export const anuncioDuration = (fps) => Math.round(SCENES.reduce((a, b) => a + b, 0) * fps)

const SAFE_TOP = 230
const SAFE_BOTTOM = 400

const brl = (v, digits = 0) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: digits, maximumFractionDigits: digits })

function useRise(delay = 0, distance = 60) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } })
  return { opacity: s, transform: `translateY(${(1 - s) * distance}px)` }
}

function Fade({ children, frames, out = true }) {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 6, frames - 6, frames], [0, 1, 1, out ? 0 : 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
}

const Stage = ({ children, glow = C.gold, style }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle at 50% 45%, ${glow}26 0%, transparent 60%), ${C.bg}`,
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${SAFE_TOP}px 80px ${SAFE_BOTTOM}px`,
      textAlign: 'center',
      color: C.ink,
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
)

const Kicker = ({ children, color = C.gold, style }) => (
  <p style={{ margin: 0, fontFamily: sans, fontWeight: 600, fontSize: 34, letterSpacing: '0.3em', color, ...style }}>{children}</p>
)

function LogoMark({ size = 120 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size}>
      <circle cx="24" cy="24" r="23" fill={C.dark} stroke={`${C.gold}73`} strokeWidth="1" />
      <path d="M18 15.5v17h12" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 1 · Gancho: o contador da comissão subindo. */
function Hook() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const total = VENDAS * COMISSAO
  const value = interpolate(frame, [8, 2.4 * fps], [0, total], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - (1 - t) ** 3 })
  const q = useRise(0)
  const n = useRise(6)
  const note = useRise(20)
  const shake = frame > 2.4 * fps && frame < 2.4 * fps + 8 ? Math.sin(frame * 3) * 6 : 0
  return (
    <Stage glow={C.loss}>
      <h1 style={{ ...q, margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 96, lineHeight: 1.04 }}>
        Quanto o app de delivery <em style={{ color: C.gold }}>levou</em> do seu restaurante este mês?
      </h1>
      <p style={{ ...n, margin: '80px 0 0', fontFamily: sans, fontWeight: 700, fontSize: 170, color: C.loss, letterSpacing: '-0.03em', transform: `${n.transform} translateX(${shake}px)`, fontVariantNumeric: 'tabular-nums' }}>
        −{brl(value)}
      </p>
      <p style={{ ...note, margin: '30px 0 0', fontFamily: sans, fontSize: 32, color: C.muted }}>
        Exemplo: {brl(VENDAS)} em pedidos × {Math.round(COMISSAO * 100)}% de comissão
      </p>
    </Stage>
  )
}

/** 2 · Todo mês: pedidos chegando e a comissão saindo de cada um. */
function EveryMonth() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const orders = [
    ['#1042', 86],
    ['#1043', 54.9],
    ['#1044', 129.5],
    ['#1045', 72],
    ['#1046', 98.4],
  ]
  const title = useRise(0)
  const year = spring({ frame: frame - 1.9 * fps, fps, config: { damping: 14 } })
  return (
    <Stage glow={C.loss}>
      <h2 style={{ ...title, margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 120, lineHeight: 1 }}>
        Todo pedido.<br /><em style={{ color: C.gold }}>Todo mês.</em>
      </h2>
      <div style={{ marginTop: 60, width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {orders.map(([id, value], i) => {
          const s = spring({ frame: frame - 6 - i * 5, fps, config: { damping: 200 } })
          return (
            <div
              key={id}
              style={{
                opacity: s,
                transform: `translateX(${(1 - s) * (i % 2 ? 120 : -120)}px)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '24px 36px',
                borderRadius: 28,
                border: `2px solid ${C.line}`,
                background: C.panel,
                fontFamily: sans,
                fontSize: 38,
              }}
            >
              <span style={{ color: C.muted }}>Pedido {id}</span>
              <span>{brl(value, 2)}</span>
              <span style={{ color: C.loss, fontWeight: 700 }}>−{brl(value * COMISSAO, 2)}</span>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 56, transform: `scale(${year})`, opacity: year }}>
        <Kicker color={C.muted} style={{ fontSize: 30 }}>EM UM ANO</Kicker>
        <p style={{ margin: '12px 0 0', fontFamily: sans, fontWeight: 700, fontSize: 104, color: C.loss, letterSpacing: '-0.02em' }}>
          −{brl(VENDAS * COMISSAO * 12)}
        </p>
      </div>
    </Stage>
  )
}

/** 3 · Solução: o cardápio próprio no celular. */
function Solution({ data }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const title = useRise(0)
  const phone = spring({ frame: frame - 8, fps, config: { damping: 18 } })
  const dishes = (data?.dishes ?? []).slice(0, 3)
  const chips = ['Pix', 'Cupons', 'WhatsApp', 'Tela da cozinha']
  return (
    <Stage style={{ justifyContent: 'flex-start', paddingTop: SAFE_TOP + 10 }}>
      <Kicker style={title}>COM A LEXMOVI</Kicker>
      <h2 style={{ ...title, margin: '20px 0 0', fontFamily: serif, fontWeight: 400, fontSize: 104, lineHeight: 1 }}>
        O pedido é <em style={{ color: C.gold }}>seu.</em>
      </h2>
      <p style={{ ...title, margin: '20px 0 0', fontFamily: sans, fontSize: 36, color: C.muted }}>Seu link de delivery, com a sua marca.</p>

      {/* celular */}
      <div
        style={{
          marginTop: 50,
          width: 600,
          borderRadius: 64,
          padding: 18,
          background: '#050505',
          boxShadow: `0 0 0 3px ${C.line}, 0 60px 120px -40px ${C.gold}66`,
          transform: `translateY(${(1 - phone) * 300}px)`,
          opacity: phone,
        }}
      >
        <div style={{ borderRadius: 48, overflow: 'hidden', background: C.bg, padding: '34px 26px 30px', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {data?.logo ? (
              <Img src={staticFile(data.logo)} style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <LogoMark size={70} />
            )}
            <div>
              <p style={{ margin: 0, fontFamily: serif, fontSize: 40, lineHeight: 1 }}>{data?.name ?? 'Seu restaurante'}</p>
              <p style={{ margin: '6px 0 0', fontFamily: sans, fontSize: 20, color: '#7fd49a' }}>● Aberto · delivery e retirada</p>
            </div>
          </div>
          <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {dishes.map((d, i) => {
              const s = spring({ frame: frame - 20 - i * 6, fps, config: { damping: 200 } })
              return (
                <div key={d.photo} style={{ opacity: s, transform: `translateY(${(1 - s) * 30}px)`, display: 'flex', gap: 18, alignItems: 'center', padding: 14, borderRadius: 24, background: C.panel }}>
                  <Img src={staticFile(d.photo)} style={{ width: 120, height: 96, borderRadius: 16, objectFit: 'cover' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontFamily: serif, fontSize: 32, lineHeight: 1.05 }}>{d.name}</p>
                    <p style={{ margin: '8px 0 0', fontFamily: sans, fontWeight: 600, fontSize: 24, color: C.gold }}>{brl(d.priceCents / 100, 2)}</p>
                  </div>
                  <span style={{ width: 52, height: 52, borderRadius: '50%', background: C.gold, color: C.bg, fontFamily: sans, fontSize: 36, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 44, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
        {chips.map((c, i) => {
          const s = spring({ frame: frame - 40 - i * 6, fps, config: { damping: 12 } })
          return (
            <span key={c} style={{ transform: `scale(${s})`, padding: '14px 28px', borderRadius: 999, border: `2px solid ${C.gold}80`, fontFamily: sans, fontWeight: 500, fontSize: 32 }}>
              ✓ {c}
            </span>
          )
        })}
      </div>
    </Stage>
  )
}

/** 4 · Preço fixo e chamada para o WhatsApp. */
function Offer() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const logo = spring({ frame, fps, config: { damping: 14 } })
  const price = spring({ frame: frame - 8, fps, config: { damping: 12 } })
  const sub = useRise(16)
  const cta = spring({ frame: frame - 26, fps, config: { damping: 14 } })
  const pulse = 1 + Math.sin((frame / fps) * Math.PI * 2) * 0.02
  return (
    <Stage>
      <div style={{ transform: `scale(${logo})` }}>
        <LogoMark size={150} />
      </div>
      <Kicker style={{ marginTop: 40 }}>LEXMOVI RESTAURANTES</Kicker>
      <p style={{ margin: '50px 0 0', fontFamily: serif, fontSize: 210, lineHeight: 0.9, transform: `scale(${price})` }}>
        {PRECO}
        <span style={{ fontFamily: sans, fontSize: 52, color: C.muted }}>/mês</span>
      </p>
      <p style={{ ...sub, margin: '36px 0 0', fontFamily: sans, fontWeight: 500, fontSize: 44, lineHeight: 1.3 }}>
        Preço fixo. <span style={{ color: C.gold }}>Sem comissão por pedido.</span>
      </p>
      <p style={{ ...sub, margin: '16px 0 0', fontFamily: sans, fontSize: 32, color: C.muted }}>Salão · Cozinha · Delivery</p>
      <div
        style={{
          marginTop: 70,
          padding: '30px 60px',
          borderRadius: 999,
          background: C.gold,
          color: C.bg,
          fontFamily: sans,
          fontWeight: 700,
          fontSize: 46,
          transform: `scale(${cta * pulse})`,
          boxShadow: `0 30px 80px -30px ${C.gold}`,
        }}
      >
        Chame no WhatsApp →
      </div>
    </Stage>
  )
}

export function AnuncioComissao({ data }) {
  const { fps } = useVideoConfig()
  const frames = SCENES.map((s) => Math.round(s * fps))
  const starts = frames.map((_, i) => frames.slice(0, i).reduce((a, b) => a + b, 0))
  const scenes = [<Hook key="h" />, <EveryMonth key="m" />, <Solution key="s" data={data} />, <Offer key="o" />]
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {scenes.map((scene, i) => (
        <Sequence key={i} from={starts[i]} durationInFrames={frames[i]}>
          <Fade frames={frames[i]} out={i < scenes.length - 1}>
            {scene}
          </Fade>
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
