require('dotenv').config()

const express = require('express')
const path = require('path')
const fs = require('fs')
const { initWhatsApp, importarHistorico } = require('./whatsapp')

const app = express()
const PORT = process.env.PORT || 3000
const DB_PATH = path.join(__dirname, 'db.json')

app.use(express.json())
app.use(express.static(path.join(__dirname, 'dashboard')))

// --- DB helpers ---

function loadDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, '[]', 'utf-8')
      return []
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  } catch (err) {
    console.error('[db] Erro ao carregar db.json, resetando:', err.message)
    fs.writeFileSync(DB_PATH, '[]', 'utf-8')
    return []
  }
}

function saveDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

// --- Helpers de ordenação ---

function toMs(evento) {
  const [d, m, y] = evento.data.split('/')
  const [h, min] = (evento.horario || '00:00').split(':')
  return new Date(
    parseInt(y),
    parseInt(m) - 1,
    parseInt(d),
    parseInt(h),
    parseInt(min)
  ).getTime()
}

// --- Rotas API ---

app.get('/api/eventos', (req, res) => {
  const db = loadDb()
  db.sort((a, b) => toMs(a) - toMs(b))
  res.json(db)
})

app.delete('/api/eventos/:id', (req, res) => {
  let db = loadDb()
  const before = db.length
  db = db.filter((e) => e.id !== req.params.id)
  if (db.length === before) {
    return res.status(404).json({ error: 'Evento não encontrado' })
  }
  saveDb(db)
  res.json({ ok: true })
})

app.patch('/api/eventos/:id', (req, res) => {
  const db = loadDb()
  const idx = db.findIndex((e) => e.id === req.params.id)
  if (idx === -1) {
    return res.status(404).json({ error: 'Evento não encontrado' })
  }
  const allowed = ['doutor', 'data', 'horario', 'tipo', 'observacoes']
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) db[idx][field] = req.body[field]
  })
  saveDb(db)
  res.json(db[idx])
})

// --- Importação histórica ---

let wzClient = null

app.post('/api/importar', async (req, res) => {
  if (!wzClient) {
    return res.status(503).json({ error: 'WhatsApp ainda não conectado' })
  }
  const dias = Math.min(Math.max(parseInt(req.body.dias) || 30, 1), 365)
  try {
    const resultado = await importarHistorico(wzClient, { loadDb, saveDb, dias })
    res.json(resultado)
  } catch (err) {
    console.error('[importar] Erro:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// --- Inicialização ---

app.listen(PORT, () => {
  console.log(`\n✓ Dashboard disponível em http://localhost:${PORT}\n`)
  wzClient = initWhatsApp({ loadDb, saveDb })
})

app.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] Porta ${PORT} já está em uso. Altere PORT no .env`)
    process.exit(1)
  }
  console.error('[server] Erro:', err.message)
})
