// Motor dos anúncios da Movitech em HTML puro (sem dependências).
// A página define window.VIDEO (rótulo + lista de cenas, cada uma com um "tipo") e window.VOZ (tempos da narração,
// gerados por scripts/gerar_voz.py) e carrega este arquivo. Tudo é função do tempo: window.seek(t) desenha o quadro
// exato do instante t. Cada tipo de cena abaixo recebe a sua caixa, a configuração e o nome da cena na narração.
;(() => {
  const VID = window.VIDEO, V = window.VOZ
  const W = 1080, H = 1920, FPS = 30
  const DUR = Math.ceil((V.duracao + 0.4) * FPS) / FPS

  // ---------- tempo e easing ----------
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
  const p = (t, a, b) => cl((t - a) / (b - a))
  const outQ = (x) => 1 - Math.pow(1 - x, 4)
  const inOut = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2)
  const mola = (s) => (s <= 0 ? 0 : 1 - Math.exp(-7 * s) * Math.cos(11 * s)) // s em segundos
  const lerp = (a, b, x) => a + (b - a) * x
  const aleat = (semente) => () => { semente |= 0; semente = (semente + 0x6d2b79f5) | 0; let r = Math.imul(semente ^ (semente >>> 15), 1 | semente); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296 }

  // ---------- cenas e falas ----------
  const cena = Object.fromEntries(V.cenas.map((c) => [c.cena, c]))
  const ORDEM = VID.cenas.map((c) => c.cena)
  const inicio = (nome) => (nome === ORDEM[0] ? 0 : cena[nome].de - 0.22)
  const fim = (nome) => { const i = ORDEM.indexOf(nome); return i === ORDEM.length - 1 ? DUR + 1 : inicio(ORDEM[i + 1]) }
  const falas = (nome) => V.legendas.filter((l) => { const m = (l.de + l.ate) / 2; return m >= cena[nome].de - 0.05 && m <= cena[nome].ate + 0.05 })
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]/g, '')

  // Tempo de cada palavra: usa as marcas da voz quando batem com o texto, senão divide proporcionalmente.
  function palavras(l) {
    const ws = l.texto.split(/\s+/).filter(Boolean)
    if (l.palavras && l.palavras.length === ws.length) return ws.map((w, i) => ({ w, de: l.palavras[i].de }))
    const tot = ws.reduce((s, w) => s + w.length + 1, 0)
    let acc = 0
    return ws.map((w) => { const de = l.de + (l.ate - l.de) * (acc / tot); acc += w.length + 1; return { w, de } })
  }
  // Instante em que a narração fala uma palavra dentro da cena (ou o início da cena, se não achar).
  const quando = (nome, palavra) => { for (const l of falas(nome)) for (const pw of palavras(l)) if (norm(pw.w).startsWith(norm(palavra))) return pw.de; return cena[nome].de }
  // Instantes para n itens: índice de fala ou palavra explícitos; senão as últimas n falas; senão espaçados na cena.
  function tempos(nome, itens) {
    const fs = falas(nome), n = itens.length
    return itens.map((it, i) => {
      if (it && typeof it === 'object' && it.palavra) return quando(nome, it.palavra)
      if (it && typeof it === 'object' && it.fala != null) return (fs[it.fala] || fs[fs.length - 1]).de
      if (fs.length >= n) return fs[fs.length - n + i].de
      return lerp(cena[nome].de + 0.2, cena[nome].ate - 0.6, n === 1 ? 0 : i / (n - 1))
    })
  }
  const txt = (it) => (typeof it === 'string' ? it : it.txt)

  // ---------- DOM ----------
  const palco = document.getElementById('palco')
  const el = (html, pai = palco) => { const d = document.createElement('div'); d.innerHTML = html.trim(); const n = d.firstElementChild; pai.appendChild(n); return n }
  const css = (n, o) => Object.assign(n.style, o)
  const caixa = () => el(`<div style="left:0;top:0;width:${W}px;height:${H}px"></div>`)
  const aposFontes = []
  const sons = []
  const som = (nome, at, vol) => sons.push({ src: `../../public/sfx/${nome}.wav`, at: Math.max(0, at), vol })
  // Texto com *palavras* em itálico champanhe e "|" para quebrar linha; devolve os spans para revelar.
  function frase(pai, texto) {
    return texto.split('|').flatMap((linha) => {
      const d = el('<div style="position:relative;display:block"></div>', pai)
      return linha.trim().split(/\s+/).map((w) => {
        const m = el(`<span class="mask"><span>${w.startsWith('*') ? `<em>${w.replace(/\*/g, '')}</em>` : w}</span></span>`, d)
        d.appendChild(document.createTextNode(' '))
        return m.firstElementChild
      })
    })
  }
  const revela = (n, t, de, k = 0.38) => { const x = outQ(p(t, de - 0.04, de + k)); n.style.transform = `translateY(${(1 - x) * 110}%)` }

  const ICONES = {
    clinica: '<path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 12v2.5a5.5 5.5 0 0 0 11 0V12"/><circle cx="21" cy="10" r="2"/><path d="M5 3h2M13 3h2"/>',
    salao: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.2 8.2 20 20M8.2 15.8 20 4"/>',
    imovel: '<path d="M3 11 12 3.5l9 7.5"/><path d="M5.5 9.5V20.5h13V9.5"/><path d="M10 20.5v-6h4v6"/>',
    volante: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.6"/><path d="M12 14.6V21M9.6 11 3.3 9.6M14.4 11l6.3-1.4"/>',
    oficina: '<path d="M14.6 3.4a5 5 0 0 0-5.9 6.4L3 15.5 5.5 18l1 2.5 2-.5 5.7-5.7a5 5 0 0 0 6.4-5.9l-3 3-3-.8-.8-3z"/>',
    contabil: '<path d="M6 2.5h8l5 5v14H6z"/><path d="M14 2.5v5h5"/><path d="M9 17v-3M12.5 17v-6M16 17v-4.5"/>',
    pet: '<path d="M12 12.5c-3 0-5.5 3.4-5.5 5.6 0 1.9 2 2.6 5.5 2.6s5.5-.7 5.5-2.6c0-2.2-2.5-5.6-5.5-5.6z"/><circle cx="5.5" cy="10" r="1.9"/><circle cx="9.3" cy="5.4" r="1.9"/><circle cx="14.7" cy="5.4" r="1.9"/><circle cx="18.5" cy="10" r="1.9"/>',
    moto: '<circle cx="5.5" cy="17" r="3"/><circle cx="18.5" cy="17" r="3"/><path d="M8.5 17h6.5l2.5-6H13l-2 3.5H5.5"/><path d="M15.5 11 14 6.5h-2.5"/><path d="M3 8.5h6v4H3z"/>',
    lupa: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5.5 5.5"/><path d="M7.5 10.5h6"/>',
  }
  const LOGO = '<svg viewBox="0 0 48 48"><circle class="lc" cx="24" cy="24" r="23" fill="#141310" stroke="#d4b483" stroke-opacity=".5"/><path class="lm" d="M14.5 32.5v-17l9.5 11 9.5-11v17" fill="none" stroke="#d4b483" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  const CHECK = (s = 44, cor = '#d4b483') => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><circle cx="12" cy="12" r="11" fill="${cor}"/><path d="m7 12.5 3.2 3.2L17.5 8.5" fill="none" stroke="#141310" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  const ZAP = (s = 70) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.3 21.8l4.9-1.3A9.8 9.8 0 1 0 12 2.2z" fill="#fff"/><path d="M9.1 7.3c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.3 3.6 5.6 4.9 2.8 1.1 3.3.9 3.9.8.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.1-.3-.2-.6-.4l-2-1c-.3-.1-.5-.1-.7.1l-.9 1.2c-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.5-.5.3-.5c.1-.2 0-.4 0-.5z" fill="#25d366"/></svg>`
  // Desenha um SVG de traço (ícone/logo) de 0 a 1.
  function traco(svg) {
    const qs = [...svg.querySelectorAll('path,circle')]
    qs.forEach((q) => { q.dataset.L = q.getTotalLength(); q.style.strokeDasharray = q.dataset.L })
    return (x0, t, passo = 0.12, dur = 1.2) => qs.forEach((q, i) => { q.style.strokeDashoffset = q.dataset.L * (1 - outQ(p(t, x0 + i * passo, x0 + i * passo + dur))) })
  }

  // ---------- fundo e topo ----------
  const brilho = el('<div style="width:1400px;height:1400px;border-radius:50%;background:radial-gradient(circle,rgba(212,180,131,.13),rgba(212,180,131,0) 62%)"></div>')
  const linhas = [380, 1300, 1720].map((y) => el(`<div style="left:0;top:${y}px;width:${W}px;height:1px;background:#2e2b26"></div>`))
  el('<svg width="1080" height="1920" style="left:0;top:0;opacity:.06;mix-blend-mode:screen"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter><rect width="1080" height="1920" filter="url(#g)"/></svg>')
  const topo = el(`<div style="left:80px;top:122px;width:920px;height:60px">
    <div style="left:0;top:0;width:60px;height:60px">${LOGO}</div>
    <div style="left:80px;top:15px;font:700 30px/1 var(--sans);letter-spacing:.02em">Movitech</div>
    <div class="eyebrow" style="right:0;top:17px;font-size:26px">${VID.rotulo || ''}</div></div>`)

  // ---------- tipos de cena ----------
  const TIPOS = {}

  // Pergunta-gancho: as palavras da fala sobem no tempo da voz; ícone ou logo desenhado acima.
  TIPOS.pergunta = (box, cfg, nome) => {
    let desenha = null, icone = null
    if (cfg.icone) {
      icone = el(`<svg viewBox="0 0 24 24" width="360" height="360" style="left:80px;top:330px" fill="none" stroke="#d4b483" stroke-width=".55" stroke-linecap="round" stroke-linejoin="round">${ICONES[cfg.icone]}</svg>`, box)
      desenha = traco(icone)
    }
    const ws = falas(nome).flatMap(palavras)
    const tam = cfg.tamanho || (ws.length > 12 ? 108 : 128)
    const perg = el(`<div class="serif" style="left:80px;top:${cfg.top || 820}px;width:930px;font-size:${tam}px;line-height:1.02"></div>`, box)
    const dest = new Set((cfg.destaque || '').split(/\s+/).map(norm).filter(Boolean))
    const ps = ws.map((pw) => {
      const m = el(`<span class="mask"><span>${dest.has(norm(pw.w)) ? `<em>${pw.w}</em>` : pw.w}</span></span>`, perg)
      perg.appendChild(document.createTextNode(' '))
      return { n: m.firstElementChild, de: pw.de }
    })
    return (t) => {
      const t0 = inicio(nome)
      if (desenha) { desenha(t0 + 0.05, t); css(icone, { transform: `translateY(${Math.sin(t * 1.4) * 8}px) rotate(${Math.sin(t * 0.9) * 2}deg)` }) }
      ps.forEach(({ n, de }) => revela(n, t, de))
      const sai = inOut(p(t, fim(nome) - 0.4, fim(nome)))
      css(box, { transform: `translateY(${-sai * 120}px)`, opacity: 1 - sai * 0.6 })
    }
  }

  // Tipografia cinética: cada fala da cena ocupa a tela sozinha; logo opcional acima.
  TIPOS.falas = (box, cfg, nome) => {
    let logo = null, lm, lc
    if (cfg.logo) {
      logo = el(`<div style="left:420px;top:380px;width:240px;height:240px">${LOGO}</div>`, box)
      lm = traco(logo)
    }
    const dest = new Set((cfg.destaque || '').split(/\s+/).map(norm).filter(Boolean))
    const fs = falas(nome)
    const blocos = fs.map((l, i) => {
      const ws = palavras(l)
      const tam = l.texto.length > 44 ? 100 : l.texto.length > 26 ? 116 : 136
      const d = el(`<div class="serif" style="left:80px;top:${cfg.logo ? 760 : 640}px;width:920px;font-size:${tam}px;line-height:1.02"></div>`, box)
      const ps = ws.map((pw) => {
        const m = el(`<span class="mask"><span>${dest.has(norm(pw.w)) ? `<em>${pw.w}</em>` : pw.w}</span></span>`, d)
        d.appendChild(document.createTextNode(' '))
        return { n: m.firstElementChild, de: pw.de }
      })
      return { d, ps, de: l.de, ate: fs[i + 1] ? fs[i + 1].de - 0.08 : fim(nome) }
    })
    return (t) => {
      if (logo) lm(inicio(nome) + 0.05, t, 0.2, 0.9)
      blocos.forEach(({ d, ps, de, ate }) => {
        const on = t >= de - 0.1 && t < ate
        d.style.display = on ? '' : 'none'
        if (!on) return
        ps.forEach(({ n, de: w }) => revela(n, t, w, 0.32))
        const sai = inOut(p(t, ate - 0.16, ate))
        css(d, { opacity: 1 - sai, transform: `translateY(${-sai * 50}px)` })
      })
    }
  }

  // Lista numerada: no modo "riscar" cada item é riscado com um ×; no modo "check" ganha um check dourado.
  TIPOS.lista = (box, cfg, nome) => {
    const check = cfg.modo === 'check'
    el(`<div class="eyebrow" style="left:80px;top:300px">${cfg.titulo || 'O problema'}</div>`, box)
    const intro = cfg.intro ? el('<div class="serif" style="left:80px;top:700px;width:920px;font-size:128px;line-height:1.02"></div>', box) : null
    const introPs = intro ? frase(intro, cfg.intro) : []
    const n = cfg.itens.length, passo = n <= 3 ? 330 : n === 4 ? 272 : 226
    const ts = tempos(nome, cfg.itens)
    const itens = cfg.itens.map((it, i) => {
      const y = 430 + i * passo
      const g = el(`<div style="left:80px;top:${y}px;width:920px;height:${passo - 50}px">
        <div class="serif" style="left:0;top:0;font-size:${n > 4 ? 120 : 150}px;line-height:1;color:${check ? '#d4b483' : '#8a7350'}">0${i + 1}</div>
        <div class="rot" style="left:190px;top:34px;font:700 66px/1.08 var(--sans);white-space:nowrap">${txt(it)}</div>
        <div class="risco" style="left:180px;top:70px;width:0;height:8px;background:#e2786a;border-radius:4px;transform-origin:0 50%;display:${check ? 'none' : ''}"></div>
        <div class="x" style="right:0;top:28px;width:90px;height:90px;border-radius:50%;${check ? '' : 'border:5px solid #e2786a;'}color:#e2786a;font:800 54px/80px var(--sans);text-align:center">${check ? CHECK(90) : '×'}</div>
        <div style="left:0;top:${passo - 68}px;width:920px;height:1px;background:#2e2b26"></div></div>`, box)
      const rot = g.querySelector('.rot'), risco = g.querySelector('.risco')
      som(check ? 'pop' : 'impacto', ts[i] + 0.7, check ? 0.2 : 0.12)
      return { g, rot, risco, x: g.querySelector('.x'), de: ts[i] }
    })
    aposFontes.push(() => itens.forEach(({ rot, risco }) => {
      let fs = 66
      while (rot.offsetWidth > 600 && fs > 44) { fs -= 2; rot.style.fontSize = fs + 'px' }
      if (rot.offsetWidth > 600) css(rot, { whiteSpace: 'normal', width: '600px' })
      css(risco, { width: Math.min(624, rot.offsetWidth + 24) + 'px', top: 34 + fs * 0.56 - 4 + 'px' })
    }))
    return (t) => {
      if (intro) {
        introPs.forEach((m, i) => revela(m, t, cena[nome].de + i * 0.1))
        const sai = inOut(p(t, itens[0].de - 0.45, itens[0].de - 0.05))
        css(intro, { opacity: 1 - sai, transform: `translateY(${-sai * 80}px)` })
      }
      itens.forEach(({ g, rot, risco, x, de }) => {
      const e = outQ(p(t, de - 0.1, de + 0.4))
      css(g, { opacity: e, transform: `translateX(${(1 - e) * 90}px)` })
      if (!check) {
        const r = inOut(p(t, de + 0.45, de + 0.8))
        css(risco, { transform: `scaleX(${r})` })
        css(rot, { color: r > 0.5 ? '#9a958b' : '#f2efe8' })
      }
      const s = mola(t - de - (check ? 0.35 : 0.7))
      css(x, { transform: `scale(${s})`, opacity: cl(s * 2) })
      })
    }
  }

  // Celular com o site (ou o cardápio) e selos que entram no tempo da fala.
  TIPOS.celular = (box, cfg, nome) => {
    const T = cfg.tela
    const tel = el(`<div style="left:280px;top:420px;width:520px;height:1060px;border-radius:72px;background:#1f1d19;border:2px solid #3a3630;box-shadow:0 60px 120px rgba(0,0,0,.55)">
      <div style="left:18px;top:18px;width:480px;height:1020px;border-radius:56px;background:#f5f1ea;overflow:hidden;color:#141310">
        <div style="left:180px;top:18px;width:120px;height:34px;border-radius:20px;background:#141310"></div>
        <div style="left:36px;top:82px;width:408px;height:60px;border-radius:30px;background:#ece8df;font:500 22px/60px var(--sans);color:#6b675f;padding-left:28px;white-space:nowrap">${T.url}</div>
        <div style="left:36px;top:178px;font:700 26px/1 var(--sans);letter-spacing:.02em">${T.nome}</div>
        <div class="serif" style="left:36px;top:226px;width:410px;font-size:62px;line-height:1">${T.titulo}</div>
        ${T.linhas.map((l, i) => `<div class="lin" style="left:36px;top:${400 + i * 132}px;width:408px;height:110px;border-radius:26px;background:#fff;border:1.5px solid #e2ddd2">
          <div style="left:28px;top:24px;font:700 26px/1.1 var(--sans)">${l[0]}</div>
          <div style="left:28px;top:62px;font:500 22px/1 var(--sans);color:#8a7350">${l[1]}</div>
          ${l[2] ? `<div style="right:26px;top:38px;font:800 28px/1 var(--sans)">${l[2]}</div>` : '<div style="right:24px;top:31px;width:48px;height:48px;border-radius:50%;border:2px solid #d4b483"></div>'}</div>`).join('')}
        <div class="btn" style="left:36px;top:820px;width:408px;height:96px;border-radius:48px;background:#141310;color:#f2efe8;font:700 28px/96px var(--sans);text-align:center">${T.botao}</div>
        <div style="right:36px;top:936px;width:68px;height:68px;border-radius:50%;background:#25d366;padding:8px">${ZAP(52)}</div>
      </div></div>`, box)
    const lin = [...tel.querySelectorAll('.lin')]
    const titulo = el(`<div class="serif" style="left:80px;top:250px;width:920px;font-size:${cfg.tamTitulo || 96}px;line-height:1">${cfg.titulo || 'Com a <em>Movitech</em>:'}</div>`, box)
    const rs = cfg.recursos, ts = tempos(nome, rs)
    const y0 = { 2: 940, 3: 880, 4: 800 }[rs.length] || 880, dy = { 2: 260, 3: 205, 4: 175 }[rs.length] || 205
    const chips = rs.map((it, i) => {
      const esq = i % 2 === 0
      const n = el(`<div class="flex" style="${esq ? 'left' : 'right'}:56px;top:${y0 + i * dy}px;height:116px;padding:0 40px 0 30px;border-radius:58px;background:#141310;border:2px solid #d4b483;box-shadow:0 30px 60px rgba(0,0,0,.5);display:flex;align-items:center;gap:22px;white-space:nowrap;font:700 44px/1 var(--sans)">
        <span style="display:inline-flex">${CHECK()}</span><span>${txt(it)}</span></div>`, box)
      som('pop', ts[i], 0.25)
      return { n, de: ts[i], esq }
    })
    return (t) => {
      const t0 = inicio(nome)
      const ent = mola(t - t0 - 0.05)
      css(tel, { transform: `translateY(${(1 - ent) * 900}px) rotate(${(1 - ent) * 8}deg)` })
      lin.forEach((n, i) => { const x = outQ(p(t, t0 + 0.5 + i * 0.18, t0 + 0.9 + i * 0.18)); css(n, { opacity: x, transform: `translateY(${(1 - x) * 40}px)` }) })
      const x = outQ(p(t, t0 + 0.1, t0 + 0.6))
      css(titulo, { opacity: x, transform: `translateY(${(1 - x) * 40}px)` })
      chips.forEach(({ n, de, esq }) => {
        const s = mola(t - de + 0.05)
        css(n, { opacity: cl(s * 1.5), transform: `translateX(${(1 - s) * (esq ? -160 : 160)}px) scale(${0.85 + 0.15 * s})` })
      })
    }
  }

  // Notificação caindo + frase do benefício.
  TIPOS.notificacao = (box, cfg, nome) => {
    const notif = el(`<div style="left:90px;top:330px;width:900px;height:200px;border-radius:44px;background:rgba(245,241,234,.97);color:#141310;box-shadow:0 40px 90px rgba(0,0,0,.5)">
      <div style="left:30px;top:44px;width:112px;height:112px">${LOGO}</div>
      <div style="left:170px;top:46px;font:500 26px/1 var(--sans);color:#8a7350;letter-spacing:.04em">MOVITECH · agora</div>
      <div style="left:170px;top:86px;font:800 40px/1.1 var(--sans)">${cfg.notificacao[0]}</div>
      <div style="left:170px;top:138px;font:500 30px/1 var(--sans);color:#4a463f">${cfg.notificacao[1]}</div></div>`, box)
    const ben = el('<div class="serif" style="left:80px;top:760px;width:920px;font-size:124px;line-height:1.02"></div>', box)
    const ps = frase(ben, cfg.beneficio)
    som('ding', inicio(nome) + 0.15, 0.2)
    return (t) => {
      const t0 = inicio(nome)
      const s = mola(t - t0 - 0.15)
      css(notif, { transform: `translateY(${(1 - s) * -380}px)`, opacity: cl(s * 2) })
      const fb = falas(nome), a = fb[0].de + 0.1
      const passo = cl((fb[fb.length - 1].ate - a - 1.2) / ps.length, 0.1, 0.2)
      ps.forEach((n, i) => revela(n, t, a + i * passo))
    }
  }

  // Frase de impacto em tela cheia (com etiquetas que caem, opcional) e subtítulo.
  TIPOS.frase = (box, cfg, nome) => {
    const tam = cfg.tamanho || 150
    const tags = (cfg.etiquetas || []).map((tx, i) => {
      const r = aleat(11 + i)
      const n = el(`<div style="left:${80 + r() * 700}px;top:${420 + r() * 1000}px;padding:14px 26px;border-radius:16px;border:3px solid #e2786a;color:#e2786a;font:800 56px/1 var(--sans);transform-origin:50% 50%">${tx}</div>`, box)
      const x = 80 + r() * 700, y = 420 + r() * 1000, ang = Math.atan2(y - 960, x + 120 - 540)
      css(n, { left: x + 'px', top: y + 'px' })
      return { n, rot: (r() - 0.5) * 30, cai: r(), giro: (r() - 0.5) * 120, dx: Math.cos(ang) * 700, dy: Math.sin(ang) * 700 }
    })
    const bloco = el(`<div class="serif" style="left:70px;top:${cfg.top || 700}px;width:940px;text-align:center;font-size:${tam}px;line-height:1"></div>`, box)
    const ps = frase(bloco, cfg.texto)
    const sub = cfg.sub ? el(`<div style="left:80px;top:${(cfg.top || 700) + tam * cfg.texto.split('|').length + 60}px;width:920px;text-align:center;font:600 46px/1.3 var(--sans);color:#9a958b">${cfg.sub}</div>`, box) : null
    som('impacto', cena[nome].de, 0.3)
    return (t) => {
      const t0 = cena[nome].de
      ps.forEach((n, i) => revela(n, t, t0 - 0.05 + i * 0.07, 0.3))
      if (sub) css(sub, { opacity: p(t, t0 + 0.5, t0 + 0.9) })
      tags.forEach(({ n, rot, cai, giro, dx, dy }) => {
        const ap = outQ(p(t, inicio(nome), inicio(nome) + 0.25))
        const q = outQ(p(t, t0 - 0.1 + cai * 0.4, t0 + 0.35 + cai * 0.4))
        css(n, { opacity: ap * (1 - q), transform: `translate(${q * dx}px,${q * dy}px) rotate(${rot + q * giro}deg) scale(${(0.8 + 0.2 * ap) * (1 + q * 0.4)})` })
      })
      const b = 1 + (1 - outQ(p(t, t0, t0 + 0.5))) * 0.06
      css(bloco, { transform: `scale(${b})` })
    }
  }

  // Salão: QR code na mesa é escaneado e o pedido voa até a tela da cozinha.
  TIPOS.qr = (box, cfg, nome) => {
    el(`<div class="eyebrow" style="left:80px;top:300px">${cfg.titulo || 'No salão'}</div>`, box)
    const r = aleat(7), mods = []
    for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)
      if (finder) { const fx = x % 14, fy = y % 14, a = Math.max(Math.abs(fx - 3), Math.abs(fy - 3)); if (a === 3 || a <= 1) mods.push([x, y]) } else if (r() < 0.47) mods.push([x, y])
    }
    const mesa = el(`<div style="left:90px;top:440px;width:440px;height:520px;border-radius:36px;background:#f5f1ea;color:#141310;box-shadow:0 40px 90px rgba(0,0,0,.5)">
      <div style="left:0;top:34px;width:440px;text-align:center;font:800 30px/1 var(--sans);letter-spacing:.08em">MESA 7</div>
      <svg viewBox="0 0 21 21" width="300" height="300" style="left:70px;top:96px" shape-rendering="crispEdges">${mods.map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="#141310"/>`).join('')}</svg>
      <div class="feixe" style="left:50px;top:96px;width:340px;height:6px;background:#d4b483;box-shadow:0 0 30px 8px rgba(212,180,131,.7);border-radius:3px"></div>
      <div style="left:0;top:432px;width:440px;text-align:center;font:600 26px/1.3 var(--sans);color:#6b675f">Aponte a câmera<br>e faça seu pedido</div></div>`, box)
    const feixe = mesa.querySelector('.feixe')
    const coz = el(`<div style="left:470px;top:1000px;width:540px;height:470px;border-radius:32px;background:#1f1d19;border:2px solid #3a3630">
      <div style="left:32px;top:30px;font:800 30px/1 var(--sans);letter-spacing:.06em;color:#d4b483">COZINHA</div>
      <div style="right:32px;top:32px;font:600 24px/1 var(--sans);color:#9a958b">ao vivo</div>
      <div style="left:32px;top:84px;width:476px;height:1px;background:#2e2b26"></div>
      <div class="flash" style="left:0;top:0;width:540px;height:470px;border-radius:32px;border:4px solid #d4b483;opacity:0"></div></div>`, box)
    const flash = coz.querySelector('.flash')
    const ticket = el(`<div style="left:0;top:0;width:420px;height:300px;border-radius:24px;background:#fff;color:#141310;box-shadow:0 30px 70px rgba(0,0,0,.45);transform-origin:50% 50%">
      <div style="left:28px;top:26px;font:800 32px/1 var(--sans)">Mesa 7 · novo</div>
      ${(cfg.pedido || ['2× X-Burger', '1× Fritas', '2× Refrigerante']).map((l, i) => `<div style="left:28px;top:${88 + i * 56}px;font:600 30px/1 var(--sans);color:#3a3630">${l}</div>`).join('')}
      <div style="right:28px;top:28px;width:22px;height:22px;border-radius:50%;background:#25d366"></div></div>`, box)
    const tScan = quando(nome, cfg.palavraQr || 'QR'), tCoz = quando(nome, cfg.palavraCozinha || 'cozinha')
    som('whoosh', tScan + 0.5, 0.22)
    som('ding', tCoz + 0.1, 0.25)
    return (t) => {
      const t0 = inicio(nome)
      const e = mola(t - t0 - 0.05)
      css(mesa, { transform: `translateY(${(1 - e) * 500}px) rotate(${-4 * e + (1 - e) * 10}deg)` })
      const sc = p(t, tScan - 0.1, tScan + 0.6)
      css(feixe, { top: 96 + Math.sin(sc * Math.PI) * 296 + 'px', opacity: sc > 0 && sc < 1 ? 1 : 0 })
      const ec = outQ(p(t, t0 + 0.3, t0 + 0.8))
      css(coz, { opacity: ec, transform: `translateY(${(1 - ec) * 80}px)` })
      // trajeto do ticket: sai do QR, faz um arco e pousa na cozinha
      const a = p(t, tScan + 0.45, tScan + 0.75), v = inOut(p(t, tScan + 0.75, tCoz + 0.1))
      const x0 = 100, y0 = 560, x1 = 530, y1 = 1120
      const x = lerp(x0, x1, v), y = lerp(y0, y1, v) - Math.sin(v * Math.PI) * 260
      css(ticket, { left: x + 'px', top: y + 'px', opacity: outQ(a), transform: `scale(${(0.5 + 0.5 * outQ(a)) * (1 - 0.1 * v)}) rotate(${Math.sin(v * Math.PI) * -10}deg)` })
      css(flash, { opacity: p(t, tCoz + 0.05, tCoz + 0.15) * (1 - p(t, tCoz + 0.2, tCoz + 0.8)) })
    }
  }

  // Comissão: pedidos chegando, cada um mordido pela etiqueta de −23%, e o contador do mês subindo.
  TIPOS.comissao = (box, cfg, nome) => {
    const ws = falas(nome).flatMap(palavras)
    const perg = el('<div class="serif" style="left:80px;top:290px;width:930px;font-size:100px;line-height:1.02"></div>', box)
    const dest = new Set((cfg.destaque || '').split(/\s+/).map(norm).filter(Boolean))
    const ps = ws.map((pw) => { const m = el(`<span class="mask"><span>${dest.has(norm(pw.w)) ? `<em>${pw.w}</em>` : pw.w}</span></span>`, perg); perg.appendChild(document.createTextNode(' ')); return { n: m.firstElementChild, de: pw.de } })
    const pedidos = cfg.pedidos || [['#1043', 'R$ 87,50', '− R$ 20,13'], ['#1044', 'R$ 64,00', '− R$ 14,72'], ['#1045', 'R$ 112,90', '− R$ 25,97']]
    const t0 = cena[nome].de
    const cards = pedidos.map((pd, i) => {
      const n = el(`<div style="left:90px;top:${720 + i * 190}px;width:900px;height:160px;border-radius:36px;background:#1f1d19;border:2px solid #2e2b26">
        <div style="left:34px;top:34px;font:500 26px/1 var(--sans);color:#9a958b;letter-spacing:.04em">APP DE ENTREGA · ${pd[0]}</div>
        <div style="left:34px;top:76px;font:800 50px/1 var(--sans)">Novo pedido</div>
        <div class="val" style="right:34px;top:40px;font:800 50px/1 var(--sans)">${pd[1]}</div>
        <div class="tag" style="right:30px;top:100px;padding:8px 16px;border-radius:12px;background:#e2786a;color:#141310;font:800 30px/1 var(--sans)">${pd[2]}</div></div>`, box)
      const de = t0 + 0.35 + i * (cfg.intervalo || 0.75)
      som('pop', de, 0.18); som('glitch', de + 0.35, 0.1)
      return { n, val: n.querySelector('.val'), tag: n.querySelector('.tag'), de }
    })
    const cont = el(`<div style="left:90px;top:1330px;width:900px;height:150px">
      <div style="left:0;top:0;font:600 30px/1 var(--sans);color:#9a958b;letter-spacing:.06em">${cfg.rotuloContador || 'COMISSÃO NO MÊS'}</div>
      <div class="num" style="left:0;top:46px;font:800 92px/1 var(--sans);color:#e2786a">R$ 0</div></div>`, box)
    const num = cont.querySelector('.num')
    const alvo = cfg.mes || 4600, passoNum = alvo > 20000 ? 100 : 50
    return (t) => {
      ps.forEach(({ n, de }) => revela(n, t, de, 0.32))
      cards.forEach(({ n, val, tag, de }) => {
        const s = mola(t - de)
        css(n, { opacity: cl(s * 2), transform: `translateY(${(1 - s) * -120}px)` })
        const m = mola(t - de - 0.35)
        css(tag, { transform: `scale(${m}) rotate(${(1 - m) * -20 - 4}deg)`, opacity: cl(m * 2) })
        css(val, { color: m > 0.5 ? '#9a958b' : '#f2efe8' })
      })
      const c = outQ(p(t, t0 + 0.5, fim(nome) - 0.2))
      css(cont, { opacity: p(t, t0 + 0.3, t0 + 0.6) })
      num.textContent = 'R$ ' + (Math.round((c * alvo) / passoNum) * passoNum).toLocaleString('pt-BR')
    }
  }

  // Diagnóstico: nota do site sobe enquanto os problemas aparecem e são corrigidos.
  TIPOS.diagnostico = (box, cfg, nome) => {
    const fs = falas(nome)
    const [tA, tB, tC] = [0, 1, 2].map((i) => (fs[i] || fs[fs.length - 1]).de)
    el(`<div class="eyebrow" style="left:0;top:300px;width:1080px;text-align:center">${cfg.titulo || 'Nota da sua presença online'}</div>`, box)
    const R = 220, Lc = 2 * Math.PI * R
    const anel = el(`<svg width="560" height="560" style="left:260px;top:390px" viewBox="0 0 560 560">
      <circle cx="280" cy="280" r="${R}" fill="none" stroke="#2e2b26" stroke-width="26"/>
      <circle class="arco" cx="280" cy="280" r="${R}" fill="none" stroke="#e2786a" stroke-width="26" stroke-linecap="round" transform="rotate(-90 280 280)" stroke-dasharray="${Lc}" stroke-dashoffset="${Lc}"/>
      <circle class="scan" cx="280" cy="280" r="${R + 34}" fill="none" stroke="#d4b483" stroke-width="3" stroke-dasharray="40 1560" opacity="0"/></svg>`, box)
    const arco = anel.querySelector('.arco'), scan = anel.querySelector('.scan')
    const nota = el('<div class="serif" style="left:0;top:540px;width:1080px;text-align:center;font-size:230px;line-height:1">0</div>', box)
    const itens = (cfg.itens || ['WhatsApp quebrado', 'Site lento', 'Sem cadeado']).map((tx, i) => {
      const n = el(`<div class="flex" style="left:300px;top:${1030 + i * 130}px;height:110px;padding:0 34px 0 24px;border-radius:55px;border:3px solid #e2786a;background:#141310;display:flex;align-items:center;gap:18px;white-space:nowrap;font:700 40px/1 var(--sans);color:#e2786a">
        <span class="ic" style="display:inline-flex;width:44px;height:44px;border-radius:50%;background:#e2786a;color:#141310;font:800 34px/44px var(--sans);justify-content:center">!</span><span class="tx">${tx}</span></div>`, box)
      som('pop', tB + i * 0.25, 0.2)
      return { n, ic: n.querySelector('.ic'), de: tB + i * 0.25 }
    })
    aposFontes.push(() => itens.forEach(({ n }) => css(n, { left: (W - n.offsetWidth) / 2 + 'px' })))
    som('ding', tC + 0.8, 0.25)
    const mixCor = (a, b, x) => { const ha = a.match(/\w\w/g).map((h) => parseInt(h, 16)), hb = b.match(/\w\w/g).map((h) => parseInt(h, 16)); return `rgb(${ha.map((v, i) => Math.round(lerp(v, hb[i], x))).join(',')})` }
    return (t) => {
      const sobe1 = outQ(p(t, tA, tB)), corr = inOut(p(t, tC - 0.1, tC + 0.8))
      const v = Math.round(lerp(0, 38, sobe1) + corr * (96 - 38))
      nota.textContent = v
      css(nota, { color: mixCor('e2786a', 'd4b483', corr) })
      arco.setAttribute('stroke-dashoffset', Lc * (1 - v / 100))
      arco.setAttribute('stroke', mixCor('e2786a', 'd4b483', corr))
      css(scan, { opacity: p(t, tA - 0.2, tA) * (1 - p(t, tB - 0.2, tB)), transform: `rotate(${t * 260}deg)`, transformOrigin: '280px 280px' })
      itens.forEach(({ n, ic, de }, i) => {
        const s = mola(t - de)
        const ok = p(t, tC + i * 0.15, tC + 0.1 + i * 0.15)
        css(n, { opacity: cl(s * 2), transform: `scale(${0.7 + 0.3 * s})`, borderColor: ok > 0.5 ? '#d4b483' : '#e2786a', color: ok > 0.5 ? '#f2efe8' : '#e2786a' })
        css(ic, { background: ok > 0.5 ? '#d4b483' : '#e2786a' })
        ic.textContent = ok > 0.5 ? '✓' : '!'
      })
    }
  }

  // Conta: valor × porcentagem = número vermelho grande (cada linha entra numa fala da cena).
  TIPOS.conta = (box, cfg, nome) => {
    const fs = falas(nome), tA = fs[0].de, tB = (fs[1] || fs[0]).de
    el(`<div class="eyebrow" style="left:0;top:330px;width:1080px;text-align:center">${cfg.titulo || 'A conta do aplicativo'}</div>`, box)
    const l1 = el('<div class="serif" style="left:0;top:470px;width:1080px;text-align:center;font-size:150px;line-height:1"></div>', box)
    const p1 = frase(l1, cfg.linha1)
    const l2 = el('<div class="serif" style="left:0;top:650px;width:1080px;text-align:center;font-size:150px;line-height:1"></div>', box)
    const p2 = frase(l2, cfg.linha2)
    const traco = el('<div style="left:190px;top:860px;width:700px;height:4px;background:#2e2b26;transform-origin:50% 50%"></div>', box)
    const num = el('<div style="left:0;top:920px;width:1080px;text-align:center;font:800 190px/1 var(--sans);color:#e2786a;letter-spacing:-.03em">−R$ 0</div>', box)
    const nota = el(`<div style="left:0;top:1160px;width:1080px;text-align:center;font:600 40px/1 var(--sans);color:#9a958b">${cfg.nota || ''}</div>`, box)
    som('glitch', tB + 1.2, 0.14)
    return (t) => {
      p1.forEach((n, i) => revela(n, t, tA + i * 0.1))
      p2.forEach((n, i) => revela(n, t, tA + 0.6 + i * 0.1))
      css(traco, { transform: `scaleX(${outQ(p(t, tB - 0.2, tB + 0.3))})` })
      const c = outQ(p(t, tB, tB + 1.2))
      num.textContent = '−R$ ' + (Math.round((c * cfg.valor) / 50) * 50).toLocaleString('pt-BR')
      const tremor = p(t, tB + 1.2, tB + 1.25) * (1 - p(t, tB + 1.25, tB + 1.6))
      css(num, { opacity: p(t, tB - 0.1, tB + 0.1), transform: `translateX(${Math.sin(t * 90) * 14 * tremor}px) scale(${1 + tremor * 0.04})` })
      css(nota, { opacity: p(t, tB + 1.2, tB + 1.6) })
    }
  }

  // Chamada final: logo desenhado, título, botão do WhatsApp e site.
  TIPOS.cta = (box, cfg, nome) => {
    const logoG = el(`<div style="left:420px;top:330px;width:240px;height:240px">${LOGO}</div>`, box)
    const desenha = traco(logoG)
    const tit = el('<div class="serif" style="left:60px;top:660px;width:960px;text-align:center;font-size:132px;line-height:1"></div>', box)
    const ps = frase(tit, cfg.titulo || 'Peça seu | *orçamento*')
    const zap = el(`<div class="flex" style="left:110px;top:1010px;width:860px;height:160px;border-radius:80px;background:#25d366;display:flex;align-items:center;justify-content:center;gap:26px;color:#fff;font:800 64px/1 var(--sans);box-shadow:0 30px 70px rgba(37,211,102,.25)">
      <span style="display:inline-flex">${ZAP()}</span><span>(11) 96445-2878</span></div>`, box)
    const site = el('<div style="left:0;top:1222px;width:1080px;text-align:center;font:500 38px/1 var(--sans);color:#9a958b">movitechsistemas.com.br</div>', box)
    som('ding', inicio(nome) + 0.9, 0.22)
    return (t) => {
      const s5 = inicio(nome)
      desenha(s5 + 0.1, t, 0.2, 0.9)
      ps.forEach((n, i) => revela(n, t, s5 + 0.35 + i * 0.12, 0.45))
      const z = mola(t - s5 - 0.9)
      const resp = 1 + Math.max(0, Math.sin((t - s5 - 1.8) * 4)) * 0.025 * p(t, s5 + 1.8, s5 + 2)
      css(zap, { transform: `scale(${(0.6 + 0.4 * z) * resp})`, opacity: cl(z * 2) })
      css(site, { opacity: p(t, s5 + 1.3, s5 + 1.7) })
    }
  }

  // ---------- monta as cenas ----------
  const cenas = VID.cenas.map((cfg) => { const box = caixa(); return { box, nome: cfg.cena, desenha: TIPOS[cfg.tipo](box, cfg, cfg.cena) } })
  const cort = el('<div style="left:0;top:0;width:1080px;height:1920px;background:#1f1d19"><div style="left:0;top:0;width:1080px;height:6px;background:#d4b483"></div></div>')
  const leg = el('<div style="left:70px;top:1560px;width:940px;text-align:center;font:600 50px/1.25 var(--sans)"></div>')
  const legs = V.legendas.map((l, i) => {
    const prox = V.legendas[i + 1]
    const d = el('<div style="left:0;top:0;width:940px;text-align:center"></div>', leg)
    const ps = palavras(l).map((pw) => ({ s: el(`<span>${pw.w} </span>`, d), de: pw.de }))
    return { d, l, ps, sai: Math.min(l.ate + 0.25, prox ? prox.de - 0.05 : 1e9) }
  })

  function seek(t) {
    css(brilho, { left: 540 - 700 + Math.sin(t * 0.35) * 220 + 'px', top: 560 - 700 + Math.cos(t * 0.27) * 260 + 'px' })
    linhas.forEach((n, i) => css(n, { transform: `scaleX(${outQ(p(t, 0.1 + i * 0.12, 1.1 + i * 0.12))})`, transformOrigin: i % 2 ? '100% 0' : '0 0' }))
    css(topo, { opacity: p(t, 0, 0.4), transform: `translateY(${(1 - outQ(p(t, 0, 0.6))) * -30}px)` })
    let cy = H
    for (const nome of ORDEM.slice(1)) {
      const x = p(t, inicio(nome) - 0.28, inicio(nome) + 0.28)
      if (x > 0 && x < 1) cy = x < 0.5 ? lerp(H, 0, inOut(x * 2)) : lerp(0, -H, inOut((x - 0.5) * 2))
    }
    css(cort, { transform: `translateY(${cy}px)` })
    cenas.forEach(({ box, nome, desenha }) => {
      const on = t >= inicio(nome) && t < fim(nome)
      box.style.display = on ? '' : 'none'
      if (on) desenha(t)
    })
    legs.forEach(({ d, l, ps, sai }) => {
      const on = t >= l.de - 0.05 && t < sai
      d.style.display = on ? '' : 'none'
      if (!on) return
      const x = outQ(p(t, l.de - 0.05, l.de + 0.2))
      css(d, { opacity: x, transform: `translateY(${(1 - x) * 16}px)` })
      ps.forEach(({ s, de }) => { s.style.color = t >= de ? (t < de + 0.3 ? '#d4b483' : '#f2efe8') : 'rgba(242,239,232,.35)' })
    })
  }

  window.AUDIO = [
    { src: `../../public/voz/${VID.voz}.mp3`, at: 0, vol: 1 },
    { src: '../../public/trilha/base.wav', at: 0, vol: 0.16, ate: DUR, fade: 1.2, loop: true },
    ...ORDEM.slice(1).map((n) => ({ src: '../../public/sfx/whoosh.wav', at: inicio(n) - 0.25, vol: 0.22 })),
    ...sons,
  ]
  window.DURACAO = DUR
  window.FPS = FPS
  window.seek = seek

  // Encaixa o palco 1080×1920 na janela; ?play toca em loop, ?t=5 congela em 5 s.
  const ajusta = () => { const k = Math.min(innerWidth / W, innerHeight / H); css(palco, { transform: `translate(${(innerWidth - W * k) / 2}px,${(innerHeight - H * k) / 2}px) scale(${k})` }) }
  const q = new URLSearchParams(location.search)
  if (!q.has('render')) { ajusta(); addEventListener('resize', ajusta) }
  document.fonts.ready.then(() => {
    aposFontes.forEach((f) => f())
    seek(+(q.get('t') || 0))
    if (q.has('play')) { const t0 = performance.now(); const loop = () => { seek(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop) }; loop() }
    window.PRONTO = true
  })
})()
