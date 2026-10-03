import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Footer, Topbar } from '../components/ui'
import { slugify } from '../lib/format'

const FEATURES = [
  ['QR code na mesa', 'O cliente pede pelo celular; cada rodada entra na conta da mesa.'],
  ['Conta e taxa de serviço', 'Divisão por pessoa, pedir a conta e chamar o garçom com um toque.'],
  ['Tela da cozinha', 'Fila por estação (cozinha, bar, confeitaria) com tempo de cada pedido.'],
  ['Delivery e retirada', 'CEP automático, taxa de entrega, pedido mínimo, troco e cupons.'],
  ['WhatsApp', 'Avise o cliente a cada etapa, com mensagem pronta ou envio automático.'],
  ['Inteligência', 'Horário de pico, previsão do dia, combos que vendem juntos e estoque baixo.'],
]

/** Página inicial do produto: explica o sistema e leva ao restaurante (pelo endereço) ou à plataforma. */
export default function Landing() {
  const navigate = useNavigate()
  const [slug, setSlug] = useState('')

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar>
        <Link to="/economia" className="hidden text-sm font-semibold text-lime underline-offset-4 hover:underline sm:inline">
          Calcule sua economia
        </Link>
        <Link to="/plataforma" className="btn-outline">
          Plataforma <span className="ml-1">↗</span>
        </Link>
      </Topbar>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-[clamp(16px,5.7vw,96px)] py-16">
        <p className="eyebrow text-lime">✳ &nbsp; Sistema completo para restaurantes</p>
        <h1 className="my-6 font-display text-[clamp(40px,6vw,88px)] leading-[.94] font-bold tracking-[-0.068em]">
          Do QR da mesa
          <br />
          <em className="text-lime not-italic">à conta fechada.</em>
        </h1>
        <p className="max-w-xl leading-[1.65] text-ink/75">
          Salão, cozinha e delivery no mesmo lugar. O cliente pede pelo celular, a cozinha recebe na hora, o garçom fecha a conta
          com taxa de serviço e divisão — e cada restaurante tem a sua marca, o seu cardápio e os seus números.
        </p>
        <form
          className="mt-10 flex max-w-md flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const s = slugify(slug)
            if (s) navigate(`/r/${s}`)
          }}
        >
          <label className="w-full text-xs font-semibold text-muted" htmlFor="slug">
            Já é cliente? Digite o endereço do seu restaurante
          </label>
          <div className="flex min-w-0 flex-1 items-center rounded-xl border border-line bg-green2 pl-4 focus-within:border-lime">
            <span className="text-sm text-muted">/r/</span>
            <input
              id="slug"
              className="min-w-0 flex-1 bg-transparent px-1 py-3 text-ink outline-none"
              placeholder="cantina-da-nonna"
              autoCapitalize="none"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <button className="btn-lime">Abrir →</button>
        </form>
        <Link to="/economia" className="mt-6 inline-block text-sm font-semibold text-lime underline underline-offset-4">
          Quanto você perde em comissão de aplicativo? Calcule aqui →
        </Link>
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, text]) => (
            <li key={title} className="border-t border-line pt-4">
              <p className="font-display font-semibold text-lime">{title}</p>
              <p className="mt-1 text-sm text-ink/70">{text}</p>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  )
}
