/**
 * AcolheMais 2.0 — jornada.js
 * Handles: mini-jogo de triagem, histórias adaptativas, check-in diário.
 *
 * Depends on: Chart.js (loaded via CDN before this script).
 * Shares nav/scroll logic with main.js (both loaded on jornada.html).
 */

'use strict';

/* =============================================================================
   DATA
   ============================================================================= */

const SCENARIOS = [
  {
    situation: 'Seu chefe te criticou na frente de toda a equipe.',
    question: 'O que você faz?',
    choices: [
      {
        label: 'Respira fundo, agradece pelo feedback e pede pra conversar em particular depois.',
        scores: { r: 2, c: 1, s: 1 }
      },
      {
        label: 'Fica quieto e guarda tudo pra dentro — não é hora.',
        scores: { r: 0, c: 0, s: 0 }
      },
      {
        label: 'Defende sua posição na hora mesmo com a voz trêmula.',
        scores: { r: 1, c: 0, s: 2 }
      }
    ]
  },
  {
    situation: 'Você acordou arrastado depois de uma semana pesada.',
    question: 'É sexta à noite. O que faz?',
    choices: [
      {
        label: 'Vai à festa do amigo mesmo sem muita vontade — e acaba curtindo.',
        scores: { r: 1, c: 2, s: 0 }
      },
      {
        label: 'Fica no sofá, série e pipoca. Sem culpa, de verdade.',
        scores: { r: 0, c: 0, s: 2 }
      },
      {
        label: 'Experimenta aquela atividade que estava adiando há meses.',
        scores: { r: 2, c: 1, s: 1 }
      }
    ]
  },
  {
    situation: 'Um amigo próximo some das redes por semanas sem avisar.',
    question: 'O que você faz?',
    choices: [
      {
        label: 'Manda mensagem direta: "Ei, tudo bem contigo? Estou aqui."',
        scores: { r: 0, c: 2, s: 0 }
      },
      {
        label: 'Espera ele aparecer quando estiver pronto.',
        scores: { r: 1, c: 0, s: 0 }
      },
      {
        label: 'Liga direto porque algo te diz que ele precisa de alguém.',
        scores: { r: 0, c: 2, s: 1 }
      }
    ]
  },
  {
    situation: 'Você entregou um trabalho e ouviu: "Precisamos repensar isso."',
    question: 'Sua reação interna?',
    choices: [
      {
        label: 'Analisa o que deu errado e já está pensando na próxima versão.',
        scores: { r: 2, c: 0, s: 1 }
      },
      {
        label: 'Fica remoendo por dias, questionando tudo que faz.',
        scores: { r: 0, c: 0, s: 0 }
      },
      {
        label: 'Sente raiva real, respeita isso e dá um tempo pra processar antes de reagir.',
        scores: { r: 1, c: 0, s: 2 }
      }
    ]
  },
  {
    situation: 'Você está no limite e alguém pede mais um favor.',
    question: 'O que acontece?',
    choices: [
      {
        label: 'Diz não com leveza e sem culpa — você aprendeu que isso é cuidar de si.',
        scores: { r: 2, c: 1, s: 2 }
      },
      {
        label: 'Aceita mesmo sem querer porque não consegue dizer não.',
        scores: { r: 0, c: 0, s: 0 }
      },
      {
        label: 'Aceita mas avisa: "Uma vez só, porque agora estou no limite."',
        scores: { r: 1, c: 1, s: 1 }
      }
    ]
  }
];

// Max possible score per dimension across all optimal choices
const MAX_SCORES = { r: 9, c: 6, s: 9 };

