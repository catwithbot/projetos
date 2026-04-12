/**
 * AcolheMais 2.0 — acesso.js
 * Handles: 4-step triage wizard, frequency slider, scroll reveal.
 *
 * Depends on: main.js (nav logic already loaded before this script).
 */

'use strict';

/* =============================================================================
   WIZARD STATE
   ============================================================================= */

const state = {
  currentStep: 1,
  totalSteps: 4,
  answers: {
    feelings: [],
    frequency: 2,
    therapy: null
  }
};

/* Step label→progress fill map */
const PROGRESS_MAP = { 1: '25%', 2: '50%', 3: '75%', 4: '100%' };

const FREQ_LABELS = {
  1: 'Raramente',
  2: 'Às vezes',
  3: 'Frequentemente',
  4: 'Sempre'
};


/* =============================================================================
   DOM REFS
   ============================================================================= */

const wizard       = document.getElementById('wizard');
const progressFill = document.getElementById('progress-fill');
const progressBar  = wizard?.querySelector('[role="progressbar"]');

const panels = {
  1: document.getElementById('step-1'),
  2: document.getElementById('step-2'),
  3: document.getElementById('step-3'),
  4: document.getElementById('step-4')
};

const dots = wizard?.querySelectorAll('.wizard__progress-step');


/* =============================================================================
   HELPERS
   ============================================================================= */

function showStep(nextStep) {
  const current = panels[state.currentStep];
  const next    = panels[nextStep];

  if (!current || !next) return;

  /* hide current */
  current.hidden = true;
  current.classList.remove('is-active');

  /* update dots */
  dots?.forEach(dot => {
    const n = parseInt(dot.dataset.step, 10);
    dot.classList.remove('is-active', 'is-done');
    if (n < nextStep) dot.classList.add('is-done');
    if (n === nextStep) dot.classList.add('is-active');
  });

  /* update progress bar */
  if (progressFill) progressFill.style.width = PROGRESS_MAP[nextStep];
  if (progressBar) {
    progressBar.setAttribute('aria-valuenow', nextStep);
  }

  /* show next */
  next.hidden = false;
  next.classList.add('is-active');

  /* force re-trigger animation */
  next.style.animation = 'none';
  next.offsetHeight; /* reflow */
  next.style.animation = '';

  state.currentStep = nextStep;

  /* scroll wizard into view smoothly */
  wizard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/* =============================================================================
   STEP 1 — Feelings
   ============================================================================= */

function initStep1() {
  const checkboxes = document.querySelectorAll('.feeling-input');
  const nextBtn    = document.getElementById('next-1');

  function updateNext() {
    const checked = document.querySelectorAll('.feeling-input:checked');
    state.answers.feelings = Array.from(checked).map(c => c.value);
    if (nextBtn) nextBtn.disabled = checked.length === 0;
  }

  checkboxes.forEach(cb => cb.addEventListener('change', updateNext));

  nextBtn?.addEventListener('click', () => {
    if (state.answers.feelings.length > 0) showStep(2);
  });
}


/* =============================================================================
   STEP 2 — Frequency
   ============================================================================= */

function initStep2() {
  const slider   = document.getElementById('freq-slider');
  const label    = document.getElementById('freq-label');
  const fill     = document.getElementById('freq-fill');
  const descCards = document.querySelectorAll('.freq-desc-card');
  const nextBtn  = document.getElementById('next-2');
  const backBtn  = document.getElementById('back-2');

  function updateSlider(val) {
    const v = parseInt(val, 10);
    state.answers.frequency = v;

    /* label */
    if (label) label.textContent = FREQ_LABELS[v];
    if (slider) slider.setAttribute('aria-valuetext', FREQ_LABELS[v]);

    /* fill: val 1→4 maps to 0%→100% visually (steps of 33%) */
    const pct = ((v - 1) / 3) * 100;
    if (fill) fill.style.width = `${pct}%`;

    /* active description card */
    descCards.forEach(card => {
      card.classList.toggle('is-active', parseInt(card.dataset.value, 10) === v);
    });
  }

  slider?.addEventListener('input', e => updateSlider(e.target.value));

  /* init to default */
  updateSlider(slider?.value ?? 2);

  nextBtn?.addEventListener('click', () => showStep(3));
  backBtn?.addEventListener('click', () => showStep(1));
}


/* =============================================================================
   STEP 3 — Therapy history
   ============================================================================= */

function initStep3() {
  const radios  = document.querySelectorAll('.therapy-input');
  const nextBtn = document.getElementById('next-3');
  const backBtn = document.getElementById('back-3');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      state.answers.therapy = radio.value;
      if (nextBtn) nextBtn.disabled = false;
    });
  });

  nextBtn?.addEventListener('click', () => {
    if (state.answers.therapy) showStep(4);
  });

  backBtn?.addEventListener('click', () => showStep(2));
}


/* =============================================================================
   STEP 4 — Match + Scroll Reveal
   ============================================================================= */

function initStep4() {
  const backBtn = document.getElementById('back-4');
  backBtn?.addEventListener('click', () => {
    /* reset state for redo */
    state.answers.therapy = null;
    document.querySelectorAll('.therapy-input').forEach(r => r.checked = false);
    const nextBtn3 = document.getElementById('next-3');
    if (nextBtn3) nextBtn3.disabled = true;
    showStep(3);
  });

  /* Reveal prof cards when step 4 becomes visible */
  observeMatchCards();
}

function observeMatchCards() {
  const cards = document.querySelectorAll('#step-4 .js-reveal');
  if (!cards.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay ?? '0', 10);
        setTimeout(() => {
          entry.target.classList.add('is-visible');
        }, delay);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => io.observe(card));
}


/* =============================================================================
   GLOBAL SCROLL REVEAL (supervision + CTA sections)
   ============================================================================= */

function initScrollReveal() {
  const revealEls = document.querySelectorAll('.js-reveal:not(#step-4 .js-reveal)');
  if (!revealEls.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const delay = parseInt(entry.target.dataset.delay ?? '0', 10);
      setTimeout(() => {
        entry.target.classList.add('is-visible');
      }, delay);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => io.observe(el));
}


/* =============================================================================
   CTA BUTTON — scroll wizard to top and restart
   ============================================================================= */

function initCtaButton() {
  const ctaBtn = document.getElementById('cta-start-btn');
  ctaBtn?.addEventListener('click', e => {
    /* if already on step 1, just scroll */
    if (state.currentStep !== 1) {
      e.preventDefault();
      /* reset wizard */
      document.querySelectorAll('.feeling-input').forEach(cb => { cb.checked = false; });
      document.querySelectorAll('.therapy-input').forEach(r => { r.checked = false; });
      const next1 = document.getElementById('next-1');
      const next3 = document.getElementById('next-3');
      if (next1) next1.disabled = true;
      if (next3) next3.disabled = true;
      state.answers = { feelings: [], frequency: 2, therapy: null };

      const slider = document.getElementById('freq-slider');
      if (slider) { slider.value = 2; }

      showStep(1);
    }
  });
}


/* =============================================================================
   INIT
   ============================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  if (!wizard) return;

  initStep1();
  initStep2();
  initStep3();
  initStep4();
  initScrollReveal();
  initCtaButton();
});
