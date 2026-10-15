import { loadFont as loadBricolage } from '@remotion/google-fonts/BricolageGrotesque'
import { loadFont as loadInter } from '@remotion/google-fonts/Inter'
import { useAudioData, visualizeAudio } from '@remotion/media-utils'
import { noise2D } from '@remotion/noise'
import { evolvePath } from '@remotion/paths'
import { QRCodeSVG } from 'qrcode.react'
import { AbsoluteFill, Audio, interpolate, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import vozApresentacao from '../voz/apresentacao.json'
import vozNegocios from '../voz/anuncio-negocios.json'
import vozRestaurantes from '../voz/anuncio-restaurantes.json'
import { Movi } from './Movi'

// Vídeos da Lexmovi apresentados pela Movi (mascote): 2 anúncios verticais e 1 apresentação horizontal.
// Motion design: tipografia cinética, varredura de luz entre cenas, glitch, flips 3D, partículas, confete,
// tremida de câmera nos impactos, legenda estilo TikTok e efeitos sonoros sintetizados (public/sfx).

const { fontFamily: display } = loadBricolage('normal', { weights: ['600', '800'], subsets: ['latin'] })
const { fontFamily: sans } = loadInter('normal', { weights: ['400', '500', '600', '700', '800'], subsets: ['latin'] })

const C = {
  bg: '#0c0b12', panel: '#17151f', line: '#2c2838', ink: '#f6f1e7', muted: '#a49cb3',
  gold: '#f0c46b', amber: '#e2a74a', coral: '#ff6f61', mint: '#7ff0c8', violet: '#8b6cff', zap: '#25d366',
}
const WHATS = '(11) 96445-2878'
const SITE = 'movitechsistemas.com.br'
const FPS = 30

export const VOZES = { apresentacao: vozApresentacao, negocios: vozNegocios, restaurantes: vozRestaurantes }
export const duracao = (voz) => Math.ceil(voz.duracao * FPS) + 20

// ================= utilidades =================

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }

function useSpring(delay = 0, config = { damping: 200 }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - delay, fps, config })
}

/** Volume e espectro da voz (para a boca-equalizador e a antena da Movi). */
function useVoz(src) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const audio = useAudioData(src)
  if (!audio) return { volume: 0, spectrum: [] }
  const amostra = (f) => visualizeAudio({ fps, frame: Math.max(0, f), audioData: audio, numberOfSamples: 32 })
  const a = amostra(frame)
  const b = amostra(frame - 1)
  const s = a.map((x, i) => x * 0.65 + b[i] * 0.35)
  const spectrum = [1, 2, 3, 4, 5, 6, 8].map((i) => Math.min(1, s[i] * (6 + i * 1.6)))
  const volume = Math.min(1, (s.slice(0, 8).reduce((x, y) => x + y, 0) / 8) * 9)
  return { volume, spectrum }
}

function Sfx({ at = 0, name, volume = 0.35 }) {
  return (
    <Sequence from={Math.max(0, Math.round(at))} durationInFrames={45}>
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
    </Sequence>
  )
}

/** Tremida de câmera que decai depois de um impacto em `at` (frames da cena). */
function useShake(at, forca = 18) {
  const frame = useCurrentFrame()
  const d = frame - at
  if (d < 0 || d > 14) return 'translate(0px, 0px)'
  const k = (1 - d / 14) * forca
  return `translate(${noise2D('sx', d * 0.9, 0) * k}px, ${noise2D('sy', 0, d * 0.9) * k}px) rotate(${noise2D('sr', d, d) * k * 0.08}deg)`
}

function cenasEmFrames(voz, total) {
  return voz.cenas.map((c, i) => {
    const de = i === 0 ? 0 : Math.round(c.de * FPS) - 8
    const ate = i + 1 < voz.cenas.length ? Math.round(voz.cenas[i + 1].de * FPS) - 8 : total
    return { cena: c.cena, de, dur: ate - de }
  })
}

// ================= fundo vivo =================

function Fundo() {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const blobs = [
    { c: C.violet, s: 0.7, x: 0.2, y: 0.25 },
    { c: C.amber, s: 0.65, x: 0.8, y: 0.35 },
    { c: C.coral, s: 0.5, x: 0.5, y: 0.85 },
  ]
  const raio = Math.max(width, height) * 0.45
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      {blobs.map((b, i) => {
        const x = (b.x + noise2D(`bx${i}`, frame / 260, 0) * 0.18) * width
        const y = (b.y + noise2D(`by${i}`, 0, frame / 260) * 0.15) * height
        return (
          <div
            key={i}
            style={{ position: 'absolute', left: x - raio * b.s, top: y - raio * b.s, width: raio * 2 * b.s, height: raio * 2 * b.s, borderRadius: '50%', background: b.c, opacity: 0.22, filter: `blur(${raio * 0.35}px)` }}
          />
        )
      })}
      {/* grade em perspectiva no chão */}
      <div style={{ position: 'absolute', left: -width * 0.5, right: -width * 0.5, bottom: -height * 0.05, height: height * 0.45, perspective: 600 }}>
        <div
          style={{
            position: 'absolute', inset: 0, transform: 'rotateX(68deg)', transformOrigin: 'bottom',
            backgroundImage: `linear-gradient(${C.gold}22 2px, transparent 2px), linear-gradient(90deg, ${C.gold}22 2px, transparent 2px)`,
            backgroundSize: '90px 90px', backgroundPosition: `0 ${(frame * 2) % 90}px`,
            maskImage: 'linear-gradient(to top, black 10%, transparent 90%)', WebkitMaskImage: 'linear-gradient(to top, black 10%, transparent 90%)',
          }}
        />
      </div>
      {/* poeira brilhante */}
      {Array.from({ length: 26 }, (_, i) => {
        const px = random(`px${i}`) * width
        const vel = 0.3 + random(`pv${i}`) * 0.8
        const py = height - ((frame * vel + random(`py${i}`) * height) % (height + 40))
        const r = 2 + random(`pr${i}`) * 4
        return <div key={i} style={{ position: 'absolute', left: px + Math.sin(frame / 30 + i) * 12, top: py, width: r, height: r, borderRadius: '50%', background: i % 3 ? C.gold : C.mint, opacity: 0.35 + Math.sin(frame / 12 + i) * 0.25, boxShadow: `0 0 ${r * 3}px ${C.gold}` }} />
      })}
      {/* granulado de filme */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.09, mixBlendMode: 'overlay' }}>
        <filter id="grao">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 12} />
        </filter>
        <rect width="100%" height="100%" filter="url(#grao)" />
      </svg>
      {/* vinheta */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.55) 100%)' }} />
    </AbsoluteFill>
  )
}