const PROFILES = {
  resilience: {
    badge: 'Perfil Guerreiro',
    title: 'Você se levanta',
    desc: 'Sua capacidade de absorver impactos e continuar é forte. Você processa adversidade sem se quebrar — isso é raro e valioso. O próximo passo é garantir que essa força não vire isolamento.'
  },
  connection: {
    badge: 'Perfil Ponte',
    title: 'Você conecta',
    desc: 'Seu instinto é buscar e construir relacionamentos. Você sente quando alguém precisa e age. O desafio é equilibrar isso com o cuidado de você mesmo — conexão começa por dentro.'
  },
  selfcare: {
    badge: 'Perfil Raiz',
    title: 'Você se cuida',
    desc: 'Você reconhece suas necessidades e as honra — o que a maioria não sabe fazer. Essa base sólida sustenta tudo mais. O próximo passo é estender esse cuidado às suas relações também.'
  },
  balanced: {
    badge: 'Perfil Equilibrado',
    title: 'Você caminha junto',
    desc: 'Suas dimensões estão em harmonia. Você equilibra resiliência, conexão e autocuidado de forma intuitiva. Continue prestando atenção — esse equilíbrio é dinâmico, não permanente.'
  }
};

const DIMENSION_STATUSES = {
  low:  { label: 'Em desenvolvimento', cls: '' },
  mid:  { label: 'Em crescimento',      cls: '' },
  high: { label: 'Seu ponto forte',     cls: 'is-high' }
};

const STORIES = [
  {
    id: 'stress',
    tag: 'Hoje · Estresse no trabalho',
    title: 'A Reunião que Não Saiu da Cabeça',
    excerpt: 'Lucas olha pro teto às 2h da manhã. A voz do João ainda ecoa.',
    text: `Lucas olha pro teto às 2h da manhã. A reunião acabou há horas, mas a voz do João — "isso não está bom o suficiente" — ainda ecoa como se tivesse sido dita agora.

Ele abre o celular. Fecha. Abre de novo. Pensa em mandar uma mensagem já se justificando. Pensa em largar tudo. Pensa que talvez o João tenha razão.

A questão que fica suspensa na escuridão do quarto é uma só:`,
    question: 'O que Lucas faz agora?',
    choices: [
      {
        label: 'Escreve num caderno tudo que está sentindo — sem filtro, só pra sair da cabeça.',
        ending: `Lucas pega o caderno velho da gaveta. Escreve feio, riscado, com raiva às vezes.

No fim de uma página, ele percebe algo: ele não está com raiva do João. Está com raiva de não ter dormido, de ter trabalhado num final de semana, de ter se esquecido de si mesmo por tanto tempo.

O caderno não resolveu o trabalho. Mas resolveu a noite.`
      },
      {
        label: 'Coloca um podcast pra dormir — o problema ainda existe amanhã, mas agora não.',
        ending: `Lucas coloca um podcast de investigação criminal — porque quando tem voz de fora na cabeça, a sua própria se cala um pouco.

Ele não resolve nada. Mas para de amplificar.

De manhã, com café e luz, o problema tem outro tamanho.`
      }
    ]
  },
  {
    id: 'isolation',
    tag: 'Hoje · Isolamento social',
    title: 'O Apartamento Que Ficou Quieto Demais',
    excerpt: 'Beatriz conta: 4 dias sem sair de casa, sem responder mensagens.',
    text: `Beatriz conta: 4 dias sem sair de casa. Não porque estava doente. Não porque estava ocupada.

Ela simplesmente... parou de responder as mensagens. Uma a uma, foram ficando sem leitura. A notificação do grupo some quando você muda de aba rápido o suficiente.

O apartamento ficou quieto demais. E ela percebeu que, ao invés de incomodar, estava começando a parecer normal.

No quinto dia, uma mensagem diferente chega:`,
    question: '"Ei. Não precisa responder agora. Só queria que soubesse que estou aqui." — o que Beatriz faz?',
    choices: [
      {
        label: 'Digita "obrigada" e fica olhando pra palavra por cinco minutos antes de enviar.',
        ending: `Ela envia.

Dois caracteres. Mas a janela ficou aberta.

A outra pessoa respondeu com um áudio de 3 segundos dizendo "oi" com a voz sonolenta das 11h da manhã.

Beatriz escutou três vezes.`
      },
      {
        label: 'Pega o casaco, sai pra rua sem destino — só pra sentir o ar.',
        ending: `Ela não foi longe. Uma volta no quarteirão, descalça dentro do tênis apertado que ela evitava usar.

Viu um gato. Uma árvore que tinha florescido. Uma criança correndo de algo imaginário.

Voltou. A mensagem ainda estava lá.

Ela respondeu na hora.`
      }
    ]
  },
  {
    id: 'selfcare',
    tag: 'Ontem · Autocuidado',
    title: 'O Domingo em que Nada Precisava Acontecer',
    excerpt: 'Pela primeira vez em meses, Pedro não tinha agenda.',
    text: `Pela primeira vez em meses, o domingo de Pedro não tinha agenda.

Nenhum compromisso. Nenhum amigo esperando. Nenhuma tarefa atrasada.

Ele ficou parado na cozinha por dez minutos, café na mão, sem saber o que fazer com o silêncio.

Tinha a sensação estranha de que estava esquecendo alguma coisa urgente. Mas não estava.

O dia inteiro era dele. E isso, descobriu, era assustador de um jeito que ele não esperava.`,
    question: 'O que Pedro faz com esse domingo?',
    choices: [
      {
        label: 'Cozinha algo que nunca tentou antes, sem pressa, com música.',
        ending: `Ele escolheu nhoque de batata-doce porque tinha visto no celular semanas atrás e nunca teve tempo.

Queimou a primeira fornada. A segunda ficou estranha. A terceira estava razoável.

Comeu na varanda, com um filme antigo, sujo de farinha e mais descansado do que estava há meses.`
      },
      {
        label: 'Não faz nada. Literalmente fica deitado olhando pro teto por uma hora.',
        ending: `Os primeiros 20 minutos foram torturantes. A culpa bateu pontual como um sino.

Depois de 40 minutos, algo mudou. O teto parou de ser ameaçador. Virou apenas um teto.

Pedro não resolveu nada. Não produziu nada. Não se tornou uma versão melhor de si mesmo.

Mas ficou mais leve.`
      }
    ]
  }
];

