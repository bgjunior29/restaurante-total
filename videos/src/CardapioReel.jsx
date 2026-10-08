import { loadFont as loadInter } from '@remotion/google-fonts/Inter'
import { loadFont as loadSerif } from '@remotion/google-fonts/InstrumentSerif'
import { QRCodeSVG } from 'qrcode.react'
import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'

// Mesmas fontes do cardápio no site.
const { fontFamily: serif } = loadSerif()
const { fontFamily: sans } = loadInter('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] })

const INTRO = 2.5 // segundos
const DISH = 2.3
const OUTRO = 4

/** Duração total em frames (abertura + um trecho por prato + chamada final). */
export const reelDuration = (data, fps) => Math.round((INTRO + DISH * data.dishes.length + OUTRO) * fps)

const brl = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Área segura do Reels/Stories: o Instagram cobre o topo (perfil) e a base (legenda e botões).
const SAFE_TOP = 230
const SAFE_BOTTOM = 400

/** Entra subindo e aparecendo, com atraso em frames. */
function useRise(delay = 0, distance = 60) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } })
  return { opacity: s, transform: `translateY(${(1 - s) * distance}px)` }
}

/** Escurece/clareia nas bordas de cada cena, para os cortes não ficarem secos. */
function Fade({ children, frames, out = true }) {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 8, frames - 8, frames], [0, 1, 1, out ? 0 : 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
}

function Seal({ data, size }) {
  const { colors, accent } = data
  return data.logo ? (
    <Img
      src={staticFile(data.logo)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', boxShadow: `0 0 0 ${size * 0.03}px ${accent}66` }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `3px solid ${accent}`,
        background: colors.dark,
        color: accent,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: serif,
        fontSize: size * 0.42,
      }}
    >
      {data.name.slice(0, 2)}
    </div>
  )
}

function Intro({ data }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { colors, accent } = data
  const seal = spring({ frame, fps, config: { damping: 14, mass: 0.8 } })
  const glow = interpolate(frame, [0, INTRO * fps], [0.6, 1.1])
  const name = useRise(10)
  const title = useRise(20)
  const highlight = useRise(30)
  const line = interpolate(frame, [30, 55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 38%, ${accent}33 0%, transparent ${55 * glow}%), ${colors.green}`,
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${SAFE_TOP}px 90px ${SAFE_BOTTOM}px`,
        textAlign: 'center',
        color: colors.cream,
      }}
    >
      <div style={{ transform: `scale(${seal})` }}>
        <Seal data={data} size={260} />
      </div>
      <p style={{ ...name, margin: '56px 0 0', fontFamily: sans, fontWeight: 600, fontSize: 34, letterSpacing: '0.42em', color: accent }}>{data.name}</p>
      <h1 style={{ ...title, margin: '40px 0 0', fontFamily: serif, fontWeight: 400, fontSize: 120, lineHeight: 1 }}>{data.heroTitle}</h1>
      {data.heroHighlight && (
        <h2 style={{ ...highlight, margin: '18px 0 0', fontFamily: serif, fontStyle: 'italic', fontWeight: 400, fontSize: 92, lineHeight: 1.05, color: accent }}>
          {data.heroHighlight}
        </h2>
      )}
      <div style={{ marginTop: 64, height: 3, width: 220 * line, background: accent, opacity: 0.7 }} />
      <p style={{ ...highlight, marginTop: 28, fontFamily: sans, fontSize: 30, letterSpacing: '0.3em', color: colors.muted }}>CARDÁPIO</p>
    </AbsoluteFill>
  )
}

