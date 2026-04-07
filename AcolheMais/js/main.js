/* =============================================
   AcolheMais — main.js
   Interatividade da landing page
   ============================================= */

// ── Navbar Scroll ──────────────────────────────
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  function onScroll() {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ── Mobile Menu ────────────────────────────────
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileMenu   = document.getElementById('mobileMenu');
const menuClose    = document.getElementById('menuClose');

if (hamburgerBtn && mobileMenu) {
  hamburgerBtn.addEventListener('click', () => {
    mobileMenu.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
}

if (menuClose) {
  menuClose.addEventListener('click', closeMobileMenu);
}

function closeMobileMenu() {
  if (mobileMenu) {
    mobileMenu.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close on escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMobileMenu();
});

// ── Scroll Animations (IntersectionObserver) ───
(function initScrollAnimations() {
  const elements = document.querySelectorAll('.animate-in');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach((el) => observer.observe(el));
})();

// ── Animated Counters ─────────────────────────
(function initCounters() {
  const counters = document.querySelectorAll('[data-target]');
  if (!counters.length) return;

  function animateCounter(el) {
    const target   = parseFloat(el.dataset.target);
    const suffix   = el.dataset.suffix || '';
    const duration = 1800;
    const start    = performance.now();

    function update(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = Math.round(eased * target);

      if (Number.isInteger(target)) {
        el.textContent = current.toLocaleString('pt-BR') + suffix;
      } else {
        el.textContent = (eased * target).toFixed(1) + suffix;
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target.toLocaleString('pt-BR') + suffix;
      }
    }
    requestAnimationFrame(update);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
})();

// ── Problem section — percentage counter ──────
(function initProblemCounters() {
  const nums = document.querySelectorAll('.problem-num[data-count]');
  if (!nums.length) return;

  nums.forEach((el) => {
    const target   = parseInt(el.dataset.count);
    const isR      = el.dataset.count === '150'; // R$150

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const duration = 1600;
            const start    = performance.now();

            function update(now) {
              const elapsed  = now - start;
              const progress = Math.min(elapsed / duration, 1);
              const eased    = 1 - Math.pow(1 - progress, 3);
              const current  = Math.round(eased * target);

              if (isR) {
                el.textContent = 'R$' + current;
              } else {
                el.textContent = current + '%';
              }

              if (progress < 1) requestAnimationFrame(update);
              else el.textContent = isR ? 'R$' + target : target + '%';
            }
            requestAnimationFrame(update);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
  });
})();

// ── CTA Form Submit ────────────────────────────
function handleCTASubmit(btn) {
  const form  = btn.closest('.cta-form');
  const name  = form.querySelector('input[type="text"]').value.trim();
  const email = form.querySelector('input[type="email"]').value.trim();
  const role  = form.querySelector('select').value;

  if (!name || !email || !role) {
    // Simple shake animation for empty fields
    form.style.animation = 'none';
    form.offsetHeight; // reflow
    form.style.animation = 'shake 0.4s ease';
    return;
  }

  btn.innerHTML = '<i class="fa-solid fa-check"></i> Cadastro recebido!';
  btn.style.background = 'var(--success)';
  btn.disabled = true;

  setTimeout(() => {
    btn.innerHTML = '<i class="fa-solid fa-heart"></i> Quero participar';
    btn.style.background = '';
    btn.disabled = false;
    form.querySelector('input[type="text"]').value = '';
    form.querySelector('input[type="email"]').value = '';
    form.querySelector('select').value = '';
  }, 3000);
}

// Shake keyframe
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
  }
`;
document.head.appendChild(shakeStyle);

// ── Smooth scroll for anchor links ────────────
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      closeMobileMenu();
      const offset = 80; // navbar height
      const y = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  });
});

// ── Progress bar animation for dashboards ─────
(function initProgressBars() {
  const bars = document.querySelectorAll('.progress-fill');
  if (!bars.length) return;

  bars.forEach((bar) => {
    const targetWidth = bar.style.width;
    bar.style.width   = '0%';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              bar.style.width = targetWidth;
            }, 200);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(bar);
  });
})();