const INSIGHT_BY_STORY = {
  stress:    'Reconhecer o que está sentindo antes de agir é uma das formas mais poderosas de cuidado próprio.',
  isolation: 'Reconexão não precisa de uma grande conversa. Às vezes começa com uma palavra e uma janela aberta.',
  selfcare:  'Não fazer nada de propósito é diferente de colapsar por exaustão. É uma escolha. E escolhas têm poder.'
};


/* =============================================================================
   STATE
   ============================================================================= */
const state = {
  triagem: {
    current:    0,
    scores:     { r: 0, c: 0, s: 0 },
    done:       false,
    radarChart: null
  },
  checkin: {
    mood:   null,
    sleep:  7,
    energy: 3,
    done:   false
  },
  modal: {
    open:     false,
    storyId:  null,
    phase:    'story', // 'story' | 'choice-made' | 'ending'
    choiceIdx: null
  }
};


/* =============================================================================
   MINI-JOGO DE TRIAGEM
   ============================================================================= */
function initTriagem() {
  const startBtn = document.getElementById('triagem-start');
  if (startBtn) {
    startBtn.addEventListener('click', startTriagem);
  }

  document.getElementById('restart-triagem')?.addEventListener('click', restartTriagem);
}

function startTriagem() {
  const intro = document.getElementById('triagem-intro');
  const card  = document.getElementById('triagem-card');
  if (intro) intro.style.display = 'none';
  if (card)  card.style.display  = '';

  state.triagem.current = 0;
  state.triagem.scores  = { r: 0, c: 0, s: 0 };
  state.triagem.done    = false;

  renderScenario(0);
}

