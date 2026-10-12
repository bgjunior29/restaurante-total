"""Efeitos sonoros sintetizados (sem direitos autorais): whoosh, pop, ding, glitch, impacto. Saída: public/sfx/*.wav"""
import math
import random
import struct
import wave
from pathlib import Path

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public" / "sfx"
random.seed(7)


def salvar(nome, amostras):
    OUT.mkdir(parents=True, exist_ok=True)
    pico = max(1e-9, max(abs(a) for a in amostras))
    with wave.open(str(OUT / f"{nome}.wav"), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(a / pico * 0.85 * 32767)) for a in amostras))


def whoosh(dur=0.5):
    n = int(SR * dur)
    out, lp, lp2 = [], 0.0, 0.0
    for i in range(n):
        t = i / n
        corte = 0.02 + 0.25 * math.sin(math.pi * t) ** 2  # filtro abre e fecha = "vento passando"
        x = random.uniform(-1, 1)
        lp += corte * (x - lp)
        lp2 += corte * (lp - lp2)
        env = math.sin(math.pi * t) ** 1.5
        out.append(lp2 * env)
    return out


def pop(dur=0.13):
    n = int(SR * dur)
    out, fase = [], 0.0
    for i in range(n):
        t = i / SR
        f = 260 + 900 * math.exp(-t * 40)
        fase += 2 * math.pi * f / SR
        out.append(math.sin(fase) * math.exp(-t * 28))
    return out


def ding(dur=1.1):
    n = int(SR * dur)
    return [sum(a * math.sin(2 * math.pi * f * i / SR) for f, a in ((1318.5, 1), (1975.5, 0.5), (2637, 0.25))) * math.exp(-i / SR * 4.5) for i in range(n)]


def glitch(dur=0.25):
    n = int(SR * dur)
    out = []
    for i in range(n):
        bloco = (i // 600) % 3
        f = (180, 920, 440)[bloco]
        quad = 1 if math.sin(2 * math.pi * f * i / SR) > 0 else -1
        out.append(quad * 0.5 + random.uniform(-0.5, 0.5) * (bloco == 1))
    return out


def impacto(dur=0.5):
    n = int(SR * dur)
    out, lp = [], 0.0
    for i in range(n):
        t = i / SR
        lp += 0.08 * (random.uniform(-1, 1) - lp)
        grave = math.sin(2 * math.pi * (55 + 80 * math.exp(-t * 30)) * t)
        out.append((grave * 0.9 + lp * 2) * math.exp(-t * 9))
    return out


for nome, fn in [("whoosh", whoosh), ("pop", pop), ("ding", ding), ("glitch", glitch), ("impacto", impacto)]:
    salvar(nome, fn())
    print("ok", nome)
