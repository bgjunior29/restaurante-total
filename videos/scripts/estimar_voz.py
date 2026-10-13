"""Tempos PROVISÓRIOS (sem voz) para montar as animações enquanto o serviço de voz está fora.
Estima ~2,7 palavras por segundo e gera src/voz/<id>.json + um mp3 mudo. O gerar_voz.py sobrescreve depois."""
import json, re, subprocess, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import importlib.util
spec = importlib.util.spec_from_file_location("gv", Path(__file__).parent / "gerar_voz.py")
src = (Path(__file__).parent / "gerar_voz.py").read_text(encoding="utf-8").split("async def gerar")[0]
ns = {"__file__": str(Path(__file__).parent / "gerar_voz.py")}
exec(src.replace("import edge_tts", ""), ns)
RAIZ = Path(__file__).resolve().parent.parent
PAL = re.compile(r"[\wÀ-ÿ]+")
for nome, roteiro in ns["ROTEIROS"].items():
    if not any(nome.startswith(f) for f in sys.argv[1:] or [""]):
        continue
    t, legendas, cenas = 0.2, [], []
    for cena, linhas in roteiro:
        for linha in linhas:
            falado, mostrado = linha if isinstance(linha, tuple) else (linha, linha)
            ws = PAL.findall(falado)
            palavras = []
            for w in ws:
                d = 0.16 + 0.055 * len(w)
                palavras.append({"de": round(t, 3), "ate": round(t + d, 3), "t": w})
                t += d + 0.05
            leg = {"de": palavras[0]["de"], "ate": palavras[-1]["ate"], "texto": mostrado}
            if falado == mostrado:
                leg["palavras"] = palavras
            legendas.append(leg)
            t += 0.25 if mostrado.endswith((",", ":")) else 0.45
            if cenas and cenas[-1]["cena"] == cena:
                cenas[-1]["ate"] = leg["ate"]
            else:
                cenas.append({"cena": cena, "de": leg["de"], "ate": leg["ate"]})
    dur = round(t + 0.6, 2)
    (RAIZ / "src" / "voz" / f"{nome}.json").write_text(json.dumps({"duracao": dur, "legendas": legendas, "cenas": cenas, "provisorio": True}, ensure_ascii=False, indent=1), encoding="utf-8")
    subprocess.run(f'npx remotion ffmpeg -y -v error -f lavfi -i anullsrc=r=44100:cl=mono -t {dur} -q:a 9 public/voz/{nome}.mp3', shell=True, cwd=RAIZ, check=True)
    print(f"{nome}: {dur}s (provisório)")