function renderScenario(index) {
  const scenario  = SCENARIOS[index];
  const total     = SCENARIOS.length;
  const pct       = Math.round((index / total) * 100);

  // Progress
  document.getElementById('progress-fill').style.width = `${pct}%`;
  document.getElementById('progress-current').textContent = index + 1;
  document.getElementById('progress-total').textContent   = total;

  // Scenario text
  document.getElementById('scenario-num').textContent       = index + 1;
  document.getElementById('scenario-situation').textContent = scenario.situation;
  document.getElementById('scenario-question').textContent  = scenario.question;

  // Choices — rebuild
  const container = document.getElementById('choices-container');
  container.innerHTML = '';
  const letters = ['A', 'B', 'C'];

  scenario.choices.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className     = 'choice-btn';
    btn.dataset.letter = letters[i];
    btn.dataset.index  = i;
    btn.textContent    = choice.label;
    btn.addEventListener('click', () => handleChoice(i));
    container.appendChild(btn);
  });

  // Animate in
  const screen = document.getElementById('scenario-screen');
  screen.classList.remove('is-exiting', 'is-entering');
  // Force reflow so the animation re-triggers
  void screen.offsetWidth;
  screen.classList.add('is-entering');
  setTimeout(() => screen.classList.remove('is-entering'), 700);
}

function handleChoice(choiceIndex) {
  const choice  = SCENARIOS[state.triagem.current].choices[choiceIndex];
  const buttons = document.querySelectorAll('#choices-container .choice-btn');

  // Highlight selected, disable all
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === choiceIndex) btn.classList.add('is-selected');
  });

  // Accumulate scores
  state.triagem.scores.r += choice.scores.r;
  state.triagem.scores.c += choice.scores.c;
  state.triagem.scores.s += choice.scores.s;

  // Advance after brief pause
  setTimeout(() => {
    const screen = document.getElementById('scenario-screen');
    screen.classList.add('is-exiting');

    setTimeout(() => {
      state.triagem.current++;
      if (state.triagem.current >= SCENARIOS.length) {
        showTriagemResults();
      } else {
        renderScenario(state.triagem.current);
      }
    }, 280);
  }, 420);
}

function showTriagemResults() {
  state.triagem.done = true;

  // Progress to 100%
  document.getElementById('progress-fill').style.width = '100%';
  document.getElementById('progress-current').textContent = SCENARIOS.length;

  // Hide scenario, show results
  document.getElementById('scenario-screen').style.display = 'none';
  const resultsEl = document.getElementById('results-screen');
  resultsEl.classList.add('is-visible');

  const { r, c, s } = state.triagem.scores;

  // Normalize 0-10
  const nr = Math.round((r / MAX_SCORES.r) * 10);
  const nc = Math.round((c / MAX_SCORES.c) * 10);
  const ns = Math.round((s / MAX_SCORES.s) * 10);

  // Determine dominant profile
  const max = Math.max(nr, nc, ns);
  const diff = Math.max(nr, nc, ns) - Math.min(nr, nc, ns);
  let profileKey;

  if (diff <= 2) {
    profileKey = 'balanced';
  } else if (nr === max) {
    profileKey = 'resilience';
  } else if (nc === max) {
    profileKey = 'connection';
  } else {
    profileKey = 'selfcare';
  }

  const profile = PROFILES[profileKey];
  document.getElementById('profile-badge').textContent = profile.badge;
  document.getElementById('profile-title').textContent = profile.title;
  document.getElementById('profile-desc').textContent  = profile.desc;

  // Render radar chart
  renderRadarChart([nr, nc, ns]);

  // Render dimension bars (delayed so they animate after visible)
  setTimeout(() => {
    renderDimBar('dim-resilience', nr, 'dim-bar--resilience');
    renderDimBar('dim-connection', nc, 'dim-bar--connection');
    renderDimBar('dim-selfcare',   ns, 'dim-bar--selfcare');
  }, 200);
}

