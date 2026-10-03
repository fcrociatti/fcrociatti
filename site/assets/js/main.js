/* Interações da landing page. Depende de GSAP + ScrollTrigger e Lenis (carregados antes). */
(function () {
  'use strict';

  /* =====================================================================
     CONFIGURAÇÃO DA MARCA — troque aqui e a página inteira acompanha.
     (O HTML tem os mesmos valores como reserva, para quem abre sem JS.)
     ===================================================================== */
  const CONFIG = {
    brand: 'crociatti digital',
    tagline: 'Seu negócio aberto 24 horas na internet.',
    owner: 'Fernando Crociatti',
    city: 'Butantã · São Paulo',
    whatsapp: '5511926921910',             // DDI + DDD + número, só dígitos
    whatsappDisplay: '(11) 92692-1910',
    whatsappMessage: 'Olá, Fernando! Vi seu site e quero uma prévia gratuita para o meu negócio.',
    email: 'crociattifernando@gmail.com',
    linkedin: 'https://www.linkedin.com/in/fernando-crociatti/',
    github: 'https://github.com/fcrociatti',
    showPrice: false,                       // true para exibir o preço abaixo
    price: 'a partir de R$ 450',
  };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  const hasST = hasGsap && typeof ScrollTrigger !== 'undefined';

  /* ---------- aplica a configuração ---------- */
  const waLink = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text || CONFIG.whatsappMessage)}`;
  $$('[data-config]').forEach((el) => {
    const v = CONFIG[el.dataset.config];
    if (v == null) return;
    el.textContent = v;
    if (el.dataset.href === 'mailto') el.href = `mailto:${v}`;
  });
  $$('[data-link]').forEach((el) => { const v = CONFIG[el.dataset.link]; if (v) el.href = v; });
  $$('[data-wa]').forEach((el) => { el.href = waLink(el.dataset.waMsg); });
  $$('[data-price]').forEach((el) => { el.hidden = !CONFIG.showPrice; });
  const brandTitle = CONFIG.brand.replace(/\b\w/g, (c) => c.toUpperCase());
  document.title = `${brandTitle} | Criação de sites no Butantã, São Paulo`;
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (hasST) gsap.registerPlugin(ScrollTrigger);

  /* ---------- rolagem suave só com mouse; em toque fica a nativa ---------- */
  let lenis = null;
  if (finePointer && !reduceMotion && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    if (hasST) {
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
      const target = id === '#' ? $('#top') : $(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(target);
    });
  });

  /* ---------- carregamento: no máximo 1s e sem travar a página ---------- */
  const preloader = $('#preloader');
  function runPreloader() {
    if (!preloader) { intro(); return; }
    if (reduceMotion || !hasGsap) {
      preloader.remove();
      intro();
      return;
    }
    const countEl = $('#preloaderCount');
    const barEl = $('#preloaderBar');
    const state = { v: 0 };
    gsap.to(state, {
      v: 100,
      duration: 0.55,
      ease: 'power2.inOut',
      onUpdate() {
        const v = Math.round(state.v);
        countEl.textContent = v;
        barEl.style.width = v + '%';
      },
      onComplete() {
        gsap.to(preloader, { clipPath: 'inset(0 0 100% 0)', duration: 0.4, ease: 'expo.inOut', onComplete: () => preloader.remove() });
        intro();
      },
    });
  }

  function intro() {
    window.__heroReady = true;
    if (hasGsap && !reduceMotion && finePointer) {
      gsap.timeline()
        .from('.hero__title .line__in', { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.08 })
        .from('.reveal-hero', { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07, clearProps: 'transform,opacity' }, '-=0.75')
        .from('.nav > *', { y: -20, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06, clearProps: 'transform,opacity' }, '<');
    }
    startTerminal();
    startWordCycle();
  }

  /* ---------- relógio de São Paulo ---------- */
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
  const GLYPHS = '!<>-_\\/[]{}=+*^?#01';
  function scramble(el, finalText, duration = 700) {
    const from = el.textContent;
    const len = Math.max(from.length, finalText.length);
    const start = performance.now();
    if (el._scrambleRaf) cancelAnimationFrame(el._scrambleRaf);
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      let out = '';
      for (let i = 0; i < len; i++) {
        if (i / len < p) out += finalText[i] || '';
        else if (i < finalText.length || p < 0.5) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) el._scrambleRaf = requestAnimationFrame(step);
      else el.textContent = finalText;
    };
    el._scrambleRaf = requestAnimationFrame(step);
  }

  if (finePointer) {
    $$('[data-scramble]').forEach((el) => {
      const text = el.textContent;
      el.addEventListener('mouseenter', () => scramble(el, text, 450));
    });
  }

  function startWordCycle() {
    const el = $('#heroWord');
    if (!el) return;
    const words = ['negócio', 'salão', 'pet shop', 'consultório', 'restaurante', 'oficina'];
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      i = (i + 1) % words.length;
      if (reduceMotion) el.textContent = words[i];
      else scramble(el, words[i], 800);
    }, 2600);
  }

  /* ---------- terminal digitando ---------- */
  function startTerminal() {
    const term = $('#terminal');
    if (!term || getComputedStyle(term.parentElement).display === 'none') return;
    const lines = [
      ['<span class="t-acc">$</span> criar-site --barbearia', 380],
      ['<span class="t-ok">✓</span> layout pensado para celular', 220],
      ['<span class="t-ok">✓</span> botão de WhatsApp', 220],
      ['<span class="t-ok">✓</span> mapa e horário de funcionamento', 260],
      ['<span class="t-acc">$</span> publicar', 380],
      ['<span class="t-ok">✓</span> no ar em <span class="t-acc">seunegocio.com.br</span>', 0],
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
  const menu = $('#mobileMenu');
  let lastY = 0;
  let scrollQueued = false;
  function onScroll() {
    scrollQueued = false;
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 30);
    nav.classList.toggle('is-hidden', !menu.classList.contains('is-open') && y > lastY && y > 500);
    lastY = y;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  }
  window.addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(onScroll); } }, { passive: true });
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
  function closeMenu() {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menu');
    document.documentElement.classList.remove('menu-open');
    if (lenis) lenis.start();
  }
  burger.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    if (!open) { closeMenu(); return; }
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Fechar menu');
    document.documentElement.classList.add('menu-open');
    if (lenis) lenis.stop();
    if (hasGsap && !reduceMotion) gsap.from('.mobile-menu nav a, .mobile-menu__cta', { y: 30, opacity: 0, stagger: 0.04, duration: 0.5, ease: 'power3.out', delay: 0.1, clearProps: 'transform,opacity' });
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a[data-wa]')) closeMenu(); });

  /* ---------- cursor personalizado (só mouse) ---------- */
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
    document.addEventListener('pointerleave', () => (cursor.style.opacity = '0'));
    document.addEventListener('pointerenter', () => (cursor.style.opacity = '1'));
  }

  /* ---------- botões magnéticos (só mouse) ---------- */
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

  /* ---------- spotlight e tilt nos cards (só mouse) ---------- */
  if (finePointer) {
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.spot');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  function attachTilt(el, max = 8, onMove) {
    if (!finePointer || reduceMotion) return;
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
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
  if (hasST && !reduceMotion) {
    $$('.split').forEach((el) => {
      gsap.from(el.querySelectorAll('.word > span'), {
        yPercent: 105, duration: 0.9, ease: 'expo.out', stagger: 0.035,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });
    $$('.section__lead, .eyebrow').forEach((el) => {
      if (el.closest('.hero')) return;
      gsap.from(el, { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    ScrollTrigger.batch('.bento__item, .project, .switch, .lab__swatches, .faq__item, .edge__list li, .facts > div', {
      start: 'top 92%',
      once: true,
      onEnter: (els) => gsap.from(els, { y: 32, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06, overwrite: true, clearProps: 'transform,opacity' }),
    });
    gsap.from('.lab__stage', { scale: 0.95, opacity: 0, duration: 1, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.lab__stage', start: 'top 88%', once: true } });
    gsap.from('.edge__orbit', { scale: 0.75, rotate: -30, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.edge__orbit', start: 'top 88%', once: true } });
    gsap.from('.contact__title .line__in', { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.contact__title', start: 'top 88%', once: true } });
    gsap.from('.footer__brand > span', { yPercent: 50, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.footer__brand', start: 'top 98%', once: true } });
    if (finePointer) {
      gsap.to('.hero__content', { yPercent: -15, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    }
  }

  /* ---------- marquee guiado pela rolagem ---------- */
  const marqueeRows = $$('.marquee__row');
  let marqueeBoost = 0;
  let marqueeLastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    marqueeBoost = Math.max(-14, Math.min(14, (y - marqueeLastY) * 0.5));
    marqueeLastY = y;
  }, { passive: true });
  let marqueeVisible = true;
  if (marqueeRows.length) {
    new IntersectionObserver((en) => { marqueeVisible = en[0].isIntersecting; }).observe($('#marquee'));
  }
  marqueeRows.forEach((row) => {
    const track = $('.marquee__track', row);
    row.appendChild(track.cloneNode(true));
    row.appendChild(track.cloneNode(true));
    $$('.marquee__track', row).slice(1).forEach((t) => t.setAttribute('aria-hidden', 'true'));
    const dir = Number(row.dataset.dir) || -1;
    let x = 0, w = track.offsetWidth;
    window.addEventListener('resize', () => (w = track.offsetWidth));
    const speed = reduceMotion ? 0 : 0.6;
    const step = () => {
      requestAnimationFrame(step);
      if (!marqueeVisible || !w) return;
      x += (speed + Math.abs(marqueeBoost)) * dir * (marqueeBoost < -0.5 ? -1 : 1);
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      row.style.transform = `translate3d(${x}px,0,0)`;
    };
    step();
  });
  (function decay() { marqueeBoost *= 0.92; requestAnimationFrame(decay); })();

  /* ---------- card de busca: digitação ---------- */
  const searchEl = $('#searchTyping');
  if (searchEl && !reduceMotion) {
    const queries = ['barbearia no butantã', 'pet shop perto de mim', 'oficina mecânica sp', 'clínica no butantã', 'restaurante aberto agora'];
    let qi = 0;
    setInterval(() => {
      if (document.hidden) return;
      qi = (qi + 1) % queries.length;
      const q = queries[qi];
      let c = 0;
      const t = setInterval(() => { c++; searchEl.textContent = q.slice(0, c); if (c >= q.length) clearInterval(t); }, 45);
    }, 3800);
  }

  /* ---------- órbita de tecnologias ---------- */
  $$('.orbit').forEach((orbit, oi) => {
    const items = $$('span', orbit);
    const offset = oi * 0.9;
    items.forEach((s, i) => {
      const a = offset + (i / items.length) * Math.PI * 2;
      s.style.setProperty('--x', `${50 + 50 * Math.cos(a)}%`);
      s.style.setProperty('--y', `${50 + 50 * Math.sin(a)}%`);
    });
  });

  /* ---------- modelos (mini sites desenhados em CSS) ---------- */
  const MODELS = [
    {
      id: 'barbearia', cat: 'comercio', name: 'Corte Fino', kind: 'Barbearia',
      vars: { bg: '#0f0d0b', fg: '#f3ead9', acc: '#c9a25b', card: 'rgba(201,162,91,.16)', btn: '#0f0d0b' },
      hero: ['Seu estilo, no seu horário.', 'Agende pelo WhatsApp em um minuto.', 'Agendar corte'],
      art: '<div class="mock__art" style="right:9%;top:18%;width:26%;height:58%;border-radius:40px;background:repeating-linear-gradient(-45deg,#c9a25b 0 8px,#f3ead9 8px 16px,#9b2c2c 16px 24px,#f3ead9 24px 32px);box-shadow:0 0 0 5px #2a241d"></div>',
      desc: 'Site para barbearia com tabela de serviços e valores, galeria de cortes e agendamento direto pelo WhatsApp.',
      features: ['Tabela de serviços', 'Agendamento pelo WhatsApp', 'Galeria de cortes', 'Mapa e horário de funcionamento'],
    },
    {
      id: 'petshop', cat: 'comercio', name: 'Patas & Cia', kind: 'Pet shop',
      vars: { bg: '#fff6ec', fg: '#2c2140', acc: '#ff7a3d', card: 'rgba(255,122,61,.16)', btn: '#2c2140' },
      hero: ['Banho, tosa e carinho.', 'Busca e entrega no seu bairro.', 'Agendar banho'],
      art: '<div class="mock__art" style="right:-6%;top:12%;width:56%;aspect-ratio:1;border-radius:50%;background:#ffd8bf"></div><div class="mock__art" style="right:14%;top:30%;width:24%;aspect-ratio:1;border-radius:50% 50% 46% 46%;background:#2c2140;box-shadow:-34px -26px 0 -12px #2c2140,34px -26px 0 -12px #2c2140"></div>',
      desc: 'Site para pet shop com serviços de banho e tosa, produtos em destaque e agendamento pelo WhatsApp.',
      features: ['Serviços com valores', 'Agendamento pelo WhatsApp', 'Produtos em destaque', 'Área de atendimento no mapa'],
    },
    {
      id: 'oficina', cat: 'comercio', name: 'Garage 77', kind: 'Oficina mecânica',
      vars: { bg: '#111316', fg: '#f2f2f2', acc: '#ffb020', card: 'rgba(255,176,32,.14)', btn: '#111316' },
      hero: ['Seu carro em boas mãos.', 'Orçamento rápido pelo WhatsApp.', 'Pedir orçamento'],
      art: '<div class="mock__art" style="right:-4%;top:0;width:46%;height:100%;background:repeating-linear-gradient(135deg,#ffb020 0 14px,#111316 14px 28px);opacity:.6"></div><div class="mock__art" style="right:14%;top:30%;width:22%;aspect-ratio:1;border-radius:50%;border:7px dashed #f2f2f2;animation:spin 12s linear infinite"></div>',
      desc: 'Site para oficina com lista de serviços, marcas atendidas, fotos da estrutura e pedido de orçamento pelo WhatsApp.',
      features: ['Lista de serviços', 'Orçamento pelo WhatsApp', 'Fotos da oficina', 'Mapa e horário'],
    },
    {
      id: 'clinica', cat: 'comercio', name: 'Clínica Vitta', kind: 'Clínica',
      vars: { bg: '#e9f5f2', fg: '#0d3b35', acc: '#13a387', card: 'rgba(19,163,135,.14)', btn: '#04241e' },
      hero: ['Cuidado que começa no clique.', 'Marque sua consulta pelo WhatsApp.', 'Agendar'],
      art: '<div class="mock__art" style="right:-10%;top:10%;width:60%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(19,163,135,.35),transparent 65%)"></div><div class="mock__art" style="right:12%;top:30%;width:26%;aspect-ratio:1;border-radius:24px;background:#fff;box-shadow:0 20px 40px rgba(13,59,53,.18)"></div>',
      desc: 'Site para clínica ou consultório com especialidades, equipe, convênios e marcação de consulta pelo WhatsApp.',
      features: ['Especialidades e equipe', 'Marcação pelo WhatsApp', 'Convênios atendidos', 'Preparado para o Google'],
    },
    {
      id: 'restaurante', cat: 'comercio', name: 'Brasa & Lenha', kind: 'Restaurante',
      vars: { bg: '#160b06', fg: '#ffe9d6', acc: '#ff6a2b', card: 'rgba(255,106,43,.14)', btn: '#2a0d02' },
      hero: ['Fogo alto, sabor de verdade.', 'Veja o cardápio e peça pelo WhatsApp.', 'Ver cardápio'],
      art: '<div class="mock__art" style="right:-18%;top:12%;width:70%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 40% 40%,#ffb36b,#ff6a2b 40%,#7a1d05 75%,transparent 76%);box-shadow:0 0 80px #ff6a2b"></div>',
      desc: 'Site para restaurante com cardápio digital, fotos dos pratos, horário e pedido pelo WhatsApp.',
      features: ['Cardápio digital', 'Pedido pelo WhatsApp', 'Fotos dos pratos', 'Mapa e horário'],
    },
    {
      id: 'sistema', cat: 'sistemas', name: 'Painel de gestão', kind: 'Sistema web · sob consulta',
      vars: { bg: '#070b1a', fg: '#e6ecff', acc: '#6d7cff', card: 'rgba(109,124,255,.16)', btn: '#070b1a' },
      hero: ['Sua operação em uma tela.', 'Cadastros, agenda e relatórios.', 'Conversar'],
      art: '<div class="mock__art" style="right:7%;top:24%;width:40%;height:46%;border-radius:10px;border:1px solid rgba(109,124,255,.4);background:linear-gradient(0deg,rgba(109,124,255,.5) 0 100%,transparent 0) 10% 100%/12% 30% no-repeat,linear-gradient(0deg,rgba(109,124,255,.8) 0 100%,transparent 0) 30% 100%/12% 80% no-repeat,linear-gradient(0deg,rgba(109,124,255,.5) 0 100%,transparent 0) 50% 100%/12% 45% no-repeat,linear-gradient(0deg,rgba(56,189,248,.9) 0 100%,transparent 0) 70% 100%/12% 92% no-repeat,#0c1330"></div>',
      desc: 'Sistema web sob medida para organizar a operação: cadastros, agenda, controle e relatórios. Orçamento depois de uma conversa.',
      features: ['Login por usuário', 'Cadastros e agenda', 'Relatórios', 'Integração com ERP, WMS ou TMS'],
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
    <div class="model" role="button" tabindex="0" data-cat="${m.cat}" data-id="${m.id}">
      <div class="model__shot" aria-hidden="true">${mockHTML(m)}<div class="model__glare"></div></div>
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

  if (hasST && !reduceMotion) {
    ScrollTrigger.batch('.model', {
      start: 'top 94%', once: true,
      onEnter: (els) => gsap.from(els, { y: 50, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, overwrite: true, clearProps: 'transform,opacity' }),
    });
  }

  $$('.filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.filter').forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-selected', String(b === btn)); });
      const f = btn.dataset.filter;
      const cards = $$('.model');
      cards.forEach((c) => c.classList.toggle('is-hidden', f !== 'all' && c.dataset.cat !== f));
      const shown = cards.filter((c) => !c.classList.contains('is-hidden'));
      if (hasGsap && !reduceMotion) gsap.fromTo(shown, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.05, clearProps: 'transform,opacity' });
      if (hasST) ScrollTrigger.refresh();
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
    $('#modalCta').href = waLink(`Olá, Fernando! Vi o modelo de ${m.kind.split(' ·')[0].toLowerCase()} no seu site e quero uma prévia parecida para o meu negócio.`);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('menu-open');
    if (lenis) lenis.stop();
    $('.modal__close', modal).focus({ preventScroll: true });
  }
  function closeModal() {
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('menu-open');
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  $$('[data-close]', modal).forEach((el) => el.addEventListener('click', closeModal));
  $('#modalCta').addEventListener('click', () => setTimeout(closeModal, 100));
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
  function labMove(px, py) {
    labCard.style.transform = `rotateX(${(0.5 - py) * 22}deg) rotateY(${(px - 0.5) * 26}deg) translateZ(20px)`;
    labCard.style.setProperty('--sx', `${px * 100}%`);
    labCard.style.setProperty('--sy', `${py * 100}%`);
  }
  if (finePointer) {
    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !stage.classList.contains('fx-tilt')) return;
      const r = stage.getBoundingClientRect();
      labMove((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    });
    stage.addEventListener('pointerleave', () => { labCard.style.transform = ''; });
  } else if (!reduceMotion) {
    // em telas de toque o card se mexe sozinho (sem capturar o dedo) enquanto estiver visível
    let t = 0, labVisible = false;
    new IntersectionObserver((en) => { labVisible = en[0].isIntersecting; }).observe(stage);
    const idle = () => {
      requestAnimationFrame(idle);
      if (!labVisible || !stage.classList.contains('fx-tilt')) return;
      t += 0.015;
      labMove(0.5 + Math.sin(t) * 0.3, 0.5 + Math.cos(t * 0.8) * 0.3);
    };
    idle();
  }
  $$('.swatch').forEach((sw) => {
    sw.addEventListener('click', () => {
      $$('.swatch').forEach((s) => { s.classList.toggle('is-active', s === sw); s.setAttribute('aria-checked', String(s === sw)); });
      stage.style.setProperty('--lab', sw.dataset.color);
    });
  });

  /* ---------- processo: horizontal fixado só no desktop com mouse ---------- */
  const processSec = $('#processo');
  const track = $('#processTrack');
  const processBar = $('#processBar');
  processSec.classList.add('no-pin');
  if (hasST && !reduceMotion) {
    ScrollTrigger.matchMedia({
      '(min-width: 900px) and (hover: hover) and (pointer: fine)': function () {
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
        return () => { processSec.classList.add('no-pin'); gsap.set(track, { clearProps: 'transform' }); };
      },
    });
  }

  /* ---------- simulador ---------- */
  const form = $('#builderForm');
  const pages = $('#pages');
  const pagesOut = $('#pagesOut');
  const bpBody = $('#bpBody');
  const TYPES = {
    landing: { label: 'Landing page', url: 'seunegocio.com.br', score: 1 },
    site: { label: 'Site com várias páginas', url: 'www.seunegocio.com.br', score: 2 },
    sistema: { label: 'Sistema web', url: 'app.seunegocio.com.br', score: 5, consult: true },
  };
  const FEATURES = {
    whatsapp: { s: 0, block: 'Botão de WhatsApp' },
    mapa: { s: 0.5, block: 'Mapa e horário de funcionamento' },
    galeria: { s: 1, block: 'Galeria de fotos' },
    '3d': { s: 2, block: 'Animações 3D' },
    blog: { s: 1.5, block: 'Blog' },
    login: { s: 3, block: 'Área do cliente', consult: true },
    erp: { s: 3, block: 'Integração com ERP', consult: true },
  };
  let lastSummary = '';

  function updateBuilder() {
    const typeKey = form.querySelector('input[name="type"]:checked').value;
    const type = TYPES[typeKey];
    if (typeKey === 'landing' && Number(pages.value) > 1) pages.value = 1;
    pages.disabled = typeKey === 'landing';
    const feats = $$('#featureChips input:checked').map((i) => i.value);
    const n = Number(pages.value);
    pagesOut.textContent = n;
    pages.style.setProperty('--p', `${((n - 1) / 9) * 100}%`);

    const consult = type.consult || feats.some((f) => FEATURES[f].consult);
    $('#bpWeeks').textContent = consult ? 'Sob consulta' : '7 a 10';
    $('#bpUnit').textContent = consult ? 'prazo combinado na conversa' : 'dias';
    const score = type.score + feats.reduce((a, f) => a + FEATURES[f].s, 0) + n / 3;
    const pct = Math.min(100, Math.round((score / 14) * 100));
    $('#bpMeter').style.width = `${Math.max(pct, 8)}%`;
    $('#bpLevel').textContent = pct < 30 ? 'Essencial' : pct < 60 ? 'Completo' : 'Sob medida';
    $('#bpUrl').textContent = type.url;

    const blocks = [`<div class="bp__block bp__block--hero"><b>&lt;topo&gt;</b> ${type.label}</div>`];
    if (typeKey === 'sistema') blocks.push('<div class="bp__block"><b>&lt;painel/&gt;</b> Cadastros e relatórios</div>');
    blocks.push('<div class="bp__block bp__block--grid"><i></i><i></i><i></i></div>');
    feats.forEach((f) => blocks.push(`<div class="bp__block"><b>+</b> ${FEATURES[f].block}${FEATURES[f].consult ? ' <em>sob consulta</em>' : ''}</div>`));
    blocks.push(`<div class="bp__block"><b>${n}</b> ${n === 1 ? 'página' : 'páginas'} · feito para celular</div>`);
    bpBody.innerHTML = blocks.join('');

    lastSummary = `Tipo: ${type.label}\nPáginas: ${n}\nPrecisa ter: ${feats.length ? feats.map((f) => FEATURES[f].block).join(', ') : 'só o básico'}`;
    $('#bpCta').href = waLink(`Olá, Fernando! Montei este site no simulador e quero uma prévia gratuita:\n${lastSummary}`);
  }
  form.addEventListener('input', updateBuilder);
  form.addEventListener('submit', (e) => e.preventDefault());
  updateBuilder();

  /* ---------- canvas de pontos do contato (só mouse) ---------- */
  const dots = $('#dotsCanvas');
  if (dots && finePointer && !reduceMotion) {
    const ctx = dots.getContext('2d');
    let W = 0, H = 0, pts = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouseD = { x: -9999, y: -9999 };
    let running = false;
    function build() {
      W = dots.clientWidth; H = dots.clientHeight;
      dots.width = W * dpr; dots.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gap = 32;
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
        ctx.fillStyle = force > 0.02 ? `rgba(56,189,248,${0.12 + force * 0.8})` : 'rgba(130,160,255,0.12)';
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
  } else if (dots) {
    dots.remove();
  }

  /* ---------- formulário → WhatsApp ---------- */
  const contactForm = $('#contactForm');
  const status = $('#formStatus');
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;
    $$('[required]', contactForm).forEach((f) => {
      const bad = !f.value.trim();
      f.closest('.field').classList.toggle('is-invalid', bad);
      if (bad) valid = false;
    });
    status.className = 'form__status mono';
    if (!valid) {
      status.textContent = 'Preencha seu nome e conte o que você precisa.';
      status.classList.add('is-err');
      return;
    }
    const data = new FormData(contactForm);
    const text = `Olá, Fernando! Meu nome é ${data.get('name').trim()}.` +
      (data.get('company').trim() ? `\nNegócio: ${data.get('company').trim()}` : '') +
      `\n\n${data.get('message').trim()}`;
    status.classList.add('is-ok');
    status.textContent = 'Abrindo o WhatsApp com a sua mensagem…';
    const link = document.createElement('a');
    link.href = waLink(text);
    link.target = '_blank';
    link.rel = 'noopener';
    link.click();
    if (window.Hero3D) window.Hero3D.pulse();
  });
  $$('.field input, .field textarea').forEach((f) => f.addEventListener('input', () => f.closest('.field').classList.remove('is-invalid')));

  $('#toTop').addEventListener('click', () => scrollToTarget('#top'));

  /* ---------- start ---------- */
  runPreloader();
  window.addEventListener('load', () => { if (hasST) ScrollTrigger.refresh(); });
})();
