/* =========================================
   AutomaticoZap — Frontend Logic
   ========================================= */

// ── Estado global ──
let allEvents = []
let currentWeekOffset = 0
let filterDoutor = ''
let editingId = null

// ── Utilitários de data ──

function getWeekStart(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getWeekDays(offset = 0) {
  const monday = getWeekStart(offset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDate(date) {
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear()
  ].join('/')
}

function parseEventDate(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('/')
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
}

function isSameDay(date, ddmmyyyy) {
  return formatDate(date) === ddmmyyyy
}

// ── Tipagem de eventos (para cor do card) ──

function getTipoClass(tipo) {
  if (!tipo) return ''
  const t = tipo.toLowerCase()
  if (t.includes('cancelamento') || t.includes('não atenderá') || t.includes('nao atendara')) return 'tipo-cancelamento'
  if (t.includes('cirurgia')) return 'tipo-cirurgia'
  if (t.includes('plantão') || t.includes('plantao')) return 'tipo-plantao'
  if (t.includes('retorno')) return 'tipo-retorno'
  return ''
}

// ── Renderização do grid ──

function renderGrid() {
  const days = getWeekDays(currentWeekOffset)
  const todayStr = formatDate(new Date())
  const grid = document.getElementById('agenda-grid')
  const emptyState = document.getElementById('empty-state')
  grid.innerHTML = ''

  const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
  const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

  let totalEventsInWeek = 0

  days.forEach((date, i) => {
    const dateStr = formatDate(date)
    const isToday = dateStr === todayStr
    const isPast = date < new Date() && !isToday

    // Filtra eventos do dia
    let dayEvents = allEvents.filter((e) => e.data === dateStr)
    if (filterDoutor) dayEvents = dayEvents.filter((e) => e.doutor === filterDoutor)

    // Ordena por horário
    dayEvents.sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
    totalEventsInWeek += dayEvents.length

    const col = document.createElement('div')
    col.className = 'day-column'

    // Cabeçalho do dia
    const headerClass = isToday ? 'today' : isPast ? 'past' : ''
    col.innerHTML = `
      <div class="day-header ${headerClass}">
        <div class="day-name">${DAY_NAMES[i]}</div>
        <div class="day-date">${date.getDate()}</div>
        <div class="day-month">${MONTH_NAMES[date.getMonth()]}</div>
      </div>
      <div class="day-body" id="day-${dateStr.replace(/\//g, '-')}"></div>
    `

    const body = col.querySelector('.day-body')

    if (dayEvents.length === 0) {
      body.innerHTML = '<div class="day-empty">—</div>'
    } else {
      dayEvents.forEach((event) => {
        const card = createEventCard(event)
        body.appendChild(card)
      })
    }

    grid.appendChild(col)
  })

  // Exibe empty state se não há eventos nenhum dia da semana
  if (totalEventsInWeek === 0 && !filterDoutor) {
    emptyState.classList.remove('hidden')
    grid.classList.add('hidden')
  } else {
    emptyState.classList.add('hidden')
    grid.classList.remove('hidden')
  }

  // Atualiza label da semana
  const start = days[0], end = days[6]
  const MONTH_FULL = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  document.getElementById('week-label').textContent =
    `${start.getDate()} ${MONTH_FULL[start.getMonth()]} — ${end.getDate()} ${MONTH_FULL[end.getMonth()]} ${end.getFullYear()}`
}

function createEventCard(event) {
  const card = document.createElement('div')
  card.className = `event-card ${getTipoClass(event.tipo)}`
  card.dataset.id = event.id

  const obsHtml = event.observacoes
    ? `<div class="event-obs">${escapeHtml(event.observacoes)}</div>`
    : ''

  card.innerHTML = `
    <div class="event-time">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
        <path d="M12 7V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      ${escapeHtml(event.horario || '--:--')}
    </div>
    <div class="event-doctor" title="${escapeHtml(event.doutor || '')}">${escapeHtml(event.doutor || 'Desconhecido')}</div>
    <div class="event-type">${escapeHtml(event.tipo || 'Consulta')}</div>
    ${obsHtml}
    <div class="event-actions">
      <button class="btn-xs btn-gcal" data-action="gcal" title="Abrir no Google Calendar">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Google Cal
      </button>
      <button class="btn-xs btn-edit" data-action="edit" title="Editar evento">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 19V12M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Editar
      </button>
      <button class="btn-xs btn-delete" data-action="delete" title="Excluir evento">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M3 6H21M8 6V4H16V6M19 6L18 20H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Excluir
      </button>
    </div>
  `

  // Delegação de eventos
  card.querySelector('[data-action="gcal"]').addEventListener('click', (e) => {
    e.stopPropagation()
    openGCal(event.id)
  })
  card.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
    e.stopPropagation()
    openEdit(event.id)
  })
  card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
    e.stopPropagation()
    deleteEvent(event.id)
  })

  return card
}