/** Varredura de luz + flash entre cenas. */
function Varredura() {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const p = interpolate(frame, [0, 16], [-0.4, 1.4], clamp)
  const flash = interpolate(frame, [6, 8, 14], [0, 0.35, 0], clamp)
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: -height, left: p * width - width * 0.25, width: width * 0.22, height: height * 3, transform: 'rotate(18deg)', background: `linear-gradient(90deg, transparent, ${C.gold}cc, #fff, ${C.gold}cc, transparent)`, filter: 'blur(6px)', opacity: 0.85 }} />
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
    </AbsoluteFill>
  )
}

// ================= legenda estilo TikTok =================

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
      const pausa = /[,.!?:]$/.test(escritas[i])
      if (atual.length === 3 || pausa || i === l.palavras.length - 1) {
        out.push({ de: atual[0].de, ate: atual[atual.length - 1].ate, palavras: atual })
        atual = []
      }
    })
  }
  return out
}

function Legenda({ voz, fontSize, bottom, left = 0, right = 0 }) {
  const frame = useCurrentFrame()
  const t = frame / FPS
  const lista = blocos(voz)
  const i = lista.findIndex((b, k) => t >= b.de - 0.06 && t < (lista[k + 1]?.de ?? b.ate + 0.5) - 0.02)
  if (i < 0) return null
  const b = lista[i]
  return (
    <div style={{ position: 'absolute', left, right, bottom, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: fontSize * 0.22, padding: '0 40px' }}>
      {b.palavras.map((p, k) => {
        const entra = interpolate(t, [p.de - 0.08, p.de + 0.06], [0, 1], clamp)
        const ativa = t >= p.de - 0.03 && t < p.ate + 0.08
        const s = interpolate(entra, [0, 1], [0.4, 1]) * (ativa ? 1.12 : 1)
        return (
          <span
            key={`${i}-${k}`}
            style={{
              display: 'inline-block', transform: `scale(${s}) rotate(${ativa ? -2 : 0}deg)`, opacity: entra,
              padding: `${fontSize * 0.06}px ${fontSize * 0.22}px`, borderRadius: fontSize * 0.2,
              background: ativa ? C.gold : 'transparent', color: ativa ? C.bg : C.ink,
              fontFamily: display, fontWeight: 800, fontSize, lineHeight: 1.1, letterSpacing: '-0.01em', textTransform: 'uppercase',
              WebkitTextStroke: ativa ? '0px' : `${fontSize * 0.07}px #000`, paintOrder: 'stroke fill',
              textShadow: ativa ? 'none' : '0 6px 0 rgba(0,0,0,.45)', boxShadow: ativa ? `0 10px 30px -8px ${C.gold}` : 'none',
            }}
          >
            {p.t}
          </span>
        )
      })}
    </div>
  )
}

// ================= peças de motion =================

/** Título cinético: palavras entram uma a uma (mola + desfoque + giro); destaques ganham marca-texto. */
function Kinetic({ texto, destaque = [], size = 110, delay = 0, align = 'center', cor = C.ink, maxWidth }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const palavras = texto.split(' ')
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: `${size * 0.05}px ${size * 0.24}px`, maxWidth }}>
      {palavras.map((w, i) => {
        const d = delay + i * 3
        const s = spring({ frame: frame - d, fps, config: { damping: 12, mass: 0.6 } })
        const blur = interpolate(frame - d, [0, 8], [14, 0], clamp)
        const marca = destaque.includes(w.replace(/[.,!?]/g, ''))
        const swipe = spring({ frame: frame - d - 6, fps, config: { damping: 200 } })
        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block', transform: `translateY(${(1 - s) * size * 0.6}px) rotate(${(1 - s) * 10}deg) scale(${0.7 + s * 0.3})`, opacity: Math.min(1, s * 1.5), filter: `blur(${blur}px)` }}>
            {marca && <span style={{ position: 'absolute', left: -size * 0.08, right: -size * 0.08, top: '18%', bottom: '8%', background: C.gold, borderRadius: size * 0.12, transform: `scaleX(${swipe}) rotate(-1.5deg)`, transformOrigin: 'left' }} />}
            <span style={{ position: 'relative', fontFamily: display, fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: '-0.03em', color: marca ? C.bg : cor }}>{w}</span>
          </span>
        )
      })}
    </div>
  )
}

