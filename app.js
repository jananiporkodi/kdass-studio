(() => {
  // header: phone menu + solid bar once you leave the top
  const top = document.querySelector('.top');
  const btn = document.querySelector('.menu-btn');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open);
    btn.lastChild.textContent = open ? 'Close' : 'Menu';
  };
  btn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  document.querySelectorAll('.pills a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  const solid = () => top.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', solid, { passive: true }); solid();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) {
    document.documentElement.classList.add('static');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // smooth scrolling
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? 0 : document.querySelector(id);
    if (el === null) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(el, { duration: 2.2 }) : (el === 0 ? scrollTo(0, 0) : el.scrollIntoView({ behavior: 'smooth' }));
  }));

  // ── portal scenes: each layer zooms into its focal point, the next fades up out of it
  const buildPortal = sec => {
    const layers = [...sec.querySelectorAll('.layer')];
    const isHero = sec.classList.contains('portal-hero');

    layers.forEach(l => {
      const f = l.dataset.focus || '50% 50%';
      const art = l.querySelector('.art');
      if (art.tagName === 'IMG') art.style.objectPosition = f;
      art.style.transformOrigin = f;
    });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.6 }
    });

    let t = 0;
    if (isHero) {
      // framed picture opens to full bleed, copy drifts away
      tl.to(sec.querySelector('.hero-copy'), { opacity: 0, y: -60, duration: 0.5, ease: 'power1.in' }, 0)
        .to(sec.querySelector('.scroll-hint'), { opacity: 0, duration: 0.2 }, 0)
        .to(layers[0], { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.8, ease: 'power2.inOut' }, 0.1)
        .fromTo(layers[0].querySelector('.art'), { scale: 1.12 }, { scale: 1, duration: 0.8, ease: 'power2.out' }, 0.1);
      t = 1.0;
    } else {
      // first caption is already there when the scene pins
      const c0 = layers[0].querySelector('.cap');
      if (c0) tl.fromTo(c0, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 }, 0);
      t = 0.55;
    }

    layers.forEach((l, i) => {
      const art = l.querySelector('.art');
      const cap = l.querySelector('.cap');
      const next = layers[i + 1];
      const zoom = +(l.dataset.zoom || 8);

      if (cap && (i > 0)) {
        // caption arrives once this layer has settled
        tl.fromTo(cap, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, t - 0.25);
      }
      if (!next && !l.hasAttribute('data-exit')) {
        tl.to({}, { duration: 0.5 }, t); // hold on the last room
        return;
      }

      // hold, then push into the doorway
      const go = t + 0.35;
      if (cap) tl.to(cap, { opacity: 0, y: -30, duration: 0.25 }, go);
      tl.to(art, { scale: zoom, duration: 1.1, ease: 'power3.in' }, go);
      tl.to(l, { '--shade': 0, duration: 0.3 }, go);

      if (next) {
        const nArt = next.querySelector('.art');
        tl.to(l, { opacity: 0, duration: 0.3 }, go + 0.8);
        tl.fromTo(next, { opacity: 0 }, { opacity: 1, duration: 0.3 }, go + 0.78);
        tl.fromTo(nArt, { scale: 1.7 }, { scale: 1, duration: 0.75, ease: 'power3.out' }, go + 0.78);
        t = go + 1.6;
      } else {
        tl.to(l, { opacity: 0, duration: 0.3 }, go + 0.8);
        t = go + 1.15;
      }
    });
  };

  // ── horizontal galleries
  const buildGallery = g => {
    const pin = g.querySelector('.g-pin');
    const track = g.querySelector('.track');
    const head = g.querySelector('.g-head');
    const dist = () => track.scrollWidth + head.offsetWidth - innerWidth;
    gsap.to(pin, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: { trigger: g, start: 'top top', end: () => '+=' + dist(), pin: g, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    gsap.from(track.children, {
      opacity: 0, y: 60, stagger: 0.06, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: g, start: 'top 75%' }
    });
  };

  // build in page order so each scene is measured after the pins above it
  document.querySelectorAll('.portal, .gallery').forEach(sec =>
    sec.classList.contains('portal') ? buildPortal(sec) : buildGallery(sec));

  // studio reveal
  gsap.from('.studio-img img', { scale: 1.25, ease: 'none', scrollTrigger: { trigger: '.studio', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.studio-copy > *', { opacity: 0, y: 40, stagger: 0.08, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.studio', start: 'top 65%' } });

  // rail + nav state
  const railSpans = [...document.querySelectorAll('.rail span')];
  const navLinks = [...document.querySelectorAll('.pills a')];
  const bar = document.querySelector('.rail-bar b');
  document.querySelectorAll('[data-rail]').forEach(sec => {
    ScrollTrigger.create({
      trigger: sec.closest('.pin-spacer') || sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: s => {
        if (!s.isActive) return;
        const k = sec.dataset.rail;
        railSpans.forEach(r => r.classList.toggle('on', r.dataset.for === k));
        navLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + k));
      }
    });
  });
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => { bar.style.height = (s.progress * 100) + '%'; } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
