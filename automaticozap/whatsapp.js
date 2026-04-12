const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const { v4: uuidv4 } = require('uuid')
const { extractAgenda } = require('./ollama')

const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms))

function formatErr(err) {
  return (err?.message || String(err || 'erro desconhecido')).split('\n')[0].trim()
}

// Abre o grupo no browser, carrega o histórico progressivamente e
// retorna as mensagens a partir de limiteMs.
async function lerMensagensNavegador(client, chatId, limiteMs) {
  const page = client.pupPage
  const MAX_CICLOS = 60
  const DELAY_MS = 900

  // 1. Força carregamento do chat via wwebjs (mais confiável que chamar o Store direto)
  try {
    await client.getChatById(chatId)
    await SLEEP(1500)
  } catch (err) {
    console.warn(`[browser] getChatById falhou: ${formatErr(err)}`)
  }

  // 2. Tenta abrir o chat na UI — testa vários métodos, não para em erro
  const metodoAbrir = await page.evaluate(async (chatId) => {
    try {
      const wid = window.Store.WidFactory.createWid(chatId)
      const chat = window.Store.Chat.get(wid)
      if (!chat) return 'chat não encontrado no Store'

      if (typeof window.Store.Chat.loadEarlierMessages === 'function') {
        // Pré-carrega algumas mensagens para confirmar que o canal está ativo
        await window.Store.Chat.loadEarlierMessages(chat)
      }

      // Tenta abrir visualmente (headless: false) — ignora erros
      if (window.Store.Cmd?.openChatAt) {
        try { await window.Store.Cmd.openChatAt(chat); return 'Cmd.openChatAt' } catch (_) {}
      }
      if (window.Store.Chat?.open) {
        try { window.Store.Chat.open(chat); return 'Chat.open' } catch (_) {}
      }
      return 'store pronto (sem abrir UI)'
    } catch (e) {
      return 'erro: ' + (e.message || e)
    }
  }, chatId)

  console.log(`[browser] Chat: ${metodoAbrir}`)
  await SLEEP(1500)

  // 3. Loop: carrega mensagens mais antigas até atingir o início do período
  for (let i = 0; i < MAX_CICLOS; i++) {
    const { maisAntigoMs, total, canLoadMore } = await page.evaluate((chatId) => {
      const wid = window.Store.WidFactory.createWid(chatId)
      const chat = window.Store.Chat.get(wid)
      if (!chat?.msgs) return { maisAntigoMs: 0, total: 0, canLoadMore: false }
      const msgs = chat.msgs.getModelsArray()
      const total = msgs.length
      const maisAntigoMs = total > 0 ? (msgs[0]?.t ?? msgs[0]?.timestamp ?? 0) * 1000 : 0
      const canLoadMore = chat.msgs.canLoadEarlier === true
      return { maisAntigoMs, total, canLoadMore }
    }, chatId)

    const dataStr = maisAntigoMs ? new Date(maisAntigoMs).toLocaleDateString('pt-BR') : '?'
    console.log(`[browser] ciclo ${i + 1}: ${total} msgs | mais antiga: ${dataStr} | mais: ${canLoadMore}`)

    if (maisAntigoMs > 0 && maisAntigoMs <= limiteMs) {
      console.log('[browser] Início do período alcançado.')
      break
    }
    if (!canLoadMore) {
      console.log('[browser] Sem mais histórico disponível.')
      break
    }

    // Carrega mensagens mais antigas — tenta os 3 métodos conhecidos
    await page.evaluate(async (chatId) => {
      const wid = window.Store.WidFactory.createWid(chatId)
      const chat = window.Store.Chat.get(wid)
      if (!chat) return
      try { await window.Store.Chat.loadEarlierMessages(chat); return } catch (_) {}
      try { await chat.msgs.loadEarlier(); return } catch (_) {}
      try { await window.Store.ConversationMsgs?.loadEarlierMsgs?.(chat) } catch (_) {}
    }, chatId)

    // Scroll DOM (reforça em modo headless: false)
    await page.evaluate(() => {
      for (const sel of [
        '[data-testid="conversation-panel-messages"]',
        '[data-testid="msg-container"]',
        '#main div[tabindex="-1"]',
        '#main [role="application"]'
      ]) {
        const el = document.querySelector(sel)
        if (el && el.scrollHeight > el.clientHeight) { el.scrollTop = 0; return }
      }
    })

    await SLEEP(DELAY_MS)
  }

  // 4. Coleta mensagens do período do Store
  const msgs = await page.evaluate((chatId, limiteMs) => {
    const wid = window.Store.WidFactory.createWid(chatId)
    const chat = window.Store.Chat.get(wid)
    if (!chat?.msgs) return []
    return chat.msgs
      .getModelsArray()
      .filter(
        (m) =>
          !m.isNotification &&
          (m.t ?? m.timestamp ?? 0) * 1000 >= limiteMs &&
          m.body?.trim() &&
          (m.type === 'chat' || !m.type)
      )
      .map((m) => window.WWebJS.getMessageModel(m))
  }, chatId, limiteMs)

  console.log(`[browser] ${msgs.length} mensagem(s) encontrada(s) no período`)
  return msgs
}

