/**
 * nav-loader.js — AcolheMais 2.0
 * ─────────────────────────────────────────────────────────────────
 * 1. Injects the bottom navigation bar into every page
 * 2. Marks the current page as active (aria-current + CSS class)
 * 3. Intercepts same-site .html link clicks for a fade transition
 * ─────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── Page detection ──────────────────────────────────────────── */
  const filename = window.location.pathname.split('/').pop() || 'index.html';
  const pageMap = {
    'index.html':      'index',
    'acesso.html':     'acesso',
    'jornada.html':    'jornada',
    'mente-corpo.html':'mente',
  };
  const currentPage = pageMap[filename] ?? 'index';

  /* ── Build a single nav item ─────────────────────────────────── */
  function navItem(page, href, label, svgInner) {
    const isActive = currentPage === page;
    const activeClass = isActive ? ' bottom-nav__item--active' : '';
    const ariaCurrent = isActive ? ' aria-current="page"' : '';
    return `<a href="${href}" class="bottom-nav__item${activeClass}" data-page="${page}"${ariaCurrent} aria-label="${label}">
      <span class="bottom-nav__icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">${svgInner}</svg>
      </span>
      <span class="bottom-nav__label">${label}</span>
    </a>`;
  }

  /* ── Assemble the nav HTML ───────────────────────────────────── */
  const navHTML = `<nav class="bottom-nav" id="bottom-nav" aria-label="Navegação principal">
  ${navItem('index',   'index.html',       'Início',
      '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>')}
  ${navItem('jornada', 'jornada.html',     'Jornada',
      '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>')}
  ${navItem('acesso',  'acesso.html',      'Acesso',
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>')}
  ${navItem('mente',   'mente-corpo.html', 'Mente',
      '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>')}
</nav>`;

  /* ── Inject nav ──────────────────────────────────────────────── */
  document.body.insertAdjacentHTML('beforeend', navHTML);

  /* ── Page fade transition ────────────────────────────────────── */
  document.addEventListener('click', function handleNavClick(e) {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Skip: anchors, external links, mailto/tel, _blank targets
    if (
      href.startsWith('#') ||
      href.startsWith('http') ||
      href.startsWith('//') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      link.target === '_blank'
    ) return;

    // Only intercept .html same-site navigation
    if (!href.endsWith('.html') && href !== '/' && href !== './') return;

    e.preventDefault();
    document.documentElement.classList.add('page-transitioning');
    setTimeout(() => { window.location.href = href; }, 230);
  });

})();
