import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { LogoMark } from "../components/ui";
import { slugify } from "../lib/format";
import { useLandingFx } from "../lib/landingFx";

// Número de vendas (DDI + DDD + número, só dígitos).
export const WHATSAPP_VENDAS = "5511964452878";
export const whatsapp = (text) =>
  `https://wa.me/${WHATSAPP_VENDAS}?text=${encodeURIComponent(text)}`;
const ZAP = whatsapp("Oi! Vi o site da Lexmovi e quero conversar sobre um sistema para o meu negócio.");
const ZAP_DIAGNOSTICO = whatsapp(
  "Oi! Vi o site da Lexmovi e quero o diagnóstico gratuito do meu negócio. O nome é: ",
);
const DEMO = "/r/point-arena"; // cardápio de um restaurante que já usa o sistema

const wrap = "mx-auto w-full max-w-[1280px] px-[clamp(16px,5.7vw,96px)]";
const h2 = "mt-5 max-w-3xl font-serif text-balance text-[clamp(36px,4.4vw,60px)] leading-[1.02]";

const NAV = [
  ["#solucoes", "Soluções"],
  ["/restaurantes", "Restaurantes"],
  ["#como-trabalhamos", "Como trabalhamos"],
  ["#sobre", "Sobre"],
  ["#perguntas", "Perguntas"],
];

const SEGMENTOS = [
  "Restaurantes",
  "Pizzarias",
  "Hamburguerias",
  "Bares",
  "Lanchonetes",
  "Cafeterias",
  "Bistrôs",
  "Delivery",
  "Comércio local",
  "Prestadores de serviço",
];

// As três frentes da Lexmovi (as mesmas do vídeo de apresentação).
const SOLUCOES = [
  {
    icon: "layers",
    tag: "Sistemas por assinatura",
    title: "Sistemas que rodam o seu dia a dia",
    text: "Plataformas na nuvem, com a sua marca, equipe e dados separados. A primeira já está em uso: o sistema completo para restaurantes.",
    items: ["Salão, cozinha e delivery", "Painel para o dono e para a equipe", "Relatórios e inteligência"],
    link: ["/restaurantes", "Conhecer o sistema para restaurantes"],
  },
  {
    icon: "link",
    tag: "Sites e links",
    title: "Sua vitrine rápida e que converte",
    text: "Sites e links para o Instagram, o WhatsApp e o Google: cardápio, catálogo, pedidos e agendamento, abrindo em segundos no celular.",
    items: ["Botão de WhatsApp que funciona", "Cardápio e catálogo no lugar do PDF", "Agendamento online"],
  },
  {
    icon: "smartphone",
    tag: "Apps sem download",
    title: "Um app que o cliente não precisa baixar",
    text: "Seu cliente abre pelo link ou QR code e usa como um aplicativo, direto no navegador. Sem loja de aplicativos, sem espaço no celular.",
    items: ["Abre em qualquer celular", "Ícone na tela inicial", "Sempre atualizado"],
  },
];

const RESTAURANTE = [
  ["utensils", "QR code na mesa", "Cada rodada entra na conta da mesa. O cliente chama o garçom e pede a conta pelo celular."],
  ["scooter", "Delivery próprio", "Seu link, sua marca, sem comissão por pedido. CEP automático, taxa de entrega e troco."],
  ["clock", "Tela da cozinha", "Fila por estação, cronômetro e alerta de atraso. Nenhuma comanda perdida."],
  ["receipt", "Pix, cupons e conta", "Pix com a sua chave, cupons com validade e conta dividida com taxa de serviço."],
  ["chat", "Avisos no WhatsApp", "O cliente acompanha cada etapa: confirmado, em preparo, saiu para entrega."],
  ["star", "Inteligência", "Horário de pico, previsão do dia, combos que vendem juntos e estoque baixo."],
];

// O que o diagnóstico gratuito confere (o mesmo roteiro da prospecção).
const DIAGNOSTICO = [
  ["Google Maps", "Horário, telefone, fotos e link para pedir", false],
  ["Site", "Abre rápido no 4G e funciona no celular", true],
  ["WhatsApp", "O botão abre a conversa certa", false],
  ["Cardápio", "Digital e atualizado, não um PDF", false],
  ["Delivery", "Quanto você paga de comissão por mês", false],
  ["Instagram", "Link na bio levando para pedir ou agendar", true],
];

