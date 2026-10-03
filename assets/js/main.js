/* Interações da landing page. Depende de GSAP + ScrollTrigger e Lenis (carregados antes). */
(function () {
  'use strict';

  /* ---------- configuração da marca (troque aqui) ---------- */
  const CONFIG = {
    brand: 'NEXO',
    email: 'contato@nexostudio.com.br',
  };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  const isDesktop = () => window.matchMedia('(min-width: 900px)').matches;

  $$('.brand-name').forEach((el) => (el.textContent = CONFIG.brand));
  $$('.contact-email').forEach((el) => (el.textContent = CONFIG.email));
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (hasGsap && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  /* ---------- rolagem suave (Lenis) ---------- */
  let lenis = null;
  if (!reduceMotion && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function scrollToTarget(target) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: el.id === 'top' ? 0 : -70, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2 && id !== '#') return;
      const target = id === '#' ? $('#top') : $(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (a.hasAttribute('data-close')) closeModal();
      scrollToTarget(target);
    });
  });

  /* ---------- preloader + entrada ---------- */
  const preloader = $('#preloader');
  const countEl = $('#preloaderCount');
  const barEl = $('#preloaderBar');
  const logEl = $('#preloaderLog');
  const bootLines = ['> compilando shaders', '> otimizando imagens', '> conectando APIs', '> pronto para decolar'];

  function runPreloader() {
    document.body.classList.add('is-loading');
    if (lenis) lenis.stop();
    if (reduceMotion || !hasGsap) {
      preloader.remove();
      document.body.classList.remove('is-loading');
      if (lenis) lenis.start();
      intro();
      return;
    }
    const state = { v: 0 };
    let line = 0;
    gsap.to(state, {
      v: 100,
      duration: 1.9,
      ease: 'power2.inOut',
      onUpdate() {
        const v = Math.round(state.v);
        countEl.textContent = v;
        barEl.style.width = v + '%';
        const next = Math.floor((v / 100) * bootLines.length);
        while (line < next && line < bootLines.length) {
          const s = document.createElement('span');
          s.textContent = bootLines[line++];
          logEl.appendChild(s);
        }
      },
      onComplete() {
        gsap.timeline({
          onComplete() {
            preloader.remove();
            document.body.classList.remove('is-loading');
            if (lenis) lenis.start();
          },
        })
          .to('.preloader__inner', { y: -30, opacity: 0, duration: 0.45, ease: 'power2.in' })
          .to(preloader, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '-=0.1')
          .add(intro, '-=0.55');
      },
    });
  }

  function intro() {
    window.__heroReady = true;
    if (hasGsap && !reduceMotion) {
      gsap.timeline()
        .from('.hero__title .line__in', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.09 })
        .from('.reveal-hero', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, '-=0.8')
        .from('.nav > *', { y: -24, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, clearProps: 'transform,opacity' }, '<');
    }
    startTerminal();
    startWordCycle();
  }

  /* ---------- relógio de Brasília ---------- */
  const clockEl = $('#clock');
  function tick() {
    try {
      clockEl.textContent = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date());
    } catch (e) {
      const d = new Date();
      clockEl.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
  }
  if (clockEl) { tick(); setInterval(tick, 15000); }

  /* ---------- texto embaralhado ---------- */
  const GLYPHS = '!<>-_\\/[]{}—=+*^?#01ABCDEF';
  function scramble(el, finalText, duration = 700) {
    const from = el.textContent;
    const len = Math.max(from.length, finalText.length);
    const start = performance.now();
    if (el._scrambleRaf) cancelAnimationFrame(el._scrambleRaf);
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      let out = '';
      for (let i = 0; i < len; i++) {
        const reveal = i / len < p;
        if (reveal) out += finalText[i] || '';
        else if (i < finalText.length || p < 0.5) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) el._scrambleRaf = requestAnimationFrame(step);
      else el.textContent = finalText;
    };
    el._scrambleRaf = requestAnimationFrame(step);
  }

  $$('[data-scramble]').forEach((el) => {
    const text = el.textContent;
    el.addEventListener('mouseenter', () => scramble(el, text, 450));
  });

  function startWordCycle() {
    const el = $('#heroWord');
    if (!el) return;
    const words = ['negócios', 'lojas', 'marcas', 'ideias', 'vendas'];
    let i = 0;
    setInterval(() => {
      i = (i + 1) % words.length;
      if (reduceMotion) el.textContent = words[i];
      else scramble(el, words[i], 800);
    }, 2600);
  }

  /* ---------- terminal digitando ---------- */
  function startTerminal() {
    const term = $('#terminal');
    if (!term) return;
    const lines = [
      ['<span class="t-acc">$</span> npm run build', 380],
      ['<span class="t-dim">  compilando 48 componentes…</span>', 260],
      ['<span class="t-ok">✓</span> imagens otimizadas <span class="t-dim">(-72%)</span>', 240],
      ['<span class="t-ok">✓</span> lighthouse <span class="t-ok">98</span> · seo <span class="t-ok">100</span>', 260],
      ['<span class="t-acc">$</span> deploy --prod', 380],
      ['<span class="t-ok">✓</span> no ar em <span class="t-acc">0.8s</span> 🚀', 0],
    ];
    if (reduceMotion) { term.innerHTML = lines.map((l) => l[0]).join('\n'); return; }
    let li = 0;
    const typeLine = () => {
      if (li >= lines.length) {
        setTimeout(() => { term.innerHTML = ''; li = 0; typeLine(); }, 5000);
        return;
      }
      const [html, pause] = lines[li++];
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const plain = tmp.textContent;
      const row = document.createElement('div');
      term.appendChild(row);
      let c = 0;
      const typer = setInterval(() => {
        c += 2;
        row.textContent = plain.slice(0, c);
        if (c >= plain.length) {
          clearInterval(typer);
          row.innerHTML = html;
          setTimeout(typeLine, pause + 200);
        }
      }, 22);
    };
    typeLine();
  }

  /* ---------- nav: estado, esconder ao rolar, link ativo, progresso ---------- */
  const nav = $('#nav');
  const progress = $('.scroll-progress i');
  let lastY = 0;
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 30);
    const menuOpen = $('#mobileMenu').classList.contains('is-open');
    nav.classList.toggle('is-hidden', !menuOpen && y > lastY && y > 500);
    lastY = y;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const sectionLinks = $$('.nav__links a');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      sectionLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sectionLinks.forEach((a) => { const s = $(a.getAttribute('href')); if (s) io.observe(s); });

  /* ---------- menu mobile ---------- */
  const burger = $('#burger');
  const menu = $('#mobileMenu');
  function closeMenu() {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
  }
  burger.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open && hasGsap) gsap.from('.mobile-menu a', { y: 40, opacity: 0, stagger: 0.05, duration: 0.6, ease: 'power3.out', delay: 0.15 });
  });

  /* ---------- cursor personalizado ---------- */
  if (finePointer && !reduceMotion) {
    document.documentElement.classList.add('has-cursor');
    const cursor = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    const label = $('.cursor__label');
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    window.addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px)`;
    }, { passive: true });
    const loop = () => {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('a, button, label, [data-cursor], .model');
      cursor.classList.toggle('is-hover', !!t);
      const text = t && (t.getAttribute('data-cursor') || (t.classList.contains('model') ? 'Abrir' : ''));
      cursor.classList.toggle('has-label', !!text);
      label.textContent = text || '';
    });
    document.addEventListener('pointerleave', () => cursor.style.opacity = '0');
    document.addEventListener('pointerenter', () => cursor.style.opacity = '1');
  }

  /* ---------- botões magnéticos ---------- */
  if (finePointer && !reduceMotion) {
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
        el.style.transform = '';
        setTimeout(() => (el.style.transition = ''), 600);
      });
    });
  }

  /* ---------- spotlight e tilt nos cards ---------- */
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest('.spot');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  function attachTilt(el, max = 8, onMove) {
    if (!finePointer || reduceMotion) return;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg)`;
      if (onMove) onMove(px, py);
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = '';
      setTimeout(() => (el.style.transition = ''), 700);
    });
  }
  $$('.tilt').forEach((el) => attachTilt(el, 6));

  /* ---------- títulos divididos em palavras ---------- */
  $$('.split').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="word"><span>${w}</span></span>`).join(' ');
  });

  /* ---------- animações por rolagem ---------- */
  if (hasGsap && !reduceMotion) {
    $$('.split').forEach((el) => {
      gsap.from(el.querySelectorAll('.word > span'), {
        yPercent: 105, duration: 1, ease: 'expo.out', stagger: 0.04,
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });
    $$('.section__lead, .eyebrow').forEach((el) => {
      if (el.closest('.hero')) return;
      gsap.from(el, { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    ScrollTrigger.batch('.bento__item, .switch, .lab__swatches, .faq__item, .edge__list li, .chip, .counters > div', {
      start: 'top 90%',
      once: true,
      onEnter: (els) => gsap.from(els, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06, overwrite: true }),
    });
    gsap.from('.lab__stage', { scale: 0.94, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.lab__stage', start: 'top 85%' } });
    gsap.from('.edge__orbit', { scale: 0.7, rotate: -40, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.edge__orbit', start: 'top 85%' } });
    gsap.from('.contact__title .line__in', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.contact__title', start: 'top 85%' } });
    gsap.from('.contact__form', { y: 60, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.contact__form', start: 'top 90%' } });
    gsap.from('.footer__brand span', { yPercent: 60, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.footer__brand', start: 'top 95%' } });
    gsap.to('.hero__content', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------- marquee guiado pela velocidade da rolagem ---------- */
  $$('.marquee__row').forEach((row) => {
    const track = $('.marquee__track', row);
    row.appendChild(track.cloneNode(true));
    row.appendChild(track.cloneNode(true));
    const dir = Number(row.dataset.dir) || -1;
    let x = 0, boost = 0, w = track.offsetWidth;
    window.addEventListener('resize', () => (w = track.offsetWidth));
    if (lenis) lenis.on('scroll', (l) => { boost = Math.min(Math.abs(l.velocity) * 0.6, 18) * Math.sign(l.velocity || 1); });
    const speed = reduceMotion ? 0 : 0.6;
    const step = () => {
      boost *= 0.92;
      x += (speed + Math.abs(boost)) * dir * (boost < 0 ? -1 : 1);
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      row.style.transform = `translate3d(${x}px,0,0)`;
      requestAnimationFrame(step);
    };
    step();
  });

  /* ---------- cards do bento ---------- */
  const badge = $('#cartBadge');
  if (badge && !reduceMotion) {
    let n = 3;
    setInterval(() => {
      n = n >= 9 ? 1 : n + 1;
      badge.textContent = n;
      badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump');
    }, 4000);
  }

  function countUp(el, to, duration = 1600) {
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      countIO.unobserve(el);
      const to = Number(el.dataset.count);
      if (reduceMotion) el.textContent = to; else countUp(el, to);
      const gauge = el.closest('.visual-gauge');
      if (gauge) gauge.classList.add('is-on');
    });
  }, { threshold: 0.5 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- órbita de tecnologias ---------- */
  $$('.orbit').forEach((orbit) => {
    const items = $$('span', orbit);
    const offset = Math.random() * Math.PI * 2;
    items.forEach((s, i) => {
      const a = offset + (i / items.length) * Math.PI * 2;
      s.style.setProperty('--x', `${50 + 50 * Math.cos(a)}%`);
      s.style.setProperty('--y', `${50 + 50 * Math.sin(a)}%`);
    });
  });

  /* ---------- modelos (mini sites desenhados em CSS) ---------- */
  const MODELS = [
    {
      id: 'brasa', cat: 'comercio', name: 'Brasa & Lenha', kind: 'Hamburgueria · cardápio + delivery',
      vars: { bg: '#160b06', fg: '#ffe9d6', acc: '#ff6a2b', card: 'rgba(255,106,43,.14)' },
      hero: ['Fogo alto, sabor de verdade.', 'Peça online e retire em 15 min.', 'Ver cardápio'],
      art: '<div class="mock__art" style="right:-18%;top:12%;width:70%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 40% 40%,#ffb36b,#ff6a2b 40%,#7a1d05 75%,transparent 76%);filter:blur(1px);box-shadow:0 0 80px #ff6a2b"></div>',
      desc: 'Cardápio digital com fotos que dão fome, pedido direto pelo WhatsApp e pagamento via Pix. Ideal para restaurantes, lanchonetes e food trucks.',
      features: ['Cardápio editável pelo celular', 'Pedido pelo WhatsApp com carrinho', 'Pix e cartão', 'Horários e mapa da loja'],
    },
    {
      id: 'noir', cat: 'comercio', name: 'Atelier Noir', kind: 'Moda · e-commerce',
      vars: { bg: '#efebe4', fg: '#111111', acc: '#111111', card: 'rgba(0,0,0,.08)', btn: '#efebe4' },
      hero: ['Nova coleção outono.', 'Peças atemporais, produção local.', 'Comprar agora'],
      art: '<div class="mock__art" style="right:7%;top:16%;width:38%;height:62%;border-radius:120px 120px 8px 8px;background:linear-gradient(160deg,#c9b8a4,#6b5a4a)"></div><div class="mock__art" style="right:30%;top:40%;width:18%;height:38%;border-radius:80px 80px 6px 6px;background:linear-gradient(160deg,#2b2620,#0e0c0a)"></div>',
      desc: 'Loja virtual com vitrine editorial, filtros por tamanho e cor, frete calculado no carrinho e checkout em uma página.',
      features: ['Catálogo com variações', 'Checkout com Pix, cartão e boleto', 'Cálculo de frete', 'Cupons e lista de desejos'],
    },
    {
      id: 'grao', cat: 'comercio', name: 'Grão Café', kind: 'Cafeteria · pedido antecipado',
      vars: { bg: '#f3e7d8', fg: '#3a2316', acc: '#b4621c', card: 'rgba(180,98,28,.14)' },
      hero: ['Seu café pronto na chegada.', 'Peça no caminho, sem fila.', 'Pedir agora'],
      art: '<div class="mock__art" style="right:8%;top:22%;width:34%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#3a2316 46%,#f3e7d8 47%,#f3e7d8 54%,#d8b48c 55%);box-shadow:0 20px 40px rgba(58,35,22,.3)"></div>',
      desc: 'Pedido antecipado com horário de retirada, programa de fidelidade e cardápio que muda conforme o dia.',
      features: ['Pedido com horário de retirada', 'Cartão fidelidade digital', 'Cardápio do dia', 'Avaliações do Google na página'],
    },
    {
      id: 'vitta', cat: 'servicos', name: 'Clínica Vitta', kind: 'Saúde · agendamento online',
      vars: { bg: '#e9f5f2', fg: '#0d3b35', acc: '#13a387', card: 'rgba(19,163,135,.14)' },
      hero: ['Cuidado que começa no clique.', 'Agende consultas em segundos.', 'Agendar'],
      art: '<div class="mock__art" style="right:-10%;top:10%;width:60%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(19,163,135,.35),transparent 65%)"></div><div class="mock__art" style="right:12%;top:30%;width:26%;aspect-ratio:1;border-radius:24px;background:#fff;box-shadow:0 20px 40px rgba(13,59,53,.18)"></div>',
      desc: 'Site para clínicas e consultórios com agenda integrada, lembretes automáticos e páginas por especialidade otimizadas para o Google.',
      features: ['Agenda online integrada', 'Lembrete por WhatsApp', 'Páginas por especialidade', 'Conformidade com a LGPD'],
    },
    {
      id: 'forma', cat: 'servicos', name: 'Forma Fit', kind: 'Academia · planos e matrícula',
      vars: { bg: '#0b0b0c', fg: '#f4f4f4', acc: '#ff3d2e', card: 'rgba(255,255,255,.08)' },
      hero: ['Treine sem desculpas.', 'Matrícula online em 2 minutos.', 'Ver planos'],
      art: '<div class="mock__art" style="right:-6%;top:0;width:50%;height:100%;background:repeating-linear-gradient(115deg,#ff3d2e 0 10px,transparent 10px 26px);opacity:.55"></div>',
      desc: 'Página de alta conversão para academias e estúdios, com comparação de planos, grade de aulas e matrícula com pagamento recorrente.',
      features: ['Comparador de planos', 'Grade de aulas interativa', 'Pagamento recorrente', 'Área do aluno'],
    },
    {
      id: 'lumen', cat: 'servicos', name: 'Studio Lumen', kind: 'Fotografia · portfólio',
      vars: { bg: '#0d0d12', fg: '#f1efe9', acc: '#e8c27a', card: 'rgba(232,194,122,.14)', btn: '#0d0d12' },
      hero: ['Histórias em luz.', 'Ensaios, eventos e marcas.', 'Ver portfólio'],
      art: '<div class="mock__art" style="right:6%;top:14%;width:20%;height:44%;border-radius:6px;background:linear-gradient(160deg,#e8c27a,#5a3f1a)"></div><div class="mock__art" style="right:28%;top:30%;width:16%;height:36%;border-radius:6px;background:linear-gradient(160deg,#7d8aa8,#1b2033)"></div>',
      desc: 'Portfólio com galerias em tela cheia, transições suaves entre ensaios e formulário de orçamento por tipo de evento.',
      features: ['Galerias com carregamento progressivo', 'Transições entre páginas', 'Orçamento por tipo de evento', 'Área de entrega de fotos'],
    },
    {
      id: 'habitat', cat: 'empresas', name: 'Habitat', kind: 'Imobiliária · tour 3D',
      vars: { bg: '#0d1117', fg: '#ffffff', acc: '#e0b46c', card: 'rgba(224,180,108,.14)', btn: '#0d1117' },
      hero: ['Encontre o seu lugar.', 'Busca por mapa e tour virtual.', 'Buscar imóveis'],
      art: '<div class="mock__art" style="right:10%;bottom:22%;width:34%;height:52%;background:linear-gradient(90deg,#1c2533 50%,#141b26 50%);clip-path:polygon(0 18%,50% 0,100% 18%,100% 100%,0 100%)"></div><div class="mock__art" style="right:10%;bottom:22%;width:34%;height:52%;background:repeating-linear-gradient(0deg,transparent 0 12px,rgba(224,180,108,.7) 12px 16px);clip-path:polygon(12% 30%,40% 30%,40% 90%,12% 90%);opacity:.8"></div>',
      desc: 'Portal imobiliário com busca por mapa, filtros avançados, tour 3D dos imóveis e integração com CRM para os corretores.',
      features: ['Busca por mapa', 'Tour virtual 3D', 'Integração com CRM', 'Simulador de financiamento'],
    },
    {
      id: 'pulse', cat: 'empresas', name: 'Pulse Analytics', kind: 'SaaS · dashboard',
      vars: { bg: '#070b1a', fg: '#e6ecff', acc: '#6d7cff', card: 'rgba(109,124,255,.16)' },
      hero: ['Dados que viram decisão.', 'Indicadores em tempo real.', 'Testar grátis'],
      art: '<div class="mock__art" style="right:7%;top:24%;width:40%;height:46%;border-radius:10px;border:1px solid rgba(109,124,255,.4);background:linear-gradient(0deg,rgba(109,124,255,.5) 0 30%,transparent 30%) 10% 100%/12% 60% no-repeat,linear-gradient(0deg,rgba(109,124,255,.8) 0 100%,transparent 0) 30% 100%/12% 80% no-repeat,linear-gradient(0deg,rgba(109,124,255,.5) 0 100%,transparent 0) 50% 100%/12% 45% no-repeat,linear-gradient(0deg,rgba(76,201,255,.9) 0 100%,transparent 0) 70% 100%/12% 92% no-repeat,#0c1330"></div>',
      desc: 'Sistema web com login, painéis personalizáveis, relatórios em PDF e permissões por usuário. Para empresas que precisam enxergar a operação.',
      features: ['Dashboards em tempo real', 'Controle de acesso por perfil', 'Relatórios exportáveis', 'API para integração'],
    },
    {
      id: 'atlas', cat: 'empresas', name: 'Atlas Industrial', kind: 'Indústria · portal B2B',
      vars: { bg: '#0e1a2b', fg: '#ffffff', acc: '#2f6bff', card: 'rgba(47,107,255,.16)' },
      hero: ['Engenharia que move o país.', 'Catálogo técnico e cotação online.', 'Solicitar cotação'],
      art: '<div class="mock__art" style="inset:0;background-image:linear-gradient(rgba(47,107,255,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(47,107,255,.18) 1px,transparent 1px);background-size:18px 18px;mask-image:linear-gradient(90deg,transparent 30%,#000);-webkit-mask-image:linear-gradient(90deg,transparent 30%,#000)"></div><div class="mock__art" style="right:12%;top:26%;width:28%;aspect-ratio:1;border-radius:50%;border:6px dashed #2f6bff;animation:spin 14s linear infinite"></div>',
      desc: 'Portal institucional para indústrias e distribuidoras com catálogo técnico, área do representante e cotação integrada ao ERP.',
      features: ['Catálogo técnico com fichas PDF', 'Área do representante', 'Cotação integrada ao ERP', 'Versão em inglês e espanhol'],
    },
  ];

  function mockHTML(m) {
    const v = m.vars;
    const style = `--m-bg:${v.bg};--m-fg:${v.fg};--m-acc:${v.acc};--m-card:${v.card};${v.btn ? `--m-btn:${v.btn};` : ''}`;
    return `<div class="mock" style="${style}">
      ${m.art}
      <div class="mock__nav"><b>${m.name.split(' ')[0]}</b><span><i></i><i></i><i></i></span></div>
      <div class="mock__hero"><h4>${m.hero[0]}</h4><p>${m.hero[1]}</p><span class="mock__btn">${m.hero[2]}</span></div>
      <div class="mock__row"><i></i><i></i><i></i></div>
    </div>`;
  }

  const modelsEl = $('#models');
  modelsEl.innerHTML = MODELS.map((m) => `
    <div class="model" role="button" tabindex="0" data-cat="${m.cat}" data-id="${m.id}" aria-label="Ver modelo ${m.name}">
      <div class="model__shot">${mockHTML(m)}<div class="model__glare"></div></div>
      <div class="model__info">
        <div><h3>${m.name}</h3><p>${m.kind}</p></div>
        <span class="model__go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg></span>
      </div>
    </div>`).join('');

  $$('.model').forEach((el) => {
    const glare = $('.model__glare', el);
    attachTilt(el, 10, (px, py) => {
      glare.style.setProperty('--gx', `${px * 100}%`);
      glare.style.setProperty('--gy', `${py * 100}%`);
    });
    const open = () => openModal(MODELS.find((m) => m.id === el.dataset.id));
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });

  if (hasGsap && !reduceMotion) {
    ScrollTrigger.batch('.model', {
      start: 'top 92%', once: true,
      onEnter: (els) => gsap.from(els, { y: 70, rotateX: -18, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true, clearProps: 'transform,opacity' }),
    });
  }

  $$('.filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.filter').forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-selected', String(b === btn)); });
      const f = btn.dataset.filter;
      const cards = $$('.model');
      cards.forEach((c) => c.classList.toggle('is-hidden', f !== 'all' && c.dataset.cat !== f));
      const shown = cards.filter((c) => !c.classList.contains('is-hidden'));
      if (hasGsap && !reduceMotion) gsap.fromTo(shown, { y: 30, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out', stagger: 0.05, clearProps: 'transform' });
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    });
  });

  /* ---------- modal ---------- */
  const modal = $('#modal');
  let lastFocus = null;
  function openModal(m) {
    if (!m) return;
    lastFocus = document.activeElement;
    $('#modalPreview').innerHTML = mockHTML(m);
    $('#modalTag').textContent = m.kind;
    $('#modalTitle').textContent = m.name;
    $('#modalDesc').textContent = m.desc;
    $('#modalFeatures').innerHTML = m.features.map((f) => `<li>${f}</li>`).join('');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
    $('.modal__close', modal).focus();
  }
  function closeModal() {
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  $$('[data-close]', modal).forEach((el) => el.addEventListener('click', (e) => {
    if (el.tagName !== 'A') e.preventDefault();
    closeModal();
  }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeMenu(); } });

  /* ---------- lab ---------- */
  const stage = $('#labStage');
  const labCard = $('#labCard');
  const fx = { fxGlass: 'fx-glass', fxGlow: 'fx-glow', fxTilt: 'fx-tilt', fxAurora: 'fx-aurora', fxGrid: 'fx-grid' };
  Object.entries(fx).forEach(([id, cls]) => {
    const input = document.getElementById(id);
    const apply = () => {
      stage.classList.toggle(cls, input.checked);
      if (id === 'fxTilt' && !input.checked) labCard.style.transform = '';
    };
    input.addEventListener('change', apply);
    apply();
  });
  function labMove(clientX, clientY) {
    if (!stage.classList.contains('fx-tilt')) return;
    const r = stage.getBoundingClientRect();
    const px = (clientX - r.left) / r.width;
    const py = (clientY - r.top) / r.height;
    labCard.style.transform = `rotateX(${(0.5 - py) * 22}deg) rotateY(${(px - 0.5) * 26}deg) translateZ(20px)`;
    labCard.style.setProperty('--sx', `${px * 100}%`);
    labCard.style.setProperty('--sy', `${py * 100}%`);
  }
  stage.addEventListener('pointermove', (e) => labMove(e.clientX, e.clientY));
  stage.addEventListener('pointerleave', () => { labCard.style.transform = ''; });
  if (!finePointer && !reduceMotion) {
    // em telas de toque, o card "respira" sozinho para mostrar o efeito
    let t = 0;
    const idle = () => {
      t += 0.012;
      if (stage.classList.contains('fx-tilt')) {
        const r = stage.getBoundingClientRect();
        labMove(r.left + r.width * (0.5 + Math.sin(t) * 0.3), r.top + r.height * (0.5 + Math.cos(t * 0.8) * 0.3));
      }
      requestAnimationFrame(idle);
    };
    idle();
  }
  $$('.swatch').forEach((sw) => {
    sw.addEventListener('click', () => {
      $$('.swatch').forEach((s) => { s.classList.toggle('is-active', s === sw); s.setAttribute('aria-checked', String(s === sw)); });
      stage.style.setProperty('--lab', sw.dataset.color);
    });
  });

  /* ---------- processo: rolagem horizontal fixada ---------- */
  const processSec = $('#processo');
  const track = $('#processTrack');
  const processBar = $('#processBar');
  if (hasGsap && !reduceMotion) {
    ScrollTrigger.matchMedia({
      '(min-width: 900px)': function () {
        processSec.classList.remove('no-pin');
        const dist = () => track.scrollWidth - window.innerWidth;
        const tween = gsap.to(track, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: {
            trigger: processSec,
            pin: '.process__pin',
            start: 'top top',
            end: () => '+=' + dist(),
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => { processBar.style.transform = `scaleX(${self.progress})`; },
          },
        });
        $$('.step', track).forEach((step) => {
          gsap.from(step.querySelectorAll('h3, p, ul'), {
            y: 30, opacity: 0, stagger: 0.08, duration: 0.6, ease: 'power3.out',
            scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left 85%' },
          });
        });
        return () => { gsap.set(track, { clearProps: 'transform' }); };
      },
      '(max-width: 899px)': function () {
        processSec.classList.add('no-pin');
      },
    });
  } else {
    processSec.classList.add('no-pin');
  }
  if (processSec.classList.contains('no-pin') || !hasGsap) {
    track.addEventListener('scroll', () => {
      const max = track.scrollWidth - track.clientWidth;
      processBar.style.transform = `scaleX(${max > 0 ? track.scrollLeft / max : 0})`;
    }, { passive: true });
  }

  /* ---------- simulador ---------- */
  const form = $('#builderForm');
  const pages = $('#pages');
  const pagesOut = $('#pagesOut');
  const bpBody = $('#bpBody');
  const TYPES = {
    landing: { label: 'Landing page', base: [2, 3], url: 'landing', score: 1 },
    institucional: { label: 'Site institucional', base: [3, 5], url: 'www', score: 2 },
    ecommerce: { label: 'E-commerce', base: [6, 9], url: 'loja', score: 4 },
    sistema: { label: 'Sistema web', base: [8, 12], url: 'app', score: 5 },
  };
  const FEATURES = {
    blog: { w: 1, s: 1, block: 'Blog e artigos' },
    whatsapp: { w: 0, s: 0, block: 'Botão WhatsApp flutuante' },
    pagamentos: { w: 1.5, s: 2, block: 'Checkout Pix + cartão' },
    login: { w: 2, s: 2, block: 'Área do cliente com login' },
    '3d': { w: 1.5, s: 2, block: 'Cena 3D interativa' },
    ia: { w: 2, s: 2, block: 'Assistente com IA' },
    erp: { w: 2.5, s: 3, block: 'Sincronização com ERP' },
    idiomas: { w: 1, s: 1, block: 'PT · EN · ES' },
  };
  let lastSummary = '';

  function updateBuilder() {
    const type = TYPES[form.querySelector('input[name="type"]:checked').value];
    const feats = $$('#featureChips input:checked').map((i) => i.value);
    const n = Number(pages.value);
    pagesOut.textContent = n;
    pages.style.setProperty('--p', `${((n - 1) / 29) * 100}%`);

    const extraW = feats.reduce((a, f) => a + FEATURES[f].w, 0) + Math.max(0, n - 5) * 0.25;
    const lo = Math.round(type.base[0] + extraW * 0.7);
    const hi = Math.round(type.base[1] + extraW);
    $('#bpWeeks').textContent = `${lo}–${Math.max(hi, lo + 1)}`;
    const score = type.score + feats.reduce((a, f) => a + FEATURES[f].s, 0) + n / 10;
    const pct = Math.min(100, Math.round((score / 20) * 100));
    $('#bpMeter').style.width = `${Math.max(pct, 8)}%`;
    $('#bpLevel').textContent = pct < 25 ? 'Essencial' : pct < 50 ? 'Profissional' : pct < 75 ? 'Avançado' : 'Enterprise';
    $('#bpUrl').textContent = `${type.url}.seusite.com.br`;

    const blocks = [`<div class="bp__block bp__block--hero"><b>&lt;hero&gt;</b> ${type.label}</div>`];
    if (type.url === 'loja') blocks.push('<div class="bp__block bp__block--grid"><i></i><i></i><i></i></div><div class="bp__block"><b>&lt;cart/&gt;</b> Carrinho e frete</div>');
    else if (type.url === 'app') blocks.push('<div class="bp__block"><b>&lt;dashboard/&gt;</b> Painel com indicadores</div><div class="bp__block bp__block--grid"><i></i><i></i><i></i></div>');
    else blocks.push('<div class="bp__block bp__block--grid"><i></i><i></i><i></i></div>');
    feats.forEach((f) => blocks.push(`<div class="bp__block"><b>+</b> ${FEATURES[f].block}</div>`));
    blocks.push(`<div class="bp__block"><b>${n}</b> ${n === 1 ? 'página' : 'páginas'} · SEO · responsivo</div>`);
    bpBody.innerHTML = blocks.join('');

    lastSummary = `Tipo: ${type.label}\nPáginas: ${n}\nRecursos: ${feats.length ? feats.map((f) => FEATURES[f].block).join(', ') : 'nenhum extra'}\nPrazo estimado: ${lo}–${Math.max(hi, lo + 1)} semanas`;
  }
  form.addEventListener('input', updateBuilder);
  updateBuilder();

  $('#bpCta').addEventListener('click', () => {
    const msg = $('#cMsg');
    msg.value = `Olá! Montei este projeto no simulador:\n${lastSummary}\n\n`;
    setTimeout(() => msg.focus({ preventScroll: true }), 1200);
  });

  /* ---------- canvas de pontos do contato ---------- */
  const dots = $('#dotsCanvas');
  if (dots && !reduceMotion) {
    const ctx = dots.getContext('2d');
    let W = 0, H = 0, pts = [], dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouseD = { x: -9999, y: -9999 };
    let running = false;
    function build() {
      W = dots.clientWidth; H = dots.clientHeight;
      dots.width = W * dpr; dots.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gap = W < 600 ? 26 : 32;
      pts = [];
      for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap) pts.push({ ox: x, oy: y, x, y });
    }
    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      const t = performance.now() / 1000;
      for (const p of pts) {
        const dx = p.ox - mouseD.x, dy = p.oy - mouseD.y;
        const d = Math.hypot(dx, dy);
        const force = Math.max(0, 1 - d / 160);
        const tx = p.ox + (dx / (d || 1)) * force * 28;
        const ty = p.oy + (dy / (d || 1)) * force * 28 + Math.sin(t + p.ox * 0.02) * 1.5;
        p.x += (tx - p.x) * 0.12; p.y += (ty - p.y) * 0.12;
        const a = 0.12 + force * 0.8;
        ctx.fillStyle = force > 0.02 ? `rgba(76,201,255,${a})` : 'rgba(130,160,255,0.12)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.1 + force * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    build();
    window.addEventListener('resize', build);
    const sec = dots.parentElement;
    sec.addEventListener('pointermove', (e) => { const r = dots.getBoundingClientRect(); mouseD.x = e.clientX - r.left; mouseD.y = e.clientY - r.top; });
    sec.addEventListener('pointerleave', () => { mouseD.x = mouseD.y = -9999; });
    new IntersectionObserver((en) => {
      const vis = en[0].isIntersecting;
      if (vis && !running) { running = true; draw(); } else if (!vis) running = false;
    }).observe(dots);
  }

  /* ---------- formulário + copiar e-mail ---------- */
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
  }
  $('#copyEmail').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const ok = await copyText(CONFIG.email);
    const small = $('small', btn);
    if (ok) small.textContent = 'copiado ✓';
    else { const r = document.createRange(); r.selectNodeContents($('span', btn)); const s = getSelection(); s.removeAllRanges(); s.addRange(r); small.textContent = 'selecionado'; }
    setTimeout(() => (small.textContent = 'copiar'), 2000);
  });

  const contactForm = $('#contactForm');
  const status = $('#formStatus');
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let valid = true;
    $$('[required]', contactForm).forEach((f) => {
      const bad = !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
      f.closest('.field').classList.toggle('is-invalid', bad);
      if (bad) valid = false;
    });
    status.className = 'form__status mono';
    if (!valid) {
      status.textContent = 'Preencha nome, um e-mail válido e uma descrição do projeto.';
      status.classList.add('is-err');
      return;
    }
    // Sem back-end ainda: o briefing é copiado para o visitante enviar por e-mail.
    // Para receber direto, conecte um serviço de formulários (Formspree, Resend, etc.) aqui.
    const data = new FormData(contactForm);
    const text = `Nome: ${data.get('name')}\nEmpresa: ${data.get('company') || '-'}\nE-mail: ${data.get('email')}\n\n${data.get('message')}`;
    const ok = await copyText(text);
    status.classList.add('is-ok');
    status.textContent = ok
      ? `Briefing copiado. Cole em um e-mail para ${CONFIG.email}.`
      : `Briefing pronto. Envie para ${CONFIG.email}.`;
    if (window.Hero3D) window.Hero3D.pulse();
  });
  $$('.field input, .field textarea').forEach((f) => f.addEventListener('input', () => f.closest('.field').classList.remove('is-invalid')));

  $('#toTop').addEventListener('click', () => scrollToTarget('#top'));

  /* ---------- start ---------- */
  runPreloader();
  window.addEventListener('load', () => { if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); });
})();
