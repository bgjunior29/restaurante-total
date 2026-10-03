/**
 * Temas do sistema (paletas sóbrias, de restaurante de alto padrão). Cada tema redefine as cores do Tailwind (variáveis --color-*), então o sistema
 * inteiro muda de cara sem mexer em nenhuma tela. A cor de destaque (accent) é escolhida à parte.
 *
 * green  = fundo da página        dark  = cartões escuros      panel = etiquetas/realces
 * green2 = fundo dos campos       line  = bordas               olive = texto de apoio no claro
 * cream  = fundo do cardápio      card  = cartões do cardápio  sage  = caixas claras
 */
export const THEMES = {
  terra: {
    name: 'Noir',
    accent: '#d4b483',
    colors: {
      green: '#0f0e0c', green2: '#171613', panel: '#1f1d19', line: '#2e2b26', dark: '#141310',
      olive: '#8a7350', cream: '#f5f1ea', card: '#fffdf9', sage: '#ebe5da', muted: '#9a958b',
    },
  },
  grafite: {
    name: 'Grafite',
    accent: '#d9a47a',
    colors: {
      green: '#0e0f10', green2: '#16181a', panel: '#1e2023', line: '#2d3034', dark: '#131416',
      olive: '#8c6446', cream: '#f3f2ef', card: '#fdfdfc', sage: '#e7e5e1', muted: '#989ca1',
    },
  },
  vinho: {
    name: 'Bordeaux',
    accent: '#e2b6a6',
    colors: {
      green: '#130c0e', green2: '#1c1215', panel: '#26191d', line: '#3a272c', dark: '#170f12',
      olive: '#8f5560', cream: '#f6efec', card: '#fffcfb', sage: '#efe1dc', muted: '#ab979b',
    },
  },
  oceano: {
    name: 'Marinho',
    accent: '#b4c8d6',
    colors: {
      green: '#0b0f14', green2: '#11171e', panel: '#18202a', line: '#26313d', dark: '#0e131a',
      olive: '#4f6b80', cream: '#eff2f4', card: '#fbfcfd', sage: '#dfe6ea', muted: '#8f9ba6',
    },
  },
  verde: {
    name: 'Floresta',
    accent: '#cbc196',
    colors: {
      green: '#0c100d', green2: '#131914', panel: '#1a221c', line: '#28322a', dark: '#0f1410',
      olive: '#6b7448', cream: '#f2f1ea', card: '#fdfdf9', sage: '#e3e5d8', muted: '#949b92',
    },
  },
  roxo: {
    name: 'Ameixa',
    accent: '#cfbad8',
    colors: {
      green: '#100d13', green2: '#17131b', panel: '#201a25', line: '#312838', dark: '#130f17',
      olive: '#6f5a80', cream: '#f3f0f5', card: '#fdfcfe', sage: '#e6e0ea', muted: '#9d95a3',
    },
  },
}

// Cores de destaque da versão anterior (saturadas demais). Restaurantes que ainda usam uma delas
// passam a ver a cor nova do próprio tema, sem precisar editar nada.
const LEGACY_ACCENTS = new Set(['#d5f16a', '#ffb347', '#ff9aa2', '#7ee0c3', '#c9a7ff', '#f6c35b', '#8ec5ff', '#f6e27a', '#f4f1e8'])

export const DEFAULT_THEME = 'terra'

const validColor = (c) => /^#[0-9a-f]{6}$/i.test(c || '')

/** Variáveis CSS do tema + cor de destaque (para usar em style={} de um bloco, como uma prévia). */
export function themeVars(theme, accent) {
  const t = THEMES[theme] || THEMES[DEFAULT_THEME]
  const vars = Object.fromEntries(Object.entries(t.colors).map(([k, v]) => [`--color-${k}`, v]))
  const legacy = validColor(accent) && LEGACY_ACCENTS.has(accent.toLowerCase())
  vars['--color-lime'] = validColor(accent) && !legacy ? accent : t.accent
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
