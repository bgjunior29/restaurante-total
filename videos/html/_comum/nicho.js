// Motor dos anúncios de nicho da Movitech (HTML puro, sem dependências).
// Cada página define window.NICHO (textos do nicho) e window.VOZ (tempos da narração gerados por scripts/gerar_voz.py)
// e carrega este arquivo. Tudo é função do tempo t: window.seek(t) desenha o quadro exato daquele instante.
;(() => {
  const N = window.NICHO, V = window.VOZ
  const W = 1080, H = 1920, FPS = 30
  const DUR = Math.ceil((V.duracao + 0.4) * FPS) / FPS

  // ---------- tempo e easing ----------
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
  const p = (t, a, b) => cl((t - a) / (b - a))
  const outQ = (x) => 1 - Math.pow(1 - x, 4)
  const inOut = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2)
  const outBack = (x) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2)
  const mola = (s) => (s <= 0 ? 0 : 1 - Math.exp(-7 * s) * Math.cos(11 * s)) // s em segundos
  const lerp = (a, b, x) => a + (b - a) * x

  // ---------- cenas e falas ----------
  const cena = Object.fromEntries(V.cenas.map((c) => [c.cena, c]))
  const ORDEM = ['abertura', 'problema', 'solucao', 'beneficio', 'cta']
  const inicio = (nome) => (nome === 'abertura' ? 0 : cena[nome].de - 0.22)
  const fim = (nome) => { const i = ORDEM.indexOf(nome); return i === ORDEM.length - 1 ? DUR + 1 : inicio(ORDEM[i + 1]) }
  const falas = (nome) => V.legendas.filter((l) => { const m = (l.de + l.ate) / 2; return m >= cena[nome].de - 0.05 && m <= cena[nome].ate + 0.05 })

  // Tempo de cada palavra de uma fala: usa as marcas da voz quando batem com o texto, senão divide proporcionalmente.
  function palavras(l) {
    const ws = l.texto.split(/\s+/).filter(Boolean)
    if (l.palavras && l.palavras.length === ws.length) return ws.map((w, i) => ({ w, de: l.palavras[i].de }))
    const tot = ws.reduce((s, w) => s + w.length + 1, 0)
    let acc = 0
    return ws.map((w) => { const de = l.de + (l.ate - l.de) * (acc / tot); acc += w.length + 1; return { w, de } })
  }

  // ---------- montagem do DOM ----------
  const palco = document.getElementById('palco')
  const el = (html, pai = palco) => { const d = document.createElement('div'); d.innerHTML = html.trim(); const n = d.firstElementChild; pai.appendChild(n); return n }
  const css = (n, o) => Object.assign(n.style, o)
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]/g, '')

  const ICONES = {
    clinica: '<path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 12v2.5a5.5 5.5 0 0 0 11 0V12"/><circle cx="21" cy="10" r="2"/><path d="M5 3h2M13 3h2"/>',
    salao: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.2 8.2 20 20M8.2 15.8 20 4"/>',
    imovel: '<path d="M3 11 12 3.5l9 7.5"/><path d="M5.5 9.5V20.5h13V9.5"/><path d="M10 20.5v-6h4v6"/>',
    volante: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.6"/><path d="M12 14.6V21M9.6 11 3.3 9.6M14.4 11l6.3-1.4"/>',
    oficina: '<path d="M14.6 3.4a5 5 0 0 0-5.9 6.4L3 15.5 5.5 18l1 2.5 2-.5 5.7-5.7a5 5 0 0 0 6.4-5.9l-3 3-3-.8-.8-3z"/>',
    contabil: '<path d="M6 2.5h8l5 5v14H6z"/><path d="M14 2.5v5h5"/><path d="M9 17v-3M12.5 17v-6M16 17v-4.5"/>',
    pet: '<path d="M12 12.5c-3 0-5.5 3.4-5.5 5.6 0 1.9 2 2.6 5.5 2.6s5.5-.7 5.5-2.6c0-2.2-2.5-5.6-5.5-5.6z"/><circle cx="5.5" cy="10" r="1.9"/><circle cx="9.3" cy="5.4" r="1.9"/><circle cx="14.7" cy="5.4" r="1.9"/><circle cx="18.5" cy="10" r="1.9"/>',
  }
  const LOGO = '<svg viewBox="0 0 48 48"><circle class="lc" cx="24" cy="24" r="23" fill="#141310" stroke="#d4b483" stroke-opacity=".5"/><path class="lm" d="M14.5 32.5v-17l9.5 11 9.5-11v17" fill="none" stroke="#d4b483" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  const CHECK = '<svg viewBox="0 0 24 24" width="44" height="44"><circle cx="12" cy="12" r="11" fill="#d4b483"/><path d="m7 12.5 3.2 3.2L17.5 8.5" fill="none" stroke="#141310" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  const ZAP = '<svg viewBox="0 0 24 24" width="70" height="70"><path d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.3 21.8l4.9-1.3A9.8 9.8 0 1 0 12 2.2z" fill="#fff"/><path d="M9.1 7.3c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.3 3.6 5.6 4.9 2.8 1.1 3.3.9 3.9.8.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.1-.3-.2-.6-.4l-2-1c-.3-.1-.5-.1-.7.1l-.9 1.2c-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.5-.5.3-.5c.1-.2 0-.4 0-.5z" fill="#25d366"/></svg>'

  // Fundo: brilho champanhe que passeia devagar, linhas finas editoriais e grão.
  const brilho = el('<div style="width:1400px;height:1400px;border-radius:50%;background:radial-gradient(circle,rgba(212,180,131,.13),rgba(212,180,131,0) 62%)"></div>')
  const linhas = [380, 1300, 1720].map((y) => el(`<div style="left:0;top:${y}px;width:${W}px;height:1px;background:#2e2b26"></div>`))
  el('<svg width="1080" height="1920" style="left:0;top:0;opacity:.06;mix-blend-mode:screen"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter><rect width="1080" height="1920" filter="url(#g)"/></svg>')

  // Topo fixo: marca e nicho.
  const topo = el(`<div style="left:80px;top:122px;width:920px;height:60px">
    <div style="left:0;top:0;width:60px;height:60px">${LOGO}</div>
    <div style="left:80px;top:15px;font:700 30px/1 var(--sans);letter-spacing:.02em">Movitech</div>
    <div class="eyebrow" style="right:0;top:17px;font-size:26px">para ${N.rotulo}</div></div>`)

  // ----- Cena 1: abertura (pergunta-gancho) -----
  const c1 = el('<div style="left:0;top:0;width:1080px;height:1920px"></div>')
  const icone = el(`<svg viewBox="0 0 24 24" width="360" height="360" style="left:80px;top:330px" fill="none" stroke="#d4b483" stroke-width=".55" stroke-linecap="round" stroke-linejoin="round">${ICONES[N.icone]}</svg>`, c1)
  const icPaths = [...icone.querySelectorAll('path,circle')]
  icPaths.forEach((q) => { const L = q.getTotalLength(); q.style.strokeDasharray = L; q.dataset.L = L })
  const f1 = falas('abertura')
  const perg = el('<div class="serif" style="left:80px;top:820px;width:930px;font-size:128px;line-height:1.02"></div>', c1)
  const destaque = new Set(N.destaque.split(/\s+/).map(norm))
  const pergPal = f1.flatMap(palavras).map((pw) => {
    const m = el(`<span class="mask"><span>${destaque.has(norm(pw.w)) ? `<em>${pw.w}</em>` : pw.w}</span></span>`, perg)
    perg.appendChild(document.createTextNode(' '))
    return { n: m.firstElementChild, de: pw.de }
  })

  // ----- Cena 2: problema (3 linhas que são riscadas) -----
  const c2 = el('<div style="left:0;top:0;width:1080px;height:1920px"></div>')
  el('<div class="eyebrow" style="left:80px;top:300px">O problema</div>', c2)
  const f2 = falas('problema')
  const probs = N.problemas.map((txt, i) => {
    const y = 430 + i * 330
    const g = el(`<div style="left:80px;top:${y}px;width:920px;height:280px">
      <div class="serif" style="left:0;top:0;font-size:150px;line-height:1;color:#8a7350">0${i + 1}</div>
      <div class="rot" style="left:190px;top:34px;width:600px;font:700 66px/1.08 var(--sans)">${txt}</div>
      <div class="risco" style="left:180px;top:118px;width:0;height:8px;background:#e2786a;border-radius:4px;transform-origin:0 50%"></div>
      <div class="x" style="right:0;top:28px;width:90px;height:90px;border-radius:50%;border:5px solid #e2786a;color:#e2786a;font:800 54px/80px var(--sans);text-align:center">×</div>
      <div style="left:0;top:262px;width:920px;height:1px;background:#2e2b26"></div></div>`, c2)
    const rot = g.querySelector('.rot')
    const risco = g.querySelector('.risco')
    return { g, rot, risco, x: g.querySelector('.x'), de: (f2[i] || f2[f2.length - 1]).de }
  })

  // ----- Cena 3 e 4: celular com o site do nicho -----
  const tel = el(`<div style="left:280px;top:420px;width:520px;height:1060px;border-radius:72px;background:#1f1d19;border:2px solid #3a3630;box-shadow:0 60px 120px rgba(0,0,0,.55)">
    <div class="tela" style="left:18px;top:18px;width:480px;height:1020px;border-radius:56px;background:#f5f1ea;overflow:hidden;color:#141310">
      <div style="left:180px;top:18px;width:120px;height:34px;border-radius:20px;background:#141310"></div>
      <div style="left:36px;top:82px;width:408px;height:60px;border-radius:30px;background:#ece8df;font:500 22px/60px var(--sans);color:#6b675f;padding-left:28px;white-space:nowrap">${N.tela.url}</div>
      <div style="left:36px;top:178px;font:700 26px/1 var(--sans);letter-spacing:.02em">${N.tela.nome}</div>
      <div class="serif" style="left:36px;top:226px;width:410px;font-size:62px;line-height:1">${N.tela.titulo}</div>
      ${N.tela.linhas.map((l, i) => `<div class="lin" style="left:36px;top:${400 + i * 132}px;width:408px;height:110px;border-radius:26px;background:#fff;border:1.5px solid #e2ddd2">
        <div style="left:28px;top:24px;font:700 26px/1.1 var(--sans)">${l[0]}</div>
        <div style="left:28px;top:62px;font:500 22px/1 var(--sans);color:#8a7350">${l[1]}</div>
        <div style="right:24px;top:31px;width:48px;height:48px;border-radius:50%;border:2px solid #d4b483"></div></div>`).join('')}
      <div class="btn" style="left:36px;top:820px;width:408px;height:96px;border-radius:48px;background:#141310;color:#f2efe8;font:700 28px/96px var(--sans);text-align:center">${N.tela.botao}</div>
      <div class="zapmini" style="right:36px;top:936px;width:68px;height:68px;border-radius:50%;background:#25d366;padding:8px">${ZAP.replace('width="70" height="70"', 'width="52" height="52"')}</div>
    </div></div>`)
  const telLin = [...tel.querySelectorAll('.lin')]
  const telBtn = tel.querySelector('.btn')
  const titulo3 = el('<div class="serif" style="left:80px;top:250px;width:920px;font-size:96px;line-height:1">Com a <em>Movitech</em>:</div>')
  const f3 = falas('solucao').slice(-3)
  const chips = N.recursos.map((txt, i) => {
    const lado = i % 2 === 0 ? 'left:56px' : 'right:56px'
    const n = el(`<div class="flex" style="${lado};top:${880 + i * 205}px;height:116px;padding:0 40px 0 30px;border-radius:58px;background:#141310;border:2px solid #d4b483;box-shadow:0 30px 60px rgba(0,0,0,.5);display:flex;align-items:center;gap:22px;white-space:nowrap;font:700 44px/1 var(--sans)">
      <span style="display:inline-flex">${CHECK}</span><span>${txt}</span></div>`)
    return { n, de: (f3[i] || f3[f3.length - 1]).de, esq: i % 2 === 0 }
  })

  // Notificação e frase do benefício.
  const notif = el(`<div style="left:90px;top:330px;width:900px;height:200px;border-radius:44px;background:rgba(245,241,234,.97);color:#141310;box-shadow:0 40px 90px rgba(0,0,0,.5)">
    <div style="left:30px;top:44px;width:112px;height:112px">${LOGO}</div>
    <div style="left:170px;top:46px;font:500 26px/1 var(--sans);color:#8a7350;letter-spacing:.04em">MOVITECH · agora</div>
    <div style="left:170px;top:86px;font:800 40px/1.1 var(--sans)">${N.notificacao[0]}</div>
    <div style="left:170px;top:138px;font:500 30px/1 var(--sans);color:#4a463f">${N.notificacao[1]}</div></div>`)
  const benef = el(`<div class="serif" style="left:80px;top:760px;width:920px;font-size:124px;line-height:1.02"></div>`)
  const benPal = N.beneficio.split('|').map((linha) => {
    const d = el('<div style="position:relative;display:block"></div>', benef)
    return linha.trim().split(/\s+/).map((w) => {
      const it = w.startsWith('*')
      const m = el(`<span class="mask"><span>${it ? `<em>${w.replace(/\*/g, '')}</em>` : w}</span></span>`, d)
      d.appendChild(document.createTextNode(' '))
      return m.firstElementChild
    })
  }).flat()

  // ----- Cena 5: chamada -----
  const c5 = el('<div style="left:0;top:0;width:1080px;height:1920px"></div>')
  const logoG = el(`<div style="left:420px;top:330px;width:240px;height:240px">${LOGO}</div>`, c5)
  const lm = logoG.querySelector('.lm'), lc = logoG.querySelector('.lc')
  const LM = lm.getTotalLength(), LC = lc.getTotalLength()
  css(lm, { strokeDasharray: LM }); css(lc, { strokeDasharray: LC })
  const cta1 = el('<div class="serif" style="left:60px;top:660px;width:960px;text-align:center;font-size:132px;line-height:1"><span class="mask"><span>Peça seu</span></span><br><span class="mask"><span><em>orçamento</em></span></span></div>', c5)
  const ctaM = [...cta1.querySelectorAll('.mask > span')]
  const zap = el(`<div class="flex" style="left:110px;top:1010px;width:860px;height:160px;border-radius:80px;background:#25d366;display:flex;align-items:center;justify-content:center;gap:26px;color:#fff;font:800 64px/1 var(--sans);box-shadow:0 30px 70px rgba(37,211,102,.25)">
    <span style="display:inline-flex">${ZAP}</span><span>(11) 96445-2878</span></div>`, c5)
  const site = el('<div style="left:0;top:1222px;width:1080px;text-align:center;font:500 38px/1 var(--sans);color:#9a958b">movitechsistemas.com.br</div>', c5)

  // Cortina entre cenas: painel que sobe com borda champanhe.
  const cort = el('<div style="left:0;top:0;width:1080px;height:1920px;background:#1f1d19"><div style="left:0;top:0;width:1080px;height:6px;background:#d4b483"></div></div>')

  // Legenda palavra por palavra (para quem assiste sem som).
  const leg = el('<div style="left:70px;top:1560px;width:940px;text-align:center;font:600 50px/1.25 var(--sans)"></div>')
  const legs = V.legendas.map((l, i) => {
    const prox = V.legendas[i + 1]
    const d = el('<div style="left:0;top:0;width:940px;text-align:center"></div>', leg)
    const ps = palavras(l).map((pw) => { const s = el(`<span>${pw.w} </span>`, d); return { s, de: pw.de } })
    return { d, l, ps, sai: Math.min(l.ate + 0.25, prox ? prox.de - 0.05 : 1e9) }
  })

  // ---------- desenho de um quadro ----------
  function seek(t) {
    // fundo
    css(brilho, { left: 540 - 700 + Math.sin(t * 0.35) * 220 + 'px', top: 560 - 700 + Math.cos(t * 0.27) * 260 + 'px' })
    linhas.forEach((n, i) => css(n, { transform: `scaleX(${outQ(p(t, 0.1 + i * 0.12, 1.1 + i * 0.12))})`, transformOrigin: i % 2 ? '100% 0' : '0 0' }))
    css(topo, { opacity: p(t, 0, 0.4), transform: `translateY(${(1 - outQ(p(t, 0, 0.6))) * -30}px)` })

    const em = (nome) => t >= inicio(nome) && t < fim(nome)

    // cortina centrada em cada troca de cena
    let cy = H
    for (const nome of ORDEM.slice(1)) {
      const b = inicio(nome), x = p(t, b - 0.28, b + 0.28)
      if (x > 0 && x < 1) cy = x < 0.5 ? lerp(H, 0, inOut(x * 2)) : lerp(0, -H, inOut((x - 0.5) * 2))
    }
    css(cort, { transform: `translateY(${cy}px)` })

    // cena 1
    c1.style.display = em('abertura') ? '' : 'none'
    if (em('abertura')) {
      icPaths.forEach((q, i) => { const x = outQ(p(t, 0.05 + i * 0.12, 1.3 + i * 0.12)); q.style.strokeDashoffset = q.dataset.L * (1 - x) })
      css(icone, { transform: `translateY(${Math.sin(t * 1.4) * 8}px) rotate(${Math.sin(t * 0.9) * 2}deg)` })
      pergPal.forEach(({ n, de }) => { const x = outQ(p(t, de - 0.05, de + 0.35)); css(n, { transform: `translateY(${(1 - x) * 110}%)` }) })
      const sai = inOut(p(t, fim('abertura') - 0.4, fim('abertura')))
      css(c1, { transform: `translateY(${-sai * 120}px)`, opacity: 1 - sai * 0.6 })
    }

    // cena 2
    c2.style.display = em('problema') ? '' : 'none'
    if (em('problema')) {
      probs.forEach(({ g, rot, risco, x, de }) => {
        const e = outQ(p(t, de - 0.1, de + 0.4))
        css(g, { opacity: e, transform: `translateX(${(1 - e) * 90}px)` })
        const r = inOut(p(t, de + 0.45, de + 0.8))
        css(risco, { transform: `scaleX(${r})` })
        css(rot, { color: r > 0.5 ? '#9a958b' : '#f2efe8' })
        const s = mola(t - de - 0.7)
        css(x, { transform: `scale(${s})`, opacity: cl(s * 2) })
      })
    }

    // cenas 3 e 4 (celular)
    const s3 = inicio('solucao'), s4 = inicio('beneficio'), f4 = fim('beneficio')
    const telOn = t >= s3 && t < f4
    tel.style.display = telOn ? '' : 'none'
    titulo3.style.display = em('solucao') ? '' : 'none'
    chips.forEach((c) => (c.n.style.display = em('solucao') ? '' : 'none'))
    notif.style.display = benef.style.display = em('beneficio') ? '' : 'none'
    if (telOn) {
      const ent = mola(t - s3 - 0.05)
      const desce = inOut(p(t, s4 - 0.1, s4 + 0.5))
      css(tel, {
        transform: `translateY(${(1 - ent) * 900 + desce * 700}px) rotate(${(1 - ent) * 8 - desce * 6}deg) scale(${1 - desce * 0.1})`,
        opacity: 1 - desce,
      })
      telLin.forEach((n, i) => { const x = outQ(p(t, s3 + 0.5 + i * 0.18, s3 + 0.9 + i * 0.18)); css(n, { opacity: x, transform: `translateY(${(1 - x) * 40}px)` }) })
      const pulse = chips.length ? cl(Math.sin((t - chips[1].de) * 6) * 0.5 + 0.5) * p(t, chips[1].de, chips[1].de + 0.2) : 0
      css(telBtn, { transform: `scale(${1 + pulse * 0.04})` })
    }
    if (em('solucao')) {
      const x = outQ(p(t, s3 + 0.1, s3 + 0.6))
      css(titulo3, { opacity: x, transform: `translateY(${(1 - x) * 40}px)` })
      chips.forEach(({ n, de, esq }) => {
        const s = mola(t - de + 0.05)
        css(n, { opacity: cl(s * 1.5), transform: `translateX(${(1 - s) * (esq ? -160 : 160)}px) scale(${0.85 + 0.15 * s})` })
      })
    }
    if (em('beneficio')) {
      const s = mola(t - s4 - 0.15)
      css(notif, { transform: `translateY(${(1 - s) * -380}px)`, opacity: cl(s * 2) })
      const fb = falas('beneficio')
      const t0 = fb[0].de + 0.1, passo = cl((fb[fb.length - 1].ate - t0 - 1.2) / benPal.length, 0.1, 0.2)
      benPal.forEach((n, i) => { const x = outQ(p(t, t0 + i * passo, t0 + i * passo + 0.4)); css(n, { transform: `translateY(${(1 - x) * 110}%)` }) })
    }

    // cena 5
    c5.style.display = em('cta') ? '' : 'none'
    if (em('cta')) {
      const s5 = inicio('cta')
      lc.style.strokeDashoffset = LC * (1 - outQ(p(t, s5 + 0.1, s5 + 0.9)))
      lm.style.strokeDashoffset = LM * (1 - inOut(p(t, s5 + 0.3, s5 + 1.1)))
      ctaM.forEach((n, i) => { const x = outQ(p(t, s5 + 0.35 + i * 0.25, s5 + 0.8 + i * 0.25)); css(n, { transform: `translateY(${(1 - x) * 110}%)` }) })
      const z = mola(t - s5 - 0.9)
      const resp = 1 + Math.max(0, Math.sin((t - s5 - 1.8) * 4)) * 0.025 * p(t, s5 + 1.8, s5 + 2)
      css(zap, { transform: `scale(${(0.6 + 0.4 * z) * resp})`, opacity: cl(z * 2) })
      css(site, { opacity: p(t, s5 + 1.3, s5 + 1.7) })
    }

    // legenda
    legs.forEach(({ d, l, ps, sai }) => {
      const on = t >= l.de - 0.05 && t < sai
      d.style.display = on ? '' : 'none'
      if (!on) return
      const x = outQ(p(t, l.de - 0.05, l.de + 0.2))
      css(d, { opacity: x, transform: `translateY(${(1 - x) * 16}px)` })
      ps.forEach(({ s, de }) => { const a = t >= de; s.style.color = a ? (t < de + 0.3 ? '#d4b483' : '#f2efe8') : 'rgba(242,239,232,.35)' })
    })
  }

  // Sons: narração + efeitos nos cortes (lidos pelo render).
  const sfx = (nome, at, vol) => ({ src: `../../public/sfx/${nome}.wav`, at: Math.max(0, at), vol })
  window.AUDIO = [
    { src: `../../public/voz/${N.voz}.mp3`, at: 0, vol: 1 },
    { src: '../../public/trilha/base.wav', at: 0, vol: 0.16, ate: DUR, fade: 1.2 },
    ...ORDEM.slice(1).map((n) => sfx('whoosh', inicio(n) - 0.25, 0.22)),
    ...probs.map((q) => sfx('impacto', q.de + 0.7, 0.12)),
    ...chips.map((c) => sfx('pop', c.de, 0.25)),
    sfx('ding', inicio('beneficio') + 0.15, 0.2),
    sfx('ding', inicio('cta') + 0.9, 0.22),
  ]
  window.DURACAO = DUR
  window.FPS = FPS
  window.seek = seek

  // Encaixa o palco 1080×1920 na janela; ?play toca em loop, ?t=5 congela em 5 s.
  const ajusta = () => { const k = Math.min(innerWidth / W, innerHeight / H); css(palco, { transform: `translate(${(innerWidth - W * k) / 2}px,${(innerHeight - H * k) / 2}px) scale(${k})` }) }
  const q = new URLSearchParams(location.search)
  if (!q.has('render')) { ajusta(); addEventListener('resize', ajusta) }
  document.fonts.ready.then(() => {
    // O risco cobre a primeira linha do texto: mede depois que a fonte carregou.
    // Texto longo diminui até caber numa linha (mínimo 50 px).
    probs.forEach(({ rot, risco }) => {
      css(rot, { whiteSpace: 'nowrap', width: 'auto' })
      let fs = 66
      while (rot.offsetWidth > 600 && fs > 44) { fs -= 2; rot.style.fontSize = fs + 'px' }
      if (rot.offsetWidth > 600) css(rot, { whiteSpace: 'normal', width: '600px' })
      css(risco, { width: Math.min(624, rot.offsetWidth + 24) + 'px', top: 34 + fs * 0.56 - 4 + 'px' })
    })
    seek(+(q.get('t') || 0))
    if (q.has('play')) { const t0 = performance.now(); const loop = () => { seek(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop) }; loop() }
    window.PRONTO = true
  })
})()
