"""Trilha de fundo sintetizada (sem direitos autorais): 100 BPM, acordes quentes + batida leve. Saída: public/trilha/base.wav (40 s)."""
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 100
DUR = 40
OUT = Path(__file__).resolve().parent.parent / "public" / "trilha"
rng = np.random.default_rng(3)

n = SR * DUR
t = np.arange(n) / SR
beat = 60 / BPM
mix = np.zeros((n, 2))


def nota(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def soma(sinal, inicio, canal=None, pan=0.0):
    i = int(inicio * SR)
    if i >= n:
        return
    s = sinal[: n - i]
    mix[i : i + len(s), 0] += s * (1 - pan) / 2 * 2 ** 0.5
    mix[i : i + len(s), 1] += s * (1 + pan) / 2 * 2 ** 0.5


# Acordes (Am9 - Fmaj7 - C6/9 - G6), 2 compassos cada, pad suave com leve desafinação.
acordes = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 69], [48, 55, 60, 62, 64], [55, 59, 62, 64, 67]]
compasso = beat * 4
dur_ac = compasso * 2
tt = np.arange(int(dur_ac * SR)) / SR
env = np.minimum(1, tt / 0.6) * np.minimum(1, (dur_ac - tt) / 0.8)
k = 0
while k * dur_ac < DUR:
    pad = np.zeros_like(tt)
    for m in acordes[k % 4]:
        f = nota(m)
        for d in (-0.12, 0.12):
            pad += np.sin(2 * np.pi * f * (1 + d / 100) * tt) * 0.5 + 0.12 * np.sin(2 * np.pi * 2 * f * tt)
    soma(pad * env * 0.035, k * dur_ac)
    # baixo na tônica, uma nota por tempo forte
    for b in range(8):
        tb = np.arange(int(beat * 0.9 * SR)) / SR
        f = nota(acordes[k % 4][0] - 12)
        baixo = np.sin(2 * np.pi * f * tb) * np.exp(-tb * 3.5) * 0.22
        soma(baixo, k * dur_ac + b * beat)
    k += 1

# Bumbo nos tempos 1 e 3, palma no 2 e 4, chimbal em colcheias.
tk = np.arange(int(0.35 * SR)) / SR
bumbo = np.sin(2 * np.pi * (48 + 90 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 9) * 0.55
tp = np.arange(int(0.2 * SR)) / SR
palma = rng.uniform(-1, 1, len(tp)) * np.exp(-tp * 22) * 0.12
th = np.arange(int(0.05 * SR)) / SR
chimbal = np.diff(rng.uniform(-1, 1, len(th) + 1)) * np.exp(-th * 80) * 0.05
b = 0
while b * beat < DUR:
    tempo = b * beat
    if b % 2 == 0:
        soma(bumbo, tempo)
    else:
        soma(palma, tempo, pan=0.1)
    soma(chimbal, tempo + beat / 2, pan=-0.3)
    soma(chimbal * 0.6, tempo, pan=0.3)
    b += 1

mix /= np.abs(mix).max() / 0.8
fade = np.minimum(1, t / 0.5)[:, None]
mix *= fade
OUT.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUT / "base.wav"), "w") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"public/trilha/base.wav: {DUR}s, {BPM} BPM")