function Sticker({ children, delay = 0, x = 0, y = 0, rot = 0, size = 90 }) {
  const frame = useCurrentFrame()
  const s = useSpring(delay, { damping: 9, mass: 0.5 })
  const wob = frame > delay ? Math.sin((frame - delay) / 6) * 6 : 0
  return (
    <div style={{ position: 'absolute', left: x, top: y, fontSize: size, transform: `scale(${s}) rotate(${rot + wob}deg)`, filter: 'drop-shadow(0 12px 18px rgba(0,0,0,.45))' }}>
      {children}
    </div>
  )
}

function Faiscas({ at = 0, x, y, cor = C.gold, n = 14, raio = 160 }) {
  const frame = useCurrentFrame()
  const d = frame - at
  if (d < 0 || d > 30) return null
  const p = interpolate(d, [0, 30], [0, 1], clamp)
  return Array.from({ length: n }, (_, i) => {
    const ang = (i / n) * Math.PI * 2 + random(`fa${i}`) * 0.4
    const dist = raio * (0.6 + random(`fd${i}`) * 0.6) * Math.sqrt(p)
    const r = (1 - p) * (6 + random(`fr${i}`) * 8)
    return <div key={i} style={{ position: 'absolute', left: x + Math.cos(ang) * dist, top: y + Math.sin(ang) * dist, width: r, height: r, borderRadius: '50%', background: i % 2 ? cor : '#fff', boxShadow: `0 0 12px ${cor}` }} />
  })
}

function Confete({ at = 0, n = 70 }) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const d = frame - at
  if (d < 0) return null
  const cores = [C.gold, C.mint, C.coral, C.violet, '#fff']
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: n }, (_, i) => {
        const vx = (random(`cx${i}`) - 0.5) * width * 0.04
        const vy = -height * (0.018 + random(`cy${i}`) * 0.02)
        const x = width / 2 + vx * d
        const y = height * 0.45 + vy * d + 0.9 * d * d
        const rot = d * (8 + random(`cr${i}`) * 20)
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: 14, height: 24, background: cores[i % cores.length], transform: `rotate(${rot}deg) scaleX(${Math.cos(d / 3 + i)})`, borderRadius: 3 }} />
      })}
    </AbsoluteFill>
  )
}

/** Pop-up de erro estilo sistema: entra com impacto + glitch RGB e pode virar (flip 3D) para "resolvido". */
function Popup({ icone, titulo, texto, delay = 0, x, y, rot = 0, w = 640, flipAt = null, okTitulo, okTexto, fs = 34 }) {
  const frame = useCurrentFrame()
  const s = useSpring(delay, { damping: 11, mass: 0.7 })
  const flip = useSpring(flipAt ?? 99999, { damping: 14 })
  const d = frame - delay
  const glitch = d >= 0 && d < 9
  const ang = flipAt == null ? 0 : flip * 180
  const face = (ok) => (
    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: ok ? 'rotateY(180deg)' : 'none', borderRadius: 26, overflow: 'hidden', background: ok ? '#0f2a20' : C.panel, border: `3px solid ${ok ? C.mint : C.coral}`, boxShadow: `0 30px 60px -20px rgba(0,0,0,.7), 0 0 40px -10px ${ok ? C.mint : C.coral}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: ok ? '#123a2b' : '#221c2a' }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 14, height: 14, borderRadius: '50%', background: c }} />)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 26px' }}>
        <span style={{ fontSize: fs * 1.6 }}>{ok ? '✅' : icone}</span>
        <div>
          <p style={{ margin: 0, fontFamily: display, fontWeight: 800, fontSize: fs, color: ok ? C.mint : C.coral }}>{ok ? okTitulo : titulo}</p>
          <p style={{ margin: '4px 0 0', fontFamily: sans, fontSize: fs * 0.7, color: C.muted }}>{ok ? okTexto : texto}</p>
        </div>
      </div>
    </div>
  )
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: fs * 4.6, perspective: 1400, transform: `rotate(${rot}deg) scale(${interpolate(s, [0, 1], [1.6, 1])})`, opacity: Math.min(1, s * 2) }}>
      {glitch && <div style={{ position: 'absolute', inset: 0, transform: `translate(${(d % 2 ? -1 : 1) * 10}px, 0)`, background: C.coral, opacity: 0.35, borderRadius: 26, mixBlendMode: 'screen' }} />}
      {glitch && <div style={{ position: 'absolute', inset: 0, transform: `translate(${(d % 2 ? 1 : -1) * 10}px, 0)`, background: C.mint, opacity: 0.3, borderRadius: 26, mixBlendMode: 'screen' }} />}
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateY(${ang}deg)` }}>
        {face(false)}
        {flipAt != null && face(true)}
      </div>
    </div>
  )
}

function Logo({ size = 140, draw = 1 }) {
  const d = 'M18 15.5v17h12'
  const ev = evolvePath(Math.max(0.0001, draw), d)
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ filter: `drop-shadow(0 0 ${size * 0.15}px ${C.gold})` }}>
      <circle cx="24" cy="24" r="22.5" fill="#0c0b12" stroke={C.gold} strokeOpacity={0.5 * draw} strokeWidth="1" />
      <path d={d} fill="none" stroke={C.gold} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
    </svg>
  )
}