function Dish({ data, dish, index, total }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { colors, accent } = data
  const zoom = interpolate(frame, [0, DISH * fps], [1.0, 1.1])
  const card = spring({ frame, fps, config: { damping: 200 } })
  const category = useRise(4, 40)
  const name = useRise(8)
  const desc = useRise(13)
  const price = spring({ frame: frame - 16, fps, config: { damping: 12 } })
  return (
    <AbsoluteFill style={{ background: colors.green }}>
      {/* Fundo: a mesma foto, desfocada e escura. Frente: a foto nítida num cartão (as fotos são horizontais e
          esticar para a tela vertical inteira deixaria tudo borrado). */}
      <Img
        src={staticFile(dish.photo)}
        style={{ position: 'absolute', inset: -80, width: 'calc(100% + 160px)', height: 'calc(100% + 160px)', objectFit: 'cover', filter: 'blur(48px) brightness(0.45) saturate(1.2)' }}
      />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${colors.green}99 0%, transparent 30%, ${colors.green}cc 62%, ${colors.green} 100%)` }} />
      <div
        style={{
          position: 'absolute',
          top: SAFE_TOP + 90,
          left: 60,
          right: 60,
          aspectRatio: '4 / 3',
          borderRadius: 40,
          overflow: 'hidden',
          boxShadow: '0 50px 100px -30px rgba(0,0,0,.75)',
          transform: `translateY(${(1 - card) * 80}px) scale(${0.94 + card * 0.06})`,
          opacity: card,
        }}
      >
        <Img src={staticFile(dish.photo)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }} />
      </div>

      {/* topo: marca e contador */}
      <div style={{ position: 'absolute', top: SAFE_TOP - 40, left: 70, right: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <Seal data={data} size={84} />
          <span style={{ fontFamily: sans, fontWeight: 600, fontSize: 30, letterSpacing: '0.3em', color: colors.cream }}>{data.name}</span>
        </div>
        <span style={{ fontFamily: sans, fontWeight: 500, fontSize: 30, color: colors.cream, opacity: 0.85 }}>
          {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
        </span>
      </div>

      {/* base: prato */}
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: SAFE_BOTTOM, color: colors.cream }}>
        <p style={{ ...category, margin: 0, fontFamily: sans, fontWeight: 600, fontSize: 30, letterSpacing: '0.32em', color: accent }}>
          {dish.category.toUpperCase()}
        </p>
        <h2 style={{ ...name, margin: '22px 0 0', fontFamily: serif, fontWeight: 400, fontSize: 118, lineHeight: 0.98 }}>{dish.name}</h2>
        {dish.description && (
          <p style={{ ...desc, margin: '24px 0 0', fontFamily: sans, fontSize: 36, lineHeight: 1.35, color: colors.cream, opacity: 0.82 * desc.opacity }}>
            {dish.description}
          </p>
        )}
        <div
          style={{
            display: 'inline-block',
            marginTop: 40,
            padding: '20px 40px',
            borderRadius: 999,
            background: accent,
            color: colors.green,
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 52,
            transform: `scale(${price})`,
            transformOrigin: 'left center',
          }}
        >
          {brl(dish.priceCents)}
        </div>
      </div>
    </AbsoluteFill>
  )
}

function Outro({ data }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { colors, accent, delivery } = data
  const title = useRise(0)
  const chips = useRise(10)
  const qr = spring({ frame: frame - 16, fps, config: { damping: 14 } })
  const handle = useRise(26)
  const pulse = 1 + Math.sin((frame / fps) * Math.PI * 2) * 0.015
  const facts = delivery
    ? [
        `Entrega em ~${delivery.minutes} min`,
        delivery.freeAboveCents > 0 ? `Grátis acima de ${brl(delivery.freeAboveCents)}` : delivery.feeCents ? `Taxa ${brl(delivery.feeCents)}` : 'Entrega grátis',
      ]
    : ['Retirada no balcão']
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 55%, ${accent}2e 0%, transparent 60%), ${colors.green}`,
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${SAFE_TOP}px 80px ${SAFE_BOTTOM - 120}px`,
        textAlign: 'center',
        color: colors.cream,
      }}
    >
      <p style={{ ...title, margin: 0, fontFamily: sans, fontWeight: 600, fontSize: 32, letterSpacing: '0.36em', color: accent }}>BATEU A FOME?</p>
      <h2 style={{ ...title, margin: '26px 0 0', fontFamily: serif, fontWeight: 400, fontSize: 118, lineHeight: 1 }}>
        Peça pelo <span style={{ fontStyle: 'italic', color: accent }}>delivery</span>
      </h2>
      <div style={{ ...chips, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18, marginTop: 44 }}>
        {facts.map((f) => (
          <span key={f} style={{ padding: '16px 30px', borderRadius: 999, border: `2px solid ${accent}80`, fontFamily: sans, fontWeight: 500, fontSize: 32 }}>
            {f}
          </span>
        ))}
      </div>
      <div style={{ marginTop: 56, padding: 34, borderRadius: 44, background: '#fff', transform: `scale(${qr * pulse})`, boxShadow: `0 30px 80px -30px ${accent}` }}>
        <QRCodeSVG value={data.link} size={380} fgColor={colors.green} />
      </div>
      <p style={{ ...handle, marginTop: 34, fontFamily: sans, fontWeight: 500, fontSize: 34, color: colors.cream }}>Aponte a câmera ou toque no link da bio</p>
      {data.instagram && <p style={{ ...handle, marginTop: 14, fontFamily: sans, fontWeight: 700, fontSize: 40, color: accent }}>@{data.instagram}</p>}
    </AbsoluteFill>
  )
}

export function CardapioReel({ data }) {
  const { fps } = useVideoConfig()
  const intro = Math.round(INTRO * fps)
  const dish = Math.round(DISH * fps)
  const outroStart = intro + dish * data.dishes.length
  return (
    <AbsoluteFill style={{ background: data.colors.green }}>
      <Sequence durationInFrames={intro}>
        <Fade frames={intro}>
          <Intro data={data} />
        </Fade>
      </Sequence>
      {data.dishes.map((d, i) => (
        <Sequence key={d.photo} from={intro + i * dish} durationInFrames={dish}>
          <Fade frames={dish}>
            <Dish data={data} dish={d} index={i} total={data.dishes.length} />
          </Fade>
        </Sequence>
      ))}
      <Sequence from={outroStart} durationInFrames={Math.round(OUTRO * fps)}>
        <Fade frames={Math.round(OUTRO * fps)} out={false}>
          <Outro data={data} />
        </Fade>
      </Sequence>
    </AbsoluteFill>
  )
}
