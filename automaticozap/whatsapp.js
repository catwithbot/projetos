const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const { v4: uuidv4 } = require('uuid')
const { extractAgenda } = require('./ollama')

function getMsgTimestampMs(msg) {
  const seconds = msg?.timestamp ?? msg?.t ?? 0
  return Number(seconds) * 1000
}

async function fetchMessagesWithFallback(client, chatId, limite) {
  try {
    const chat = await client.getChatById(chatId)
    if (!chat) {
      throw new Error('Chat não encontrado no cache do cliente')
    }
    return await chat.fetchMessages({ limit: limite })
  } catch (err) {
    console.warn(`[importar] fetchMessages falhou (${err.message}). Tentando fallback...`)
  }

  // Tentativa 2: API de busca da lib (costuma funcionar mesmo quando fetchMessages quebra)
  try {
    const query = ''
    const encontrados = await client.searchMessages(query, { chatId, limit: limite, page: 1 })
    if (Array.isArray(encontrados) && encontrados.length > 0) {
      return encontrados
    }
  } catch (err) {
    console.warn(`[importar] searchMessages falhou (${err.message}). Tentando cache local...`)
  }

  // Tentativa 3: somente mensagens já em cache, sem chamadas que forçam carregamento do chat
  try {
    return await client.pupPage.evaluate((chatId, limit) => {
      const wid = window.Store.WidFactory.createWid(chatId)
      const chat = window.Store.Chat.get(wid)
      if (!chat || !chat.msgs) return []

      const msgs = chat.msgs
        .getModelsArray()
        .filter((m) => !m.isNotification)
        .slice(-limit)

      return msgs.map((m) => window.WWebJS.getMessageModel(m))
    }, chatId, limite)
  } catch (err) {
    console.warn(`[importar] fallback de cache local falhou (${err.message}).`) 
    return []
  }
}

async function importarHistorico(client, { loadDb, saveDb, dias = 30 }) {
  const grupoAlvo = process.env.GRUPO_NOME
  if (!grupoAlvo) {
    console.warn('[importar] GRUPO_NOME não configurado')
    return { processadas: 0, eventos: 0, erros: 0, aviso: 'GRUPO_NOME não configurado' }
  }

  const chats = await client.getChats()
  const chatInfo = chats.find((c) => c.isGroup && c.name === grupoAlvo)
  if (!chatInfo) {
    console.warn(`[importar] Grupo "${grupoAlvo}" não encontrado`)
    return { processadas: 0, eventos: 0, erros: 0, aviso: `Grupo "${grupoAlvo}" não encontrado` }
  }

  const limiteMs = Date.now() - dias * 24 * 60 * 60 * 1000
  // Estima o número de mensagens necessárias (média de 20 msgs/dia é conservador para grupos médicos)
  const limite = Math.min(dias * 20, 1000)
  console.log(`[importar] Buscando até ${limite} mensagens dos últimos ${dias} dias em "${grupoAlvo}"...`)

  const todasMsgs = await fetchMessagesWithFallback(client, chatInfo.id._serialized, limite)

  const filtradas = todasMsgs.filter(
    (m) => getMsgTimestampMs(m) >= limiteMs && m.type === 'chat' && m.body && m.body.trim()
  )

  console.log(`[importar] ${filtradas.length} mensagem(s) no intervalo encontrada(s)`)

  const db = loadDb()
  const idsExistentes = new Set(db.map((e) => e.mensagemId).filter(Boolean))

  let processadas = 0
  let eventos = 0
  let erros = 0

  for (const msg of filtradas) {
    const msgId = msg.id._serialized
    if (idsExistentes.has(msgId)) continue

    processadas++
    try {
      const extraidos = await extractAgenda(msg.body)
      if (!extraidos || extraidos.length === 0) continue

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
      // Marca como processada para evitar reprocessar se aparecer duas vezes na lista
      idsExistentes.add(msgId)
    } catch (err) {
      erros++
      console.error('[importar] Erro ao processar mensagem:', err.message)
    }
  }

  saveDb(db)
  console.log(`[importar] Concluído: ${eventos} evento(s) extraído(s) de ${processadas} mensagem(s) processada(s)`)
  return { processadas, eventos, erros }
}

function initWhatsApp({ loadDb, saveDb }) {
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
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
    console.log(`[whatsapp] Carregando... ${percent}% — ${message}`)
  })

  client.on('authenticated', () => {
    console.log('[whatsapp] Autenticado com sucesso')
  })

  client.on('auth_failure', (msg) => {
    console.error('[whatsapp] Falha de autenticação:', msg)
  })

  client.on('ready', () => {
    const grupo = process.env.GRUPO_NOME || '(não configurado)'
    console.log(`[whatsapp] Conectado. Monitorando grupo: "${grupo}"`)
    console.log('[whatsapp] Aguardando mensagens...\n')
  })

  client.on('disconnected', (reason) => {
    console.warn('[whatsapp] Desconectado:', reason)
    console.log('[whatsapp] Tentando reconectar em 10 segundos...')
    setTimeout(() => {
      client.initialize().catch((err) => {
        console.error('[whatsapp] Erro ao reinicializar:', err.message)
      })
    }, 10_000)
  })

  client.on('message_create', async (message) => {
    try {
      // Filtra apenas mensagens de grupos
      const chat = await message.getChat()
      if (!chat.isGroup) return

      const grupoAlvo = process.env.GRUPO_NOME
      if (!grupoAlvo) {
        console.warn('[whatsapp] GRUPO_NOME não está configurado no .env')
        return
      }
      if (chat.name !== grupoAlvo) return

      // Filtra apenas mensagens de texto
      if (message.type !== 'chat') return

      const body = message.body.trim()
      if (!body) return

      console.log(`[whatsapp] Mensagem recebida em "${chat.name}": "${body.slice(0, 60)}${body.length > 60 ? '...' : ''}"`)

      // Deduplicação: ignora se a mensagem já foi processada
      const msgId = message.id._serialized
      const db = loadDb()
      if (db.some((e) => e.mensagemId === msgId)) {
        console.log('[whatsapp] Mensagem já processada, ignorando.')
        return
      }

      // Extrai eventos via Ollama
      const eventos = await extractAgenda(body)
      if (!eventos || eventos.length === 0) {
        console.log('[whatsapp] Nenhum agendamento encontrado na mensagem.')
        return
      }

      // Persiste os eventos
      for (const evento of eventos) {
        const record = {
          id: uuidv4(),
          mensagemId: msgId,
          doutor: evento.doutor || 'Desconhecido',
          data: evento.data,
          horario: evento.horario,
          tipo: evento.tipo || 'Consulta',
          observacoes: evento.observacoes || null,
          criadoEm: new Date().toISOString(),
          mensagemOriginal: body
        }
        db.push(record)
      }
      saveDb(db)

      const hora = new Date().toLocaleTimeString('pt-BR')
      console.log(`[${hora}] ${eventos.length} evento(s) extraído(s) e salvo(s).`)
    } catch (err) {
      console.error('[whatsapp] Erro ao processar mensagem:', err.message)
    }
  })

  console.log('[whatsapp] Inicializando cliente...')
  client.initialize().catch((err) => {
    console.error('[whatsapp] Erro crítico ao inicializar:', err.message)
  })

  return client
}

module.exports = { initWhatsApp, importarHistorico }
