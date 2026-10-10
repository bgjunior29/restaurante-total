import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { Footer, Topbar } from "../components/ui";
import { PanelPreview, whatsapp } from "./Landing";

// Ajuste antes de publicar: restaurante de demonstração (o WhatsApp de vendas fica em Landing.jsx).
const DEMO = "/r/point-arena";
const PRECO = "R$ 199";

const ZAP_DEMO = whatsapp(
  "Oi! Vi a página da Movitech e quero ver o sistema funcionando no meu restaurante.",
);

const PAINS = [
  "Pagar uma porcentagem de cada pedido para o aplicativo de delivery.",
  "Cliente levantando a mão no salão e ninguém vendo.",
  "Comanda de papel perdida e prato saindo atrasado.",
  "Confusão para dividir a conta no fim da noite.",
  "Fechar o mês sem saber quanto vendeu, o que vendeu e quando lotou.",
];

const STEPS = [
  [
    "A gente monta tudo",
    "Cadastramos o seu cardápio com fotos, adicionais e preços, e entregamos os QR codes das mesas prontos para imprimir.",
  ],
  [
    "Seu cliente pede",
    "Na mesa, pelo QR code. Em casa, pelo seu link de delivery, que você divulga no Instagram e no WhatsApp.",
  ],
  [
    "Sua equipe entrega",
    "O pedido aparece na hora na tela da cozinha e no painel do garçom. O cliente acompanha cada etapa.",
  ],
];

const FEATURES = [
  [
    "utensils",
    "QR code na mesa",
    "O cliente pede pelo celular e cada rodada entra na conta da mesa. Chama o garçom e pede a conta com um toque.",
  ],
  [
    "scooter",
    "Delivery e retirada próprios",
    "Seu link, sua marca. CEP automático, taxa de entrega, frete grátis acima de um valor, pedido mínimo e troco.",
  ],
  [
    "receipt",
    "Pix e cupons",
    "Receba no Pix e crie cupons de % ou R$, com validade e limite de uso.",
  ],
  [
    "clock",
    "Tela da cozinha",
    "Fila por estação (cozinha, bar, confeitaria) com cronômetro e alerta de atraso.",
  ],
  [
    "hand",
    "Conta da mesa",
    "Taxa de serviço, divisão por pessoa e mapa do salão com mesas livres, ocupadas e pedindo a conta.",
  ],
  [
    "chat",
    "WhatsApp",
    "O cliente recebe aviso a cada etapa: confirmado, em preparo, saiu para entrega.",
  ],
  [
    "bag",
    "Estoque",
    'Dá baixa sozinho a cada pedido, avisa "últimas unidades" e tira do cardápio quando acaba.',
  ],
  [
    "star",
    "Inteligência",
    "Previsão do dia, horário de pico, combos que vendem juntos e produtos parados.",
  ],
  [
    "layers",
    "Equipe",
    "Perfis para administrador, garçom/caixa e cozinha: cada um vê só o que precisa.",
  ],
];

const COMPARE = [
  ["Custo", "% sobre cada pedido", `${PRECO}/mês fixo`],
  ["Dados do cliente", "Ficam no aplicativo", "Ficam com você"],
  ["Marca", "A do aplicativo", "A sua"],
  ["Cupons e promoções", "Regras do aplicativo", "Você decide"],
];

// Confirme cada item antes de publicar (fidelidade e implantação dependem da oferta escolhida).
const INCLUDED = [
  "Salão, cozinha e delivery",
  "Sem comissão por pedido",
  "Pedidos e equipe sem limite",
  "Avisos pelo WhatsApp",
  "Relatórios e inteligência",
  "Backup diário dos seus dados",
];

const FAQ = [
  [
    "Preciso de computador ou equipamento especial?",
    "Não. Funciona no navegador de qualquer celular, tablet ou computador.",
  ],
  [
    "Meu cliente precisa baixar aplicativo?",
    "Não. Ele aponta a câmera para o QR code ou toca no link, e o cardápio abre.",
  ],
  [
    "Posso continuar no aplicativo de delivery?",
    "Pode, e faz sentido: use o aplicativo para ser descoberto e o seu link para os clientes que já te conhecem.",
  ],
  [
    "Como começo?",
    "Chama no WhatsApp e manda o seu cardápio (foto ou PDF). A gente monta e te mostra como ele fica antes de você decidir.",
  ],
  [
    "Meus dados ficam seguros?",
    "Cada restaurante tem os seus dados separados, com backup diário criptografado e termos de privacidade conforme a LGPD.",
  ],
];

