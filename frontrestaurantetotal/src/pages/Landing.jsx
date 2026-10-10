import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Footer, Topbar } from "../components/ui";
import { slugify } from "../lib/format";

// Ajuste antes de publicar: número de vendas (DDI + DDD + número, só dígitos).
export const WHATSAPP_VENDAS = "5500000000000";
export const whatsapp = (text) =>
  `https://wa.me/${WHATSAPP_VENDAS}?text=${encodeURIComponent(text)}`;
const ZAP = whatsapp("Oi! Vi o site da Movitech e quero conversar sobre um sistema para o meu negócio.");

// Formas de pagamento aceitas nos sistemas Movitech (faixa rolando abaixo do topo).
const PAYMENTS = ["Pix", "Visa", "Mastercard", "Elo", "American Express", "Dinheiro"];

// Diferenciais da Movitech, em lista com check.
const DIFERENCIAIS = [
  ["SaaS e multi-sistemas", "várias empresas, cada uma com seus dados, equipe e marca."],
  ["Links prontos", "cardápio, catálogo, pedidos e agendamentos para o Instagram, WhatsApp e Google."],
  ["Apps sem download", "abrem direto no celular, com painel para a equipe e para o dono."],
  ["Sem comissão por pedido", "o cliente compra direto de você."],
  ["Inteligência do negócio", "horário de pico, previsão do dia e estoque baixo."],
  ["Suporte contínuo", "acompanhamento de perto, do primeiro acesso em diante."],
];

