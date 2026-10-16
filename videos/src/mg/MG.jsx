import { loadFont as loadBricolage } from '@remotion/google-fonts/BricolageGrotesque'
import { useAudioData, visualizeAudio } from '@remotion/media-utils'
import { evolvePath } from '@remotion/paths'
import { QRCodeSVG } from 'qrcode.react'
import { AbsoluteFill, Audio, Easing, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import vozApresentacao from '../voz/apresentacao.json'
import vozNegocios from '../voz/anuncio-negocios.json'
import vozRestaurantes from '../voz/anuncio-restaurantes.json'

// Versão "motion graphics" (flat): cores sólidas, formas geométricas, ícones vetoriais, fundo que troca de cor
// a cada cena com transição de círculo, infográficos animados e a Movi plana. Mesma narração e legendas.

export const { fontFamily: font } = loadBricolage('normal', { weights: ['500', '700', '800'], subsets: ['latin'] })

export const P = { ink: '#15132b', cream: '#fff6e5', gold: '#ffc145', goldDark: '#e9a21f', coral: '#ff5a5f', teal: '#2ec4b6', violet: '#6c5ce7', mint: '#7ff0c8', white: '#ffffff', zap: '#25d366' }
export const WHATS = '(11) 96445-2878'
export const SITE = 'movitechsistemas.com.br'
export const FPS = 30
export const EASE = Easing.bezier(0.65, 0, 0.35, 1)
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }

export const MG_VOZES = { apresentacao: vozApresentacao, negocios: vozNegocios, restaurantes: vozRestaurantes }
export const mgDuracao = (voz) => Math.ceil(voz.duracao * FPS) + 20

// ---------- movimento ----------

const useT = (de, ate) => interpolate(useCurrentFrame(), [de, ate], [0, 1], { ...clamp, easing: EASE })
export function usePop(delay = 0, damping = 10) {
  const frame = useCurrentFrame()
  return spring({ frame: frame - delay, fps: FPS, config: { damping, mass: 0.6 } })
}
export function Sfx({ at = 0, name, volume = 0.3 }) {
  return (
    <Sequence from={Math.max(0, Math.round(at))} durationInFrames={45}>
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
    </Sequence>
  )
}
export function useVoz(src) {
  const frame = useCurrentFrame()
  const audio = useAudioData(src)
  if (!audio) return { volume: 0, spectrum: [] }
  const a = visualizeAudio({ fps: FPS, frame, audioData: audio, numberOfSamples: 32 })
  const b = visualizeAudio({ fps: FPS, frame: Math.max(0, frame - 1), audioData: audio, numberOfSamples: 32 })
  const s = a.map((x, i) => x * 0.65 + b[i] * 0.35)
  return { spectrum: [1, 2, 3, 4, 5, 6, 8].map((i) => Math.min(1, s[i] * (6 + i * 1.6))), volume: Math.min(1, (s.slice(0, 8).reduce((x, y) => x + y, 0) / 8) * 9) }
}

// ---------- Movi plana ----------

