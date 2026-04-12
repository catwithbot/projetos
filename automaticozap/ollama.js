const axios = require('axios')

const SYSTEM_PROMPT = `Você é um extrator de dados de agendas médicas para uma clínica.
As mensagens são avisos internos sobre a agenda de médicos: podem informar que a agenda será aberta (atendimento normal) ou que o médico NÃO atenderá em determinada data (cancelamento/feriado/ausência).

Exemplos de mensagens de ATENDIMENTO NORMAL:
- "Dr. João vai atender dia 22/05" → doutor=João, data=22/05, tipo=Abertura de Agenda
- "Dra. Ana 15/04 às 8h" → doutor=Ana, data=15/04, horario=08:00, tipo=Abertura de Agenda
- "Marcelo 10/06 cirurgia" → doutor=Marcelo, data=10/06, tipo=Cirurgia
- "Abrir agenda do Dr. Pedro para 03/05" → doutor=Pedro, data=03/05, tipo=Abertura de Agenda
- "Silva atende segunda 14/04" → doutor=Silva, data=14/04, tipo=Abertura de Agenda

Exemplos de mensagens de CANCELAMENTO (não atenderá):
- "Dra. Daniela não atenderá segunda 21/04 (feriado)" → doutor=Daniela, data=21/04, tipo=Cancelamento, observacoes=feriado
- "Dr. Carlos não vai atender dia 05/05" → doutor=Carlos, data=05/05, tipo=Cancelamento
- "Agenda da Dra. Ana cancelada para 10/06" → doutor=Ana, data=10/06, tipo=Cancelamento
- "Silva não atende amanhã 30/04" → doutor=Silva, data=30/04, tipo=Cancelamento
- "Dr. Pedro de folga no dia 01/05" → doutor=Pedro, data=01/05, tipo=Cancelamento, observacoes=folga
- "Cancelar agenda do Dr. Marcos 15/04" → doutor=Marcos, data=15/04, tipo=Cancelamento

Retorne SOMENTE um array JSON válido, sem markdown, sem texto explicativo, sem blocos de código.
Cada elemento do array deve ter exatamente este formato:
{"doutor":"nome do médico","data":"DD/MM/YYYY","horario":"HH:MM","tipo":"tipo","observacoes":"informações adicionais ou null"}

Regras:
- Se não houver nenhum médico ou data na mensagem, retorne exatamente: []
- Se houver múltiplos médicos ou datas, retorne todos no array
- O campo "data" deve estar obrigatoriamente no formato DD/MM/YYYY
- O campo "horario" deve estar no formato HH:MM (24 horas). Se não informado, use "00:00"
- Se o ano não for mencionado, assuma o ano ANO_ATUAL
- "tipo" deve ser "Cancelamento" quando a mensagem indicar que o médico NÃO atenderá (ausência, feriado, folga, cancelamento, não vai atender, não atenderá)
- "tipo" padrão é "Abertura de Agenda" para atendimentos normais, salvo se a mensagem indicar outro (Cirurgia, Plantão, Retorno, Exame)
- "observacoes" deve conter o motivo do cancelamento se mencionado (ex: feriado, folga, viagem), ou null
- Nunca invente dados que não estão na mensagem`

async function extractAgenda(mensagem) {
  const url = `${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/chat`
  const model = process.env.OLLAMA_MODEL || 'qwen2.5:7b'
  const anoAtual = new Date().getFullYear()
  const promptComAno = SYSTEM_PROMPT.replace('ANO_ATUAL', anoAtual)

  const payload = {
    model,
    messages: [
      { role: 'system', content: promptComAno },
      { role: 'user', content: mensagem }
    ],
    stream: false,
    options: {
      temperature: 0.1,
      top_p: 0.9,
      num_predict: 1024
    }
  }

  try {
    const response = await axios.post(url, payload, { timeout: 30 * 60 * 1000 })
    const raw = response.data?.message?.content?.trim() || ''

    if (!raw) {
      console.warn('[ollama] Resposta vazia do modelo')
      return []
    }

    console.log('[ollama] Resposta bruta:', raw.slice(0, 300))

    // Fallback: remove markdown fences caso o modelo quebre o protocolo
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('[ollama] Falha ao parsear JSON. Resposta bruta:', cleaned.slice(0, 300))
      return []
    }

    // Garante array
    if (!Array.isArray(parsed)) {
      console.warn('[ollama] Resposta não é um array:', typeof parsed)
      return []
    }

    // Filtra itens com campos mínimos obrigatórios
    const validos = parsed.filter((item) => {
      const ok = item && item.doutor && item.data && item.horario
      if (!ok) console.warn('[ollama] Item inválido ignorado:', JSON.stringify(item))
      return ok
    })

    return validos
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error(`[ollama] Ollama não está rodando em ${process.env.OLLAMA_URL || 'http://localhost:11434'}`)
      console.error('[ollama] Execute: ollama serve')
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      console.error('[ollama] Timeout na chamada ao Ollama (>30min). Modelo pode estar carregando.')
    } else {
      console.error('[ollama] Erro inesperado:', err.message)
    }
    return []
  }
}

module.exports = { extractAgenda }