function renderDimBar(id, normalizedScore, cls) {
  const el = document.getElementById(id);
  if (!el) return;

  const fill   = el.querySelector('.dim-bar__fill');
  const score  = el.querySelector('.dim-bar__score');
  const status = el.querySelector('.dim-bar__status');

  const pct = normalizedScore * 10;
  const level = normalizedScore >= 7 ? 'high' : normalizedScore >= 4 ? 'mid' : 'low';
  const info  = DIMENSION_STATUSES[level];

  score.textContent       = `${normalizedScore}/10`;
  status.textContent      = info.label;
  status.className        = `dim-bar__status ${info.cls}`;

  // Trigger width animation
  requestAnimationFrame(() => {
    fill.style.width = `${pct}%`;
  });
}

function renderRadarChart(data) {
  const ctx = document.getElementById('radar-chart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (state.triagem.radarChart) {
    state.triagem.radarChart.destroy();
    state.triagem.radarChart = null;
  }

  state.triagem.radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Resiliência', 'Conexão Social', 'Autocuidado'],
      datasets: [{
        data: data,
        backgroundColor:  'rgba(216, 90, 48, 0.18)',
        borderColor:      '#D85A30',
        borderWidth:      2,
        pointBackgroundColor: '#D85A30',
        pointBorderColor:     '#1F2B3D',
        pointBorderWidth:     2,
        pointRadius:          5,
        pointHoverRadius:     7,
        pointHoverBackgroundColor: '#E07553'
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      animation: {
        duration: 1000,
        easing:   'easeOutQuart'
      },
      scales: {
        r: {
          min: 0,
          max: 10,
          ticks: {
            display:  false,
            stepSize: 2
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.08)'
          },
          angleLines: {
            color: 'rgba(255, 255, 255, 0.08)'
          },
          pointLabels: {
            color: '#A8B8CC',
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size:   12,
              weight: '600'
            }
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(31, 43, 61, 0.95)',
          borderColor:     'rgba(51, 72, 102, 1)',
          borderWidth:     1,
          titleColor:      '#F0F4F8',
          bodyColor:       '#A8B8CC',
          padding:         10
        }
      }
    }
  });
}

function restartTriagem() {
  // Reset scores
  state.triagem.current = 0;
  state.triagem.scores  = { r: 0, c: 0, s: 0 };
  state.triagem.done    = false;

  if (state.triagem.radarChart) {
    state.triagem.radarChart.destroy();
    state.triagem.radarChart = null;
  }

  // Show scenario screen, hide results
  const scenarioScreen = document.getElementById('scenario-screen');
  const resultsScreen  = document.getElementById('results-screen');

  resultsScreen.classList.remove('is-visible');
  scenarioScreen.style.display = '';

  renderScenario(0);
}


/* =============================================================================
   HISTÓRIAS ADAPTATIVAS
   ============================================================================= */
function initStories() {
  // Open modal on card click
  document.querySelectorAll('.story-card[data-story]').forEach(card => {
    card.addEventListener('click', () => openStory(card.dataset.story));
    // Keyboard
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openStory(card.dataset.story);
      }
    });
  });

  // Close on backdrop click
  document.querySelector('.modal__backdrop')?.addEventListener('click', closeModal);

  // Close button
  document.querySelector('.modal__close')?.addEventListener('click', closeModal);

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.modal.open) closeModal();
  });
}

function openStory(storyId) {
  const story = STORIES.find(s => s.id === storyId);
  if (!story) return;

  state.modal.open      = true;
  state.modal.storyId   = storyId;
  state.modal.phase     = 'story';
  state.modal.choiceIdx = null;

  // Populate story phase
  document.getElementById('modal-tag').textContent   = story.tag;
  document.getElementById('modal-title').textContent = story.title;
  document.getElementById('modal-text').textContent  = story.text;
  document.getElementById('modal-question').textContent = story.question;

  // Build choice buttons
  const choicesEl = document.getElementById('modal-choices');
  choicesEl.innerHTML = '';
  const letters = ['A', 'B'];

  story.choices.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className      = 'choice-btn';
    btn.dataset.letter = letters[i];
    btn.textContent    = choice.label;
    btn.addEventListener('click', () => handleStoryChoice(i));
    choicesEl.appendChild(btn);
  });

  // Reset phases
  document.getElementById('modal-story-phase').style.display  = '';
  const endingEl = document.getElementById('modal-ending');
  endingEl.classList.remove('is-visible');
  endingEl.style.display = 'none';

  // Open modal
  const modal = document.getElementById('story-modal');
  modal.classList.add('is-open');
  modal.removeAttribute('aria-hidden');
  document.body.classList.add('menu-open');

  // Focus close button for accessibility
  setTimeout(() => document.querySelector('.modal__close')?.focus(), 300);
}