export function MoviFlat({ spectrum = [], volume = 0, size = 360, waving = false, pointing = null }) {
  const frame = useCurrentFrame()
  const t = frame / FPS
  const v = Math.min(1, volume)
  const falando = v > 0.05
  const pulo = Math.abs(Math.sin(t * 2.2)) * -10 - v * 4
  const estica = 1 + Math.sin(t * 4.4) * 0.02
  const pisca = (frame % 97) < 5 ? 0.12 : 1
  const olhar = pointing === 'right' ? 8 : pointing === 'left' ? -8 : Math.sin(t * 0.8) * 5
  const aceno = waving ? Math.sin(t * 14) * 22 : 0
  const bars = Array.from({ length: 5 }, (_, i) => 6 + Math.min(1, spectrum[i + 1] ?? 0) * 30 * (1 - Math.abs(i - 2) * 0.18))
  return (
    <svg viewBox="0 0 300 340" width={size * (300 / 340)} height={size} style={{ overflow: 'visible' }}>
      <ellipse cx="150" cy="328" rx={70 + pulo} ry="10" fill={P.ink} opacity="0.18" />
      <g transform={`translate(0 ${pulo}) translate(150 310) scale(${1 / estica} ${estica}) translate(-150 -310)`}>
        <line x1="150" y1="52" x2={150 + Math.sin(t * 3) * 10} y2="16" stroke={P.goldDark} strokeWidth="7" strokeLinecap="round" />
        <circle cx={150 + Math.sin(t * 3) * 10} cy="14" r={10 + v * 4} fill={P.coral} />
        <g transform={`rotate(${waving ? 140 + aceno : pointing === 'left' ? 80 : 14} 52 200)`}>
          <line x1="52" y1="200" x2="40" y2="262" stroke={P.goldDark} strokeWidth="14" strokeLinecap="round" />
          <circle cx="40" cy="266" r="16" fill={P.gold} stroke={P.ink} strokeWidth="6" />
        </g>
        <g transform={`rotate(${pointing === 'right' ? -80 : -14} 248 200)`}>
          <line x1="248" y1="200" x2="260" y2="262" stroke={P.goldDark} strokeWidth="14" strokeLinecap="round" />
          <circle cx="260" cy="266" r="16" fill={P.gold} stroke={P.ink} strokeWidth="6" />
        </g>
        <rect x="44" y="50" width="212" height="256" rx="100" fill={P.gold} stroke={P.ink} strokeWidth="7" />
        <path d="M206 70 Q262 140 236 280 Q226 296 206 300 Q246 200 206 70 Z" fill={P.goldDark} />
        <ellipse cx="100" cy="92" rx="22" ry="10" fill={P.white} opacity="0.7" transform="rotate(-30 100 92)" />
        <rect x="70" y="104" width="160" height="110" rx="48" fill={P.ink} />
        <g transform={`translate(${olhar} 0)`}>
          <rect x="108" y={132 + 18 * (1 - pisca)} width="22" height={36 * pisca} rx="11" fill={P.mint} />
          <rect x="170" y={132 + 18 * (1 - pisca)} width="22" height={36 * pisca} rx="11" fill={P.mint} />
        </g>
        {falando
          ? bars.map((h, i) => <rect key={i} x={126 + i * 11} y={190 - h / 2} width="7" height={h} rx="3.5" fill={P.mint} />)
          : <path d="M134 186 Q150 198 166 186" stroke={P.mint} strokeWidth="6" fill="none" strokeLinecap="round" />}
        <circle cx="150" cy="262" r="20" fill={P.ink} />
        <path d="M141 271v-18l9 10 9-10v18" fill="none" stroke={P.gold} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

// ---------- ícones planos ----------

export const Ico = ({ size = 200, children, vb = '0 0 100 100' }) => (
  <svg viewBox={vb} width={size} height={size} style={{ overflow: 'visible' }}>{children}</svg>
)
export const S = { stroke: P.ink, strokeWidth: 5, strokeLinejoin: 'round', strokeLinecap: 'round' }

export const IconeCadeado = ({ size, aberto = true, cor = P.coral }) => (
  <Ico size={size}>
    <path d={aberto ? 'M32 46 V30 a18 18 0 0 1 36 0 V20' : 'M32 46 V32 a18 18 0 0 1 36 0 V46'} fill="none" {...S} strokeWidth={8} />
    <rect x="22" y="44" width="56" height="44" rx="10" fill={cor} {...S} />
    <circle cx="50" cy="64" r="6" fill={P.ink} />
    <rect x="47" y="64" width="6" height="12" rx="3" fill={P.ink} />
  </Ico>
)
export function IconeAmpulheta({ size, cor = P.gold }) {
  const frame = useCurrentFrame()
  const giro = interpolate(frame % 40, [28, 40], [0, 180], { ...clamp, easing: EASE })
  return (
    <Ico size={size}>
      <g transform={`rotate(${giro} 50 50)`}>
        <rect x="24" y="10" width="52" height="8" rx="4" fill={P.ink} />
        <rect x="24" y="82" width="52" height="8" rx="4" fill={P.ink} />
        <path d="M30 18 H70 Q70 40 50 50 Q70 60 70 82 H30 Q30 60 50 50 Q30 40 30 18 Z" fill={P.white} {...S} />
        <path d="M38 70 Q50 60 62 70 L66 80 H34 Z" fill={cor} />
      </g>
    </Ico>
  )
}
export const IconeChat = ({ size, quebrado = false, cor = P.zap }) => (
  <Ico size={size}>
    <path d="M18 22 h64 a10 10 0 0 1 10 10 v30 a10 10 0 0 1 -10 10 H46 l-18 14 v-14 h-10 a10 10 0 0 1 -10 -10 V32 a10 10 0 0 1 10 -10 Z" fill={quebrado ? '#b9b4c9' : cor} {...S} />
    {quebrado ? <path d="M54 22 L46 40 L58 50 L48 72" fill="none" stroke={P.ink} strokeWidth="5" strokeLinejoin="round" /> : [36, 50, 64].map((x) => <circle key={x} cx={x} cy="47" r="5" fill={P.white} />)}
  </Ico>
)
export const IconeCheck = ({ size, draw = 1, cor = P.teal }) => {
  const d = 'M30 52 L44 66 L72 36'
  const ev = evolvePath(Math.max(0.001, draw), d)
  return (
    <Ico size={size}>
      <circle cx="50" cy="50" r="40" fill={cor} {...S} />
      <path d={d} fill="none" stroke={P.white} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
    </Ico>
  )
}
export const IconeX = ({ size }) => (
  <Ico size={size}>
    <circle cx="50" cy="50" r="40" fill={P.coral} {...S} />
    <path d="M36 36 L64 64 M64 36 L36 64" stroke={P.white} strokeWidth="10" strokeLinecap="round" />
  </Ico>
)
const IconeLoja = ({ size }) => (
  <Ico size={size}>
    <rect x="16" y="40" width="68" height="48" fill={P.cream} {...S} />
    <rect x="42" y="58" width="16" height="30" fill={P.violet} {...S} />
    {[0, 1, 2, 3].map((i) => <path key={i} d={`M${12 + i * 19} 40 a9.5 9.5 0 0 0 19 0 V22 h-19 Z`} fill={i % 2 ? P.coral : P.white} {...S} />)}
  </Ico>
)
export const Pessoa = ({ size = 90, cor = P.violet }) => (
  <Ico size={size}>
    <circle cx="50" cy="28" r="16" fill={cor} {...S} />
    <path d="M22 92 V70 a28 28 0 0 1 56 0 V92 Z" fill={cor} {...S} />
  </Ico>
)
export const IconeMoeda = ({ size, cor = P.gold }) => (
  <Ico size={size}>
    <circle cx="50" cy="50" r="38" fill={cor} {...S} />
    <circle cx="50" cy="50" r="27" fill="none" stroke={P.ink} strokeWidth="3" />
    <text x="50" y="62" textAnchor="middle" fontFamily={font} fontWeight="800" fontSize="32" fill={P.ink}>R$</text>
  </Ico>
)
const IconeSino = ({ size }) => (
  <Ico size={size}>
    <rect x="14" y="74" width="72" height="10" rx="5" fill={P.ink} />
    <path d="M20 74 a30 30 0 0 1 60 0 Z" fill={P.gold} {...S} />
    <circle cx="50" cy="38" r="6" fill={P.ink} />
  </Ico>
)
export const IconeFoguete = ({ size }) => (
  <Ico size={size}>
    <path d="M50 8 Q72 28 68 66 H32 Q28 28 50 8 Z" fill={P.white} {...S} />
    <circle cx="50" cy="38" r="9" fill={P.teal} {...S} />
    <path d="M32 54 L18 72 H34 Z M68 54 L82 72 H66 Z" fill={P.coral} {...S} />
    <path d="M40 70 Q50 96 60 70 Z" fill={P.gold} {...S} />
  </Ico>
)
export const IconeLupa = ({ size }) => (
  <Ico size={size}>
    <line x1="62" y1="62" x2="86" y2="86" stroke={P.ink} strokeWidth="12" strokeLinecap="round" />
    <circle cx="42" cy="42" r="28" fill={P.mint} {...S} />
    <path d="M28 36 a16 16 0 0 1 14 -10" stroke={P.white} strokeWidth="5" fill="none" strokeLinecap="round" />
  </Ico>
)
export const IconeRecibo = ({ size }) => (
  <Ico size={size}>
    <path d="M24 10 H76 V90 L68 84 L60 90 L52 84 L44 90 L36 84 L28 90 L24 86 Z" fill={P.white} {...S} />
    {[28, 42, 56].map((y) => <rect key={y} x="34" y={y} width={y === 56 ? 20 : 32} height="6" rx="3" fill={P.ink} />)}
    <rect x="34" y="68" width="32" height="8" rx="4" fill={P.gold} />
  </Ico>
)

// ---------- texto com máscara ----------

/** Palavras sobem por trás de uma "linha" (máscara), uma de cada vez — o reveal clássico de motion graphics. */
export function Revela({ texto, size = 110, delay = 0, cor = P.ink, destaque = [], corDestaque = P.white, fundoDestaque = P.coral, align = 'center', maxWidth }) {
  const frame = useCurrentFrame()
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: `${size * 0.04}px ${size * 0.22}px`, maxWidth }}>
      {texto.split(' ').map((w, i) => {
        const p = interpolate(frame, [delay + i * 3, delay + i * 3 + 14], [0, 1], { ...clamp, easing: EASE })
        const marca = destaque.includes(w.replace(/[.,!?]/g, ''))
        const fundo = interpolate(frame, [delay + i * 3 + 8, delay + i * 3 + 20], [0, 1], { ...clamp, easing: EASE })
        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', padding: `0 ${marca ? size * 0.12 : 0}px`, lineHeight: 1.08 }}>
            {marca && <span style={{ position: 'absolute', inset: `${size * 0.08}px 0`, background: fundoDestaque, borderRadius: size * 0.14, transform: `scaleX(${fundo})`, transformOrigin: 'left' }} />}
            <span style={{ position: 'relative', display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)`, fontFamily: font, fontWeight: 800, fontSize: size, letterSpacing: '-0.035em', color: marca ? corDestaque : cor }}>{w}</span>
          </span>
        )
      })}
    </div>
  )
}

// ---------- formas decorativas ----------

export function Formas({ cores, seed = 0 }) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const itens = [
    { t: 'c', x: 0.1, y: 0.12, s: 70 }, { t: 'p', x: 0.88, y: 0.1, s: 60 }, { t: 'r', x: 0.82, y: 0.55, s: 54 },
    { t: 'z', x: 0.08, y: 0.6, s: 90 }, { t: 't', x: 0.5, y: 0.06, s: 50 }, { t: 'c', x: 0.93, y: 0.85, s: 40 },
  ]
  return itens.map((f, i) => {
    const p = usePop(4 + i * 3, 12)
    const rot = frame * (i % 2 ? 0.8 : -0.6) + seed * 40
    const fl = Math.sin(frame / 25 + i) * 10
    const cor = cores[i % cores.length]
    const st = { position: 'absolute', left: f.x * width, top: f.y * height + fl, transform: `translate(-50%,-50%) scale(${p}) rotate(${rot}deg)` }
    if (f.t === 'c') return <div key={i} style={{ ...st, width: f.s, height: f.s, borderRadius: '50%', border: `10px solid ${cor}` }} />
    if (f.t === 'r') return <div key={i} style={{ ...st, width: f.s, height: f.s, borderRadius: 12, background: cor }} />
    if (f.t === 'p') return <svg key={i} style={st} width={f.s} height={f.s} viewBox="0 0 10 10"><path d="M5 1v8M1 5h8" stroke={cor} strokeWidth="2.4" strokeLinecap="round" /></svg>
    if (f.t === 't') return <svg key={i} style={st} width={f.s} height={f.s} viewBox="0 0 10 10"><path d="M5 1 L9 9 H1 Z" fill={cor} /></svg>
    return <svg key={i} style={st} width={f.s * 1.6} height={f.s * 0.6} viewBox="0 0 32 12"><path d="M2 6 q3.5 -6 7 0 t7 0 t7 0 t7 0" fill="none" stroke={cor} strokeWidth="3" strokeLinecap="round" /></svg>
  })
}

// ---------- legenda ----------

function blocos(voz) {
  const out = []
  for (const l of voz.legendas) {
    const escritas = l.texto.split(/\s+/)
    if (!l.palavras || l.palavras.length !== escritas.length) {
      out.push({ de: l.de, ate: l.ate, palavras: [{ de: l.de, ate: l.ate, t: l.texto }] })
      continue
    }
    let atual = []
    l.palavras.forEach((p, i) => {
      atual.push({ ...p, t: escritas[i] })
      if (atual.length === 3 || /[,.!?:]$/.test(escritas[i]) || i === l.palavras.length - 1) {
        out.push({ de: atual[0].de, ate: atual[atual.length - 1].ate, palavras: atual })
        atual = []
      }
    })
  }
  return out
}

export function Legenda({ voz, fontSize, bottom, left = 0, right = 0 }) {
  const t = useCurrentFrame() / FPS
  const lista = blocos(voz)
  const i = lista.findIndex((b, k) => t >= b.de - 0.06 && t < (lista[k + 1]?.de ?? b.ate + 0.5) - 0.02)
  if (i < 0) return null
  const b = lista[i]
  const entra = interpolate(t, [b.de - 0.06, b.de + 0.08], [0, 1], { ...clamp, easing: EASE })
  return (
    <div style={{ position: 'absolute', left, right, bottom, display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: fontSize * 0.25, padding: `${fontSize * 0.22}px ${fontSize * 0.45}px`, borderRadius: fontSize * 0.3, background: P.ink, transform: `translateY(${(1 - entra) * 30}px) scale(${0.9 + entra * 0.1})`, opacity: entra, boxShadow: `0 ${fontSize * 0.12}px 0 rgba(0,0,0,.25)` }}>
        {b.palavras.map((p, k) => {
          const ativa = t >= p.de - 0.03 && t < p.ate + 0.08
          return (
            <span key={k} style={{ position: 'relative', fontFamily: font, fontWeight: 800, fontSize, lineHeight: 1.1, color: ativa ? P.gold : P.white, opacity: t >= p.de - 0.05 ? 1 : 0.35 }}>
              {p.t}
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: -fontSize * 0.08, height: fontSize * 0.08, borderRadius: 9, background: P.gold, transform: `scaleX(${ativa ? 1 : 0})`, transformOrigin: 'left' }} />
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ---------- estrutura: fundo por cena com transição de círculo ----------

export function cenasEmFrames(voz, total) {
  return voz.cenas.map((c, i) => {
    const de = i === 0 ? 0 : Math.round(c.de * FPS) - 8
    const ate = i + 1 < voz.cenas.length ? Math.round(voz.cenas[i + 1].de * FPS) - 8 : total
    return { cena: c.cena, de, dur: ate - de }
  })
}

export function CirculoFundo({ cor, origem }) {
  const { width, height } = useVideoConfig()
  const p = useT(0, 18)
  const r = Math.hypot(width, height) * p
  return <AbsoluteFill style={{ background: cor, clipPath: `circle(${r}px at ${origem[0]}px ${origem[1]}px)` }} />
}

export function Cena({ frames, children }) {
  const frame = useCurrentFrame()
  const sai = interpolate(frame, [frames - 8, frames], [1, 0], { ...clamp, easing: EASE })
  return <AbsoluteFill style={{ opacity: sai, transform: `scale(${0.96 + sai * 0.04})` }}>{children}</AbsoluteFill>
}

export function Video({ voz, audio, cenas, vertical }) {
  const { durationInFrames, width, height } = useVideoConfig()
  const src = staticFile(audio)
  const { volume, spectrum } = useVoz(src)
  const partes = cenasEmFrames(voz, durationInFrames)
  const frame = useCurrentFrame()
  const atual = partes.find((p) => frame >= p.de && frame < p.de + p.dur)
  const def = atual ? cenas[atual.cena] : null
  const moviPos = vertical ? [180, 1330] : [330, 760]
  const entra = spring({ frame, fps: FPS, config: { damping: 9, mass: 0.6 } })
  return (
    <AbsoluteFill style={{ background: P.ink, overflow: 'hidden' }}>
      <Audio src={src} />
      {partes.map((p, i) => (
        <Sequence key={`bg-${p.cena}`} from={p.de} durationInFrames={durationInFrames - p.de}>
          <CirculoFundo cor={cenas[p.cena]?.fundo ?? P.ink} origem={i === 0 ? [width / 2, height / 2] : moviPos} />
          {i > 0 && <Sfx name="whoosh" volume={0.28} />}
        </Sequence>
      ))}
      {partes.map((p) => {
        const C = cenas[p.cena]
        return (
          <Sequence key={p.cena} from={p.de} durationInFrames={p.dur}>
            <Cena frames={p.dur}>
              <Formas cores={C?.formas ?? [P.gold, P.white]} seed={p.de} />
              {C ? <C.Comp /> : null}
            </Cena>
          </Sequence>
        )
      })}
      <div style={{ position: 'absolute', left: moviPos[0] - (vertical ? 165 : 230), top: moviPos[1] - (vertical ? 190 : 270), transform: `scale(${entra})`, transformOrigin: 'bottom center' }}>
        <MoviFlat spectrum={spectrum} volume={volume} size={vertical ? 380 : 540} waving={atual === partes[0] && frame < 70} pointing={def?.apontar ?? null} />
      </div>
      <Sfx at={4} name="pop" volume={0.35} />
      {vertical ? <Legenda voz={voz} fontSize={52} bottom={440} left={360} right={30} /> : <Legenda voz={voz} fontSize={46} bottom={56} left={600} right={60} />}
    </AbsoluteFill>
  )
}

export const Area = ({ children, vertical = true, top = 220, alinhar = 'center' }) =>
  vertical
    ? <AbsoluteFill style={{ alignItems: 'center', paddingTop: top, paddingLeft: 60, paddingRight: 60 }}>{children}</AbsoluteFill>
    : <AbsoluteFill style={{ left: 640, width: 1220, top: 0, bottom: 150, alignItems: alinhar, justifyContent: 'center' }}>{children}</AbsoluteFill>

// ---------- blocos de cena ----------

export function Tile({ children, delay = 0, cor = P.white, w = 260, label, rot = 0, virar = null, verso, corLabel = P.ink }) {
  const frame = useCurrentFrame()
  const p = usePop(delay, 9)
  const v = virar == null ? 0 : interpolate(frame, [virar, virar + 12], [0, 1], { ...clamp, easing: EASE })
  const escala = Math.abs(Math.cos(v * Math.PI))
  const mostraVerso = v > 0.5
  return (
    <div style={{ width: w, transform: `scale(${p}) rotate(${rot}deg)`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ width: w, height: w, borderRadius: w * 0.18, background: mostraVerso ? P.teal : cor, border: `7px solid ${P.ink}`, boxShadow: `0 12px 0 ${P.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scaleX(${escala})` }}>
        {mostraVerso ? verso : children}
      </div>
      {label && <p style={{ margin: 0, fontFamily: font, fontWeight: 800, fontSize: w * 0.13, color: corLabel, textAlign: 'center', lineHeight: 1.05 }}>{mostraVerso ? label[1] : label[0]}</p>}
    </div>
  )
}

function Pizza({ size = 520, saltar = 20, valor = 27, cor = P.coral }) {
  const frame = useCurrentFrame()
  const p = usePop(0, 12)
  const fatia = interpolate(frame, [saltar, saltar + 14], [0, 1], { ...clamp, easing: EASE })
  const ang = (valor / 100) * Math.PI * 2
  const r = 44
  const arco = (a0, a1) => `M50 50 L${50 + r * Math.sin(a0)} ${50 - r * Math.cos(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${50 + r * Math.sin(a1)} ${50 - r * Math.cos(a1)} Z`
  const meio = ang / 2
  return (
    <div style={{ position: 'relative', width: size, height: size, transform: `scale(${p}) rotate(${(1 - p) * -90}deg)` }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible' }}>
        <path d={arco(ang, Math.PI * 2 - 0.0001)} fill={P.white} stroke={P.ink} strokeWidth="2.4" strokeLinejoin="round" />
        <g transform={`translate(${Math.sin(meio) * 10 * fatia} ${-Math.cos(meio) * 10 * fatia})`}>
          <path d={arco(0, ang)} fill={cor} stroke={P.ink} strokeWidth="2.4" strokeLinejoin="round" />
          <text x={50 + Math.sin(meio) * 27} y={54 - Math.cos(meio) * 27} textAnchor="middle" fontFamily={font} fontWeight="800" fontSize="11" fill={P.ink}>{valor}%</text>
        </g>
      </svg>
      <Sfx at={saltar} name="pop" volume={0.35} />
    </div>
  )
}

function Celular({ h = 640, delay = 0 }) {
  const frame = useCurrentFrame()
  const p = usePop(delay, 11)
  const linhas = [[P.coral, 'Pizza da casa'], [P.gold, 'Burger artesanal'], [P.teal, 'Suco natural']]
  const zap = usePop(delay + 34, 9)
  const pix = usePop(delay + 24, 8)
  return (
    <div style={{ position: 'relative', width: h * 0.66, height: h, transform: `translateY(${(1 - p) * 300}px) rotate(${(1 - p) * 12}deg)` }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: h * 0.09, background: P.ink, padding: h * 0.03 }}>
        <div style={{ height: '100%', borderRadius: h * 0.07, background: P.cream, padding: h * 0.045, display: 'flex', flexDirection: 'column', gap: h * 0.025 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: h * 0.08, height: h * 0.08, borderRadius: '50%', background: P.gold, border: `4px solid ${P.ink}` }} />
            <p style={{ margin: 0, fontFamily: font, fontWeight: 800, fontSize: h * 0.042, color: P.ink }}>Seu Restaurante</p>
          </div>
          {linhas.map(([c, n], i) => {
            const k = interpolate(frame, [delay + 10 + i * 5, delay + 22 + i * 5], [0, 1], { ...clamp, easing: EASE })
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: h * 0.018, borderRadius: 18, background: P.white, border: `4px solid ${P.ink}`, transform: `translateX(${(1 - k) * 120}%)` }}>
                <div style={{ width: h * 0.075, height: h * 0.075, borderRadius: 14, background: c, border: `3px solid ${P.ink}` }} />
                <p style={{ margin: 0, flex: 1, fontFamily: font, fontWeight: 700, fontSize: h * 0.028, color: P.ink, whiteSpace: 'nowrap' }}>{n}</p>
                <div style={{ width: h * 0.05, height: h * 0.05, borderRadius: '50%', background: P.ink, color: P.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, fontWeight: 800, fontSize: h * 0.04 }}>+</div>
              </div>
            )
          })}
          <div style={{ marginTop: 'auto', transform: `scale(${pix})`, padding: h * 0.024, borderRadius: 999, background: P.teal, border: `4px solid ${P.ink}`, textAlign: 'center', fontFamily: font, fontWeight: 800, fontSize: h * 0.035, color: P.ink }}>◆ Pagar com Pix</div>
        </div>
      </div>
      <div style={{ position: 'absolute', right: -h * 0.3, top: h * 0.1, transform: `scale(${zap}) rotate(6deg)` }}>
        <IconeChat size={h * 0.32} />
      </div>
      <Sfx at={delay + 24} name="pop" volume={0.3} />
      <Sfx at={delay + 34} name="ding" volume={0.22} />
    </div>
  )
}

/** Mesa com QR → pedido percorre uma linha tracejada até o sino da cozinha. */
function MesaCozinha({ w = 940 }) {
  const frame = useCurrentFrame()
  const qr = usePop(0, 11)
  const d = `M ${w * 0.2} ${w * 0.3} C ${w * 0.4} ${w * 0.02}, ${w * 0.6} ${w * 0.02}, ${w * 0.8} ${w * 0.3}`
  const linha = interpolate(frame, [14, 40], [0, 1], { ...clamp, easing: EASE })
  const ev = evolvePath(Math.max(0.001, linha), d)
  const tx = interpolate(linha, [0, 1], [0.2, 0.8]) * w
  const ty = (0.3 - Math.sin(linha * Math.PI) * 0.21) * w
  const sino = usePop(40, 8)
  const balanco = frame > 40 ? Math.sin((frame - 40) / 2) * 18 * Math.max(0, 1 - (frame - 40) / 30) : 0
  return (
    <div style={{ position: 'relative', width: w, height: w * 0.62 }}>
      <svg width={w} height={w * 0.5} style={{ position: 'absolute', overflow: 'visible' }}>
        <path d={d} fill="none" stroke={P.ink} strokeWidth="7" strokeDasharray="2 22" strokeLinecap="round" opacity="0.35" />
        <path d={d} fill="none" stroke={P.ink} strokeWidth="7" strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
      </svg>
      <div style={{ position: 'absolute', left: 0, top: w * 0.18, width: w * 0.36, transform: `scale(${qr})`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ padding: 16, borderRadius: 24, background: P.white, border: `7px solid ${P.ink}`, lineHeight: 0 }}>
          <QRCodeSVG value={`https://${SITE}`} size={w * 0.2} fgColor={P.ink} />
        </div>
        <div style={{ marginTop: 10, width: w * 0.34, height: w * 0.035, borderRadius: 10, background: P.ink }} />
        <p style={{ margin: '10px 0 0', fontFamily: font, fontWeight: 800, fontSize: w * 0.04, color: P.ink }}>Mesa 7</p>
      </div>
      {linha > 0 && linha < 1 && <div style={{ position: 'absolute', left: tx - w * 0.04, top: ty - w * 0.05, transform: `rotate(${linha * 30 - 15}deg)` }}><IconeRecibo size={w * 0.09} /></div>}
      <div style={{ position: 'absolute', right: w * 0.02, top: w * 0.2, width: w * 0.32, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${sino})` }}>
        <div style={{ transform: `rotate(${balanco}deg)`, transformOrigin: 'bottom center' }}><IconeSino size={w * 0.24} /></div>
        <p style={{ margin: '6px 0 0', fontFamily: font, fontWeight: 800, fontSize: w * 0.04, color: P.ink }}>Cozinha</p>
      </div>
      <Sfx at={14} name="whoosh" volume={0.25} />
      <Sfx at={40} name="ding" volume={0.3} />
    </div>
  )
}

function Contador({ de = 27, ate = 0, delay = 10 }) {
  const frame = useCurrentFrame()
  const n = Math.round(interpolate(frame, [delay, delay + 30], [de, ate], { ...clamp, easing: EASE }))
  const fim = usePop(delay + 30, 7)
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ margin: 0, fontFamily: font, fontWeight: 800, fontSize: 330, lineHeight: 0.9, color: n === 0 ? P.mint : P.coral, transform: `scale(${n === 0 ? 0.85 + fim * 0.15 : 1})` }}>{n}%</p>
      <div style={{ display: 'inline-block', marginTop: 20, padding: '14px 34px', borderRadius: 20, background: P.mint, border: `6px solid ${P.white}`, transform: `scale(${fim}) rotate(-4deg)` }}>
        <span style={{ fontFamily: font, fontWeight: 800, fontSize: 70, color: P.ink }}>de comissão por pedido</span>
      </div>
      <p style={{ margin: '24px 0 0', fontFamily: font, fontWeight: 500, fontSize: 26, color: P.white, opacity: 0.75 }}>Comissão de aplicativo pode chegar a 27% por pedido.</p>
      <Sfx at={delay} name="whoosh" volume={0.25} />
      <Sfx at={delay + 30} name="impacto" volume={0.4} />
    </div>
  )
}

export function Cta({ frase = 'Chama no WhatsApp', escala = 1 }) {
  const frame = useCurrentFrame()
  const balao = usePop(4, 8)
  const toque = Math.sin(frame / 3) * (frame % 40 < 14 ? 8 : 0)
  const digitos = Math.floor(interpolate(frame, [18, 50], [0, WHATS.length], clamp))
  const site = interpolate(frame, [40, 54], [0, 1], { ...clamp, easing: EASE })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 * escala }}>
      <div style={{ position: 'relative', transform: `scale(${balao}) rotate(${toque}deg)` }}>
        {[0, 1, 2].map((k) => {
          const r = (((frame + k * 10) % 30) / 30)
          return <div key={k} style={{ position: 'absolute', inset: -20 - r * 60, borderRadius: '50%', border: `6px solid ${P.ink}`, opacity: (1 - r) * 0.5 }} />
        })}
        <IconeChat size={260 * escala} />
      </div>
      <Revela texto={frase} size={92 * escala} delay={8} destaque={[frase.split(' ').pop()]} fundoDestaque={P.ink} corDestaque={P.gold} />
      <p style={{ margin: 0, fontFamily: font, fontWeight: 800, fontSize: 84 * escala, color: P.ink }}>
        {WHATS.slice(0, digitos)}
        <span style={{ opacity: frame % 20 < 10 ? 1 : 0 }}>|</span>
      </p>
      <div style={{ padding: `${10 * escala}px ${28 * escala}px`, borderRadius: 999, background: P.ink, transform: `translateY(${(1 - site) * 40}px)`, opacity: site }}>
        <span style={{ fontFamily: font, fontWeight: 700, fontSize: 40 * escala, color: P.gold }}>{SITE}</span>
      </div>
      <Sfx at={4} name="impacto" volume={0.3} />
      <Sfx at={8} name="ding" volume={0.28} />
    </div>
  )
}

// ---------- cenas compartilhadas ----------

function Problemas({ vertical, virar = false, corLabel = P.ink }) {
  const w = vertical ? 280 : 250
  const itens = [
    [<IconeCadeado key="a" size={w * 0.6} />, ['Não seguro', 'Seguro'], <IconeCadeado key="a2" size={w * 0.6} aberto={false} cor={P.gold} />],
    [<IconeAmpulheta key="b" size={w * 0.6} />, ['Lento', 'Rápido'], <IconeFoguete key="b2" size={w * 0.6} />],
    [<IconeChat key="c" size={w * 0.62} quebrado />, ['WhatsApp quebrado', 'WhatsApp em 1 toque'], <IconeChat key="c2" size={w * 0.62} />],
  ]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: vertical ? 40 : 50, maxWidth: vertical ? 960 : 1200 }}>
      {itens.map(([ic, label, verso], k) => (
        <div key={k} style={{ position: 'relative' }}>
          <Tile delay={virar ? 0 : k * 9} w={w} label={label} rot={k === 1 ? 3 : -3} virar={virar ? 6 + k * 8 : null} verso={verso} corLabel={corLabel}>{ic}</Tile>
          <div style={{ position: 'absolute', right: -14, top: -14, transform: `scale(${usePop((virar ? 12 + k * 8 : 8 + k * 9), 8)})` }}>
            {virar ? <IconeCheck size={w * 0.34} draw={1} /> : <IconeX size={w * 0.34} />}
          </div>
          <Sfx at={virar ? 6 + k * 8 : k * 9} name="pop" volume={0.3} />
        </div>
      ))}
    </div>
  )
}

function ClientesSaindo() {
  const frame = useCurrentFrame()
  return (
    <div style={{ position: 'relative', width: 900, height: 420 }}>
      <div style={{ position: 'absolute', left: 330, top: 60, transform: `scale(${usePop(0, 10)})` }}><IconeLoja size={260} /></div>
      {[0, 1, 2, 3, 4].map((i) => {
        const sai = interpolate(frame, [16 + i * 6, 40 + i * 6], [0, 1], { ...clamp, easing: EASE })
        const lado = i % 2 ? 1 : -1
        return (
          <div key={i} style={{ position: 'absolute', left: 400 + lado * (80 + sai * 380) + (i - 2) * 10, top: 220 + Math.abs(Math.sin(frame / 4 + i)) * -10 * (sai > 0 && sai < 1), opacity: 1 - sai * 0.4 }}>
            <Pessoa size={110} cor={[P.violet, P.teal, P.gold, P.white, P.violet][i]} />
          </div>
        )
      })}
      <Sfx at={16} name="whoosh" volume={0.2} />
    </div>
  )
}

// ================= composições =================

export function MGAnuncioNegocios() {
  return (
    <Video
      voz={vozNegocios}
      audio="voz/anuncio-negocios.mp3"
      vertical
      cenas={{
        abertura: { fundo: P.teal, formas: [P.gold, P.white, P.ink], Comp: () => <Area top={320}><Revela texto="Oi! Eu sou a Movi" destaque={['Movi']} size={140} fundoDestaque={P.ink} corDestaque={P.gold} /><div style={{ height: 24 }} /><Revela texto="da Movitech" size={72} delay={14} cor={P.white} /></Area> },
        problema: { fundo: P.coral, formas: [P.gold, P.white], Comp: () => <Area top={240}><Revela texto="Sua empresa está perdendo clientes?" destaque={['perdendo']} size={108} cor={P.white} fundoDestaque={P.ink} corDestaque={P.gold} /><ClientesSaindo /></Area> },
        exemplos: { fundo: P.ink, formas: [P.coral, P.gold, P.teal], apontar: 'right', Comp: () => <Area top={300}><Problemas vertical corLabel={P.white} /></Area> },
        solucao: { fundo: P.teal, formas: [P.gold, P.white], apontar: 'right', Comp: () => <Area top={190}><Revela texto="A gente corrige!" destaque={['corrige!']} size={100} fundoDestaque={P.ink} corDestaque={P.mint} cor={P.white} /><div style={{ height: 40 }} /><Problemas vertical virar /></Area> },
        cta: { fundo: P.cream, formas: [P.coral, P.teal, P.gold], apontar: 'right', Comp: () => <Area top={230}><Cta frase="Peça seu diagnóstico" escala={0.95} /></Area> },
      }}
    />
  )
}

export function MGAnuncioRestaurantes() {
  return (
    <Video
      voz={vozRestaurantes}
      audio="voz/anuncio-restaurantes.mp3"
      vertical
      cenas={{
        abertura: {
          fundo: P.coral, formas: [P.gold, P.white],
          Comp: () => {
            const frame = useCurrentFrame()
            return (
              <Area top={220}>
                <Revela texto="Comissão em cada pedido?" destaque={['Comissão']} size={104} cor={P.white} fundoDestaque={P.ink} corDestaque={P.gold} />
                <div style={{ position: 'relative', marginTop: 30 }}>
                  <Pizza size={520} saltar={22} cor={P.gold} />
                  {[0, 1, 2, 3].map((i) => {
                    const cai = interpolate(frame, [30 + i * 7, 52 + i * 7], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) })
                    return <div key={i} style={{ position: 'absolute', left: 560 + (i % 2) * 110, top: -60 + cai * 560, transform: `rotate(${cai * 200}deg)`, opacity: cai > 0 ? 1 : 0 }}><IconeMoeda size={110} /></div>
                  })}
                </div>
              </Area>
            )
          },
        },
        link: { fundo: P.violet, formas: [P.gold, P.mint, P.white], apontar: 'right', Comp: () => <Area top={300}><Celular h={660} /></Area> },
        salao: { fundo: P.teal, formas: [P.gold, P.white], apontar: 'right', Comp: () => <Area top={330}><MesaCozinha w={960} /></Area> },
        semcomissao: { fundo: P.ink, formas: [P.coral, P.mint, P.gold], Comp: () => <Area top={300}><Contador /></Area> },
        cta: { fundo: P.cream, formas: [P.coral, P.teal, P.gold], apontar: 'right', Comp: () => <Area top={230}><Cta frase="Peça seu orçamento" escala={0.95} /></Area> },
      }}
    />
  )
}

function Pilares({ foco }) {
  const frame = useCurrentFrame()
  const dados = [[P.coral, 'Sistemas', 'por assinatura'], [P.teal, 'Sites e links', 'rápidos e seguros'], [P.gold, 'Apps', 'direto no celular']]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40, height: 520 }}>
      {dados.map(([c, t, s], i) => {
        const sobe = interpolate(frame, [i * 5, i * 5 + 18], [0, 1], { ...clamp, easing: EASE })
        const ativo = i === foco
        const h = (ativo ? 420 : 280) * sobe
        return (
          <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <p style={{ margin: 0, fontFamily: font, fontWeight: 800, fontSize: ativo ? 54 : 38, color: P.white, opacity: sobe, textAlign: 'center' }}>{t}</p>
            <div style={{ width: 300, height: h, borderRadius: '30px 30px 0 0', background: ativo ? c : 'rgba(255,255,255,.18)', border: `7px solid ${P.ink}`, borderBottom: 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 26, overflow: 'hidden' }}>
              <span style={{ fontFamily: font, fontWeight: 700, fontSize: 28, color: P.ink, opacity: ativo ? 1 : 0.6 }}>{s}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Navegador() {
  const frame = useCurrentFrame()
  const p = usePop(16, 10)
  const ponteiro = interpolate(frame, [26, 50], [-80, 70], { ...clamp, easing: Easing.out(Easing.back(2)) })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 50, transform: `scale(${p})` }}>
      <div style={{ width: 460, borderRadius: 26, border: `7px solid ${P.ink}`, background: P.white, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: `6px solid ${P.ink}`, background: P.cream }}>
          <IconeCadeado size={44} aberto={false} cor={P.teal} />
          <span style={{ fontFamily: font, fontWeight: 700, fontSize: 24, color: P.ink }}>seunegocio.com.br</span>
        </div>
        <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ height: 24, width: '70%', borderRadius: 8, background: P.ink }} />
          <div style={{ height: 16, width: '90%', borderRadius: 8, background: '#d9d3c4' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 999, background: P.zap, border: `5px solid ${P.ink}` }}>
            <span style={{ fontFamily: font, fontWeight: 800, fontSize: 26, color: P.ink }}>WhatsApp</span>
          </div>
        </div>
      </div>
      <svg viewBox="0 0 100 60" width="260" height="156">
        <path d="M10 55 A40 40 0 0 1 90 55" fill="none" stroke={P.ink} strokeWidth="9" strokeLinecap="round" />
        <path d="M10 55 A40 40 0 0 1 30 20" fill="none" stroke={P.coral} strokeWidth="9" strokeLinecap="round" />
        <path d="M70 20 A40 40 0 0 1 90 55" fill="none" stroke={P.mint} strokeWidth="9" strokeLinecap="round" />
        <g transform={`rotate(${ponteiro} 50 55)`}><line x1="50" y1="55" x2="50" y2="22" stroke={P.ink} strokeWidth="6" strokeLinecap="round" /></g>
        <circle cx="50" cy="55" r="7" fill={P.ink} />
      </svg>
    </div>
  )
}

function LinhaDoTempo() {
  const frame = useCurrentFrame()
  const passos = [[<IconeLupa key="l" size={110} />, 'Diagnóstico', 0], [<IconeRecibo key="r" size={110} />, 'Orçamento', 80], [<IconeFoguete key="f" size={110} />, 'No ar', 170]]
  const linha = interpolate(frame, [0, 190], [0, 1], { ...clamp, easing: EASE })
  return (
    <div style={{ position: 'relative', width: 1100, height: 420 }}>
      <div style={{ position: 'absolute', left: 90, right: 90, top: 150, height: 14, borderRadius: 9, background: 'rgba(21,19,43,.2)' }} />
      <div style={{ position: 'absolute', left: 90, top: 150, height: 14, borderRadius: 9, background: P.ink, width: (1100 - 180) * linha }} />
      {passos.map(([ic, t, at], i) => {
        const k = usePop(at, 8)
        return (
          <div key={t} style={{ position: 'absolute', left: 90 + i * 460 - 110, top: 47, width: 220, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 220, height: 220, borderRadius: '50%', background: k > 0.5 ? P.white : 'rgba(255,255,255,.4)', border: `8px solid ${P.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.6 + k * 0.4})` }}>{ic}</div>
            <p style={{ margin: '18px 0 0', fontFamily: font, fontWeight: 800, fontSize: 50, color: P.ink, opacity: k }}>{t}</p>
            <Sfx at={at} name="pop" volume={0.32} />
          </div>
        )
      })}
    </div>
  )
}

function AberturaApresentacao() {
  const frame = useCurrentFrame()
  const d = 'M14.5 32.5v-17l9.5 11 9.5-11v17'
  const ev = evolvePath(Math.max(0.001, interpolate(frame, [0, 28], [0, 1], { ...clamp, easing: EASE })), d)
  return (
    <Area vertical={false} alinhar="flex-start">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <svg viewBox="0 0 48 48" width="120" height="120">
            <circle cx="24" cy="24" r="22" fill={P.gold} stroke={P.white} strokeWidth="2.5" />
            <path d={d} fill="none" stroke={P.ink} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
          </svg>
          <Revela texto="MOVITECH SISTEMAS" size={50} delay={16} cor={P.gold} align="left" />
        </div>
        <Revela texto="Sistemas, sites e apps que fazem seu negócio vender mais." destaque={['vender', 'mais.']} size={90} delay={36} cor={P.white} fundoDestaque={P.coral} align="left" maxWidth={1180} />
        <Revela texto="Barueri · SP" size={42} delay={76} cor={P.mint} align="left" />
      </div>
    </Area>
  )
}

export function MGApresentacao() {
  return (
    <Video
      voz={vozApresentacao}
      audio="voz/apresentacao.mp3"
      vertical={false}
      cenas={{
        abertura: { fundo: P.ink, formas: [P.gold, P.coral, P.teal], Comp: AberturaApresentacao },
        problema: { fundo: P.ink, formas: [P.coral, P.gold, P.teal], apontar: 'right', Comp: () => <Area vertical={false}><Problemas vertical={false} corLabel={P.white} /></Area> },
        sistemas: { fundo: P.violet, formas: [P.gold, P.mint], apontar: 'right', Comp: () => <Area vertical={false}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}><div style={{ transform: 'scale(0.7)', margin: '-80px 0' }}><Pilares foco={0} /></div><MesaCozinha w={760} /></div></Area> },
        sites: { fundo: P.violet, formas: [P.gold, P.mint], apontar: 'right', Comp: () => <Area vertical={false}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}><div style={{ transform: 'scale(0.7)', margin: '-80px 0' }}><Pilares foco={1} /></div><Navegador /></div></Area> },
        apps: { fundo: P.violet, formas: [P.gold, P.mint], apontar: 'right', Comp: () => <Area vertical={false}><div style={{ display: 'flex', alignItems: 'center', gap: 160 }}><Celular h={680} /><Revela texto="Abre direto no celular, sem baixar nada." destaque={['sem', 'baixar', 'nada.']} size={76} delay={10} cor={P.white} fundoDestaque={P.gold} corDestaque={P.ink} align="left" maxWidth={520} /></div></Area> },
        processo: { fundo: P.teal, formas: [P.gold, P.white], apontar: 'right', Comp: () => <Area vertical={false}><LinhaDoTempo /></Area> },
        cta: { fundo: P.cream, formas: [P.coral, P.teal, P.gold], apontar: 'right', Comp: () => <Area vertical={false}><Cta /></Area> },
      }}
    />
  )
}