// ── Segurança ──

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Filtro por médico ──

function updateDoctorFilter() {
  const select = document.getElementById('filtro-doutor')
  const current = select.value
  const doctors = [...new Set(allEvents.map((e) => e.doutor).filter(Boolean))].sort()

  select.innerHTML = '<option value="">Todos os médicos</option>'
  doctors.forEach((d) => {
    const opt = document.createElement('option')
    opt.value = d
    opt.textContent = d
    if (d === current) opt.selected = true
    select.appendChild(opt)
  })

  // Restaura filtro se médico ainda existe
  if (!doctors.includes(filterDoutor)) filterDoutor = ''
}

// ── Fetch e polling ──

async function fetchEvents() {
  try {
    const res = await fetch('/api/eventos')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    allEvents = await res.json()
    updateDoctorFilter()
    renderGrid()
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    document.getElementById('status-update').textContent = `Atualizado às ${hora}`
  } catch (err) {
    console.error('Erro ao buscar eventos:', err)
    document.getElementById('status-update').textContent = 'Erro ao conectar'
  }
}

fetchEvents()
setInterval(fetchEvents, 30_000)

// ── Navegação da semana ──

document.getElementById('prev-week').addEventListener('click', () => {
  currentWeekOffset--
  renderGrid()
})

document.getElementById('next-week').addEventListener('click', () => {
  currentWeekOffset++
  renderGrid()
})

document.getElementById('btn-today').addEventListener('click', () => {
  currentWeekOffset = 0
  renderGrid()
})

document.getElementById('filtro-doutor').addEventListener('change', (e) => {
  filterDoutor = e.target.value
  renderGrid()
})

// ── Google Calendar ──

function buildGCalUrl(event) {
  const [d, m, y] = event.data.split('/')
  const [h, min] = (event.horario || '09:00').split(':')

  const pad = (n) => String(n).padStart(2, '0')
  const startDt = `${y}${m}${d}T${h}${min}00`

  const endDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h) + 1, parseInt(min))
  const endDt = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${event.tipo || 'Consulta'} — ${event.doutor || 'Médico'}`,
    dates: `${startDt}/${endDt}`,
    details: event.observacoes || '',
    sf: 'true',
    output: 'xml'
  })

  return `https://www.google.com/calendar/render?${params.toString()}`
}

function openGCal(id) {
  const event = allEvents.find((e) => e.id === id)
  if (event) window.open(buildGCalUrl(event), '_blank', 'noopener')
}

// ── Importar histórico ──