const PASSOS = [
  ["Diagnóstico", "A gente olha o seu Google, o seu site, o seu Instagram e como você recebe pedidos hoje, e te mostra o que está fazendo você perder cliente."],
  ["Orçamento sob medida", "Você recebe uma proposta só com o que faz diferença para o seu negócio. Sem pacote fechado e sem empurrar o que você não precisa."],
  ["Implantação", "Montamos tudo com a sua marca: cardápio, fotos, QR codes, link, equipe. Você vê funcionando antes de divulgar."],
  ["Suporte de perto", "Depois do lançamento, o atendimento continua direto pelo WhatsApp, com quem fez o seu sistema."],
];

const SEGURANCA = [
  ["layers", "Dados separados", "Cada negócio tem os seus dados isolados. Um cliente nunca enxerga o outro."],
  ["check", "Backup diário", "Cópia de segurança todos os dias, criptografada."],
  ["ban", "Proteção de acesso", "Senhas criptografadas e bloqueio automático contra tentativas de invasão."],
  ["receipt", "LGPD", "Termos de uso e política de privacidade para você e para os seus clientes."],
];

const FAQ = [
  ["A Lexmovi atende só restaurantes?", "Não. O sistema completo de hoje é para restaurantes, pizzarias, bares e lanchonetes, mas também fazemos sites, links e apps para outros negócios locais: comércio, prestadores de serviço e quem atende com agendamento."],
  ["Quanto custa?", "Depende do que o seu negócio precisa. Primeiro fazemos o diagnóstico gratuito e depois enviamos um orçamento sob medida, sem compromisso."],
  ["Meu cliente precisa baixar algum aplicativo?", "Não. Tudo abre pelo navegador do celular, pelo link ou pelo QR code."],
  ["Preciso comprar equipamento?", "Não. Funciona em qualquer celular, tablet ou computador que você já tem. A tela da cozinha pode ser um tablet ou uma TV com navegador."],
  ["Vocês atendem fora de Barueri?", "Sim. Em Barueri e região a gente vai até você. Para o resto do Brasil, a implantação e o suporte são online."],
  ["Posso continuar nos aplicativos de delivery?", "Pode. O ideal é usar o aplicativo para ser descoberto e o seu link próprio, sem comissão, para quem já é seu cliente."],
];

function Eyebrow({ children, className = "text-lime", ...rest }) {
  return (
    <p {...rest} className={`eyebrow flex items-center gap-3 ${className}`}>
      <span className="h-px w-8 bg-current opacity-60" />
      {children}
    </p>
  );
}

