// Cena 3D da home: o "L" do logo em metal champanhe, órbitas, satélites (celular, QR da mesa, comanda) e poeira dourada.
// Carregada sob demanda (import dinâmico) para não pesar nas outras páginas.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// Raio externo do anel do logo, em unidades da cena: é o que `place` encaixa no diâmetro pedido.
const LOGO_R = 3.17;
const CAM_Z = 10;

/**
 * Monta a cena no canvas. `state` é lido a cada quadro (posição, giro, escala, aparição, dispersão da poeira).
 * Retorna `render(t)` para o ticker, `place()` para converter uma área da página em posição 3D e `destroy()`.
 */
export function createScene(canvas, state, { mobile }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0f0e0c, 0.045);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(mobile ? 50 : 38, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);

  const gold = new THREE.MeshPhysicalMaterial({ color: 0xd4b483, metalness: 1, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 1.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, transmission: 1, thickness: 0.6, ior: 1.45, envMapIntensity: 1.2, transparent: true });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x1a1814, metalness: 0.6, roughness: 0.35, clearcoat: 1 });

  const hero = new THREE.Group();
  scene.add(hero);

  // O "L" com o mesmo traço do favicon (viewBox 48×48), em tubo com pontas arredondadas.
  const pts = [[18, 15.5], [18, 32.5], [30, 32.5]].map(([x, y]) => new THREE.Vector3((x - 24) / 6, -(y - 24) / 6, 0));
  const path = new THREE.CurvePath();
  for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  const R = 0.2;
  const mGroup = new THREE.Group();

  // Vida do traço: um pulso de luz que percorre o L (uv.x vai de 0 a 1 ao longo do tubo) e um brilho que "respira".
  const pulse = { uPulse: { value: -1 }, uGlow: { value: 0 } };
  const mGold = gold.clone();
  mGold.defines = { USE_UV: "" };
  mGold.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, pulse);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uPulse, uGlow;").replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
      float band = smoothstep(0.08, 0.0, abs(vUv.x - uPulse));
      totalEmissiveRadiance += vec3(1.0, 0.8, 0.5) * (band * 2.4 + uGlow);`,
    );
  };
  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 400, R, 32, false), mGold);
  const tubeCount = tube.geometry.index.count;
  mGroup.add(tube);
  // Onde cada junta fica ao longo do traço (0 a 1), para acender quando o desenho chega nela.
  const segLen = pts.slice(1).map((p, i) => p.distanceTo(pts[i]));
  const total = segLen.reduce((a, b) => a + b, 0);
  let acc = 0;
  const joints = pts.map((p, i) => {
    if (i > 0) acc += segLen[i - 1];
    const s = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 32), mGold);
    s.position.copy(p);
    mGroup.add(s);
    return { mesh: s, at: acc / total };
  });
  hero.add(mGroup);

  // Disco escuro e anel, como o círculo do logo.
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 0.22, 96), dark);
  disc.rotation.x = Math.PI / 2;
  disc.position.z = -0.35;
  hero.add(disc);
  const ringMat = gold.clone();
  ringMat.emissive = new THREE.Color(0xd4b483);
  ringMat.emissiveIntensity = 0;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.12, 0.045, 24, 200), ringMat);
  ring.position.z = -0.3;
  hero.add(ring);

  // Cometa de luz correndo pelo anel: cabeça brilhante e cauda que some.
  const comet = Array.from({ length: 16 }, (_, i) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.075 * (1 - i / 18), 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 1 - i / 16 }),
    );
    m.position.z = -0.3;
    hero.add(m);
    return m;
  });

  const orbits = new THREE.Group();
  hero.add(orbits);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd4b483, transparent: true, opacity: 0.35 });
  [[3.7, 1.2, 0.3], [4.1, -0.5, 1.1], [4.5, 0.7, -0.6]].forEach(([r, a, b]) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 8, 300), lineMat);
    t.rotation.set(a, b, 0);
    orbits.add(t);
  });

  // Satélites: celular (link de delivery), QR code da mesa e comanda da cozinha.
  const phone = new THREE.Group();
  phone.add(new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.8, 0.1, 6, 0.12), dark));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.6), new THREE.MeshBasicMaterial({ color: 0x8a7350, transparent: true, opacity: 0.7 }));
  screen.position.z = 0.051;
  phone.add(screen);
  const qr = new THREE.Group();
  qr.add(new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.1, 0.08, 4, 0.08), glass));
  const qrCell = new THREE.BoxGeometry(0.11, 0.11, 0.04);
  for (let i = 0; i < 7; i++)
    for (let j = 0; j < 7; j++)
      if ((i * 7 + j * 3 + i * j) % 3 !== 0 || (i < 2 && j < 2) || (i > 4 && j < 2) || (i < 2 && j > 4)) {
        const c = new THREE.Mesh(qrCell, gold);
        c.position.set((i - 3) * 0.13, (j - 3) * 0.13, 0.05);
        qr.add(c);
      }
  const ticket = new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.3, 0.05, 4, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x8f877a, roughness: 0.7 }));
  const sats = [[phone, 3.9, 0, 0.3], [qr, 4.3, 2.1, -0.3], [ticket, 3.6, 4.2, 0.4]].map(([obj, r, phase, tilt]) => {
    hero.add(obj);
    return { obj, r, phase, tilt };
  });

  // Poeira dourada: partículas com shader próprio (brilho piscando e dispersão controlada pelo scroll).
  const N = mobile ? 1400 : 3200;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = 6 + Math.random() * 16;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.6, r * Math.cos(ph) - 6], i * 3);
    seed[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uBurst: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float seed; uniform float uTime, uBurst, uPR; varying float vA;
      void main(){
        vec3 p = position;
        p.y += sin(uTime*.4 + seed*12.)*.35;
        p.x += cos(uTime*.3 + seed*9.)*.25;
        p *= 1. + uBurst*.6*seed;
        vec4 mv = modelViewMatrix * vec4(p,1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.2 + seed*2.6) * uPR * (12. / -mv.z);
        vA = .45 + .25*sin(uTime*1.5 + seed*30.);
      }`,
    fragmentShader: `
      varying float vA;
      void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard;
        gl_FragColor = vec4(vec3(.83,.71,.51), (1.-d*2.)*vA); }`,
  });
  const dust = new THREE.Points(pGeo, pMat);
  scene.add(dust);

  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  const key = new THREE.PointLight(0xffd9a0, 40, 30);
  key.position.set(4, 4, 6);
  scene.add(key);
  const rim = new THREE.PointLight(0x8a7350, 60, 30);
  rim.position.set(-6, -2, -4);
  scene.add(rim);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.38, 0.55, 0.86));
  composer.addPass(new OutputPass());

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => {
    mouse.tx = e.clientX / innerWidth - 0.5;
    mouse.ty = e.clientY / innerHeight - 0.5;
  };
  const onResize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setSize(innerWidth, innerHeight);
  };
  addEventListener("pointermove", onMove);
  addEventListener("resize", onResize);

  // Mouse sobre o logo: o raio acerta o disco ou o L. Não conta se o mouse está sobre conteúdo da página.
  const BLOCK = "a, button, input, label, summary, h1, h2, h3, p, li, header, [data-tilt], [data-glow], [data-reveal]";
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovering = false;
  function hitTest(e) {
    if (!hero.visible || e.target.closest?.(BLOCK)) return false;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects([disc, mGroup], true).length > 0;
  }

  // Molas: o logo segue o mouse com um leve balanço; um clique faz ele dar uma volta e voltar de frente.
  const spring = { rx: 0, ry: 0, vx: 0, vy: 0, spin: 0, spinV: 0, spinTo: 0, lift: 0 };
  let nextPulse = 0;
  let pulseT = -1;
  let flash = 0;
  let kick = 0;
  let last = 0;
  const firePulse = (t) => {
    pulseT = t;
    nextPulse = t + 4.5;
  };
  const onHover = (e) => {
    hovering = hitTest(e);
  };
  const onDown = (e) => {
    if (!hitTest(e)) return;
    spring.spinTo += Math.PI * 2;
    kick = 1;
    firePulse(last);
  };
  addEventListener("pointermove", onHover);
  addEventListener("pointerdown", onDown);

  const S = state;
  function render(t) {
    last = t;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    // Entrada: o L se desenha (S.draw de 0 a 1) e cada junta acende quando o traço chega nela.
    const draw = S.draw ?? 1;
    tube.geometry.setDrawRange(0, Math.floor((tubeCount * draw) / 6) * 6);
    joints.forEach((j) => (j.mesh.visible = draw >= j.at - 0.001));

    // Pulso de luz pelo traço a cada 4,5 s; quando ele termina, o anel dá um lampejo.
    if (draw >= 1 && nextPulse === 0) nextPulse = t + 0.4;
    if (nextPulse > 0 && t >= nextPulse) firePulse(t);
    const p = pulseT < 0 ? -1 : (t - pulseT) / 1.3;
    pulse.uPulse.value = p < 0 || p > 1 ? -1 : -0.1 + p * 1.2;
    if (p > 0.9 && p < 1) flash = 1;
    flash *= 0.93;
    spring.lift += ((hovering ? 1 : 0) - spring.lift) * 0.1;
    pulse.uGlow.value = 0.04 + Math.sin(t * 2) * 0.025 + spring.lift * 0.12;
    ringMat.emissiveIntensity = flash * 1.6 + spring.lift * 0.25;

    // Olhar segue o mouse (e balança com a velocidade do scroll); giro do clique com mola.
    const tx = mouse.y * 0.45 + (S.vel || 0) * 0.004;
    const ty = mouse.x * 0.7;
    spring.vx = (spring.vx + (tx - spring.rx) * 0.06) * 0.86;
    spring.vy = (spring.vy + (ty - spring.ry) * 0.06) * 0.86;
    spring.rx += spring.vx;
    spring.ry += spring.vy;
    spring.spinV = (spring.spinV + (spring.spinTo - spring.spin) * 0.03) * 0.88;
    spring.spin += spring.spinV;
    kick *= 0.95;

    const breathe = 1 + Math.sin(t * 2) * 0.012 + spring.lift * 0.04;
    hero.position.set(S.x, S.y + Math.sin(t * 0.8) * 0.12, S.z);
    hero.scale.setScalar(Math.max(S.scale * S.appear * breathe, 1e-4));
    hero.visible = S.scale * S.appear > 0.01;
    hero.rotation.y = S.rotY + spring.ry + spring.spin + Math.sin(t * 0.5) * 0.08;
    hero.rotation.x = S.rotX + spring.rx;
    mGroup.position.z = 0.2 + Math.sin(t * 1.2) * 0.08 + spring.lift * 0.45;

    comet.forEach((m, i) => {
      const a = -t * 1.4 + i * 0.035;
      m.position.x = Math.cos(a) * 3.12;
      m.position.y = Math.sin(a) * 3.12;
    });
    orbits.rotation.z = t * 0.06;
    orbits.rotation.y = t * 0.04;
    sats.forEach((s, i) => {
      const a = t * (0.35 + spring.lift * 0.4) + s.phase;
      s.obj.position.set(Math.cos(a) * s.r, Math.sin(a * 1.3) * 0.6 + s.tilt, Math.sin(a) * s.r * 0.55 - 0.5);
      s.obj.rotation.set(Math.sin(t * 0.6 + i) * 0.4, a * 0.8, Math.cos(t * 0.5 + i) * 0.2);
    });
    dust.rotation.y = t * 0.02 + mouse.x * 0.15;
    pMat.uniforms.uTime.value = t;
    pMat.uniforms.uBurst.value = S.burst + kick * 1.5;
    // Câmera quase parada: assim o logo fica alinhado à área da página que `place` calculou.
    camera.position.x += (mouse.x * 0.15 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.y * 0.1 - camera.position.y) * 0.04;
    camera.lookAt(camera.position.x, camera.position.y, 0);
    composer.render();
  }

  /** Centro (cx, cy) e diâmetro em px na tela → posição e escala para o logo ficar ali, na profundidade z. */
  function place(cx, cy, diam, z) {
    const worldPerPx = (2 * (CAM_Z - z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / innerHeight;
    return { x: (cx - innerWidth / 2) * worldPerPx, y: -(cy - innerHeight / 2) * worldPerPx, scale: (diam * worldPerPx) / 2 / LOGO_R };
  }

  function destroy() {
    removeEventListener("pointermove", onMove);
    removeEventListener("pointermove", onHover);
    removeEventListener("pointerdown", onDown);
    removeEventListener("resize", onResize);
    scene.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) [].concat(o.material).forEach((m) => m.dispose());
    });
    envTex.dispose();
    pmrem.dispose();
    composer.dispose();
    renderer.dispose();
  }

  return {
    render,
    place,
    destroy,
    get hovering() {
      return hovering;
    },
  };
}
