/**
 * AcolheMais 2.0 — main.js
 * Nav, smooth scroll, scroll animations, hero parallax.
 *
 * Convention: data-delay values in HTML are bare numbers (e.g. "150"),
 * JS appends "ms" when applying as transitionDelay. Never write "150ms" in HTML.
 */

'use strict';

/* -----------------------------------------------------------------------------
   NAV
   ----------------------------------------------------------------------------- */
function initNav() {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');
  const nav       = document.getElementById('nav');

  if (!hamburger || !navLinks || !nav) return;

  // --- Toggle mobile menu ---
  function openMenu() {
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.classList.add('is-active');
    navLinks.classList.add('is-open');
    document.body.classList.add('menu-open');
    // Move focus to first link for accessibility
    const firstLink = navLinks.querySelector('a');
    if (firstLink) firstLink.focus();
  }

  function closeMenu() {
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.classList.remove('is-active');
    navLinks.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  }

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMenu() : openMenu();
  });

  // Close on link click (mobile)
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hamburger.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      hamburger.focus();
    }
  });

  // --- Glass effect on scroll (IntersectionObserver on hero) ---
  const hero = document.getElementById('hero');
  if (hero) {
    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        nav.classList.toggle('nav--scrolled', !entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    heroObserver.observe(hero);
  }
}


/* -----------------------------------------------------------------------------
   SMOOTH SCROLL
   Intercepts <a href="#..."> and scrolls with nav-height offset.
   Does NOT use scrollIntoView to avoid offset conflict with sticky nav.
   ----------------------------------------------------------------------------- */
function initSmoothScroll() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Read nav height from CSS variable so it stays in sync
  const navHeightPx = () => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--nav-height')
      .trim();
    return parseFloat(raw) || 68;
  };

  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const targetId = anchor.getAttribute('href').slice(1);
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    e.preventDefault();

    const offset = target.getBoundingClientRect().top + window.scrollY - navHeightPx();

    window.scrollTo({
      top: Math.max(0, offset),
      behavior: prefersReduced ? 'auto' : 'smooth'
    });

    // Update URL hash without triggering jump
    history.pushState(null, '', `#${targetId}`);
  });
}


/* -----------------------------------------------------------------------------
   SCROLL ANIMATIONS — IntersectionObserver on .js-reveal elements
   ----------------------------------------------------------------------------- */
function initScrollAnimations() {
  const reveals = document.querySelectorAll('.js-reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        // data-delay is a bare number (e.g. "150") — append "ms" here
        const delay = el.dataset.delay ?? '0';
        el.style.transitionDelay = `${delay}ms`;
        el.classList.add('is-visible');

        // One-shot: unobserve after first trigger
        observer.unobserve(el);
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px'
    }
  );

  reveals.forEach(el => observer.observe(el));
}


/* -----------------------------------------------------------------------------
   HERO PARALLAX — subtle translateY on scroll
   Disabled when: prefers-reduced-motion OR viewport < 768px
   ----------------------------------------------------------------------------- */
function initHeroParallax() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const isMobile = () => window.innerWidth < 768;
  if (isMobile()) return;

  const heroVisual = document.querySelector('.hero__visual');
  if (!heroVisual) return;

  let ticking = false;
  const MAX_SHIFT = 20; // px

  function onScroll() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      if (isMobile()) {
        heroVisual.style.transform = '';
        ticking = false;
        return;
      }

      const scrollY  = window.scrollY;
      const viewportH = window.innerHeight;
      // Only active while hero is in view
      if (scrollY > viewportH) {
        heroVisual.style.transform = '';
        ticking = false;
        return;
      }

      const progress = scrollY / viewportH; // 0 → 1
      const shift    = progress * MAX_SHIFT;
      heroVisual.style.transform = `translateY(${shift}px)`;
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Clean up on resize to mobile
  window.addEventListener('resize', () => {
    if (isMobile()) {
      heroVisual.style.transform = '';
    }
  }, { passive: true });
}


/* -----------------------------------------------------------------------------
   ACTIVE NAV LINK — highlight on scroll using IntersectionObserver
   ----------------------------------------------------------------------------- */
function initActiveNavLinks() {
  const sections  = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav__links a[href^="#"]');
  if (!sections.length || !navAnchors.length) return;

  const map = new Map();
  navAnchors.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    if (id) map.set(id, a);
  });

  let current = '';

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          current = entry.target.id;
        }
      });

      // Update active classes
      navAnchors.forEach(a => a.classList.remove('is-active'));
      if (current && map.has(current)) {
        map.get(current).classList.add('is-active');
      }
    },
    {
      threshold: 0.4
    }
  );

  sections.forEach(s => sectionObserver.observe(s));
}


/* -----------------------------------------------------------------------------
   JOURNEY CONNECTOR — animate the vertical line via IntersectionObserver
   ----------------------------------------------------------------------------- */
function initJourneyConnector() {
  const stepsEl = document.querySelector('.journey__steps');
  if (!stepsEl) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  // Start line hidden, animate when section comes into view
  const pseudoStyle = document.createElement('style');
  pseudoStyle.textContent = `
    .journey__steps::before {
      transform: scaleY(0);
      transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .journey__steps.connector-visible::before {
      transform: scaleY(1);
    }
  `;
  document.head.appendChild(pseudoStyle);

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        stepsEl.classList.add('connector-visible');
        observer.unobserve(stepsEl);
      }
    },
    { threshold: 0.2 }
  );

  observer.observe(stepsEl);
}


/* -----------------------------------------------------------------------------
   ENTRY POINT
   ----------------------------------------------------------------------------- */
function init() {
  initNav();
  initSmoothScroll();
  initScrollAnimations();
  initHeroParallax();
  initActiveNavLinks();
  initJourneyConnector();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM already parsed (script deferred or at end of body)
  init();
}
