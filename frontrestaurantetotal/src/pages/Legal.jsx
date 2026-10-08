import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Footer, Topbar } from '../components/ui'
import { useTenant } from '../lib/tenant'

// Quem opera a plataforma. Preencha antes de vender (e peça para um advogado revisar os textos abaixo).
const OPERATOR = {
  name: 'Restaurante Total', // razão social ou seu nome completo
  doc: '[CNPJ ou CPF]',
  email: '[seu e-mail de contato]',
  city: '[cidade/UF]',
}
const UPDATED = '03/10/2026'

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="font-serif text-2xl text-lime">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink/80">{children}</div>
    </section>
  )
}

function Page({ title, children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-[clamp(16px,5.7vw,96px)] py-12">
        <p className="eyebrow text-lime">Atualizado em {UPDATED}</p>
        <h1 className="mt-3 font-serif text-4xl">{title}</h1>
        {children}
        <p className="mt-10 text-xs text-muted">
          Veja também: <Link className="underline" to="/termos">Termos de uso</Link> ·{' '}
          <Link className="underline" to="/privacidade">Política de privacidade</Link>
        </p>
      </main>
      <Footer />
    </div>
  )
}

export function Terms() {
  return (
    <Page title="Termos de uso">
      <Section title="1. Quem somos">
        <p>
          O Restaurante Total é uma plataforma de cardápio digital, pedidos e gestão para restaurantes, operada por {OPERATOR.name} (
          {OPERATOR.doc}). Cada restaurante que usa a plataforma é um negócio independente e responsável pelos produtos, preços, preparo,
          entrega e atendimento.
        </p>
      </Section>
      <Section title="2. Para quem faz pedidos">
        <p>
          Ao fazer um pedido, você contrata diretamente o restaurante. Valores, disponibilidade, prazos, taxas de entrega e formas de
          pagamento são definidos por ele. Dúvidas, trocas e reclamações sobre o pedido devem ser tratadas com o restaurante, pelos contatos
          exibidos no cardápio.
        </p>
        <p>Você se compromete a informar dados verdadeiros (nome, telefone e endereço) e a não fazer pedidos falsos ou abusivos.</p>
      </Section>
      <Section title="3. Para restaurantes">
        <p>
          O restaurante é responsável pelo conteúdo que publica (cardápio, fotos, preços, chave Pix), pelas senhas da sua equipe e pelo uso
          dos dados dos seus clientes conforme a Lei Geral de Proteção de Dados (LGPD). A assinatura, os valores e as condições de
          cancelamento seguem o combinado na contratação. A falta de pagamento pode levar à suspensão do cardápio, sem apagar os dados.
        </p>
      </Section>
      <Section title="4. Disponibilidade">
        <p>
          Trabalhamos para manter a plataforma no ar, mas ela pode ficar indisponível por manutenção ou falhas de terceiros (internet,
          hospedagem). Não respondemos por lucros cessantes decorrentes dessas interrupções.
        </p>
      </Section>
      <Section title="5. Alterações e foro">
        <p>
          Estes termos podem ser atualizados; a data acima indica a última versão. Fica eleito o foro de {OPERATOR.city}. Contato:{' '}
          {OPERATOR.email}.
        </p>
      </Section>
    </Page>
  )
}

export function Privacy() {
  return (
    <Page title="Política de privacidade">
      <Section title="Quem cuida dos seus dados">
        <p>
          O <strong>restaurante</strong> em que você faz o pedido é o controlador dos seus dados: ele decide como usá-los para preparar,
          entregar e falar com você sobre o pedido. A plataforma Restaurante Total ({OPERATOR.name}, {OPERATOR.doc}) é a operadora: guarda e
          processa os dados em nome do restaurante, seguindo esta política.
        </p>
      </Section>
      <Section title="Quais dados coletamos">
        <p>
          <strong>Clientes:</strong> nome, telefone, endereço de entrega e referência (só em retirada e delivery), itens do pedido,
          observações, forma de pagamento escolhida, avaliação e o número da mesa. Não coletamos dados de cartão: o pagamento é feito
          direto ao restaurante.
        </p>
        <p>
          <strong>Equipe dos restaurantes:</strong> nome, usuário e senha (guardada de forma criptografada, que nem nós conseguimos ler).
        </p>
        <p>Também registramos dados técnicos mínimos, como endereço IP, para proteger contra fraudes e tentativas de invasão.</p>
      </Section>
      <Section title="Para que usamos">
        <p>
          Para receber, preparar, entregar e acompanhar o pedido; avisar sobre o andamento (inclusive por WhatsApp, quando o restaurante
          usa esse recurso); gerar relatórios de vendas para o restaurante; e manter a segurança do sistema. Base legal: execução do
          contrato (o seu pedido) e legítimo interesse (segurança e prevenção a fraudes).
        </p>
      </Section>
      <Section title="Com quem compartilhamos">
        <p>
          Só com o restaurante do pedido e com os serviços necessários para o sistema funcionar: hospedagem (Vercel, Render), banco de
          dados (Neon), consulta de CEP (ViaCEP) e, quando ativado pelo restaurante, a API do WhatsApp (Meta). Não vendemos dados.
        </p>
      </Section>
      <Section title="Por quanto tempo">
        <p>
          Os pedidos ficam guardados enquanto o restaurante usa a plataforma, para relatórios e obrigações legais. Se o restaurante cancelar
          a assinatura, os dados podem ser exportados por ele e são apagados depois de 90 dias.
        </p>
      </Section>
      <Section title="Seus direitos">
        <p>
          Você pode pedir acesso, correção ou exclusão dos seus dados. Fale primeiro com o restaurante (pelos contatos do cardápio) ou com a
          plataforma em {OPERATOR.email}; respondemos em até 15 dias.
        </p>
      </Section>
    </Page>
  )
}

