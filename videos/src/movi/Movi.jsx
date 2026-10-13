import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'

// A Movi: mascote da Movitech. Robozinha dourada com uma tela no rosto: olhos neon que piscam e olham em volta,
// boca de equalizador que segue as frequências da voz, antena que balança e corpo que flutua com squash & stretch.
// viewBox 300×360. Props: spectrum (7 valores 0–1 da voz), volume (0–1), waving, pointing ('left' | 'right').

const NEON = '#7ff0c8'

function useBlink() {
  const frame = useCurrentFrame()
  const ciclo = [92, 128, 76, 150, 104]
  let t = frame
  let i = 0
  while (t >= ciclo[i % ciclo.length]) {
    t -= ciclo[i % ciclo.length]
    i++
  }
  const r = ciclo[i % ciclo.length] - t
  return r <= 6 ? interpolate(r, [0, 3, 6], [1, 0.1, 1]) : 1
}

export function Movi({ spectrum = [], volume = 0, size = 420, waving = false, pointing = null, id = 'm' }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const piscar = useBlink()
  const v = Math.min(1, volume)
  const t = frame / fps

  // flutuação + squash & stretch (estica subindo, achata descendo)
  const ciclo = Math.sin(t * 2.4)
  const sobe = ciclo * 9 - v * 4
  const estica = 1 + ciclo * 0.025 + v * 0.03
  const inclina = Math.sin(t * 1.3) * 3 + (pointing === 'right' ? 6 : pointing === 'left' ? -6 : 0)
  const olharX = pointing === 'right' ? 7 : pointing === 'left' ? -7 : Math.sin(t * 0.7) * 5
  const olharY = Math.sin(t * 0.9) * 2
  const falando = v > 0.05
  const antena = Math.sin(t * 3.1) * 10 + v * 8

  const bars = Array.from({ length: 7 }, (_, i) => {
    const s = spectrum[i] ?? 0
    const centro = 1 - Math.abs(i - 3) / 4.5 // barras do meio um pouco maiores, parece boca
    return 5 + Math.min(1, s) * 38 * (0.55 + centro * 0.45)
  })

  const aceno = waving ? Math.sin(t * 14) * 22 : 0
  const g = (n) => `${id}-${n}`

  return (
    <svg viewBox="0 0 300 360" width={size * (300 / 360)} height={size} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={g('corpo')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe7b3" />
          <stop offset="0.45" stopColor="#e2b867" />
          <stop offset="1" stopColor="#9c6c2c" />
        </linearGradient>
        <linearGradient id={g('visor')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d1a2b" />
          <stop offset="1" stopColor="#0a0912" />
        </linearGradient>
        <radialGradient id={g('chao')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e2b867" stopOpacity="0.55" />
          <stop offset="1" stopColor="#e2b867" stopOpacity="0" />
        </radialGradient>
        <filter id={g('glow')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={g('clipVisor')}>
          <rect x="62" y="102" width="176" height="118" rx="52" />
        </clipPath>
      </defs>

      {/* brilho no chão, acompanha a flutuação */}
      <ellipse cx="150" cy="345" rx={78 - sobe * 1.5} ry={13 - sobe * 0.2} fill={`url(#${g('chao')})`} />

      <g transform={`translate(0 ${sobe}) rotate(${inclina} 150 200) translate(150 300) scale(${1 / estica} ${estica}) translate(-150 -300)`}>
        {/* antena */}
        <path d={`M150 46 Q${150 + antena * 0.6} 26 ${150 + antena} 12`} stroke="#c99a50" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx={150 + antena} cy="10" r={9 + v * 4} fill={NEON} filter={`url(#${g('glow')})`} />

        {/* braço esquerdo (acena) */}
        <g transform={`rotate(${waving ? 135 + aceno : pointing === 'left' ? 75 : 12 + Math.sin(t * 2) * 6} 48 205)`}>
          <path d="M48 205 Q28 230 30 262" stroke="#b98a44" strokeWidth="16" fill="none" strokeLinecap="round" />
          <circle cx="30" cy="268" r="15" fill={`url(#${g('corpo')})`} stroke="#9c6c2c" strokeWidth="2" />
        </g>
        {/* braço direito (aponta) */}
        <g transform={`rotate(${pointing === 'right' ? -75 : -12 - Math.sin(t * 2 + 1) * 6} 252 205)`}>
          <path d="M252 205 Q272 230 270 262" stroke="#b98a44" strokeWidth="16" fill="none" strokeLinecap="round" />
          <circle cx="270" cy="268" r="15" fill={`url(#${g('corpo')})`} stroke="#9c6c2c" strokeWidth="2" />
        </g>

        {/* corpo */}
        <rect x="40" y="44" width="220" height="262" rx="104" fill={`url(#${g('corpo')})`} />
        <rect x="40" y="44" width="220" height="262" rx="104" fill="none" stroke="#fff3d6" strokeOpacity="0.5" strokeWidth="3" />
        {/* reflexos */}
        <ellipse cx="98" cy="86" rx="34" ry="16" fill="#fff" opacity="0.45" transform="rotate(-28 98 86)" />
        <ellipse cx="236" cy="220" rx="8" ry="40" fill="#fff" opacity="0.18" />

        {/* tela do rosto */}
        <rect x="58" y="98" width="184" height="126" rx="56" fill="#3b2a12" opacity="0.35" />
        <rect x="62" y="102" width="176" height="118" rx="52" fill={`url(#${g('visor')})`} />
        <g clipPath={`url(#${g('clipVisor')})`}>
          {/* linhas de varredura e reflexo da tela */}
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x="62" y={104 + i * 10 + ((frame * 0.6) % 10)} width="176" height="1.5" fill={NEON} opacity="0.05" />
          ))}
          <path d="M80 104 L140 104 L100 220 L60 220 Z" fill="#fff" opacity="0.05" />

          {/* olhos */}
          <g transform={`translate(${olharX} ${olharY})`} filter={`url(#${g('glow')})`}>
            {!falando && Math.sin(t * 0.8) > 0.6 ? (
              // olhos sorrindo (arquinhos)
              <>
                <path d="M100 152 Q115 136 130 152" stroke={NEON} strokeWidth="8" fill="none" strokeLinecap="round" />
                <path d="M170 152 Q185 136 200 152" stroke={NEON} strokeWidth="8" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <rect x="102" y={128 + 20 * (1 - piscar)} width="26" height={40 * piscar} rx="13" fill={NEON} />
                <rect x="172" y={128 + 20 * (1 - piscar)} width="26" height={40 * piscar} rx="13" fill={NEON} />
              </>
            )}
          </g>

          {/* boca: equalizador que segue a voz; calada, um sorriso */}
          <g filter={`url(#${g('glow')})`}>
            {falando ? (
              bars.map((h, i) => <rect key={i} x={117 + i * 10} y={197 - h / 2} width="6" height={h} rx="3" fill={NEON} />)
            ) : (
              <path d="M132 192 Q150 206 168 192" stroke={NEON} strokeWidth="6" fill="none" strokeLinecap="round" />
            )}
          </g>
        </g>

        {/* bochechas */}
        <ellipse cx="72" cy="238" rx="16" ry="8" fill="#ff8a7a" opacity="0.4" />
        <ellipse cx="228" cy="238" rx="16" ry="8" fill="#ff8a7a" opacity="0.4" />

        {/* selo M no peito */}
        <circle cx="150" cy="268" r="20" fill="#141310" stroke="#fff3d6" strokeOpacity="0.6" strokeWidth="2" />
        <path d="M141 277v-18l9 10 9-10v18" fill="none" stroke="#e2b867" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