async function importarHistorico(client, { loadDb, saveDb, dias = 30, mes = null }) {
  if (!process.env.GRUPO_NOME) {
    return { processadas: 0, eventos: 0, erros: 0, aviso: 'GRUPO_NOME não configurado' }
  }

  const chats = await client.getChats()
  const chatInfo = chats.find((c) => c.isGroup && c.name === process.env.GRUPO_NOME)
  if (!chatInfo) {
    return {
      processadas: 0, eventos: 0, erros: 0,
      aviso: `Grupo "${process.env.GRUPO_NOME}" não encontrado`
    }
  }

  let limiteMs, descricao
  if (mes) {
    const [ano, numMes] = mes.split('-').map(Number)
    limiteMs = new Date(ano, numMes - 1, 1, 0, 0, 0, 0).getTime()
    descricao = `mês ${mes}`
  } else {
    limiteMs = Date.now() - dias * 24 * 60 * 60 * 1000
    descricao = `últimos ${dias} dias`
  }

  console.log(`[importar] Lendo via browser — ${descricao} — "${process.env.GRUPO_NOME}"`)

  const mensagens = await lerMensagensNavegador(client, chatInfo.id._serialized, limiteMs)

  const db = loadDb()
  const idsExistentes = new Set(db.map((e) => e.mensagemId).filter(Boolean))

  let processadas = 0, eventos = 0, erros = 0

  for (const msg of mensagens) {
    const msgId = msg.id._serialized
    if (idsExistentes.has(msgId)) continue

    processadas++
    try {
      const extraidos = await extractAgenda(msg.body)
      if (!extraidos?.length) continue

      for (const evento of extraidos) {
        db.push({
          id: uuidv4(),
          mensagemId: msgId,
          doutor: evento.doutor || 'Desconhecido',
          data: evento.data,
          horario: evento.horario,
          tipo: evento.tipo || 'Consulta',
          observacoes: evento.observacoes || null,
          criadoEm: new Date().toISOString(),
          mensagemOriginal: msg.body
        })
        eventos++
      }
      idsExistentes.add(msgId)
    } catch (err) {
      erros++
      console.error('[importar] Erro ao processar mensagem:', formatErr(err))
    }
  }

  saveDb(db)
  console.log(`[importar] Concluído: ${eventos} evento(s) de ${processadas} mensagem(s) | ${erros} erro(s)`)
  return { processadas, eventos, erros }
}

function initWhatsApp({ loadDb, saveDb }) {
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
  })

  client.on('qr', (qr) => {
    console.log('─────────────────────────────────────────')
    console.log('  Escaneie o QR code com o WhatsApp:')
    console.log('─────────────────────────────────────────')
    qrcode.generate(qr, { small: true })
    console.log('─────────────────────────────────────────\n')
  })

  client.on('loading_screen', (percent, message) => {
    process.stdout.write(`\r[whatsapp] Carregando... ${percent}% — ${message}   `)
  })

  client.on('authenticated', () => console.log('\n[whatsapp] Autenticado'))

  client.on('auth_failure', (msg) => console.error('[whatsapp] Falha de autenticação:', msg))

  client.on('ready', () => {
    console.log(`[whatsapp] Conectado. Monitorando: "${process.env.GRUPO_NOME || '(não configurado)'}"\n`)
  })

  client.on('disconnected', (reason) => {
    console.warn('[whatsapp] Desconectado:', reason)
    setTimeout(() => {
      client.initialize().catch((err) => console.error('[whatsapp] Erro ao reconectar:', formatErr(err)))
    }, 10_000)
  })

  client.on('message_create', async (message) => {
    try {
      const chat = await message.getChat()
      if (!chat.isGroup || chat.name !== process.env.GRUPO_NOME) return
      if (message.type !== 'chat') return

      const body = message.body.trim()
      if (!body) return

      const msgId = message.id._serialized
      const db = loadDb()
      if (db.some((e) => e.mensagemId === msgId)) return

      console.log(`[whatsapp] Nova msg: "${body.slice(0, 80)}${body.length > 80 ? '...' : ''}"`)

      const eventos = await extractAgenda(body)
      if (!eventos?.length) return

      for (const evento of eventos) {
        db.push({
          id: uuidv4(),
          mensagemId: msgId,
          doutor: evento.doutor || 'Desconhecido',
          data: evento.data,
          horario: evento.horario,
          tipo: evento.tipo || 'Consulta',
          observacoes: evento.observacoes || null,
          criadoEm: new Date().toISOString(),
          mensagemOriginal: body
        })
      }
      saveDb(db)
      console.log(`[whatsapp] ${eventos.length} evento(s) salvo(s)`)
    } catch (err) {
      console.error('[whatsapp] Erro:', formatErr(err))
    }
  })

  console.log('[whatsapp] Inicializando...')
  client.initialize().catch((err) => console.error('[whatsapp] Erro crítico:', formatErr(err)))
  return client
}

module.exports = { initWhatsApp, importarHistorico }
