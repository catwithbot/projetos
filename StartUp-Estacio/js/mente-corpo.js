/* =============================================================================
   AcolheMais 2.0 — Mente & Corpo Module Logic
   Features: daily check-in (sleep/food/mood), localStorage, week history
   CSS bar chart, educational card expand/collapse.
   ============================================================================= */

'use strict';

/* ─────────────────────────────────────────────
   CONSTANTS
   ───────────────────────────────────────────── */
const STORAGE_KEY = 'acolhe_mc_checkins'; // array of { date, sleep, food, mood, ts }
const MAX_HISTORY  = 7;

const DAY_LABELS   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MOOD_LABELS  = ['', 'Muito baixo', 'Baixo', 'Neutro', 'Bom', 'Muito bom'];
const FOOD_LABELS  = ['', 'Muito ruim', 'Ruim', 'Regular', 'Boa', 'Ótima'];

// 10 insight messages keyed by sleep (low/ok/high) × mood (low/mid/high)
// Key: `${sleepBand}_${moodBand}` — bands: l/m/h
const INSIGHTS = {
  l_l: 'Sono curto + humor baixo é uma combinação que merece atenção. Uma noite bem dormida pode ser o primeiro passo — tente antecipar 30 minutos o horário de dormir esta semana.',
  l_m: 'Você está mantendo o equilíbrio emocional apesar do sono curto. Isso é resiliência! Mas dormir menos de 6h cronicamente cobra um preço silencioso na memória e na imunidade.',
  l_h: 'Ótimo humor mesmo com pouco sono — seu corpo está compensando agora, mas fique atento. O déficit de sono se acumula ao longo da semana.',
  m_l: 'Sono adequado, mas humor baixo. Isso pode indicar outros fatores: movimentação física, exposição solar, conexão social. Que tal uma caminhada de 20 minutos ao ar livre hoje?',
  m_m: 'Um dia equilibrado. Para solidificar esse padrão, tente manter o mesmo horário de acordar nos próximos 5 dias — a consistência circadiana melhora o humor de forma mensurável.',
  m_h: 'Sono bom e humor elevado — combinação poderosa! Seu sistema nervoso está regulado. Aproveite esse estado para tarefas que exigem criatividade ou tomada de decisão.',
  h_l: 'Dormir muito junto de humor baixo às vezes sinaliza fadiga prolongada ou baixo cortisol matinal. Exposição ao sol logo de manhã pode ajudar a calibrar o ritmo circadiano.',
  h_m: 'Sono generoso! Certifique-se de que a qualidade também está boa — álcool e telas até tarde fragmentam o sono profundo mesmo quando a duração parece suficiente.',
  h_h: 'Excelente combinação. Seu cérebro está realizando a consolidação máxima de memórias esta noite. Registre qualquer aprendizado importante — ele vai se fixar melhor.',
  default: 'Cada registro constrói seu padrão. Continue acompanhando para entender as conexões entre sono, alimentação e humor ao longo do tempo.',
};

/* ─────────────────────────────────────────────
   UTILS
   ───────────────────────────────────────────── */
