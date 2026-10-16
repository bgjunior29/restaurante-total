// Cor de destaque da home que troca sozinha de tempos em tempos (dourado → azul → laranja → ...).
// Todas foram escolhidas com contraste alto: acima de 8:1 sobre o fundo preto e com o texto escuro dos botões.
import { useEffect } from "react";

export const ACCENTS = [
  { name: "Dourado", accent: "#d4b483", deep: "#8a7350" },
  { name: "Azul", accent: "#6cb8ff", deep: "#3d6f9e" },
  { name: "Laranja", accent: "#ff9a52", deep: "#a35a28" },
  { name: "Rosa", accent: "#ff86bd", deep: "#a14a73" },
  { name: "Menta", accent: "#5fe0b0", deep: "#2f8a68" },
  { name: "Lilás", accent: "#b49cff", deep: "#6a58a8" },
  { name: "Pérola", accent: "#ece6da", deep: "#8f877a" },
];

/**
 * Troca a cor de destaque dentro de `rootRef` a cada `everyMs` (padrão 60 s; `?cores=rapido` troca a cada 8 s
 * para testar). Avisa a cena 3D pelo evento `accentchange` (detail = cor em hex).
 */
export function useAccentCycle(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fast = new URLSearchParams(location.search).get("cores") === "rapido";
    const everyMs = fast ? 8000 : 60 * 1000;
    let i = 0;
    const apply = () => {
      const c = ACCENTS[i];
      root.style.setProperty("--color-lime", c.accent);
      root.style.setProperty("--color-olive", c.deep);
      root.dataset.accent = c.accent;
      root.dispatchEvent(new CustomEvent("accentchange", { detail: c.accent }));
    };
    root.classList.add("accent-cycle");
    root.dataset.accent = ACCENTS[0].accent;
    const id = setInterval(() => {
      i = (i + 1) % ACCENTS.length;
      apply();
    }, everyMs);
    return () => {
      clearInterval(id);
      root.classList.remove("accent-cycle");
      root.style.removeProperty("--color-lime");
      root.style.removeProperty("--color-olive");
    };
  }, [rootRef]);
}
