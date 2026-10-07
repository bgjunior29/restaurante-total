import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Footer, Topbar } from "../components/ui";
import { slugify } from "../lib/format";

const FEATURES = [
  [
    "utensils",
    "QR code na mesa",
    "O cliente pede pelo celular e cada rodada entra na conta da mesa, sem esperar o garçom.",
  ],
  [
    "receipt",
    "Conta e taxa de serviço",
    "Divisão por pessoa, pedido de conta e chamado do garçom com um toque.",
  ],
  [
    "clock",
    "Tela da cozinha",
    "Fila por estação, com o tempo de cada pedido e alerta de atraso.",
  ],
  [
    "scooter",
    "Delivery e retirada",
    "CEP automático, taxa de entrega, pedido mínimo, troco e cupons.",
  ],
  [
    "chat",
    "WhatsApp",
    "O cliente acompanha cada etapa do pedido, com mensagem pronta ou envio automático.",
  ],
  [
    "star",
    "Inteligência",
    "Horário de pico, previsão do dia, combos que vendem juntos e estoque baixo.",
  ],
];

/** Prévia ilustrativa do painel: mostra o produto sem depender de dados reais. */
function PanelPreview() {
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

/** Página inicial do produto: apresenta o sistema e leva ao restaurante (pelo endereço), à calculadora ou à plataforma. */
export default function Landing() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar>
        <Link
          to="/economia"
          className="hidden text-[13px] text-muted transition hover:text-ink sm:inline"
        >
          Calculadora de economia
        </Link>
        <Link to="/plataforma" className="btn-outline">
          Entrar
        </Link>
      </Topbar>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-[1280px] items-center gap-16 px-[clamp(16px,5.7vw,96px)] pt-16 pb-20 lg:grid-cols-[1.05fr_.95fr] lg:pt-24">
          <div>
            <p className="eyebrow flex items-center gap-3 text-lime">
              <span className="h-px w-8 bg-lime/60" />
              Plataforma para restaurantes
            </p>
            <h1 className="mt-7 font-serif text-[clamp(46px,6.4vw,96px)] leading-[.95]">
              Do QR da mesa
              <br />
              <em className="text-lime">à conta fechada.</em>
            </h1>
            <p className="mt-7 max-w-[520px] text-[16px] leading-[1.7] text-ink/65">
              Salão, cozinha e delivery numa operação só. O cliente pede pelo
              celular, a cozinha recebe na hora e o garçom fecha a conta com
              taxa de serviço e divisão. Cada restaurante com a sua marca, o seu
              cardápio e os seus números.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/economia"
                className="btn-lime inline-flex items-center gap-2"
              >
                Calcule sua economia <Icon name="arrow" className="size-4" />
              </Link>
            </div>
            <form
              className="mt-12 max-w-md"
              onSubmit={(e) => {
                e.preventDefault();
                const s = slugify(slug);
                if (s) navigate(`/r/${s}`);
              }}
            >
              <label className="label" htmlFor="slug">
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
          </div>
          <PanelPreview />
        </section>

        <section className="mx-auto max-w-[1280px] px-[clamp(16px,5.7vw,96px)] py-24">
          <p className="eyebrow flex items-center gap-3 text-lime">
            <span className="h-px w-8 bg-lime/60" />
            Tudo em um só lugar
          </p>
          <h2 className="mt-5 max-w-2xl font-serif text-[clamp(34px,4vw,56px)] leading-[1.02]">
            Feito para a rotina de quem{" "}
            <em className="text-lime">serve bem.</em>
          </h2>
          <ul className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line/70 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([icon, title, text]) => (
              <li key={title} className="bg-green p-8 transition hover:bg-dark">
                <span className="flex size-10 items-center justify-center rounded-full border border-lime/30 text-lime">
                  <Icon name={icon} className="size-[18px]" />
                </span>
                <p className="mt-6 font-serif text-2xl">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">
                  {text}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-[1280px] px-[clamp(16px,5.7vw,96px)] pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-dark px-8 py-14 text-center sm:px-16">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-lime)_14%,transparent),transparent_60%)]" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-serif text-[clamp(32px,4vw,52px)] leading-[1.05]">
                Quanto a comissão dos aplicativos{" "}
                <em className="text-lime">custa para você?</em>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm text-ink/60">
                No canal próprio não existe comissão por pedido. Faça a conta
                com os números do seu restaurante.
              </p>
              <Link
                to="/economia"
                className="btn-lime mt-8 inline-flex items-center gap-2"
              >
                Abrir a calculadora <Icon name="arrow" className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