function handleStoryChoice(choiceIndex) {
  const story  = STORIES.find(s => s.id === state.modal.storyId);
  if (!story) return;

  state.modal.choiceIdx = choiceIndex;
  state.modal.phase     = 'ending';

  const ending  = story.choices[choiceIndex].ending;
  const insight = INSIGHT_BY_STORY[state.modal.storyId] || '';

  // Build ending HTML — insight becomes a highlighted block via <em> parsing
  const endingTextEl = document.getElementById('modal-ending-text');
  endingTextEl.innerHTML = '';

  const mainText = document.createElement('p');
  mainText.style.cssText = 'white-space: pre-line; font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.8;';
  mainText.textContent = ending;
  endingTextEl.appendChild(mainText);

  if (insight) {
    const em = document.createElement('em');
    em.textContent = '✦ ' + insight;
    endingTextEl.appendChild(em);
  }

  // Transition: hide story phase, show ending
  const storyPhase = document.getElementById('modal-story-phase');
  storyPhase.style.opacity    = '0';
  storyPhase.style.transition = 'opacity 250ms ease';

  setTimeout(() => {
    storyPhase.style.display = 'none';
    const endingEl = document.getElementById('modal-ending');
    endingEl.style.display = 'flex';
    endingEl.classList.add('is-visible');
    // Scroll to top of modal panel
    document.querySelector('.modal__panel')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, 260);
}

function closeModal() {
  const modal = document.getElementById('story-modal');
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('menu-open');
  state.modal.open = false;

  // Return focus to the card that opened the modal
  if (state.modal.storyId) {
    document.querySelector(`.story-card[data-story="${state.modal.storyId}"]`)?.focus();
  }
}

function readAnotherStory() {
  closeModal();
  // Slight delay then scroll to stories section
  setTimeout(() => {
    const section = document.getElementById('historias');
    if (!section) return;
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 68;
    window.scrollTo({
      top: section.getBoundingClientRect().top + window.scrollY - navH,
      behavior: 'smooth'
    });
  }, 350);
}


/* =============================================================================
   CHECK-IN DIÁRIO
   ============================================================================= */
function initCheckin() {
  // Mood radio buttons — clicking label toggles state
  document.querySelectorAll('.mood-input').forEach(input => {
    input.addEventListener('change', () => {
      state.checkin.mood = parseInt(input.value);
    });
  });

  // Sleep slider
  const sleepSlider = document.getElementById('sleep-slider');
  const sleepValue  = document.getElementById('sleep-value');

  if (sleepSlider) {
    sleepSlider.addEventListener('input', () => {
      state.checkin.sleep = parseInt(sleepSlider.value);
      sleepValue.textContent = `${sleepSlider.value}h`;
      updateSliderFill(sleepSlider, 0, 12);
    });
    updateSliderFill(sleepSlider, 0, 12);
  }

  // Energy dots
  document.querySelectorAll('.energy-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const val = parseInt(dot.dataset.value);
      state.checkin.energy = val;

      document.querySelectorAll('.energy-dot').forEach((d, i) => {
        d.classList.toggle('is-active', parseInt(d.dataset.value) <= val);
      });

      const energyInput = document.getElementById('energy-hidden');
      if (energyInput) energyInput.value = val;
    });
  });

  // Init energy dots (default = 3)
  document.querySelectorAll('.energy-dot').forEach(dot => {
    if (parseInt(dot.dataset.value) <= state.checkin.energy) {
      dot.classList.add('is-active');
    }
  });

  // Submit
  document.getElementById('checkin-submit')?.addEventListener('click', handleCheckinSubmit);
}

