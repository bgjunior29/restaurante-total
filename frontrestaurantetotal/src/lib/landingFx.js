// Efeitos da home: scroll suave (Lenis), animações por scroll (GSAP + ScrollTrigger), títulos palavra por palavra
// (SplitType), cards com inclinação 3D, botões magnéticos, cursor próprio e a cena 3D (Three.js) presa ao scroll.
import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import SplitType from "split-type";

gsap.registerPlugin(ScrollTrigger);

function webglOk() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// Onde o logo 3D fica: cada seção [data-scene] pode ter uma âncora [data-anchor] invisível no layout.
// O logo se encaixa no centro e no tamanho dela (data-z = profundidade, data-burst = poeira espalhada).
// Seção sem âncora visível (ex.: no celular): o logo recua e encolhe até sumir, sem ficar atrás do texto.
const AMBIENT = { z: -20, burst: 0.3 };

function activeSection(root) {
  const mid = innerHeight * 0.5;
  for (const sec of root.querySelectorAll("[data-scene]")) {
    const r = sec.getBoundingClientRect();
    if (r.top <= mid && r.bottom >= mid) return sec;
  }
  return null;
}

function visibleAnchor(sec) {
  for (const el of sec.querySelectorAll("[data-anchor]")) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { el, r };
  }
  return null;
}

/**
 * Liga todos os efeitos dentro de `rootRef`. `canvasRef` recebe a cena 3D; `cursorRef`/`dotRef`, o cursor.
 * Retorna se a cena 3D está ativa (sem WebGL, a capa mostra as prévias ilustradas).
 */
