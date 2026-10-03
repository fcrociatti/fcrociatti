/* Cena 3D do hero: núcleo orgânico com shader (ruído simplex + linhas de contorno),
   casca em wireframe, anel orbital e campo de partículas. Reage ao mouse, ao toque,
   ao clique (pulso) e à rolagem. */
(function () {
  'use strict';

  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  // O Three.js (~670 KB) só é baixado depois que a página carregou, para não atrasar o texto.
  function start() {
    if (typeof THREE !== 'undefined') { boot(); return; }
    const s = document.createElement('script');
    s.src = 'assets/vendor/three.min.js';
    s.onload = boot;
    document.head.appendChild(s);
  }
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  if (document.readyState === 'complete') idle(start, { timeout: 1500 });
  else window.addEventListener('load', () => idle(start, { timeout: 1500 }));

  function boot() {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMobile = isTouch || window.matchMedia('(max-width: 760px)').matches;
  const lowPower = isMobile || (navigator.hardwareConcurrency || 8) <= 4;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    canvas.remove();
    return;
  }
  renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  const root = new THREE.Group();
  scene.add(root);

  const BLUE = new THREE.Color('#2f6bff');
  const CYAN = new THREE.Color('#38bdf8');

  /* ---------- ruído simplex 3D (Ashima Arts / Stefan Gustavson, MIT) ---------- */
  const NOISE = `
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }`;

  /* ---------- núcleo ---------- */
  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.2 },
    uFreq: { value: 1.05 },
    uPulse: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uColorA: { value: BLUE.clone() },
    uColorB: { value: CYAN.clone() },
  };

  const coreGeo = new THREE.IcosahedronGeometry(1.45, isMobile ? 18 : lowPower ? 40 : 90);
  const coreMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: `
      uniform float uTime, uAmp, uFreq, uPulse;
      uniform vec2 uMouse;
      varying float vNoise;
      varying vec3 vNormal;
      varying vec3 vView;
      ${NOISE}
      void main(){
        vec3 p = position;
        float t = uTime * 0.35;
        float n = snoise(p * uFreq + vec3(t, t * 0.6, -t * 0.4));
        n += 0.3 * snoise(p * uFreq * 2.1 - vec3(t * 0.8));
        float pull = dot(normalize(p), normalize(vec3(uMouse * 1.6, 1.2))) ;
        float amp = uAmp + uPulse * 0.35 + max(pull, 0.0) * length(uMouse) * 0.22;
        vNoise = n;
        p += normal * n * amp;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vView = normalize(-mv.xyz);
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColorA, uColorB;
      uniform float uTime, uPulse;
      varying float vNoise;
      varying vec3 vNormal;
      varying vec3 vView;
      void main(){
        float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
        // linhas de contorno tipo mapa topográfico
        float bands = fract(vNoise * 6.0 - uTime * 0.25);
        float line = smoothstep(0.0, 0.06, bands) * (1.0 - smoothstep(0.06, 0.14, bands));
        vec3 base = mix(vec3(0.01, 0.02, 0.06), uColorA * 0.35, smoothstep(-0.6, 0.9, vNoise));
        vec3 col = base + uColorB * line * 0.9 + mix(uColorA, uColorB, fres) * fres * 1.6;
        col += uColorB * uPulse * 0.4;
        float alpha = clamp(0.92 + fres * 0.08, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  root.add(core);

  /* ---------- casca wireframe ---------- */
  const shellGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.15, 1));
  const shellMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.18 });
  const shell = new THREE.LineSegments(shellGeo, shellMat);
  root.add(shell);

  // vértices da casca como "nós" brilhantes
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.Float32BufferAttribute(new THREE.IcosahedronGeometry(2.15, 1).attributes.position.array, 3));
  const dotTexture = makeDotTexture();
  const nodeMat = new THREE.PointsMaterial({ size: 0.09, map: dotTexture, color: CYAN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const nodes = new THREE.Points(nodeGeo, nodeMat);
  shell.add(nodes);

  /* ---------- anel orbital ---------- */
  const ringCount = isMobile ? 350 : lowPower ? 700 : 1600;
  const ringPos = new Float32Array(ringCount * 3);
  for (let i = 0; i < ringCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 2.9 + (Math.random() - 0.5) * 0.5 + Math.pow(Math.random(), 4) * 0.8;
    ringPos[i * 3] = Math.cos(a) * r;
    ringPos[i * 3 + 1] = (Math.random() - 0.5) * 0.08;
    ringPos[i * 3 + 2] = Math.sin(a) * r;
  }
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
  const ringMat = new THREE.PointsMaterial({ size: 0.035, map: dotTexture, color: BLUE.clone().lerp(CYAN, 0.4), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring = new THREE.Points(ringGeo, ringMat);
  ring.rotation.set(1.15, 0, 0.35);
  root.add(ring);

  /* ---------- campo de partículas ---------- */
  const starCount = isMobile ? 400 : lowPower ? 900 : 2400;
  const starPos = new Float32Array(starCount * 3);
  const starSeed = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const r = 4 + Math.random() * 14;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    starPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7;
    starPos[i * 3 + 2] = r * Math.cos(ph) - 4;
    starSeed[i] = Math.random();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('aSeed', new THREE.BufferAttribute(starSeed, 1));
  const starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: uniforms.uTime, uPx: { value: renderer.getPixelRatio() }, uColor: { value: CYAN.clone() } },
    vertexShader: `
      attribute float aSeed; uniform float uTime, uPx; varying float vA;
      void main(){
        vec3 p = position;
        p.y += sin(uTime * 0.2 + aSeed * 40.0) * 0.15;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.0 + aSeed * 2.4) * uPx * (9.0 / -mv.z);
        vA = 0.25 + 0.75 * (0.5 + 0.5 * sin(uTime * (0.6 + aSeed * 2.0) + aSeed * 90.0));
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.35), a * vA * 0.8);
      }`,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* ---------- interação ---------- */
  const mouse = new THREE.Vector2(0, 0);
  const mouseTarget = new THREE.Vector2(0, 0);
  let scrollProgress = 0;

  if (!isTouch) {
    window.addEventListener('pointermove', (e) => {
      mouseTarget.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    }, { passive: true });
  }

  // giroscópio em celulares não está disponível em todos os navegadores; o toque já move a cena
  // no celular a cena gira sozinha devagar; nenhum gesto é capturado

  canvas.parentElement.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    uniforms.uPulse.value = 1;
  });

  window.addEventListener('scroll', () => {
    const h = canvas.parentElement.offsetHeight || window.innerHeight;
    scrollProgress = Math.min(Math.max(window.scrollY / h, 0), 1.2);
  }, { passive: true });

  /* ---------- layout ---------- */
  function layout() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const wide = w > 900;
    root.position.x = wide ? 2.1 : 0.9;
    root.position.y = wide ? 0.1 : 1.9;
    const s = wide ? 0.95 : Math.max(0.55, Math.min(w / 900, 0.8));
    root.scale.setScalar(s);
    coreMat.opacity = 1;
  }
  layout();
  let lastW = canvas.clientWidth;
  window.addEventListener('resize', () => {
    // no celular a barra de endereço muda a altura ao rolar; só refaz quando a largura muda
    if (isTouch && canvas.clientWidth === lastW) return;
    lastW = canvas.clientWidth;
    layout();
  });

  /* ---------- loop ---------- */
  let visible = true;
  let entered = 0; // 0 → 1 na entrada
  const clock = new THREE.Clock();
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { threshold: 0 }).observe(canvas);

  // no celular: até 30 quadros por segundo; para quando sai da tela ou a aba fica oculta
  const minFrame = isMobile ? 1 / 30 : 0;
  let acc = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    acc += clock.getDelta();
    if (acc < minFrame) return;
    const dt = Math.min(acc, 0.05);
    acc = 0;
    if (isTouch) mouseTarget.set(Math.sin(uniforms.uTime.value * 0.3) * 0.35, Math.cos(uniforms.uTime.value * 0.23) * 0.2);
    const speed = reduceMotion ? 0.15 : 1;
    uniforms.uTime.value += dt * speed;

    mouse.lerp(mouseTarget, 0.05);
    uniforms.uMouse.value.copy(mouse);
    uniforms.uPulse.value *= 0.94;
    entered += (window.__heroReady ? 1 - entered : 0) * 0.04;

    core.rotation.y += dt * 0.12 * speed;
    core.rotation.x = mouse.y * 0.35;
    shell.rotation.y -= dt * 0.08 * speed;
    shell.rotation.z += dt * 0.03 * speed;
    ring.rotation.z += dt * 0.05 * speed;

    root.rotation.y = mouse.x * 0.45;
    root.rotation.x = -mouse.y * 0.2;
    const s = 0.6 + entered * 0.4 + scrollProgress * 0.35;
    core.scale.setScalar(s);
    shell.scale.setScalar(0.7 + entered * 0.3 + scrollProgress * 0.6);
    ring.scale.setScalar(0.5 + entered * 0.5 + scrollProgress * 0.25);
    shellMat.opacity = 0.18 * entered * (1 - scrollProgress * 0.6);

    camera.position.x += (mouse.x * 0.6 - camera.position.x) * 0.04;
    camera.position.y += (mouse.y * 0.4 - camera.position.y) * 0.04;
    camera.position.z = 7 + scrollProgress * 1.5;
    camera.lookAt(0, 0, 0);
    stars.rotation.y = uniforms.uTime.value * 0.01 + mouse.x * 0.08;

    renderer.render(scene, camera);
  }
  frame();
  canvas.classList.add('is-ready');

  window.Hero3D = {
    pulse() { uniforms.uPulse.value = 1; },
  };

  function makeDotTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(255,255,255,0.7)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  }
})();