function todayISO() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getCheckins() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCheckins(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function getTodayCheckin() {
  return getCheckins().find(c => c.date === todayISO()) || null;
}

function upsertCheckin(entry) {
  const all   = getCheckins().filter(c => c.date !== entry.date);
  const fresh = [entry, ...all].slice(0, 30); // keep up to 30 days
  saveCheckins(fresh);
}

function sleepBand(h) {
  if (h < 5.5) return 'l';
  if (h > 8.5) return 'h';
  return 'm';
}

function moodBand(m) {
  if (m <= 2) return 'l';
  if (m === 3) return 'm';
  return 'h';
}

function getInsight(sleep, mood) {
  const key = `${sleepBand(sleep)}_${moodBand(mood)}`;
  return INSIGHTS[key] || INSIGHTS.default;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* ─────────────────────────────────────────────
   SLEEP SLIDER
   ───────────────────────────────────────────── */
const sliderEl   = document.getElementById('sleep-slider');
const sleepValEl = document.getElementById('sleep-value');

function updateSliderTrack(val) {
  const pct = (val / 10) * 100;
  sliderEl.style.background = `linear-gradient(to right, var(--color-purple) 0%, var(--color-purple) ${pct}%, var(--bg-surface-3) ${pct}%, var(--bg-surface-3) 100%)`;
  sleepValEl.textContent = val % 1 === 0 ? val : val.toFixed(1);
  sliderEl.setAttribute('aria-valuenow', val);
  sliderEl.setAttribute('aria-valuetext', `${val} horas`);
}

if (sliderEl) {
  sliderEl.addEventListener('input', () => updateSliderTrack(parseFloat(sliderEl.value)));
  updateSliderTrack(parseFloat(sliderEl.value));
}

/* ─────────────────────────────────────────────
   MOOD LABELS (live update)
   ───────────────────────────────────────────── */
const moodSelectedEl = document.getElementById('mood-selected-label');

document.querySelectorAll('input[name="mood"]').forEach(radio => {
  radio.addEventListener('change', () => {
    if (moodSelectedEl) {
      moodSelectedEl.textContent = MOOD_LABELS[parseInt(radio.value, 10)] || '';
    }
  });
});

/* ─────────────────────────────────────────────
   CHECKIN FORM — submit
   ───────────────────────────────────────────── */
const form        = document.getElementById('checkin-form');
const doneBox     = document.getElementById('checkin-done');
const doneTimeEl  = document.getElementById('checkin-done-time');
const insightEl   = document.getElementById('checkin-insight');
const btnRedo     = document.getElementById('btn-redo');

function showDoneState(entry) {
  form.hidden = true;
  doneBox.hidden = false;
  if (doneTimeEl) doneTimeEl.textContent = `Registrado hoje às ${formatTime(entry.ts)}`;
  if (insightEl)  insightEl.textContent  = getInsight(entry.sleep, entry.mood);
  renderHistory();
}

function showFormState() {
  doneBox.hidden = true;
  form.hidden    = false;
  // restore slider
  updateSliderTrack(parseFloat(sliderEl ? sliderEl.value : 7));
}

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const sleep   = parseFloat(sliderEl ? sliderEl.value : 7);
    const foodEl  = form.querySelector('input[name="food"]:checked');
    const moodEl2 = form.querySelector('input[name="mood"]:checked');

    if (!foodEl) {
      // highlight food section
      const foodScale = form.querySelector('.food-scale');
      if (foodScale) {
        foodScale.style.outline = '2px solid var(--color-purple)';
        foodScale.style.borderRadius = 'var(--radius-lg)';
        setTimeout(() => { foodScale.style.outline = ''; }, 1800);
        foodScale.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!moodEl2) {
      const moodBar = form.querySelector('.mood-bar');
      if (moodBar) {
        moodBar.style.outline = '2px solid var(--color-purple)';
        setTimeout(() => { moodBar.style.outline = ''; }, 1800);
        moodBar.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const entry = {
      date:  todayISO(),
      sleep: sleep,
      food:  parseInt(foodEl.value, 10),
      mood:  parseInt(moodEl2.value, 10),
      ts:    Date.now(),
    };

    upsertCheckin(entry);
    showDoneState(entry);
  });
}

if (btnRedo) {
  btnRedo.addEventListener('click', showFormState);
}

/* ─────────────────────────────────────────────
   LOAD STATE ON INIT
   ───────────────────────────────────────────── */
(function initCheckinState() {
  const today = getTodayCheckin();
  if (today) {
    showDoneState(today);
  }
})();

/* ─────────────────────────────────────────────
   HISTORY — CSS bar chart
   ───────────────────────────────────────────── */
const histChart    = document.getElementById('hist-chart');
const histEmpty    = document.getElementById('hist-empty');
const histSummary  = document.getElementById('hist-summary');
const avgSleepEl   = document.getElementById('avg-sleep');
const avgMoodEl    = document.getElementById('avg-mood');
const avgFoodEl    = document.getElementById('avg-food');

// Build the last-7 days array (newest last)
function buildWeekDates() {
  const dates = [];
  for (let i = MAX_HISTORY - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function renderHistory() {
  if (!histChart) return;

  const checkins = getCheckins();
  const week     = buildWeekDates();

  // Max values for scaling
  const SLEEP_MAX = 10;
  const MOOD_MAX  = 5;
  const FOOD_MAX  = 5;

  const populated = week.filter(d => checkins.find(c => c.date === d));
  const hasData   = populated.length > 0;

  if (histEmpty) histEmpty.style.display = hasData ? 'none' : '';
  if (histSummary) histSummary.hidden = !hasData;

  // Remove old columns
  histChart.querySelectorAll('.hist-day').forEach(n => n.remove());

  if (!hasData) return;

  const today = todayISO();

  week.forEach(date => {
    const entry    = checkins.find(c => c.date === date);
    const dayObj   = new Date(date + 'T12:00:00');
    const dayLabel = DAY_LABELS[dayObj.getDay()];
    const isToday  = date === today;

    const col = document.createElement('div');
    col.className = 'hist-day' + (isToday ? ' hist-day--today' : '');

    const barsDiv = document.createElement('div');
    barsDiv.className = 'hist-day__bars';

    if (entry) {
      // Sleep bar: 0-10h → 0-100%
      const sleepPct = Math.round((entry.sleep / SLEEP_MAX) * 100);
      // Mood: 1-5 → 20-100%
      const moodPct  = Math.round((entry.mood  / MOOD_MAX)  * 100);
      // Food: 1-5 → 20-100%
      const foodPct  = Math.round((entry.food  / FOOD_MAX)  * 100);

      [
        { cls: 'hist-bar--sleep', pct: sleepPct, title: `Sono: ${entry.sleep}h` },
        { cls: 'hist-bar--mood',  pct: moodPct,  title: `Humor: ${MOOD_LABELS[entry.mood]}` },
        { cls: 'hist-bar--food',  pct: foodPct,  title: `Alimentação: ${FOOD_LABELS[entry.food]}` },
      ].forEach(({ cls, pct, title }) => {
        const bar = document.createElement('div');
        bar.className = `hist-bar ${cls}`;
        bar.style.height = '0';
        bar.title = title;
        bar.setAttribute('role', 'presentation');
        barsDiv.appendChild(bar);
        // Animate in
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bar.style.height = `${pct}%`;
          });
        });
      });
    } else {
      // Empty day placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'hist-bar';
      placeholder.style.cssText = 'flex:3;background:var(--bg-surface-3);opacity:0.3;height:4px;';
      barsDiv.appendChild(placeholder);
    }

    const label = document.createElement('div');
    label.className = 'hist-day__label';
    label.textContent = isToday ? 'Hoje' : dayLabel;
    label.setAttribute('aria-label', isToday ? 'Hoje' : dayLabel);

    col.appendChild(barsDiv);
    col.appendChild(label);
    histChart.appendChild(col);
  });

  // Averages
  const entries = week.map(d => checkins.find(c => c.date === d)).filter(Boolean);
  if (entries.length && histSummary) {
    const avg = (arr, fn) => (arr.reduce((s, e) => s + fn(e), 0) / arr.length);
    const aSleep = avg(entries, e => e.sleep).toFixed(1);
    const aMood  = avg(entries, e => e.mood).toFixed(1);
    const aFood  = avg(entries, e => e.food).toFixed(1);

    if (avgSleepEl) avgSleepEl.textContent = `${aSleep}h`;
    if (avgMoodEl)  avgMoodEl.textContent  = aMood;
    if (avgFoodEl)  avgFoodEl.textContent  = aFood;
    histSummary.hidden = false;
  }
}

renderHistory();

/* ─────────────────────────────────────────────
   BIBLIOTECA — expand / collapse
   ───────────────────────────────────────────── */
document.querySelectorAll('.bib-card').forEach(card => {
  const btn  = card.querySelector('.bib-card__header');
  const body = card.querySelector('.bib-card__body');

  if (!btn || !body) return;

  btn.addEventListener('click', () => {
    const expanded = card.getAttribute('aria-expanded') === 'true';

    // Close all other cards
    document.querySelectorAll('.bib-card[aria-expanded="true"]').forEach(other => {
      if (other !== card) {
        other.setAttribute('aria-expanded', 'false');
        other.querySelector('.bib-card__header').setAttribute('aria-expanded', 'false');
        const otherBody = other.querySelector('.bib-card__body');
        if (otherBody) otherBody.hidden = true;
      }
    });

    // Toggle current
    const next = !expanded;
    card.setAttribute('aria-expanded', String(next));
    btn.setAttribute('aria-expanded', String(next));
    body.hidden = !next;

    if (next) {
      // Scroll card into view smoothly
      setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 120);
    }
  });
});