export function useLandingFx({ rootRef, canvasRef, cursorRef, dotRef, progressRef }) {
  const [has3D] = useState(webglOk);

  useEffect(() => {
    const root = rootRef.current;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desk = matchMedia("(min-width: 1024px)").matches;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const cleanups = [];
    const on = (el, ev, fn) => {
      el.addEventListener(ev, fn);
      cleanups.push(() => el.removeEventListener(ev, fn));
    };

    // Scroll suave, sincronizado com o ScrollTrigger e com âncoras (#solucoes etc.).
    const lenis = reduce ? null : new Lenis({ lerp: 0.09, anchors: { offset: -80 } });
    const raf = (t) => lenis?.raf(t * 1000);
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    }

    const splits = [];
    const ctx = gsap.context(() => {
      // Títulos entram palavra por palavra.
      root.querySelectorAll("[data-split]").forEach((el) => {
        const st = new SplitType(el, { types: "words" });
        splits.push(st);
        if (reduce) return;
        const hero = el.dataset.split === "hero";
        gsap.from(st.words, {
          yPercent: 60,
          rotate: 3,
          opacity: 0,
          duration: hero ? 1.3 : 1.1,
          delay: hero ? 0.15 : 0,
          ease: "expo.out",
          stagger: hero ? 0.05 : 0.04,
          scrollTrigger: hero ? undefined : { trigger: el, start: "top 88%" },
        });
      });
      if (reduce) return;

      gsap.from("[data-hero-in]", { y: 36, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.1, delay: 0.5 });

      // Blocos que sobem ao aparecer; grupos [data-stagger] entram em sequência, com leve giro 3D.
      gsap.utils.toArray("[data-reveal]").forEach((el) =>
        gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } }),
      );
      gsap.utils.toArray("[data-stagger]").forEach((group) =>
        gsap.from(group.children, {
          y: 90,
          rotateX: -25,
          opacity: 0,
          transformOrigin: "50% 100%",
          duration: 1.2,
          ease: "expo.out",
          stagger: 0.1,
          scrollTrigger: { trigger: group, start: "top 85%" },
        }),
      );

      // Faixa de segmentos: anda sozinha e acelera com a velocidade do scroll.
      const mq = root.querySelector("[data-marquee]");
      if (mq) {
        const loop = gsap.to(mq, { xPercent: -50, ease: "none", duration: 40, repeat: -1 });
        let boost = 0;
        lenis?.on("scroll", ({ velocity }) => {
          boost = Math.max(-6, Math.min(6, velocity * 0.25));
        });
        const ease = () => {
          boost *= 0.94;
          loop.timeScale(1 + boost);
        };
        gsap.ticker.add(ease);
        cleanups.push(() => gsap.ticker.remove(ease));
      }

      if (progressRef.current)
        gsap.to(progressRef.current, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });
    }, root);

    // Interações de mouse (só com mouse de verdade).
    if (fine && !reduce) {
      root.querySelectorAll("[data-tilt]").forEach((c) => {
        gsap.set(c, { transformPerspective: 1000 });
        const rx = gsap.quickTo(c, "rotationX", { duration: 0.6, ease: "power3" });
        const ry = gsap.quickTo(c, "rotationY", { duration: 0.6, ease: "power3" });
        on(c, "pointermove", (e) => {
          const r = c.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          ry((px - 0.5) * 14);
          rx((0.5 - py) * 10);
          c.style.setProperty("--gx", `${px * 100}%`);
          c.style.setProperty("--gy", `${py * 100}%`);
        });
        on(c, "pointerleave", () => {
          rx(0);
          ry(0);
        });
      });
      root.querySelectorAll("[data-glow]").forEach((el) =>
        on(el, "pointermove", (e) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty("--mx", `${e.clientX - r.left}px`);
          el.style.setProperty("--my", `${e.clientY - r.top}px`);
        }),
      );
      root.querySelectorAll("[data-magnetic]").forEach((b) => {
        const mx = gsap.quickTo(b, "x", { duration: 0.6, ease: "elastic.out(1, .4)" });
        const my = gsap.quickTo(b, "y", { duration: 0.6, ease: "elastic.out(1, .4)" });
        on(b, "pointermove", (e) => {
          const r = b.getBoundingClientRect();
          mx((e.clientX - r.left - r.width / 2) * 0.3);
          my((e.clientY - r.top - r.height / 2) * 0.4);
        });
        on(b, "pointerleave", () => {
          mx(0);
          my(0);
        });
      });
      const cur = cursorRef.current;
      const dot = dotRef.current;
      if (cur && dot) {
        gsap.set([cur, dot], { opacity: 1 });
        const cx = gsap.quickTo(cur, "x", { duration: 0.45, ease: "power3" });
        const cy = gsap.quickTo(cur, "y", { duration: 0.45, ease: "power3" });
        on(window, "pointermove", (e) => {
          cx(e.clientX);
          cy(e.clientY);
          gsap.set(dot, { x: e.clientX, y: e.clientY });
          cur.classList.toggle("is-hover", !!e.target.closest?.("a, button, summary, [data-tilt]") || !!scene3d?.hovering);
        });
      }
    }

    // Cena 3D: carregada sob demanda; o logo segue a âncora da seção que está no meio da tela.
    let alive = true;
    let scene3d = null;
    let tick = null;
    const sceneCtx = gsap.context(() => {}, root);
    if (has3D && canvasRef.current) {
      const S = { rotY: 0, rotX: 0, x: 0, y: 0, z: 0, scale: 1, appear: reduce ? 1 : 0.25, burst: 0, draw: reduce ? 1 : 0, vel: 0 };
      // O logo balança de leve com a velocidade do scroll.
      lenis?.on("scroll", ({ velocity }) => (S.vel = velocity));
      import("./scene3d.js")
        .then(({ createScene }) => {
          if (!alive) return;
          scene3d = createScene(canvasRef.current, S, { mobile: !desk });
          const t0 = performance.now();
          let current = null;
          let settle = 1;
          let first = true;
          let spin = 0;
          tick = () => {
            const sec = activeSection(root);
            const key = sec ?? current;
            // Ao trocar de seção: um giro completo enquanto o logo viaja até a nova âncora.
            if (key && key !== current) {
              if (current && !reduce) {
                spin += Math.PI * 2;
                gsap.to(S, { rotY: spin, duration: 1.6, ease: "power3.inOut", overwrite: "auto" });
              }
              current = key;
              settle = 0;
            }
            const a = current ? visibleAnchor(current) : null;
            const z = a ? +(a.el.dataset.z || 0) : AMBIENT.z;
            const burst = a ? +(a.el.dataset.burst || 0) : AMBIENT.burst;
            const goal = a
              ? scene3d.place(a.r.left + a.r.width / 2, a.r.top + a.r.height / 2, Math.min(a.r.width, a.r.height), z)
              : { ...scene3d.place(innerWidth / 2, innerHeight / 2, 0, z), scale: 0 };
            // Parado na seção, o logo acompanha a âncora quase colado; na troca, viaja suave.
            settle = Math.min(1, settle + 0.012);
            const k = first ? 1 : 0.05 + settle * settle * 0.3;
            first = false;
            S.x += (goal.x - S.x) * k;
            S.y += (goal.y - S.y) * k;
            S.z += (z - S.z) * k;
            S.scale += (goal.scale - S.scale) * k;
            S.burst += (burst - S.burst) * 0.05;
            S.vel *= 0.9;
            scene3d.render((performance.now() - t0) / 1000);
          };
          gsap.ticker.add(tick);
          sceneCtx.add(() => {
            if (!reduce) {
              gsap.fromTo(S, { appear: 0.25, rotY: -Math.PI }, { appear: 1, rotY: 0, duration: 2.2, ease: "expo.out" });
              // O M se desenha como se fosse escrito à mão, depois do disco aparecer.
              gsap.to(S, { draw: 1, duration: 1.6, delay: 0.5, ease: "power2.inOut" });
            }
            gsap.to(canvasRef.current, { opacity: 1, duration: 1.2 });
          });
        })
        .catch(() => {});
    }

    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);

    return () => {
      alive = false;
      sceneCtx.revert();
      if (tick) gsap.ticker.remove(tick);
      scene3d?.destroy();
      ctx.revert();
      splits.forEach((s) => s.revert());
      cleanups.forEach((fn) => fn());
      if (lenis) {
        gsap.ticker.remove(raf);
        lenis.destroy();
      }
    };
  }, [rootRef, canvasRef, cursorRef, dotRef, progressRef, has3D]);

  return has3D;
}