/** Celular com cardápio; entra virando em 3D, Pix pula e chega notificação do WhatsApp. */
function Celular({ h = 700, delay = 0, notificacao = true }) {
  const frame = useCurrentFrame()
  const s = useSpring(delay, { damping: 14 })
  const pratos = [['🍕', 'Pizza da casa', 'R$ 59,90'], ['🍔', 'Burger artesanal', 'R$ 34,90'], ['🥤', 'Suco natural', 'R$ 12,00']]
  const zap = useSpring(delay + 38, { damping: 12 })
  const pix = useSpring(delay + 26, { damping: 10 })
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: h * 0.6, height: h, perspective: 1600 }}>
      <div style={{ position: 'absolute', inset: 0, transform: `rotateY(${(1 - s) * -75}deg) rotateZ(${(1 - s) * -8}deg) translateY(${Math.sin(frame / 20) * 8}px)`, opacity: s, borderRadius: h * 0.09, background: '#050407', padding: h * 0.022, boxShadow: `0 0 0 3px ${C.line}, 0 60px 120px -40px ${C.violet}aa` }}>
        <div style={{ height: '100%', borderRadius: h * 0.07, background: `linear-gradient(180deg, #17142a, ${C.bg})`, padding: h * 0.04, display: 'flex', flexDirection: 'column', gap: h * 0.022, overflow: 'hidden' }}>
          <p style={{ margin: 0, fontFamily: display, fontWeight: 800, fontSize: h * 0.05, color: C.ink }}>Seu Restaurante</p>
          <p style={{ margin: '-8px 0 0', fontFamily: sans, fontSize: h * 0.022, color: C.mint }}>● Aberto · delivery e retirada</p>
          {pratos.map(([e, n, p], i) => {
            const k = spring({ frame: frame - delay - 10 - i * 5, fps: FPS, config: { damping: 13 } })
            return (
              <div key={n} style={{ transform: `translateX(${(1 - k) * 120}px)`, opacity: k, display: 'flex', alignItems: 'center', gap: 14, padding: h * 0.018, borderRadius: 20, background: '#ffffff0d', border: `1px solid ${C.line}` }}>
                <span style={{ fontSize: h * 0.055 }}>{e}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontFamily: sans, fontWeight: 700, fontSize: h * 0.028, color: C.ink }}>{n}</p>
                  <p style={{ margin: '2px 0 0', fontFamily: sans, fontWeight: 800, fontSize: h * 0.025, color: C.gold }}>{p}</p>
                </div>
                <span style={{ width: h * 0.05, height: h * 0.05, borderRadius: '50%', background: C.gold, color: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: h * 0.035 }}>+</span>
              </div>
            )
          })}
          <div style={{ marginTop: 'auto', transform: `scale(${pix})`, padding: h * 0.024, borderRadius: 999, background: `linear-gradient(90deg, ${C.gold}, ${C.amber})`, color: C.bg, textAlign: 'center', fontFamily: display, fontWeight: 800, fontSize: h * 0.032 }}>Pagar com Pix ⚡</div>
        </div>
      </div>
      {notificacao && (
        <div style={{ position: 'absolute', left: h * 0.12, right: -h * 0.12, top: -h * 0.06, transform: `translateY(${(1 - zap) * -60}px) scale(${0.8 + zap * 0.2})`, opacity: zap, padding: '16px 22px', borderRadius: 22, background: '#0f3d24ee', border: `2px solid ${C.zap}`, boxShadow: `0 20px 40px -10px ${C.zap}88`, color: C.ink, fontFamily: sans, fontSize: h * 0.025 }}>
          <b style={{ color: C.zap }}>WhatsApp · agora</b>
          <br />
          Seu pedido saiu para entrega 🛵
        </div>
      )}
      <Sfx at={delay + 26} name="pop" volume={0.3} />
      {notificacao && <Sfx at={delay + 38} name="ding" volume={0.22} />}
    </div>
  )
}