/** Prévia ilustrativa do painel: mostra o produto sem depender de dados reais. */
export function PanelPreview() {
  const orders = [
    [
      "Mesa 07",
      "Em preparo",
      "2× Risoto de Cogumelos",
      "R$ 119,80",
      "text-amber-100 ring-amber-200/25 bg-amber-200/[0.06]",
    ],
    [
      "Delivery",
      "Saiu para entrega",
      "1× Picanha na Chapa",
      "R$ 97,90",
      "text-violet-200 ring-violet-300/25 bg-violet-300/[0.06]",
    ],
    [
      "Mesa 12",
      "Pronto",
      "3× Caipirinha",
      "R$ 68,70",
      "text-emerald-200 ring-emerald-300/30 bg-emerald-300/[0.07]",
    ],
  ];
  return (
    <div aria-hidden className="relative">
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
            <li
              key={where}
              className="flex items-center justify-between gap-3 rounded-xl border border-line/80 bg-panel/50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-serif text-lg leading-tight">{where}</p>
                <p className="truncate text-[11px] text-muted">{item}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${tone}`}
                >
                  {status}
                </span>
                <span className="text-xs tabular-nums">{total}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Página inicial da Movitech, no formato de página de negócio: topo em tela cheia, faixa de pagamento,
 *  apresentação, diferenciais, onde atende e chamada final para conversar. */
export default function Landing() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <Topbar>
        <a href="#diferenciais" className="hidden text-[13px] text-muted transition hover:text-ink sm:inline">
          Diferenciais
        </a>
        <Link to="/plataforma" className="btn-outline">
          Entrar
        </Link>
      </Topbar>

      <main className="flex flex-1 flex-col gap-3 overflow-x-clip p-3 sm:gap-4 sm:p-4">
        {/* Topo em tela cheia */}
        <section className="relative flex min-h-[min(calc(100svh-100px),820px)] overflow-hidden rounded-2xl bg-dark p-8 md:p-12">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,color-mix(in_srgb,var(--color-lime)_28%,transparent),transparent_55%),radial-gradient(ellipse_at_0%_100%,color-mix(in_srgb,var(--color-olive)_30%,transparent),transparent_60%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[.07] [background-image:linear-gradient(var(--color-ink)_1px,transparent_1px),linear-gradient(90deg,var(--color-ink)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
          />
          <div className="relative z-10 flex max-w-2xl flex-col gap-6">
            <p className="text-lg font-medium text-ink/90">Sistemas · SaaS, links e apps</p>
            <h1 className="max-w-xl text-6xl leading-none font-black tracking-tight md:text-8xl">
              Movi<span className="text-lime">tech</span>
            </h1>
            <p className="mt-auto max-w-xl text-lg leading-relaxed text-ink/80">
              Sistemas que movem o seu negócio, sem achismo. Soluções sob medida, com a sua marca, do QR da mesa ao delivery.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={ZAP}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-ink px-6 py-4 font-semibold text-dark transition hover:brightness-95"
              >
                Falar com especialista
              </a>
              <a href="#apresentacao" aria-label="Rolar para baixo" className="px-3 text-2xl text-ink/70 hover:text-ink">
                <Icon name="arrow" className="size-6 rotate-90" />
              </a>
            </div>
          </div>
        </section>

        {/* Faixa de pagamento */}
        <section aria-label="Pagamento seguro" className="flex items-center gap-4 overflow-hidden px-4 py-8 sm:px-12">
          <span className="flex shrink-0 items-center gap-2 rounded-full border border-lime/30 px-4 py-2 text-xs font-semibold text-lime">
            <Icon name="check" className="size-4" /> Pagamento seguro
          </span>
          <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <ul aria-hidden className="flex w-max animate-[marquee_28s_linear_infinite] gap-3">
              {[...PAYMENTS, ...PAYMENTS, ...PAYMENTS, ...PAYMENTS].map((p, i) => (
                <li key={i} className="rounded-lg border border-line bg-dark px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink/80">
                  {p}
                </li>
              ))}
            </ul>
            <p className="sr-only">Aceitamos {PAYMENTS.join(", ")}.</p>
          </div>
        </section>

        {/* Apresentação */}
        <section id="apresentacao" className="grid scroll-mt-24 grid-cols-1 items-center gap-8 rounded-2xl bg-dark p-8 md:grid-cols-2 md:p-12">
          <div className="flex flex-col gap-6">
            <h2 className="text-5xl leading-none font-black md:text-7xl">Excelência em sistemas</h2>
            <p className="max-w-2xl text-xl leading-relaxed text-muted">
              Uma plataforma para solução de sistemas e multi-sistemas. A primeira já está rodando em restaurantes: salão, cozinha e delivery numa operação só.
            </p>
            <p className="text-2xl font-black">
              Movi<span className="text-lime">tech</span>
            </p>
          </div>
          <PanelPreview />
        </section>

        {/* Diferenciais */}
        <section id="diferenciais" className="scroll-mt-24 rounded-2xl bg-dark px-8 py-16 md:px-12 md:py-24">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-bold tracking-widest text-muted uppercase">Por que a Movitech</p>
            <h2 className="text-4xl leading-tight font-black">Nossos diferenciais</h2>
            <ul className="flex flex-col gap-4">
              {DIFERENCIAIS.map(([title, text]) => (
                <li key={title} className="flex items-start gap-3 text-xl leading-relaxed md:text-2xl">
                  <Icon name="check" className="mt-1.5 size-6 shrink-0 text-lime" />
                  <span>
                    <span className="font-bold">{title}</span> <span className="text-ink/60">— {text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Onde atende + acesso do cliente */}
        <section className="grid grid-cols-1 gap-8 px-8 py-16 md:grid-cols-2 md:px-12 md:py-24">
          <div className="flex flex-col justify-center gap-4">
            <p className="text-sm font-bold tracking-widest text-muted uppercase">Onde atendemos</p>
            <h2 className="text-4xl leading-tight font-black">Todo o Brasil, 100% online</h2>
            <p className="text-lg leading-relaxed text-muted">
              Os sistemas rodam na nuvem e abrem em qualquer celular, tablet ou computador. Implantação e suporte a distância.
            </p>
            <Link to="/restaurantes" className="inline-flex items-center gap-2 font-semibold text-lime hover:underline">
              Conheça o sistema para restaurantes <Icon name="arrow" className="size-4" />
            </Link>
          </div>
          <form
            className="flex flex-col justify-center gap-3 rounded-2xl border border-line bg-dark p-8"
            onSubmit={(e) => {
              e.preventDefault();
              const s = slugify(slug);
              if (s) navigate(`/r/${s}`);
            }}
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-lime/10 text-lime">
              <Icon name="pin" className="size-5" />
            </span>
            <label className="text-lg font-bold" htmlFor="slug">
              Já é cliente? Abra o seu restaurante
            </label>
            <div className="flex gap-2">
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
        </section>

        {/* Chamada final */}
        <section className="flex flex-col gap-10 rounded-2xl bg-lime p-8 text-dark md:p-12">
          <div className="flex items-start justify-between gap-6">
            <h2 className="text-5xl leading-none font-black md:text-8xl">Entre em contato</h2>
            <Icon name="chat" className="size-12 shrink-0 md:size-16" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-md text-lg leading-relaxed text-dark/75">
              Conte o que o seu negócio precisa. A gente responde pelo WhatsApp.
            </p>
            <a
              href={ZAP}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-dark px-6 py-4 font-semibold text-ink transition hover:brightness-125"
            >
              Iniciar conversa <Icon name="arrow" className="size-4" />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