function NavLinkItem({ href, children, onClick, className }) {
  return href.startsWith("/") ? (
    <Link to={href} onClick={onClick} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
}

/** Topo do site: marca, menu, Entrar e WhatsApp. No celular o menu abre numa gaveta. */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-green/80 backdrop-blur-xl">
      <div className={`${wrap} flex h-[68px] items-center justify-between gap-4 sm:h-[76px]`}>
        <Link to="/" className="flex items-center gap-3" onClick={close}>
          <LogoMark />
          <span className="leading-none">
            <span className="block font-serif text-[23px]">Lexmovi</span>
            <span className="mt-1.5 block text-[9px] font-medium tracking-[0.22em] text-muted uppercase">Sistemas · Barueri</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map(([href, label]) => (
            <NavLinkItem key={href} href={href} className="rounded-lg px-3 py-2 text-[13px] text-muted transition hover:bg-white/[0.04] hover:text-ink">
              {label}
            </NavLinkItem>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/plataforma" className="hidden px-3 py-2 text-[13px] text-muted transition hover:text-ink sm:inline">
            Entrar
          </Link>
          <a href={ZAP} target="_blank" rel="noreferrer" className="btn-lime hidden items-center gap-2 py-2.5 text-[13px] sm:inline-flex">
            <Icon name="chat" className="size-4" /> WhatsApp
          </a>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-lg border border-line text-ink lg:hidden"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line/60 bg-green/95 px-[clamp(16px,5.7vw,96px)] pb-6 lg:hidden">
          {NAV.map(([href, label]) => (
            <NavLinkItem key={href} href={href} onClick={close} className="block border-b border-line/50 py-4 font-serif text-2xl">
              {label}
            </NavLinkItem>
          ))}
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Link to="/plataforma" onClick={close} className="btn-outline py-3 text-center">
              Entrar
            </Link>
            <a href={ZAP} target="_blank" rel="noreferrer" className="btn-lime inline-flex items-center justify-center gap-2">
              <Icon name="chat" className="size-4" /> WhatsApp
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

/** Rodapé completo do site, com colunas. */
export function SiteFooter() {
  const col = "flex flex-col gap-3 text-sm";
  const link = "text-ink/60 transition hover:text-ink";
  return (
    <footer className="border-t border-line/60 bg-green">
      <div className={`${wrap} grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]`}>
        <div className="max-w-xs">
          <div className="flex items-center gap-3">
            <LogoMark />
            <span className="font-serif text-2xl">Lexmovi</span>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-ink/55">
            Sistemas, sites e apps para negócios locais. Tecnologia feita aqui do lado, em Barueri.
          </p>
        </div>
        <div className={col}>
          <p className="eyebrow text-muted">Soluções</p>
          <Link to="/restaurantes" className={link}>Sistema para restaurantes</Link>
          <a href="/#solucoes" className={link}>Sites e links</a>
          <a href="/#solucoes" className={link}>Apps sem download</a>
          <a href="/#diagnostico" className={link}>Diagnóstico gratuito</a>
        </div>
        <div className={col}>
          <p className="eyebrow text-muted">Empresa</p>
          <a href="/#sobre" className={link}>Sobre a Lexmovi</a>
          <a href="/#como-trabalhamos" className={link}>Como trabalhamos</a>
          <a href="/#perguntas" className={link}>Perguntas frequentes</a>
          <Link to="/plataforma" className={link}>Área do cliente</Link>
        </div>
        <div className={col}>
          <p className="eyebrow text-muted">Contato</p>
          <a href={ZAP} target="_blank" rel="noreferrer" className={`${link} flex items-center gap-2`}>
            <Icon name="chat" className="size-4 text-lime" /> (11) 96445-2878
          </a>
          <span className="flex items-center gap-2 text-ink/60">
            <Icon name="pin" className="size-4 text-lime" /> Barueri e região · Brasil online
          </span>
        </div>
      </div>
      <div className={`${wrap} flex flex-wrap items-center justify-between gap-3 border-t border-line/50 py-6 text-[11px] text-muted`}>
        <span>© {new Date().getFullYear()} Lexmovi Sistemas</span>
        <span className="flex gap-5">
          <Link to="/termos" className="hover:text-ink">Termos de uso</Link>
          <Link to="/privacidade" className="hover:text-ink">Privacidade</Link>
        </span>
      </div>
    </footer>
  );
}

/** Prévia ilustrativa do painel: mostra o produto sem depender de dados reais. */
export function PanelPreview({ className = "" }) {
  const orders = [
    ["Mesa 07", "Em preparo", "2× Risoto de Cogumelos", "R$ 119,80", "text-amber-100 ring-amber-200/25 bg-amber-200/[0.06]"],
    ["Delivery", "Saiu para entrega", "1× Picanha na Chapa", "R$ 97,90", "text-violet-200 ring-violet-300/25 bg-violet-300/[0.06]"],
    ["Mesa 12", "Pronto", "3× Caipirinha", "R$ 68,70", "text-emerald-200 ring-emerald-300/30 bg-emerald-300/[0.07]"],
  ];
  return (
    <div aria-hidden className={`relative ${className}`}>
      <div className="absolute -inset-10 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-lime)_16%,transparent),transparent)]" />
      <div className="relative overflow-hidden rounded-2xl border border-line bg-dark/90 shadow-[0_50px_100px_-40px_rgba(0,0,0,.9)] backdrop-blur">
        <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="ml-3 text-[11px] text-muted">Pedidos · ao vivo</span>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-300">
            <i className="size-1.5 rounded-full bg-emerald-400" /> online
          </span>
        </div>
        <div className="grid grid-cols-3 gap-px bg-line/60">
          {[
            ["Movimento do dia", "R$ 4.382"],
            ["Pedidos", "57"],
            ["Ticket médio", "R$ 76,90"],
          ].map(([k, v]) => (
            <div key={k} className="bg-dark px-4 py-4">
              <p className="text-[10px] text-muted">{k}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{v}</p>
            </div>
          ))}
        </div>
        <ul className="space-y-2 p-4">
          {orders.map(([where, status, item, total, tone]) => (
            <li key={where} className="flex items-center justify-between gap-3 rounded-xl border border-line/80 bg-panel/50 px-4 py-3">
              <div className="min-w-0">
                <p className="font-serif text-lg leading-tight">{where}</p>
                <p className="truncate text-[11px] text-muted">{item}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${tone}`}>{status}</span>
                <span className="text-xs tabular-nums">{total}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Celular ilustrativo com um cardápio digital (capa do site). */
function PhonePreview({ className = "" }) {
  const items = [
    ["Bruschetta da Casa", "R$ 28,90"],
    ["Risoto de Cogumelos", "R$ 59,90"],
    ["Picanha na Chapa", "R$ 89,90"],
  ];
  return (
    <div aria-hidden className={`w-[250px] rounded-[38px] border border-line bg-[#0b0a09] p-2.5 shadow-[0_50px_90px_-30px_rgba(0,0,0,.95)] ${className}`}>
      <div className="overflow-hidden rounded-[30px] bg-cream text-dark">
        <div className="flex items-center justify-between bg-dark px-5 pt-4 pb-5 text-ink">
          <span className="font-serif text-lg">Sua Casa</span>
          <span className="flex items-center gap-1.5 text-[9px] text-muted">
            <i className="size-1.5 rounded-full bg-emerald-400" /> Aberto
          </span>
        </div>
        <div className="px-4 pt-4 pb-5">
          <p className="text-[8px] font-medium tracking-[0.22em] text-olive uppercase">Mesa 07</p>
          <p className="mt-1 font-serif text-[22px] leading-none">
            O que vai ser <em className="text-olive">hoje?</em>
          </p>
          <div className="mt-3 flex gap-1.5">
            {["Todos", "Entradas", "Pratos"].map((c, i) => (
              <span key={c} className={`rounded-full border px-2.5 py-1 text-[8px] ${i === 0 ? "border-dark bg-dark text-cream" : "border-[#ddd6c8]"}`}>
                {c}
              </span>
            ))}
          </div>
          <ul className="mt-3 space-y-2">
            {items.map(([name, price]) => (
              <li key={name} className="flex items-center justify-between rounded-xl border border-[#e8e2d6] bg-card px-3 py-2.5">
                <span>
                  <span className="block font-serif text-[13px] leading-tight">{name}</span>
                  <span className="text-[9px] font-semibold">{price}</span>
                </span>
                <span className="flex size-5 items-center justify-center rounded-full bg-dark text-[11px] text-cream">+</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-dark px-3 py-2.5 text-[9px] font-semibold text-ink">
            <span className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-full bg-lime text-[8px] text-dark">2</span> Ver pedido
            </span>
            <span>R$ 88,80</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tela da cozinha ilustrativa (seção do sistema para restaurantes). */
function KitchenPreview() {
  const tickets = [
    ["Mesa 03", "18′", "2× Filé à Parmegiana", "b-red"],
    ["Delivery", "9′", "1× Salmão Grelhado", "b-amber"],
    ["Mesa 11", "3′", "3× Suco Natural", ""],
  ];
  const tone = {
    "b-red": "bg-red-400/15 text-red-300 ring-red-400/40",
    "b-amber": "bg-amber-300/10 text-amber-200 ring-amber-300/40",
    "": "bg-panel text-ink/80 ring-line",
  };
  return (
    <div aria-hidden className="rounded-2xl border border-line bg-dark/90 p-5 shadow-[0_50px_100px_-40px_rgba(0,0,0,.9)]">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-[10px] text-lime">Tela da cozinha · ao vivo</p>
        <span className="text-[11px] text-muted">3 na fila</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {tickets.map(([where, min, item, t]) => (
          <div key={where} className={`rounded-xl border bg-panel/40 p-4 ${t === "b-red" ? "border-red-400/50" : t ? "border-amber-300/40" : "border-line"}`}>
            <div className="flex items-start justify-between">
              <p className="font-serif text-xl leading-none">{where}</p>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ${tone[t]}`}>{min}</span>
            </div>
            <p className="mt-3 rounded-lg border border-line/70 px-2.5 py-2 text-[12px]">{item}</p>
            <p className={`mt-3 rounded-lg py-2 text-center text-[11px] font-semibold ${t === "b-red" ? "bg-lime text-dark" : "border border-lime/40 text-lime"}`}>
              {t === "b-red" ? "Pronto" : "Começar preparo"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Página inicial da Lexmovi: quem somos, as três frentes, o sistema para restaurantes, como trabalhamos e contato. */
/** "Já é cliente?": fica num componente próprio para que digitar não renderize a página toda de novo. */
function SlugForm() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  return (
    <form
      className="rounded-2xl border border-line bg-green/70 p-4 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const s = slugify(slug);
        if (s) navigate(`/r/${s}`);
      }}
    >
      <label className="text-sm font-medium" htmlFor="slug">
        Já é cliente? Abra o seu restaurante
      </label>
      <div className="mt-3 flex gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-lg border border-line bg-white/[0.03] pl-4 transition focus-within:border-lime/60 focus-within:ring-4 focus-within:ring-lime/10">
          <span className="text-sm text-muted">/r/</span>
          <input
            id="slug"
            className="min-w-0 flex-1 bg-transparent px-1 py-3 text-ink outline-none placeholder:text-muted/50"
            placeholder="nome-do-restaurante"
            autoCapitalize="none"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>
        <button className="btn-outline px-5">Abrir</button>
      </div>
    </form>
  );
}

export default function Landing() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);
  const dotRef = useRef(null);
  const progressRef = useRef(null);
  const has3D = useLandingFx({ rootRef, canvasRef, cursorRef, dotRef, progressRef });

  useEffect(() => {
    document.title = "Lexmovi Sistemas · Sistemas, sites e apps para o seu negócio";
  }, []);

  return (
    <div ref={rootRef} className="landing-3d flex min-h-screen flex-col">
      {/* Cena 3D fixa atrás da página, barra de progresso, cursor e granulado */}
      {has3D && <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-0" />}
      <div aria-hidden className="landing-grain" />
      <div ref={progressRef} aria-hidden className="fixed top-0 left-0 z-50 h-0.5 w-full origin-left scale-x-0 bg-lime" />
      <div ref={cursorRef} aria-hidden className="landing-cursor" />
      <div ref={dotRef} aria-hidden className="landing-cursor-dot" />

      <SiteHeader />

      <main className="relative z-[1] flex-1 overflow-x-clip">
        {/* Capa */}
        <section data-scene="hero" className="relative">
          {!has3D && (
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_75%_10%,color-mix(in_srgb,var(--color-lime)_14%,transparent),transparent_70%)]" />
          )}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[.05] [background-image:linear-gradient(var(--color-ink)_1px,transparent_1px),linear-gradient(90deg,var(--color-ink)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
          />
          <div className={`${wrap} relative grid items-center gap-16 pt-16 pb-24 lg:min-h-[min(calc(100svh-76px),860px)] lg:grid-cols-[1.1fr_.9fr] lg:pt-10`}>
            <div>
              {/* No celular o logo 3D aparece em cima do título */}
              {has3D && <div aria-hidden data-anchor className="pointer-events-none mx-auto mb-8 h-[32svh] max-w-[280px] lg:hidden" />}
              <Eyebrow data-hero-in>Lexmovi Sistemas · Barueri</Eyebrow>
              <h1 data-split="hero" className="mt-7 font-serif text-balance text-[clamp(48px,7vw,108px)] leading-[.93]">
                Tecnologia que move o seu negócio.{" "}
                <em className="text-lime">Feita aqui do lado.</em>
              </h1>
              <p data-hero-in className="mt-8 max-w-[560px] text-[17px] leading-[1.7] text-ink/65">
                Sistemas, sites e apps para negócios locais venderem mais e trabalharem menos. Começamos pelo que mais pesa:
                restaurantes, com salão, cozinha e delivery numa operação só, sem comissão por pedido.
              </p>
              <div data-hero-in className="mt-10 flex flex-wrap gap-3">
                <a data-magnetic href={ZAP_DIAGNOSTICO} target="_blank" rel="noreferrer" className="btn-lime inline-flex items-center gap-2 px-6 py-3.5">
                  Quero o diagnóstico gratuito <Icon name="arrow" className="size-4" />
                </a>
                <Link data-magnetic to="/restaurantes" className="btn-outline inline-flex items-center px-6 py-3.5 backdrop-blur">
                  Sistema para restaurantes
                </Link>
              </div>
              <ul data-hero-in className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-muted">
                {["Sem aplicativo para baixar", "Com a sua marca", "Suporte direto no WhatsApp"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Icon name="check" className="size-4 text-lime" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            {has3D ? (
              <div aria-hidden data-anchor className="pointer-events-none mx-auto hidden aspect-square w-[86%] lg:block" />
            ) : (
              <div className="relative mx-auto w-full max-w-[520px] pb-10 lg:pb-0">
                <PanelPreview className="mr-auto w-[84%]" />
                <PhonePreview className="absolute -right-2 -bottom-10 hidden rotate-[4deg] sm:block lg:-right-10" />
              </div>
            )}
          </div>
        </section>

        {/* Para quem */}
        <section aria-label="Para quem fazemos" className="border-y border-line/60 bg-dark/40 py-6 backdrop-blur-sm">
          <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <ul aria-hidden data-marquee className="flex w-max items-center gap-10">
              {[...SEGMENTOS, ...SEGMENTOS].map((s, i) => (
                <li key={i} className="flex items-center gap-10 font-serif text-2xl whitespace-nowrap text-ink/45">
                  {s} <span className="size-1.5 rounded-full bg-lime/50" />
                </li>
              ))}
            </ul>
            <p className="sr-only">Fazemos sistemas para {SEGMENTOS.join(", ")}.</p>
          </div>
        </section>

        {/* Soluções */}
        <section id="solucoes" data-scene="solucoes" className={`${wrap} relative scroll-mt-24 py-24`}>
          {has3D && <div aria-hidden data-anchor data-z="-1" className="pointer-events-none absolute top-20 right-[clamp(16px,5.7vw,96px)] hidden size-[220px] lg:block" />}
          <Eyebrow>Soluções</Eyebrow>
          <h2 data-split className={h2}>
            Três frentes para o seu negócio <em className="text-lime">crescer na internet.</em>
          </h2>
          <div data-stagger className="mt-14 grid gap-4 [perspective:1200px] lg:grid-cols-3">
            {SOLUCOES.map((s, i) => (
              <article
                key={s.tag}
                data-tilt
                className={`fx-glare relative flex flex-col rounded-3xl border p-8 backdrop-blur-md transition-[border-color] ${i === 0 ? "border-lime/35 bg-gradient-to-b from-lime/[0.09] to-dark/60" : "border-line bg-dark/60 hover:border-ink/20"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-full border border-lime/30 text-lime">
                    <Icon name={s.icon} className="size-5" />
                  </span>
                  {i === 0 && <span className="rounded-full bg-lime/10 px-3 py-1 text-[11px] font-medium text-lime">Em uso</span>}
                </div>
                <p className="eyebrow mt-8 text-muted">{s.tag}</p>
                <h3 className="mt-3 font-serif text-[30px] leading-[1.05]">{s.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-ink/60">{s.text}</p>
                <ul className="mt-6 space-y-2.5 border-t border-line/70 pt-6 text-sm">
                  {s.items.map((t) => (
                    <li key={t} className="flex items-center gap-2.5 text-ink/80">
                      <Icon name="check" className="size-4 shrink-0 text-lime" /> {t}
                    </li>
                  ))}
                </ul>
                {s.link ? (
                  <Link to={s.link[0]} className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-semibold text-lime hover:underline">
                    {s.link[1]} <Icon name="arrow" className="size-4" />
                  </Link>
                ) : (
                  <a href={ZAP} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-semibold text-ink/80 hover:text-lime">
                    Pedir orçamento <Icon name="arrow" className="size-4" />
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Sistema para restaurantes */}
        <section data-scene="restaurantes" className="border-y border-line/60 bg-dark/30">
          <div className={`${wrap} grid gap-16 py-24 lg:grid-cols-[.9fr_1.1fr] lg:items-center`}>
            <div>
              <Eyebrow>Lexmovi Restaurantes</Eyebrow>
              <h2 data-split className={h2}>
                Do QR da mesa <em className="text-lime">à conta fechada.</em>
              </h2>
              <p className="mt-6 max-w-[520px] text-[16px] leading-[1.7] text-ink/65">
                O cliente pede pelo celular, a cozinha recebe na hora, o garçom fecha a conta com taxa de serviço e divisão. E o
                delivery passa a ser seu, sem comissão por pedido.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/restaurantes" className="btn-lime inline-flex items-center gap-2">
                  Ver todos os recursos <Icon name="arrow" className="size-4" />
                </Link>
                <Link to={DEMO} className="btn-outline inline-flex items-center py-3">
                  Ver um cardápio no ar
                </Link>
              </div>
            </div>
            <div data-reveal className="relative">
              {has3D && <div aria-hidden data-anchor data-z="-1" className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[64%] -translate-x-1/2 -translate-y-1/2" />}
              <div className="relative">
                <KitchenPreview />
              </div>
            </div>
          </div>
          <div className={`${wrap} pb-24`}>
            <ul data-stagger className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line/70 sm:grid-cols-2 lg:grid-cols-3">
              {RESTAURANTE.map(([icon, title, text]) => (
                <li key={title} data-glow className="fx-glow relative bg-green/90 p-8 backdrop-blur transition-colors hover:bg-dark/90">
                  <Icon name={icon} className="size-5 text-lime" />
                  <p className="mt-5 font-serif text-2xl">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Diagnóstico gratuito */}
        <section id="diagnostico" data-scene="diagnostico" className={`${wrap} grid scroll-mt-24 gap-16 py-24 lg:grid-cols-2 lg:items-center`}>
          <div>
            <Eyebrow>Diagnóstico gratuito</Eyebrow>
            <h2 data-split className={h2}>
              A gente mostra onde o seu negócio <em className="text-lime">perde cliente.</em>
            </h2>
            <p className="mt-6 max-w-[520px] text-[16px] leading-[1.7] text-ink/65">
              Antes de oferecer qualquer coisa, olhamos a sua presença online como o seu cliente vê: no Google, no Instagram, no
              site e na hora de pedir. Você recebe o resultado, sem compromisso.
            </p>
            <a href={ZAP_DIAGNOSTICO} target="_blank" rel="noreferrer" className="btn-lime mt-9 inline-flex items-center gap-2">
              <Icon name="chat" className="size-4" /> Pedir meu diagnóstico
            </a>
          </div>
          <div data-reveal className="relative">
            {has3D && <div aria-hidden data-anchor data-z="-1" data-burst="1" className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[92%] -translate-x-1/2 -translate-y-1/2" />}
            <div aria-hidden className="absolute -inset-8 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-lime)_12%,transparent),transparent)]" />
            <div className="relative rounded-3xl border border-line bg-dark/70 p-7 backdrop-blur-md shadow-[0_50px_100px_-40px_rgba(0,0,0,.9)] sm:p-9">
              <div className="flex items-center justify-between">
                <p className="font-serif text-2xl">Diagnóstico</p>
                <span className="text-[11px] text-muted">exemplo</span>
              </div>
              <ul className="mt-6 divide-y divide-line/70">
                {DIAGNOSTICO.map(([k, v, ok]) => (
                  <li key={k} className="flex items-center gap-4 py-4">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ${ok ? "bg-emerald-300/10 text-emerald-300 ring-emerald-300/30" : "bg-amber-200/10 text-amber-200 ring-amber-200/30"}`}>
                      <Icon name={ok ? "check" : "alert"} className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{k}</span>
                      <span className="block text-xs text-muted">{v}</span>
                    </span>
                    <span className={`ml-auto shrink-0 text-[11px] font-medium ${ok ? "text-emerald-300" : "text-amber-200"}`}>{ok ? "Certo" : "Melhorar"}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Como trabalhamos */}
        <section id="como-trabalhamos" data-scene="como" className="scroll-mt-24 border-y border-line/60 bg-dark/30">
          <div className={`${wrap} py-24`}>
            <Eyebrow>Como trabalhamos</Eyebrow>
            <h2 data-split className={h2}>
              Do primeiro contato <em className="text-lime">ao sistema no ar.</em>
            </h2>
            <div className="relative mt-14">
              {has3D && <div aria-hidden data-anchor data-z="-2" className="pointer-events-none absolute top-1/2 left-1/2 hidden aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 lg:block" />}
              <ol data-stagger className="relative grid gap-4 [perspective:1200px] md:grid-cols-2 lg:grid-cols-4">
                {PASSOS.map(([title, text], i) => (
                  <li key={title} data-tilt className="fx-glare relative rounded-3xl border border-line bg-green/70 p-8 backdrop-blur-md">
                    <span className="font-serif text-6xl text-lime italic">{String(i + 1).padStart(2, "0")}</span>
                    <p className="mt-6 font-serif text-2xl">{title}</p>
                    <p className="mt-3 text-sm leading-relaxed text-ink/60">{text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Segurança */}
        <section data-scene="seguranca" className={`${wrap} py-24`}>
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div>
              <Eyebrow>Segurança</Eyebrow>
              <h2 data-split className={h2}>
                Seus dados <em className="text-lime">são seus.</em>
              </h2>
              <p className="mt-6 max-w-md text-[16px] leading-[1.7] text-ink/65">
                Os seus clientes, pedidos e números ficam com você, protegidos e com cópia de segurança todos os dias.
              </p>
              {has3D && <div aria-hidden data-anchor className="pointer-events-none mt-12 hidden aspect-square w-[44%] lg:block" />}
            </div>
            <ul data-stagger className="grid gap-4 sm:grid-cols-2">
              {SEGURANCA.map(([icon, title, text]) => (
                <li key={title} data-glow className="fx-glow relative rounded-2xl border border-line bg-dark/60 p-6 backdrop-blur-md">
                  <Icon name={icon} className="size-5 text-lime" />
                  <p className="mt-4 font-medium">{title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Sobre */}
        <section id="sobre" className="scroll-mt-24 border-y border-line/60 bg-cream text-dark">
          <div className={`${wrap} grid gap-14 py-24 lg:grid-cols-[1.1fr_.9fr] lg:items-center`}>
            <div>
              <Eyebrow className="text-olive">Sobre a Lexmovi</Eyebrow>
              <h2 data-split className={h2}>
                De perto, <em className="text-olive">para quem está perto.</em>
              </h2>
              <div className="mt-7 max-w-[580px] space-y-4 text-[16px] leading-[1.75] text-[#5b554b]">
                <p>
                  A Lexmovi nasceu em Barueri, olhando para os negócios do bairro: restaurantes lotados em que, mesmo assim, o
                  dono via o lucro ir embora em comissão de aplicativo, comanda perdida e cliente esperando.
                </p>
                <p>
                  Os sistemas que existiam eram caros, complicados ou feitos para rede grande. Então criamos o nosso: simples para
                  a equipe, com a marca do cliente e com suporte de quem fez.
                </p>
              </div>
            </div>
            <figure className="rounded-3xl border border-[#e2dccf] bg-card p-10">
              <blockquote className="font-serif text-[clamp(28px,3vw,40px)] leading-[1.1]">
                “Antes de oferecer qualquer coisa, eu olho como o seu negócio funciona. Depois te digo, com sinceridade, o que faz
                diferença.”
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-full bg-dark font-serif text-xl text-lime">J</span>
                <span>
                  <span className="block font-medium">John</span>
                  <span className="text-sm text-[#7a7266]">Fundador · Lexmovi Sistemas</span>
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Perguntas */}
        <section id="perguntas" data-scene="perguntas" className={`${wrap} grid scroll-mt-24 gap-12 py-24 lg:grid-cols-[.8fr_1.2fr]`}>
          <div>
            <Eyebrow>Perguntas frequentes</Eyebrow>
            <h2 data-split className={h2}>
              Antes de <em className="text-lime">conversar.</em>
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink/60">Não achou o que procurava? Pergunte direto no WhatsApp.</p>
            {has3D && <div aria-hidden data-anchor className="pointer-events-none mt-14 hidden aspect-square w-[44%] lg:block" />}
          </div>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-serif text-[22px] leading-snug">
                  {q}
                  <Icon name="plus" className="size-4 shrink-0 text-lime transition group-open:rotate-45" />
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/65">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Chamada final */}
        <section data-scene="final" className={`${wrap} pb-24`}>
          <div data-reveal className="relative overflow-hidden rounded-[32px] border border-line bg-dark/35 px-5 py-14 sm:px-16 sm:py-20">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_srgb,var(--color-lime)_20%,transparent),transparent_60%)]" />
            <div className="relative grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
              <div>
                <h2 data-split className="max-w-2xl font-serif text-[clamp(38px,5vw,72px)] leading-[1]">
                  Vamos colocar o seu negócio <em className="text-lime">para mover?</em>
                </h2>
                <p className="mt-6 max-w-lg text-[16px] leading-[1.7] text-ink/65">
                  Conte o que você precisa. A gente responde pelo WhatsApp, faz o diagnóstico e te manda um orçamento sob medida.
                </p>
                <a data-magnetic href={ZAP} target="_blank" rel="noreferrer" className="btn-lime mt-9 inline-flex items-center gap-2 px-6 py-3.5">
                  <Icon name="chat" className="size-4" /> Iniciar conversa
                </a>
              </div>
              <div>
                {has3D && <div aria-hidden data-anchor className="pointer-events-none mx-auto mb-10 hidden aspect-square w-[62%] lg:block" />}
                <SlugForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* No celular sobra espaço no fim para o botão flutuante do WhatsApp não cobrir os links do rodapé. */}
      <div className="relative z-[1] bg-green pb-20 sm:pb-0">
        <SiteFooter />
      </div>

      {/* WhatsApp sempre à mão no celular */}
      <a
        href={ZAP}
        target="_blank"
        rel="noreferrer"
        aria-label="Falar no WhatsApp"
        className="fixed right-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full bg-lime text-dark shadow-[0_20px_40px_-12px_rgba(0,0,0,.7)] transition hover:brightness-105 sm:hidden"
      >
        <Icon name="chat" className="size-6" />
      </a>
    </div>
  );
}