/** QR da mesa sendo escaneado → pedido voa em arco até a tela da cozinha. */
function MesaCozinha({ w = 960 }) {
  const frame = useCurrentFrame()
  const qr = useSpring(0, { damping: 12 })
  const scan = interpolate(frame, [8, 26], [0, 1], clamp)
  const voo = interpolate(frame, [28, 46], [0, 1], clamp)
  const chegou = useSpring(46, { damping: 11 })
  const cron = Math.max(0, Math.floor((frame - 46) / 5))
  const qs = w * 0.24
  const tx = interpolate(voo, [0, 1], [qs / 2, w - w * 0.2])
  const ty = -Math.sin(voo * Math.PI) * w * 0.22
  return (
    <div style={{ position: 'relative', width: w, height: w * 0.5 }}>
      <div style={{ position: 'absolute', left: 0, top: w * 0.06, transform: `scale(${qr}) rotate(${(1 - qr) * -20}deg)` }}>
        <div style={{ position: 'relative', padding: 18, borderRadius: 26, background: '#fff', lineHeight: 0, overflow: 'hidden' }}>
          <QRCodeSVG value={`https://${SITE}`} size={qs} fgColor={C.bg} />
          {scan > 0 && scan < 1 && <div style={{ position: 'absolute', left: 0, right: 0, top: 18 + scan * qs, height: 6, background: C.mint, boxShadow: `0 0 24px 8px ${C.mint}` }} />}
        </div>
        <p style={{ margin: '14px 0 0', textAlign: 'center', fontFamily: display, fontWeight: 800, fontSize: w * 0.036, color: C.ink }}>MESA 7</p>
      </div>
      {voo > 0 && voo < 1 && <div style={{ position: 'absolute', left: tx, top: w * 0.18 + ty, transform: `rotate(${voo * 360}deg)`, fontSize: w * 0.06 }}>🧾</div>}
      <div style={{ position: 'absolute', right: 0, top: w * 0.04, width: w * 0.42, transform: `scale(${chegou}) rotate(${(1 - chegou) * 12}deg)`, padding: 26, borderRadius: 26, background: C.panel, border: `3px solid ${C.gold}`, boxShadow: `0 0 50px -10px ${C.gold}` }}>
        <p style={{ margin: 0, fontFamily: sans, fontWeight: 800, letterSpacing: '0.24em', fontSize: w * 0.024, color: C.gold }}>🔔 COZINHA</p>
        <p style={{ margin: '12px 0 0', fontFamily: display, fontWeight: 800, fontSize: w * 0.055, color: C.ink }}>Mesa 7</p>
        <p style={{ margin: '6px 0 0', fontFamily: sans, fontSize: w * 0.028, color: C.muted }}>2× Pizza da casa · 1× Suco</p>
        <p style={{ margin: '12px 0 0', fontFamily: display, fontWeight: 800, fontSize: w * 0.04, color: cron > 12 ? C.gold : C.mint }}>⏱ 0:{String(cron).padStart(2, '0')}</p>
      </div>
      <Faiscas at={46} x={w * 0.79} y={w * 0.2} />
      <Sfx at={8} name="glitch" volume={0.12} />
      <Sfx at={28} name="whoosh" volume={0.3} />
      <Sfx at={46} name="ding" volume={0.25} />
    </div>
  )
}

function Cta({ escala = 1, frase = 'CHAMA NO WHATSAPP' }) {
  const frame = useCurrentFrame()
  const logo = interpolate(frame, [0, 26], [0, 1], clamp)
  const btn = useSpring(14, { damping: 10 })
  const digitos = Math.floor(interpolate(frame, [24, 60], [0, WHATS.length], clamp))
  const site = useSpring(40)
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Logo size={150 * escala} draw={logo} />
      <div style={{ position: 'relative', marginTop: 50 * escala }}>
        {[0, 1, 2].map((k) => {
          const r = (((frame - 14 + k * 12) % 36) + 36) % 36 / 36
          return frame > 14 ? <div key={k} style={{ position: 'absolute', inset: 0, borderRadius: 999, border: `4px solid ${C.zap}`, transform: `scale(${1 + r * 0.35})`, opacity: 1 - r }} /> : null
        })}
        <div style={{ position: 'relative', transform: `scale(${btn * (1 + Math.sin(frame / 5) * 0.03)})`, padding: `${28 * escala}px ${56 * escala}px`, borderRadius: 999, background: C.zap, color: '#062b14', fontFamily: display, fontWeight: 800, fontSize: 50 * escala, boxShadow: `0 30px 70px -20px ${C.zap}`, whiteSpace: 'nowrap' }}>
          💬 {frase}
        </div>
      </div>
      <p style={{ margin: `${36 * escala}px 0 0`, fontFamily: display, fontWeight: 800, fontSize: 76 * escala, color: C.ink, letterSpacing: '0.01em' }}>
        {WHATS.slice(0, digitos)}
        <span style={{ opacity: frame % 20 < 10 ? 1 : 0, color: C.gold }}>|</span>
      </p>
      <p style={{ margin: `${10 * escala}px 0 0`, transform: `translateY(${(1 - site) * 30}px)`, opacity: site, fontFamily: sans, fontWeight: 600, fontSize: 40 * escala, color: C.gold }}>{SITE}</p>
      <Confete at={18} />
      <Sfx at={14} name="impacto" volume={0.35} />
      <Sfx at={18} name="ding" volume={0.3} />
    </div>
  )
}

// ================= estrutura =================

function CenaFade({ frames, children }) {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 6, frames - 6, frames], [0, 1, 1, 0], clamp)
  const zoom = interpolate(frame, [0, frames], [1.04, 1], clamp)
  return <AbsoluteFill style={{ opacity, transform: `scale(${zoom})` }}>{children}</AbsoluteFill>
}

function Video({ voz, audio, cenas, vertical, apontar = {} }) {
  const { durationInFrames } = useVideoConfig()
  const src = staticFile(audio)
  const { volume, spectrum } = useVoz(src)
  const partes = cenasEmFrames(voz, durationInFrames)
  const frame = useCurrentFrame()
  const atual = partes.find((p) => frame >= p.de && frame < p.de + p.dur)?.cena
  const entrada = spring({ frame, fps: FPS, config: { damping: 11, mass: 0.8 } })
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Fundo />
      <Audio src={src} />
      {partes.map((p) => {
        const Cena = cenas[p.cena]
        return (
          <Sequence key={p.cena} from={p.de} durationInFrames={p.dur}>
            <CenaFade frames={p.dur}>{Cena ? <Cena /> : null}</CenaFade>
          </Sequence>
        )
      })}
      {partes.slice(1).map((p) => (
        <Sequence key={`v-${p.cena}`} from={p.de - 6} durationInFrames={20}>
          <Varredura />
          <Sfx name="whoosh" volume={0.3} />
        </Sequence>
      ))}
      <div
        style={
          vertical
            ? { position: 'absolute', right: 30, top: 1010, transform: `translateY(${(1 - entrada) * -900}px)` }
            : { position: 'absolute', left: 60, bottom: 70, transform: `translateY(${(1 - entrada) * -900}px)` }
        }
      >
        <Movi spectrum={spectrum} volume={volume} size={vertical ? 400 : 640} waving={atual === partes[0].cena && frame < 70} pointing={apontar[atual] ?? null} id={vertical ? 'mv' : 'mh'} />
      </div>
      <Sfx at={10} name="pop" volume={0.35} />
      {vertical ? <Legenda voz={voz} fontSize={64} bottom={420} left={0} right={330} /> : <Legenda voz={voz} fontSize={50} bottom={60} left={640} right={60} />}
    </AbsoluteFill>
  )
}

