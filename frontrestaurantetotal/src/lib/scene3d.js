// Cena 3D da home: o "M" do logo em metal champanhe, órbitas, satélites (celular, QR da mesa, comanda) e poeira dourada.
// Carregada sob demanda (import dinâmico) para não pesar nas outras páginas.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/**
 * Monta a cena no canvas. `state` é lido a cada quadro (posição, giro, escala, dispersão da poeira),
 * então o GSAP pode animá-lo pelo scroll. Retorna `render(t)` para o ticker e `destroy()`.
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
  camera.position.set(0, 0, 10);

  const gold = new THREE.MeshPhysicalMaterial({ color: 0xd4b483, metalness: 1, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 1.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, transmission: 1, thickness: 0.6, ior: 1.45, envMapIntensity: 1.2, transparent: true });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x1a1814, metalness: 0.6, roughness: 0.35, clearcoat: 1 });

  const hero = new THREE.Group();
  scene.add(hero);

  // O "M" com o mesmo traço do favicon (viewBox 48×48), em tubo com pontas arredondadas.
  const pts = [[14.5, 32.5], [14.5, 15.5], [24, 26.5], [33.5, 15.5], [33.5, 32.5]].map(([x, y]) => new THREE.Vector3((x - 24) / 6, -(y - 24) / 6, 0));
  const path = new THREE.CurvePath();
  for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  const R = 0.2;
  const mGroup = new THREE.Group();
  mGroup.add(new THREE.Mesh(new THREE.TubeGeometry(path, 400, R, 32, false), gold));
  pts.forEach((p) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 32), gold);
    s.position.copy(p);
    mGroup.add(s);
  });
  hero.add(mGroup);

  // Disco escuro e anel, como o círculo do logo.
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 0.22, 96), dark);
  disc.rotation.x = Math.PI / 2;
  disc.position.z = -0.35;
  hero.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.12, 0.045, 24, 200), gold);
  ring.position.z = -0.3;
  hero.add(ring);

  const orbits = new THREE.Group();
  hero.add(orbits);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd4b483, transparent: true, opacity: 0.35 });
  [[4.1, 1.2, 0.3], [4.8, -0.5, 1.1], [5.6, 0.7, -0.6]].forEach(([r, a, b]) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 8, 300), lineMat);
    t.rotation.set(a, b, 0);
    orbits.add(t);
  });

  // Satélites: celular (link de delivery), QR code da mesa e comanda da cozinha.
  const phone = new THREE.Group();
  phone.add(new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.8, 0.1, 6, 0.12), dark));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.6), new THREE.MeshBasicMaterial({ color: 0xd4b483, transparent: true, opacity: 0.85 }));
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
  const ticket = new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.3, 0.05, 4, 0.05), new THREE.MeshPhysicalMaterial({ color: 0xf5f1ea, roughness: 0.6 }));
  const sats = [[phone, 4.6, 0, 0.35], [qr, 5.3, 2.1, -0.4], [ticket, 4.0, 4.2, 0.6]].map(([obj, r, phase, tilt]) => {
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

  const S = state;
  function render(t) {
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    hero.position.set(S.x, S.y + Math.sin(t * 0.8) * 0.12, S.z);
    hero.scale.setScalar(S.scale);
    hero.rotation.y = S.rotY + mouse.x * 0.5 + Math.sin(t * 0.5) * 0.08;
    hero.rotation.x = S.rotX + mouse.y * 0.35;
    mGroup.position.z = 0.2 + Math.sin(t * 1.2) * 0.08;
    orbits.rotation.z = t * 0.06;
    orbits.rotation.y = t * 0.04;
    ring.scale.setScalar(S.ring);
    sats.forEach((s, i) => {
      const a = t * 0.35 + s.phase;
      s.obj.position.set(Math.cos(a) * s.r, Math.sin(a * 1.3) * 0.9 + s.tilt, Math.sin(a) * s.r * 0.55 - 0.5);
      s.obj.rotation.set(Math.sin(t * 0.6 + i) * 0.4, a * 0.8, Math.cos(t * 0.5 + i) * 0.2);
    });
    dust.rotation.y = t * 0.02 + mouse.x * 0.15;
    pMat.uniforms.uTime.value = t;
    pMat.uniforms.uBurst.value = S.burst;
    camera.position.x += (mouse.x * 0.6 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.y * 0.4 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    composer.render();
  }

  function destroy() {
    removeEventListener("pointermove", onMove);
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

  return { render, destroy };
}
