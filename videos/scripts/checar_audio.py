"""Falha se alguma narração estiver muda (pico de volume muito baixo). Uso: python scripts/checar_audio.py public/voz/nicho-*.mp3"""
import subprocess, sys, re
ruim = []
for f in sys.argv[1:]:
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", f, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.search(r"max_volume: (-?[\d.]+) dB", out)
    pico = float(m.group(1)) if m else -99
    print(f"{f}: pico {pico} dB")
    if pico < -30:
        ruim.append(f)
if ruim:
    sys.exit(f"narração muda: {ruim}")