const Topo = ({ children, top = 240, shake }) => (
  <AbsoluteFill style={{ alignItems: 'center', paddingTop: top, paddingLeft: 60, paddingRight: 60, transform: shake }}>{children}</AbsoluteFill>
)
const Direita = ({ children }) => (
  <AbsoluteFill style={{ left: 640, width: 1220, top: 0, bottom: 150, alignItems: 'center', justifyContent: 'center' }}>{children}</AbsoluteFill>
)

// ================= cenas compartilhadas =================

function CenaErros({ vertical, flip = false }) {
  const itens = [
    ['🔓', 'Não seguro', 'O navegador avisa seu cliente', 'Site seguro', 'Cadeado e HTTPS'],
    ['⏳', 'Carregando…', 'E o cliente desiste', 'Rápido no celular', 'Abre em segundos'],
    ['📵', 'WhatsApp não abre', 'O botão está quebrado', 'WhatsApp em 1 toque', 'Conversa direto'],
  ]
  const w = vertical ? 820 : 760
  return (
    <>
      {itens.map(([i, t, x, ok, okx], k) => (
        <Popup
          key={t} icone={i} titulo={t} texto={x} okTitulo={ok} okTexto={okx} delay={flip ? 0 : k * 12} flipAt={flip ? 8 + k * 9 : null}
          x={vertical ? 130 + (k % 2 ? 40 : -30) : 240 + k * 40} y={vertical ? 280 + k * 200 : 170 + k * 210} rot={k === 1 ? 3 : -2} w={w} fs={vertical ? 40 : 36}
        />
      ))}
      {[0, 1, 2].map((k) => (flip ? <Sfx key={k} at={8 + k * 9} name="pop" volume={0.3} /> : <Sfx key={k} at={k * 12} name="glitch" volume={0.16} />))}
    </>
  )
}

// ================= anúncio: negócios =================

function PessoasSaindo() {
  const frame = useCurrentFrame()
  return (
    <div style={{ position: 'relative', width: 900, height: 360, marginTop: 30 }}>
      {Array.from({ length: 10 }, (_, i) => {
        const cai = interpolate(frame, [20 + i * 4, 40 + i * 4], [0, 1], clamp)
        return (
          <span key={i} style={{ position: 'absolute', left: 30 + (i % 5) * 170, top: 30 + Math.floor(i / 5) * 150 + cai * cai * 500, fontSize: 96, opacity: 1 - cai, transform: `rotate(${cai * (i % 2 ? 90 : -90)}deg)` }}>🧑</span>
        )
      })}
      <Sfx at={20} name="whoosh" volume={0.2} />
    </div>
  )
}

export function AnuncioNegocios() {
  return (
    <Video
      voz={vozNegocios}
      audio="voz/anuncio-negocios.mp3"
      vertical
      apontar={{ exemplos: 'left', solucao: 'left', cta: 'left' }}
      cenas={{
        abertura: () => (
          <Topo top={300}>
            <Kinetic texto="Oi! Eu sou a Movi" destaque={['Movi']} size={150} />
            <div style={{ height: 30 }} />
            <Kinetic texto="da Lexmovi ✨" size={70} delay={14} cor={C.muted} />
            <Faiscas at={14} x={540} y={420} />
          </Topo>
        ),
        problema: () => (
          <Topo top={260}>
            <Kinetic texto="Sua empresa está perdendo clientes" destaque={['perdendo']} size={118} />
            <PessoasSaindo />
          </Topo>
        ),
        exemplos: () => <CenaErros vertical />,
        solucao: () => (
          <>
            <CenaErros vertical flip />
            <Faiscas at={8} x={540} y={600} cor={C.mint} n={20} raio={320} />
          </>
        ),
        cta: () => (
          <Topo top={250}>
            <Cta escala={0.95} frase="PEÇA SEU DIAGNÓSTICO" />
          </Topo>
        ),
      }}
    />
  )
}

// ================= anúncio: restaurantes =================

function Notificacoes() {
  const frame = useCurrentFrame()
  const itens = ['−R$ 12,40', '−R$ 8,90', '−R$ 15,70', '−R$ 9,30', '−R$ 21,10']
  return (
    <div style={{ position: 'relative', width: 860, height: 520 }}>
      {itens.map((v, i) => {
        const d = 16 + i * 6
        const s = spring({ frame: frame - d, fps: FPS, config: { damping: 12 } })
        return (
          <div key={i} style={{ position: 'absolute', left: 40 + (i % 2) * 120, top: i * 104, width: 660, transform: `translateY(${(1 - s) * -80}px) rotate(${i % 2 ? 2 : -2}deg)`, opacity: s, display: 'flex', alignItems: 'center', gap: 18, padding: '18px 24px', borderRadius: 22, background: '#1b1622f0', border: `2px solid ${C.coral}66`, boxShadow: '0 20px 40px -15px rgba(0,0,0,.7)' }}>
            <span style={{ fontSize: 40 }}>🛵</span>
            <div style={{ flex: 1, fontFamily: sans, fontSize: 26, color: C.muted, whiteSpace: 'nowrap' }}>
              <b style={{ color: C.ink }}>Pedido #{1040 + i}</b> · comissão
            </div>
            <b style={{ fontFamily: display, fontWeight: 800, fontSize: 40, color: C.coral }}>{v}</b>
          </div>
        )
      })}
      {itens.map((_, i) => <Sfx key={i} at={16 + i * 6} name="pop" volume={0.22} />)}
    </div>
  )
}

