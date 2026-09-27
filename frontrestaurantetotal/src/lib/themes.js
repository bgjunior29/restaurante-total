/**
 * Temas do cardápio. Cada tema redefine as cores do Tailwind (variáveis --color-*), então o sistema
 * inteiro muda de cara sem mexer em nenhuma tela. A cor de destaque (accent) é escolhida à parte.
 *
 * green  = fundo da página        dark  = cartões escuros      panel = etiquetas/realces
 * green2 = fundo dos campos       line  = bordas               olive = texto de apoio no claro
 * cream  = fundo do cardápio      card  = cartões do cardápio  sage  = caixas claras
 */
export const THEMES = {
  verde: {
    name: 'Verde noite',
    accent: '#d5f16a',
    colors: {
      green: '#101813', green2: '#18251b', panel: '#202c22', line: '#3b473b', dark: '#162017',
      olive: '#7d8f3f', cream: '#f4efe3', card: '#fdfbf3', sage: '#e2e7d3', muted: '#adbaa9',
    },
  },
  grafite: {
    name: 'Grafite',
    accent: '#ffb347',
    colors: {
      green: '#121314', green2: '#1b1d1f', panel: '#26292c', line: '#3b3f44', dark: '#18191b',
      olive: '#8a6a3c', cream: '#f2f1ee', card: '#fcfbf9', sage: '#e6e4df', muted: '#b0b4b8',
    },
  },
  vinho: {
    name: 'Vinho',
    accent: '#ff9aa2',
    colors: {
      green: '#1a0f12', green2: '#24151a', panel: '#321d24', line: '#4d313a', dark: '#1f1216',
      olive: '#9a4d5c', cream: '#f7eeea', card: '#fdf8f6', sage: '#f0dcd6', muted: '#c4aab0',
    },
  },
  oceano: {
    name: 'Oceano',
    accent: '#7ee0c3',
    colors: {
      green: '#0c1520', green2: '#13202e', panel: '#1b2b3c', line: '#2f4256', dark: '#101b27',
      olive: '#3b7390', cream: '#eef3f6', card: '#fafcfd', sage: '#d9e7ee', muted: '#a3b5c4',
    },
  },
  roxo: {
    name: 'Roxo',
    accent: '#c9a7ff',
    colors: {
      green: '#120f1c', green2: '#1b1728', panel: '#261f37', line: '#3d3553', dark: '#171323',
      olive: '#6e5b9a', cream: '#f2eff8', card: '#fcfbfe', sage: '#e4ddf1', muted: '#b3aac6',
    },
  },
  terra: {
    name: 'Terra',
    accent: '#f6c35b',
    colors: {
      green: '#17120c', green2: '#211a12', panel: '#2d2419', line: '#483a2a', dark: '#1c160f',
      olive: '#8a6d3b', cream: '#f6efe4', card: '#fdf9f2', sage: '#ebdfcb', muted: '#bfb09b',
    },
  },
}

export const DEFAULT_THEME = 'terra'

const validColor = (c) => /^#[0-9a-f]{6}$/i.test(c || '')

/** Variáveis CSS do tema + cor de destaque (para usar em style={} de um bloco, como uma prévia). */
export function themeVars(theme, accent) {
  const t = THEMES[theme] || THEMES[DEFAULT_THEME]
  const vars = Object.fromEntries(Object.entries(t.colors).map(([k, v]) => [`--color-${k}`, v]))
  vars['--color-lime'] = validColor(accent) ? accent : t.accent
  return vars
}

/** Aplica o tema na página inteira. */
export function applyTheme(theme, accent) {
  const root = document.documentElement
  for (const [k, v] of Object.entries(themeVars(theme, accent))) root.style.setProperty(k, v)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', (THEMES[theme] || THEMES[DEFAULT_THEME]).colors.green)
}

/** Volta ao visual padrão da plataforma. */
export const resetTheme = () => applyTheme(DEFAULT_THEME)