function Eyebrow({ children }) {
  return (
    <p className="eyebrow flex items-center gap-3 text-lime">
      <span className="h-px w-8 bg-lime/60" />
      {children}
    </p>
  );
}

function ZapButton({ children = "Quero ver funcionando", className = "" }) {
  return (
    <a
      href={ZAP_DEMO}
      target="_blank"
      rel="noreferrer"
      className={`btn-lime inline-flex items-center gap-2 ${className}`}
    >
      <Icon name="chat" className="size-4" /> {children}
    </a>
  );
}

const wrap = "mx-auto w-full max-w-[1280px] px-[clamp(16px,5.7vw,96px)]";
const h2 =
  "mt-5 max-w-3xl font-serif text-[clamp(34px,4vw,56px)] leading-[1.02]";

/** Página de vendas para donos de restaurante (destino dos anúncios). */
export default function Restaurantes() {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar>
        <a
          href={DEMO}
          className="hidden text-[13px] text-muted transition hover:text-ink sm:inline"
        >
          Ver um cardápio
        </a>
        <a
          href={ZAP_DEMO}
          target="_blank"
          rel="noreferrer"
          className="btn-outline"
        >
          Falar no WhatsApp
        </a>
      </Topbar>

      <main className="flex-1 overflow-x-clip">
        {/* Hero */}
        <section
          className={`${wrap} grid items-center gap-16 pt-16 pb-20 lg:grid-cols-[1.1fr_.9fr] lg:pt-24`}
        >
          <div>
            <Eyebrow>Movitech Restaurantes</Eyebrow>
            <h1 className="mt-7 max-w-4xl font-serif text-[clamp(44px,6.4vw,96px)] leading-[.95]">
              Salão, cozinha e delivery num sistema só.{" "}
              <em className="text-lime">Sem comissão por pedido.</em>
            </h1>
            <p className="mt-7 max-w-[600px] text-[16px] leading-[1.7] text-ink/65">
              Seu cliente pede pelo QR code da mesa ou pelo seu link de
              delivery, o pedido cai direto na cozinha e você acompanha tudo em
              tempo real. Por {PRECO}/mês, preço fixo.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ZapButton />
              <Link to={DEMO} className="btn-outline py-3">
                Ver um cardápio de exemplo
              </Link>
            </div>
            <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-muted">
              {[
                "Sem aplicativo para baixar",
                "Funciona no celular",
                "Preço fixo",
              ].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Icon name="check" className="size-3.5 text-lime" /> {t}
                </span>
              ))}
            </p>
          </div>
          <PanelPreview />
        </section>

        {/* Problema */}
        <section className={`${wrap} py-16`}>
          <Eyebrow>Soa familiar?</Eyebrow>
          <h2 className={h2}>
            Se o seu restaurante vive alguma dessas,{" "}
            <em className="text-lime">a gente precisa conversar.</em>
          </h2>
          <ul className="mt-12 grid gap-3 md:grid-cols-2">
            {PAINS.map((p) => (
              <li
                key={p}
                className="flex items-start gap-4 rounded-2xl border border-line bg-dark/60 p-6 text-[15px] leading-relaxed text-ink/80"
              >
                <Icon
                  name="alert"
                  className="mt-0.5 size-5 shrink-0 text-lime"
                />
                {p}
              </li>
            ))}
          </ul>
        </section>

        {/* Como funciona */}
        <section className={`${wrap} py-16`}>
          <Eyebrow>Como funciona</Eyebrow>
          <h2 className={h2}>
            Três passos e o seu restaurante{" "}
            <em className="text-lime">está no ar.</em>
          </h2>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li
                key={title}
                className="rounded-2xl border border-line bg-dark/60 p-8"
              >
                <span className="font-serif text-5xl text-lime">{i + 1}</span>
                <p className="mt-5 font-serif text-2xl">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">
                  {text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Recursos */}
        <section className={`${wrap} py-16`}>
          <Eyebrow>Recursos</Eyebrow>
          <h2 className={h2}>
            Tudo o que o seu restaurante precisa.{" "}
            <em className="text-lime">Nada que ele não use.</em>
          </h2>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line/70 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* A conta */}
        <section className={`${wrap} py-16`}>
          <Eyebrow>Faça a conta</Eyebrow>
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1fr]">
            <div>
              <h2 className={h2}>
                Quanto fica no aplicativo{" "}
                <em className="text-lime">todo mês?</em>
              </h2>
              <p className="mt-7 max-w-[520px] text-[16px] leading-[1.7] text-ink/65">
                Um restaurante que vende{" "}
                <strong className="text-ink">R$ 20 mil por mês</strong> num
                aplicativo com{" "}
                <strong className="text-ink">23% de comissão</strong> deixa{" "}
                <strong className="text-ink">R$ 4.600</strong> lá. Se só 1 em
                cada 5 pedidos passar para o seu link próprio, a economia já é
                de <strong className="text-lime">R$ 920 por mês</strong>: mais
                de 4 vezes o valor da Movitech.
              </p>
              <p className="mt-4 max-w-[520px] text-[13px] leading-relaxed text-muted">
                Exemplo ilustrativo. A comissão varia conforme o aplicativo e o
                plano contratado. Use o aplicativo para ser descoberto e o seu
                link para quem já te conhece.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line">
              <table className="w-full text-left text-[13px] sm:text-sm">
                <thead className="bg-dark text-[10px] tracking-[0.12em] text-muted uppercase sm:text-[11px] sm:tracking-[0.18em]">
                  <tr>
                    <th className="px-3 py-4 sm:px-5 font-medium" />
                    <th className="px-3 py-4 sm:px-5 font-medium">Aplicativo</th>
                    <th className="px-3 py-4 sm:px-5 font-medium text-lime">
                      Movitech
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {COMPARE.map(([k, app, mvt]) => (
                    <tr key={k}>
                      <td className="px-3 py-4 sm:px-5 text-muted">{k}</td>
                      <td className="px-3 py-4 sm:px-5 text-ink/70">{app}</td>
                      <td className="px-3 py-4 sm:px-5 font-medium">{mvt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Preço */}
        <section className={`${wrap} py-16`}>
          <div className="mx-auto max-w-xl rounded-3xl border border-lime/30 bg-dark/70 p-10 text-center shadow-[0_50px_100px_-50px_color-mix(in_srgb,var(--color-lime)_45%,transparent)]">
            <p className="eyebrow text-lime">Um preço. Tudo incluso.</p>
            <p className="mt-6 font-serif text-[clamp(56px,8vw,88px)] leading-none">
              {PRECO}
              <span className="font-sans text-lg text-muted">/mês</span>
            </p>
            <ul className="mx-auto mt-8 grid max-w-sm gap-3 text-left text-sm">
              {INCLUDED.map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <Icon name="check" className="size-4 shrink-0 text-lime" />{" "}
                  {t}
                </li>
              ))}
            </ul>
            <ZapButton className="mt-9">Começar agora</ZapButton>
          </div>
        </section>

        {/* FAQ */}
        <section className={`${wrap} py-16`}>
          <Eyebrow>Perguntas frequentes</Eyebrow>
          <div className="mt-10 max-w-3xl divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl">
                  {q}
                  <Icon
                    name="plus"
                    className="size-4 shrink-0 text-lime transition group-open:rotate-45"
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink/65">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className={`${wrap} pt-12 pb-24 text-center`}>
          <h2 className="mx-auto max-w-3xl font-serif text-[clamp(34px,4.6vw,64px)] leading-[1.02]">
            Seu restaurante organizado{" "}
            <em className="text-lime">a partir desta semana.</em>
          </h2>
          <p className="mx-auto mt-6 max-w-[520px] text-[16px] leading-[1.7] text-ink/65">
            Chama no WhatsApp, manda o seu cardápio e a gente te mostra como ele
            fica na Movitech, sem compromisso.
          </p>
          <ZapButton className="mt-9">Falar no WhatsApp</ZapButton>
        </section>
      </main>
      <Footer />
    </div>
  );
}