function Quebra27({ escala = 1 }) {
  const frame = useCurrentFrame()
  const quebra = interpolate(frame, [10, 30], [0, 1], clamp)
  const carimbo = useSpring(22, { damping: 9, mass: 0.8 })
  const shake = useShake(24, 26)
  const fatias = [[0, 34], [34, 67], [67, 100]]
  return (
    <div style={{ position: 'relative', width: 900 * escala, height: 700 * escala, transform: shake }}>
      {fatias.map(([a, b], i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', clipPath: `polygon(0 ${a}%, 100% ${a + (i - 1) * 4}%, 100% ${b + i * 3}%, 0 ${b}%)`, transform: `translate(${(i - 1) * quebra * 260}px, ${quebra * quebra * (200 + i * 120)}px) rotate(${(i - 1) * quebra * 35}deg)`, opacity: 1 - quebra * 0.9 }}>
          <span style={{ fontFamily: display, fontWeight: 800, fontSize: 300 * escala, color: C.coral, lineHeight: 1.05 }}>27%</span>
        </div>
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 260 * escala, display: 'flex', justifyContent: 'center', transform: `scale(${interpolate(carimbo, [0, 1], [3, 1])}) rotate(-8deg)`, opacity: carimbo }}>
        <div style={{ padding: `${20 * escala}px ${40 * escala}px`, border: `${10 * escala}px solid ${C.mint}`, borderRadius: 24, fontFamily: display, fontWeight: 800, fontSize: 84 * escala, color: C.mint, textAlign: 'center', lineHeight: 1, whiteSpace: 'nowrap', background: '#0c0b12cc', boxShadow: `0 0 60px -10px ${C.mint}` }}>
          SEM COMISSÃO
          <div style={{ fontSize: 44 * escala, marginTop: 8, color: C.ink }}>por pedido</div>
        </div>
      </div>
      <p style={{ position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center', fontFamily: sans, fontSize: 26 * escala, color: C.muted }}>Comissão de aplicativo pode chegar a 27% por pedido.</p>
      <Sfx at={10} name="glitch" volume={0.2} />
      <Sfx at={24} name="impacto" volume={0.45} />
    </div>
  )
}

export function AnuncioRestaurantes() {
  return (
    <Video
      voz={vozRestaurantes}
      audio="voz/anuncio-restaurantes.mp3"
      vertical
      apontar={{ link: 'left', salao: 'left', cta: 'left' }}
      cenas={{
        abertura: () => (
          <Topo top={230}>
            <Kinetic texto="Comissão em cada pedido?" destaque={['Comissão']} size={112} />
            <div style={{ height: 30 }} />
            <Notificacoes />
          </Topo>
        ),
        link: () => (
          <Topo top={300}>
            <Celular h={640} />
            <Sticker delay={30} x={120} y={520} rot={-12}>⚡</Sticker>
            <Sticker delay={36} x={830} y={300} rot={10}>📲</Sticker>
          </Topo>
        ),
        salao: () => (
          <Topo top={330}>
            <MesaCozinha w={960} />
          </Topo>
        ),
        semcomissao: () => (
          <Topo top={250}>
            <Quebra27 escala={1} />
          </Topo>
        ),
        cta: () => (
          <Topo top={250}>
            <Cta escala={0.95} frase="PEÇA SEU ORÇAMENTO" />
          </Topo>
        ),
      }}
    />
  )
}

// ================= apresentação =================

function Carrossel({ foco }) {
  const frame = useCurrentFrame()
  const cards = [['⚙️', 'Sistemas', 'por assinatura'], ['🔗', 'Sites e links', 'rápidos e seguros'], ['📱', 'Apps', 'direto no celular']]
  const anterior = Math.max(0, foco - 1)
  const giro = spring({ frame: frame - 4, fps: FPS, config: { damping: 15 } })
  const angulo = -(anterior + (foco - anterior) * giro) * 42
  const R = 760
  return (
    <div style={{ position: 'relative', width: 1100, height: 420, perspective: 1800 }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d', transform: `translateZ(${-R}px) rotateY(${angulo}deg)` }}>
        {cards.map(([ic, t, s], i) => {
          const ativo = i === foco
          return (
            <div key={t} style={{ position: 'absolute', left: -220, top: -170, width: 440, height: 340, transform: `rotateY(${i * 42}deg) translateZ(${R}px)`, borderRadius: 34, padding: 38, background: ativo ? `linear-gradient(140deg, ${C.gold}, ${C.amber})` : C.panel, border: `3px solid ${ativo ? '#fff6' : C.line}`, boxShadow: ativo ? `0 0 80px -10px ${C.gold}` : 'none', opacity: ativo ? 1 : 0.5, filter: ativo ? 'none' : 'blur(1.5px)', backfaceVisibility: 'hidden' }}>
              <div style={{ fontSize: 90 }}>{ic}</div>
              <p style={{ margin: '24px 0 0', fontFamily: display, fontWeight: 800, fontSize: 60, color: ativo ? C.bg : C.ink, lineHeight: 1 }}>{t}</p>
              <p style={{ margin: '10px 0 0', fontFamily: sans, fontWeight: 600, fontSize: 28, color: ativo ? '#3a2a0c' : C.muted }}>{s}</p>
            </div>
          )
        })}
      </div>
      <Sfx at={4} name="whoosh" volume={0.25} />
    </div>
  )
}

function LinhaDoTempo() {
  const frame = useCurrentFrame()
  const passos = [['🔍', 'Diagnóstico', 'mostramos o que está errado', 0], ['🧾', 'Orçamento', 'só o que você precisa', 80], ['🚀', 'No ar', 'com suporte de perto', 170]]
  const d = 'M 60 200 C 300 40, 460 360, 600 200 S 900 40, 1060 200'
  const ev = evolvePath(Math.max(0.0001, interpolate(frame, [0, 200], [0, 1], clamp)), d)
  const pontos = [[60, 200], [600, 200], [1060, 200]]
  return (
    <div style={{ position: 'relative', width: 1120, height: 560 }}>
      <svg width="1120" height="400" style={{ position: 'absolute', top: 40, overflow: 'visible' }}>
        <path d={d} stroke={C.line} strokeWidth="8" fill="none" strokeDasharray="4 18" strokeLinecap="round" />
        <path d={d} stroke={C.gold} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} style={{ filter: `drop-shadow(0 0 10px ${C.gold})` }} />
      </svg>
      {passos.map(([ic, t, s, at], i) => {
        const k = spring({ frame: frame - at, fps: FPS, config: { damping: 10 } })
        const [x, y] = pontos[i]
        return (
          <div key={t}>
            <div style={{ position: 'absolute', left: x - 60, top: 40 + y - 60, width: 120, height: 120, borderRadius: '50%', background: k > 0.5 ? C.gold : C.panel, border: `4px solid ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, transform: `scale(${0.6 + k * 0.4})`, boxShadow: k > 0.5 ? `0 0 50px ${C.gold}` : 'none' }}>{ic}</div>
            <div style={{ position: 'absolute', left: x - 170, width: 340, top: 40 + y + 80, textAlign: 'center', opacity: k, transform: `translateY(${(1 - k) * 30}px)` }}>
              <p style={{ margin: 0, fontFamily: display, fontWeight: 800, fontSize: 50, color: C.ink }}>{t}</p>
              <p style={{ margin: '6px 0 0', fontFamily: sans, fontSize: 26, color: C.muted }}>{s}</p>
            </div>
            <Faiscas at={at} x={x} y={40 + y} />
            <Sfx at={at} name="pop" volume={0.32} />
          </div>
        )
      })}
    </div>
  )
}

function AberturaApresentacao() {
  const frame = useCurrentFrame()
  return (
    <Direita>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <Logo size={120} draw={interpolate(frame, [0, 30], [0, 1], clamp)} />
          <Kinetic texto="LEXMOVI SISTEMAS" size={46} delay={18} cor={C.gold} align="left" />
        </div>
        <Kinetic texto="Sistemas, sites e apps que fazem seu negócio vender mais." destaque={['vender', 'mais']} size={92} delay={40} align="left" maxWidth={1180} />
        <Kinetic texto="📍 Barueri · SP" size={40} delay={80} cor={C.muted} align="left" />
      </div>
    </Direita>
  )
}

export function Apresentacao() {
  return (
    <Video
      voz={vozApresentacao}
      audio="voz/apresentacao.mp3"
      vertical={false}
      apontar={{ problema: 'right', sistemas: 'right', sites: 'right', apps: 'right', processo: 'right', cta: 'right' }}
      cenas={{
        abertura: AberturaApresentacao,
        problema: () => (
          <AbsoluteFill style={{ left: 600 }}>
            <CenaErros vertical={false} />
            <Sticker delay={44} x={820} y={60} rot={8} size={110}>📄</Sticker>
            <Sticker delay={52} x={1000} y={760} rot={-10} size={100}>💸</Sticker>
          </AbsoluteFill>
        ),
        sistemas: () => (
          <Direita>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Carrossel foco={0} />
              <div style={{ transform: 'scale(0.82)' }}>
                <MesaCozinha w={900} />
              </div>
            </div>
          </Direita>
        ),
        sites: () => (
          <Direita>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 50 }}>
              <Carrossel foco={1} />
              <Kinetic texto="Rápidos, seguros e com WhatsApp em 1 toque" destaque={['WhatsApp']} size={58} delay={20} maxWidth={1100} />
            </div>
          </Direita>
        ),
        apps: () => (
          <Direita>
            <div style={{ display: 'flex', alignItems: 'center', gap: 120 }}>
              <Celular h={720} />
              <Kinetic texto="Abre direto no celular, sem baixar nada." destaque={['sem', 'baixar', 'nada']} size={78} delay={12} align="left" maxWidth={560} />
            </div>
          </Direita>
        ),
        processo: () => (
          <Direita>
            <LinhaDoTempo />
          </Direita>
        ),
        cta: () => (
          <Direita>
            <Cta escala={1} />
          </Direita>
        ),
      }}
    />
  )
}