// ---------- Páginas do restaurante (/r/<slug>/termos e /privacidade) ----------

const RESTAURANT_UPDATED = '08/10/2026'

/** Contatos do restaurante, como aparecem no cardápio. */
function contactsOf(info) {
  return [
    info.address && ['Endereço', info.address],
    info.phone && ['Telefone', info.phone],
    info.whatsapp && ['WhatsApp', info.whatsapp],
    info.instagram && ['Instagram', `@${info.instagram.replace(/^@/, '')}`],
  ].filter(Boolean)
}

function RestaurantPage({ title, children }) {
  const { info, to } = useTenant()
  const contacts = contactsOf(info)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' }) // vindo do rodapé, abre no topo
  }, [title])
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar brand={info} to={to()} compact />
      <main className="mx-auto w-full max-w-3xl flex-1 px-[clamp(16px,5.7vw,96px)] py-12">
        <p className="eyebrow text-lime">
          {info.name} · atualizado em {RESTAURANT_UPDATED}
        </p>
        <h1 className="mt-3 font-serif text-4xl">{title}</h1>
        {children}
        {contacts.length > 0 && (
          <Section title="Fale com a gente">
            <ul className="space-y-1">
              {contacts.map(([label, value]) => (
                <li key={label}>
                  <strong className="text-ink">{label}:</strong> {value}
                </li>
              ))}
            </ul>
          </Section>
        )}
        <p className="mt-10 text-xs text-muted">
          <Link className="underline" to={to()}>
            Voltar ao cardápio
          </Link>{' '}
          · <Link className="underline" to={to('/termos')}>Termos de uso</Link> ·{' '}
          <Link className="underline" to={to('/privacidade')}>Política de privacidade</Link>
        </p>
      </main>
      <Footer name={info.name} legalBase={to()} />
    </div>
  )
}

export function RestaurantTerms() {
  const { info } = useTenant()
  return (
    <RestaurantPage title="Termos de uso">
      <Section title="1. Sobre os pedidos">
        <p>
          Este cardápio digital é do <strong className="text-ink">{info.name}</strong>. Ao fazer um pedido, você compra diretamente do restaurante,
          pelos preços, taxas e prazos mostrados no cardápio no momento do pedido.
        </p>
      </Section>
      <Section title="2. Mesa, retirada e delivery">
        <p>
          Pedidos feitos pelo QR code da mesa entram na conta da mesa e são pagos no fechamento. Pedidos de retirada e delivery são pagos
          pela forma escolhida (Pix, cartão ou dinheiro). Os tempos de preparo e entrega são estimativas.
        </p>
      </Section>
      <Section title="3. Seus dados no pedido">
        <p>
          Informe nome, telefone e endereço verdadeiros. Pedidos falsos ou trotes podem ser cancelados e o telefone pode ser bloqueado
          para novos pedidos pelo site.
        </p>
      </Section>
      <Section title="4. Cancelamentos e problemas">
        <p>
          Se algo der errado com o seu pedido, fale com o restaurante pelos contatos do restaurante o quanto antes. Itens já em preparo podem não
          ser cancelados.
        </p>
      </Section>
    </RestaurantPage>
  )
}

export function RestaurantPrivacy() {
  const { info } = useTenant()
  return (
    <RestaurantPage title="Política de privacidade">
      <Section title="Quem cuida dos seus dados">
        <p>
          O <strong className="text-ink">{info.name}</strong> é o responsável pelos dados que você informa ao pedir por este cardápio, conforme a Lei
          Geral de Proteção de Dados (LGPD).
        </p>
      </Section>
      <Section title="O que coletamos e para quê">
        <p>
          Nome, telefone e, no delivery, o endereço de entrega, além dos itens e observações do pedido. Usamos só para preparar, entregar e
          avisar você sobre o pedido (inclusive pelo WhatsApp). Não pedimos nem guardamos dados de cartão.
        </p>
      </Section>
      <Section title="Com quem compartilhamos">
        <p>
          Com ninguém para fins de propaganda. Os dados ficam no sistema de pedidos que usamos (hospedagem em nuvem) e, no delivery, o
          endereço vai para quem faz a entrega.
        </p>
      </Section>
      <Section title="Seus direitos">
        <p>Você pode pedir para ver, corrigir ou apagar seus dados a qualquer momento pelos contatos do restaurante.</p>
      </Section>
    </RestaurantPage>
  )
}
