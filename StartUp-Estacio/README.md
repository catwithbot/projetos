# AcolheMais 2.0

Plataforma biopsicossocial que conecta pessoas a apoio emocional acessível — gratuito, sem burocracia, via WhatsApp. Construída como PWA responsiva com design system próprio.

---

## Estrutura de arquivos

```
/
├── index.html          # Landing page (hero, módulos, mockups, diferenciais, jornada, CTA)
├── acesso.html         # Módulo 1 — Acesso & Conexão (wizard de triagem, match de profissionais)
├── jornada.html        # Módulo 3 — Jornada & IA (check-in, mini-game de triagem, histórias)
├── mente-corpo.html    # Módulo 2 — Mente & Corpo (check-in diário, histórico, biblioteca)
│
├── manifest.json       # PWA manifest (ícones, cores, shortcuts, screenshots)
├── sw.js               # Service worker (cache offline)
│
├── css/
│   ├── design-system.css   # Tokens: cores, tipografia, espaçamento, animações, reset
│   ├── style.css           # Layout global: nav, hero, módulos, mockups, footer
│   ├── nav-bottom.css      # Bottom navigation mobile + page transitions
│   ├── acesso.css          # Estilos do módulo Acesso (tema teal)
│   ├── jornada.css         # Estilos do módulo Jornada (tema brick/laranja)
│   └── mente-corpo.css     # Estilos do módulo Mente & Corpo (tema roxo)
│
├── js/
│   ├── main.js             # Shared: hamburger nav, scroll reveal, parallax, smooth scroll
│   ├── nav-loader.js       # Injeta bottom nav, define estado ativo, fade de transição
│   ├── acesso.js           # Lógica do wizard de triagem (4 etapas, match de profissionais)
│   ├── jornada.js          # Quiz com 5 cenários, radar chart, modal de histórias
│   └── mente-corpo.js      # Check-in form, localStorage, gráfico de histórico 7 dias
│
├── components/
│   └── nav.html            # Template HTML de referência da bottom navigation
│
└── icons/
    ├── icon-192.svg        # Ícone PWA 192×192 (purpose: any)
    ├── icon-512.svg        # Ícone PWA 512×512 (purpose: any maskable)
    └── screenshot-mobile.svg  # Screenshot para prompt de instalação PWA
```

---

## Design System

Todos os tokens ficam em `css/design-system.css` — nenhum hex literal em outros arquivos.

| Token            | Valor       | Uso                          |
|------------------|-------------|------------------------------|
| `--color-teal`   | `#1D9E75`   | Acesso & Conexão, primário   |
| `--color-purple` | `#7F77DD`   | Mente & Corpo                |
| `--color-brick`  | `#D85A30`   | Jornada & IA                 |
| `--bg-base`      | `#1A2332`   | Fundo principal (dark)       |
| `--font-display` | Syne        | Títulos e destaque           |
| `--font-body`    | Plus Jakarta Sans | Corpo de texto         |

---

## PWA

### Como testar a instalação

1. Sirva os arquivos via **HTTPS** ou **localhost** (service workers não funcionam em `file://`)
2. Abra no Chrome para Android
3. Um banner "Adicionar à tela inicial" deve aparecer após a primeira visita

```bash
# Opção rápida com Python
python3 -m http.server 8080
# Acesse http://localhost:8080
```

### Cache offline

O `sw.js` usa duas estratégias:
- **Network-first** para páginas HTML — sempre tenta a rede, usa cache como fallback
- **Cache-first** para assets estáticos (CSS, JS, SVG) e Google Fonts

Para forçar um novo service worker após mudanças, incremente a versão em `sw.js`:
```js
const CACHE_NAME = 'acolhemais-v2'; // ← bump aqui
```

---

## Como expandir

### Para React

A estrutura modular facilita a migração. Cada página vira um `Route`:

```
src/
├── pages/
│   ├── Home.tsx           ← index.html
│   ├── Acesso.tsx         ← acesso.html
│   ├── Jornada.tsx        ← jornada.html
│   └── MenteCorpo.tsx     ← mente-corpo.html
├── components/
│   ├── BottomNav.tsx      ← components/nav.html + js/nav-loader.js
│   ├── mockups/           ← .mockup* classes → componentes visuais
│   └── ui/                ← btn, badge, chip — tokens do design system
├── hooks/
│   ├── useCheckin.ts      ← localStorage logic de mente-corpo.js
│   └── useTriagem.ts      ← quiz logic de jornada.js / acesso.js
└── styles/
    └── tokens.ts          ← design-system.css como objeto JS/TS
```

**Stack sugerida:** Vite + React + TypeScript + React Router + Zustand (estado global do check-in).

O design system pode ser convertido para CSS-in-JS (Stitches, vanilla-extract) ou mantido como CSS Modules preservando todas as variáveis.

### Para app nativo (React Native / Flutter)

Os tokens do design system mapeiam diretamente:

| CSS var              | React Native          | Flutter               |
|----------------------|-----------------------|-----------------------|
| `--color-teal`       | `Colors.teal`         | `Color(0xFF1D9E75)`   |
| `--bg-base`          | `backgroundColor`     | `Color(0xFF1A2332)`   |
| `--font-display`     | `fontFamily: 'Syne'`  | `GoogleFonts.syne()`  |
| `--space-4` (1rem)   | `16` (dp)             | `16.0`                |

A lógica de negócio (quiz, check-in, localStorage) pode ser extraída dos arquivos JS e reimplementada em stores nativos (Zustand → Jotai para RN; Provider/BLoC para Flutter).

---

## Acessibilidade

- Todos os elementos interativos têm `aria-label` ou `<label>` associado
- Navegação por teclado funciona em todas as telas (foco visível com `focus-visible`)
- Contraste de texto: mínimo 4.5:1 (WCAG AA) em todas as combinações de cor
- `aria-current="page"` na bottom nav marca a página ativa para leitores de tela
- Animações respeitam `prefers-reduced-motion` via `@media` nos keyframes

---

## Scripts úteis

```bash
# Servir localmente (PWA completo)
npx serve .

# Validar manifest
npx pwa-asset-generator icons/icon-512.svg icons/ --manifest manifest.json

# Lint de acessibilidade (requer Node)
npx @axe-core/cli http://localhost:8080
```

---

## Créditos

Projeto acadêmico — Estácio de Sá, 2026.  
Design system e frontend: AcolheMais 2.0 team.
