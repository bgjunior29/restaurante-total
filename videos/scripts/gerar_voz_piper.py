"""Narração com o Piper (voz neural local, pt-BR "faber", masculina) — alternativa quando o edge-tts está bloqueado.

Uso (na pasta videos):  python scripts/gerar_voz_piper.py nicho-
Usa os mesmos ROTEIROS de gerar_voz.py. Cada fala é sintetizada separadamente, então o início e o fim de cada
legenda são exatos; dentro da fala, o tempo de cada palavra é distribuído pelo tamanho da palavra.
Saída: public/voz/<id>.mp3 e src/voz/<id>.json (mesmo formato do gerar_voz.py).
"""
import io
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig

RAIZ = Path(__file__).resolve().parent.parent
MODELO = RAIZ / "models" / "pt_BR-faber-medium.onnx"
PALAVRA = re.compile(r"[\wÀ-ÿ]+")
PAUSA_VIRGULA, PAUSA_PONTO = 0.18, 0.38

src = (Path(__file__).parent / "gerar_voz.py").read_text(encoding="utf-8").split("async def gerar")[0]
ns = {"__file__": str(Path(__file__).parent / "gerar_voz.py")}
exec(src.replace("import edge_tts", ""), ns)
ROTEIROS = ns["ROTEIROS"]

voz = PiperVoice.load(str(MODELO))
config = SynthesisConfig(length_scale=0.92, noise_scale=0.6, noise_w_scale=0.8)  # um pouco mais rápido e expressivo


def sintetiza(texto):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        voz.synthesize_wav(texto, w, syn_config=config)
    buf.seek(0)
    with wave.open(buf) as r:
        return r.getframerate(), r.readframes(r.getnframes()), r.getnframes() / r.getframerate()


for nome, roteiro in ROTEIROS.items():
    if sys.argv[1:] and not any(nome.startswith(f) for f in sys.argv[1:]):
        continue
    sr, pcm, t = None, bytearray(), 0.15
    legendas, cenas = [], []
    for cena, linhas in roteiro:
        for linha in linhas:
            falado, mostrado = linha if isinstance(linha, tuple) else (linha, linha)
            taxa, audio, dur = sintetiza(falado)
            sr = sr or taxa
            if not pcm:
                pcm += b"\x00\x00" * int(sr * t)
            pcm += audio
            ws = PALAVRA.findall(falado)
            pesos = [len(w) + 2 for w in ws]
            inicio, fim = t + 0.05, t + dur - 0.08
            palavras, acc = [], inicio
            for w, p in zip(ws, pesos):
                d = (fim - inicio) * p / sum(pesos)
                palavras.append({"de": round(acc, 3), "ate": round(acc + d, 3), "t": w})
                acc += d
            leg = {"de": round(inicio, 3), "ate": round(fim, 3), "texto": mostrado}
            if falado == mostrado:
                leg["palavras"] = palavras
            legendas.append(leg)
            pausa = PAUSA_VIRGULA if mostrado.rstrip().endswith((",", ":")) else PAUSA_PONTO
            pcm += b"\x00\x00" * int(sr * pausa)
            t += dur + pausa
            if cenas and cenas[-1]["cena"] == cena:
                cenas[-1]["ate"] = leg["ate"]
            else:
                cenas.append({"cena": cena, "de": leg["de"], "ate": leg["ate"]})
    wav = RAIZ / "public" / "voz" / f"{nome}.wav"
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(bytes(pcm))
    subprocess.run(f'npx remotion ffmpeg -y -v error -i public/voz/{nome}.wav -codec:a libmp3lame -q:a 3 public/voz/{nome}.mp3', shell=True, cwd=RAIZ, check=True)
    wav.unlink()
    duracao = round(t + 0.6, 2)
    (RAIZ / "src" / "voz" / f"{nome}.json").write_text(json.dumps({"duracao": duracao, "legendas": legendas, "cenas": cenas, "voz": "piper-faber"}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{nome}: {duracao}s, {len(legendas)} legendas")
