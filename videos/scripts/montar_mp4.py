"""Recebe quadros JPEG pela entrada padrão (vindos do scripts/render_html.mjs) e grava o MP4 com PyAV.

Protocolo: 1 linha JSON {w, h, fps, total, audio: [{src, at, vol, ate?, fade?}], saida}, depois, para cada quadro,
4 bytes (tamanho, little-endian) + o JPEG. O áudio é mixado aqui: narração, trilha e efeitos, cada um no seu tempo.
"""
import io
import json
import struct
import sys
from fractions import Fraction

import av
import numpy as np
from PIL import Image

SR = 48000


def carregar_audio(caminho):
    """Decodifica qualquer áudio para float32 estéreo 48 kHz, formato (amostras, 2)."""
    partes = []
    with av.open(caminho) as f:
        rs = av.AudioResampler(format="flt", layout="stereo", rate=SR)
        for quadro in f.decode(audio=0):
            for q in rs.resample(quadro):
                partes.append(q.to_ndarray().reshape(-1, 2))
        for q in rs.resample(None):
            partes.append(q.to_ndarray().reshape(-1, 2))
    return np.concatenate(partes) if partes else np.zeros((0, 2), np.float32)


def mixar(faixas, duracao):
    n = int(duracao * SR)
    mix = np.zeros((n, 2), np.float32)
    for f in faixas:
        s = carregar_audio(f["src"]) * f.get("vol", 1)
        ini = int(f.get("at", 0) * SR)
        if "ate" in f:
            s = s[: max(0, int(f["ate"] * SR) - ini)].copy()
            fade = int(f.get("fade", 0) * SR)
            if fade and len(s) > fade:
                s[-fade:] *= np.linspace(1, 0, fade)[:, None]
        fim = min(n, ini + len(s))
        if fim > ini:
            mix[ini:fim] += s[: fim - ini]
    pico = np.abs(mix).max()
    if pico > 0.98:  # evita estourar
        mix *= 0.98 / pico
    return mix


def main():
    entrada = sys.stdin.buffer
    cab = json.loads(entrada.readline())
    w, h, fps, total = cab["w"], cab["h"], cab["fps"], cab["total"]
    duracao = total / fps
    mix = mixar(cab["audio"], duracao)
    pico_db = 20 * np.log10(max(1e-9, np.abs(mix).max()))
    rms_db = 20 * np.log10(max(1e-9, float(np.sqrt((mix**2).mean()))))

    saida = av.open(cab["saida"], "w", options={"movflags": "+faststart"})
    v = saida.add_stream("libx264", rate=fps)
    v.width, v.height, v.pix_fmt = w, h, "yuv420p"
    v.options = {"crf": "18", "preset": "medium", "profile": "high"}
    a = saida.add_stream("aac", rate=SR)
    a.layout = "stereo"
    a.bit_rate = 192000

    bloco = 1024
    pos_audio = 0

    def audio_ate(seg):
        nonlocal pos_audio
        alvo = min(len(mix), int(seg * SR))
        while pos_audio + bloco <= alvo or (alvo == len(mix) and pos_audio < alvo):
            pedaço = mix[pos_audio : pos_audio + bloco]
            if len(pedaço) < bloco:
                pedaço = np.vstack([pedaço, np.zeros((bloco - len(pedaço), 2), np.float32)])
            q = av.AudioFrame.from_ndarray(np.ascontiguousarray(pedaço.T), format="fltp", layout="stereo")
            q.sample_rate = SR
            q.pts = pos_audio
            q.time_base = Fraction(1, SR)
            for pk in a.encode(q):
                saida.mux(pk)
            pos_audio += bloco

    for i in range(total):
        tam = struct.unpack("<I", entrada.read(4))[0]
        img = Image.open(io.BytesIO(entrada.read(tam))).convert("RGB")
        if img.size != (w, h):
            img = img.resize((w, h), Image.LANCZOS)
        q = av.VideoFrame.from_image(img)
        q.pts = i
        for pk in v.encode(q):
            saida.mux(pk)
        audio_ate((i + 1) / fps)

    audio_ate(duracao)
    for pk in v.encode():
        saida.mux(pk)
    for pk in a.encode():
        saida.mux(pk)
    saida.close()
    print(f"  áudio: pico {pico_db:.1f} dBFS, média {rms_db:.1f} dBFS", flush=True)


main()