function updateSliderFill(slider, min, max) {
  const val = ((slider.value - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right, var(--color-brick) ${val}%, var(--bg-surface-3) ${val}%)`;
}

function handleCheckinSubmit() {
  if (!state.checkin.mood) {
    // Pulse the mood selector to draw attention
    const moodGroup = document.querySelector('.mood-selector');
    moodGroup?.classList.add('attention-pulse');
    setTimeout(() => moodGroup?.classList.remove('attention-pulse'), 600);
    return;
  }

  state.checkin.done = true;
  const msg = generateCheckinMessage(
    state.checkin.mood,
    state.checkin.sleep,
    state.checkin.energy
  );

  const resultEl = document.getElementById('checkin-result');
  document.getElementById('checkin-greeting').innerHTML = msg.greeting;
  document.getElementById('checkin-body').textContent   = msg.body;
  document.getElementById('checkin-suggestion').innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
    ${msg.suggestion}
  `;

  resultEl.classList.add('is-visible');
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Disable submit
  const submitBtn = document.getElementById('checkin-submit');
  if (submitBtn) {
    submitBtn.disabled     = true;
    submitBtn.textContent  = 'Check-in registrado';
  }
}

function generateCheckinMessage(mood, sleep, energy) {
  const sleepNum  = parseInt(sleep);
  const energyNum = parseInt(energy);
  const moodNum   = parseInt(mood);

  // Greeting based on mood
  const moodGreetings = {
    1: 'Reconheço que hoje está difícil.',
    2: 'Dias assim são válidos.',
    3: 'Um dia neutro também tem seu valor.',
    4: 'Que bom que você está bem.',
    5: 'Você está ótimo hoje!'
  };

  // Body: combination of sleep + energy
  let body = '';
  if (sleepNum >= 7 && energyNum >= 4) {
    body = 'Você dormiu bem e está com energia. Bom momento para se dedicar ao que importa.';
  } else if (sleepNum >= 7 && energyNum <= 2) {
    body = 'Você dormiu bem, mas sua energia está baixa — a história de hoje foi escolhida pra isso.';
  } else if (sleepNum >= 5 && sleepNum < 7 && energyNum >= 3) {
    body = 'Noite razoável e energia no meio-termo. O equilíbrio tem seu ritmo próprio.';
  } else if (sleepNum < 5 && energyNum >= 4) {
    body = 'Você dormiu pouco mas ainda está de pé — respeite o limite, não force demais.';
  } else if (sleepNum < 5 && energyNum <= 2) {
    body = 'Corpo e mente pedindo pausa. Hoje a jornada tem um ritmo diferente — mais lento, mais gentil.';
  } else {
    body = 'Cada dia é único. Vá no ritmo que faz sentido pra você agora.';
  }

  // Suggestion based on mood + energy
  let suggestion;
  if (moodNum <= 2 || energyNum <= 1 || sleepNum <= 4) {
    suggestion = 'História sugerida para hoje: <strong>"O Apartamento Que Ficou Quieto Demais"</strong>';
  } else if (energyNum >= 4 && sleepNum >= 7 && moodNum >= 4) {
    suggestion = 'História sugerida para hoje: <strong>"O Domingo em que Nada Precisava Acontecer"</strong>';
  } else {
    suggestion = 'História sugerida para hoje: <strong>"A Reunião que Não Saiu da Cabeça"</strong>';
  }

  return {
    greeting:   moodGreetings[moodNum] || moodGreetings[3],
    body:       body,
    suggestion: suggestion
  };
}


/* =============================================================================
   INIT
   ============================================================================= */
function initJornada() {
  initTriagem();
  initStories();
  initCheckin();

  // "Ler outra história" button in modal
  document.getElementById('modal-read-another')?.addEventListener('click', readAnotherStory);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initJornada);
} else {
  initJornada();
}
