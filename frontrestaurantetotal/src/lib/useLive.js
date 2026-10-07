import { useEffect, useRef } from 'react'

// No Vercel o WebSocket não passa pelo rewrite: VITE_WS_URL aponta direto para a API.
// Aceita só o trecho ws:// ou wss://, mesmo que a variável tenha sido colada com lixo em volta.
const WS_URL = (import.meta.env.VITE_WS_URL || '').match(/wss?:\/\/\S+/)?.[0]

/**
 * Conecta no WebSocket da "sala" do restaurante e chama onEvent(event, data) a cada aviso.
 * Reconecta sozinho e, como garantia, também chama onEvent('tick') a cada `pollMs`.
 */
export function useLive(slug, onEvent, pollMs = 20000) {
  const handler = useRef(onEvent)
  useEffect(() => {
    handler.current = onEvent
  })

  useEffect(() => {
    let ws
    let closed = false
    let retry
    let ping

    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      const base = (WS_URL || `${proto}://${location.host}/ws`).replace(/\/$/, '')
      ws = new WebSocket(`${base}/${encodeURIComponent(slug)}`)
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          handler.current(msg.event, msg.data)
        } catch {
          /* ignora mensagens inválidas */
        }
      }
      ws.onopen = () => {
        handler.current('reconnected')
        ping = setInterval(() => ws.readyState === 1 && ws.send('ping'), 25000)
      }
      ws.onclose = (e) => {
        clearInterval(ping)
        // 4429 = conexões demais deste IP: espera mais antes de tentar (o "tick" segue atualizando a tela).
        if (!closed) retry = setTimeout(connect, e.code === 4429 ? 30000 : 3000)
      }
    }
    connect()
    const poll = setInterval(() => handler.current('tick'), pollMs)

    // Celular que volta do bloqueio / aba que volta ao foco: atualiza na hora e reconecta se preciso.
    const wake = () => {
      if (document.visibilityState !== 'visible') return
      handler.current('tick')
      if (ws.readyState > 1) {
        clearTimeout(retry)
        connect()
      }
    }
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('online', wake)

    return () => {
      closed = true
      clearTimeout(retry)
      clearInterval(ping)
      clearInterval(poll)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('online', wake)
      ws?.close()
    }
  }, [slug, pollMs])
}

// Um único AudioContext para a página toda: criar um novo a cada bip esgota o limite do navegador,
// e ele só pode tocar depois de um toque/clique do usuário (unlockAudio).
let audio
function audioCtx() {
  audio ??= new (window.AudioContext || window.webkitAudioContext)()
  return audio
}

/** Chame num clique/toque para liberar o som (política de autoplay dos navegadores). */
export function unlockAudio() {
  try {
    if (audioCtx().state === 'suspended') audioCtx().resume()
  } catch {
    /* sem suporte a áudio */
  }
}

/** Dois bips curtos para avisar novo pedido no painel. */
export function beep() {
  try {
    const ctx = audioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    for (const [offset, freq] of [
      [0, 880],
      [0.18, 1175],
    ]) {
      const t = ctx.currentTime + offset
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.2, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.35)
    }
  } catch {
    /* navegador bloqueou o áudio */
  }
}