document.getElementById('btn-importar').addEventListener('click', async () => {
  const dias = parseInt(document.getElementById('import-dias').value)
  const btn = document.getElementById('btn-importar')
  btn.disabled = true
  btn.textContent = 'Importando...'

  try {
    const res = await fetch('/api/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dias })
    })
    const data = await res.json()

    if (!res.ok) {
      showToast(data.error || 'Erro ao importar', 'error')
      return
    }

    if (data.aviso) {
      showToast(data.aviso, 'error')
      return
    }

    const msg = data.eventos > 0
      ? `${data.eventos} evento(s) importado(s) de ${data.processadas} mensagem(s)`
      : `Nenhum evento novo encontrado nos últimos ${dias} dias`
    showToast(msg, data.eventos > 0 ? 'success' : '')
    if (data.eventos > 0) await fetchEvents()
  } catch (err) {
    showToast('Erro ao conectar com o servidor', 'error')
  } finally {
    btn.disabled = false
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15V3M12 15L8 11M12 15L16 11M3 19H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Importar histórico`
  }
})

// ── Exportar ICS ──

function buildICS(events) {
  const pad = (n) => String(n).padStart(2, '0')

  const fold = (str) => {
    const chars = [...str]
    const chunks = []
    for (let i = 0; i < chars.length; i += 75) {
      chunks.push(chars.slice(i, i + 75).join(''))
    }
    return chunks.join('\r\n ')
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AutomaticoZap//Agenda Medica//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Agenda Médica',
    'X-WR-TIMEZONE:America/Sao_Paulo'
  ]

  events.forEach((event) => {
    const [d, m, y] = event.data.split('/')
    const [h, min] = (event.horario || '09:00').split(':')

    const startDt = `${y}${m}${d}T${h}${min}00`

    const endDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h) + 1, parseInt(min))
    const endDt = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`

    const dtstamp = new Date(event.criadoEm || Date.now())
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('.000Z', 'Z')

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${event.id}@automaticozap`)
    lines.push(`DTSTAMP:${dtstamp}`)
    lines.push(`DTSTART;TZID=America/Sao_Paulo:${startDt}`)
    lines.push(`DTEND;TZID=America/Sao_Paulo:${endDt}`)
    lines.push(fold(`SUMMARY:${event.tipo || 'Consulta'} — ${event.doutor || 'Médico'}`))
    if (event.observacoes) lines.push(fold(`DESCRIPTION:${event.observacoes}`))
    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

document.getElementById('btn-export-ics').addEventListener('click', () => {
  const filtered = filterDoutor
    ? allEvents.filter((e) => e.doutor === filterDoutor)
    : allEvents

  if (filtered.length === 0) {
    showToast('Nenhum evento para exportar', 'error')
    return
  }

  const ics = buildICS(filtered)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `agenda-medica-${Date.now()}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  showToast(`${filtered.length} evento(s) exportado(s)`, 'success')
})

// ── Modal de edição ──

function openEdit(id) {
  const event = allEvents.find((e) => e.id === id)
  if (!event) return
  editingId = id
  document.getElementById('edit-doutor').value = event.doutor || ''
  document.getElementById('edit-data').value = event.data || ''
  document.getElementById('edit-horario').value = event.horario || ''
  document.getElementById('edit-tipo').value = event.tipo || ''
  document.getElementById('edit-obs').value = event.observacoes || ''
  document.getElementById('modal').classList.remove('hidden')
  document.getElementById('edit-doutor').focus()
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden')
  editingId = null
}

document.getElementById('modal-cancel').addEventListener('click', closeModal)
document.getElementById('modal-close').addEventListener('click', closeModal)
document.getElementById('modal-backdrop').addEventListener('click', closeModal)

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal()
})

document.getElementById('modal-save').addEventListener('click', async () => {
  if (!editingId) return

  const body = {
    doutor: document.getElementById('edit-doutor').value.trim(),
    data: document.getElementById('edit-data').value.trim(),
    horario: document.getElementById('edit-horario').value.trim(),
    tipo: document.getElementById('edit-tipo').value.trim(),
    observacoes: document.getElementById('edit-obs').value.trim() || null
  }

  try {
    const res = await fetch(`/api/eventos/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    closeModal()
    await fetchEvents()
    showToast('Evento atualizado com sucesso', 'success')
  } catch (err) {
    console.error('Erro ao salvar:', err)
    showToast('Erro ao salvar evento', 'error')
  }
})

// ── Excluir evento ──

async function deleteEvent(id) {
  const event = allEvents.find((e) => e.id === id)
  const nome = event ? `${event.tipo || 'Evento'} de ${event.doutor}` : 'este evento'

  if (!confirm(`Excluir "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return

  try {
    const res = await fetch(`/api/eventos/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await fetchEvents()
    showToast('Evento excluído', 'success')
  } catch (err) {
    console.error('Erro ao excluir:', err)
    showToast('Erro ao excluir evento', 'error')
  }
}

// ── Toast de notificação ──

let toastTimeout = null

function showToast(message, type = '') {
  const toast = document.getElementById('toast')
  toast.textContent = message
  toast.className = `toast ${type}`
  toast.classList.remove('hidden')

  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden')
  }, 3000)
}
