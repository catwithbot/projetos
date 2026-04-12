const { GoogleGenerativeAI } = require('@google/generative-ai')

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

let genAI = null

function getClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY não configurada no .env')
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

async function extractAgenda(mensagem) {
  const anoAtual = new Date().getFullYear()
  const promptComAno = SYSTEM_PROMPT.replace('ANO_ATUAL', anoAtual)
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

  try {
    const client = getClient()
    const gemini = client.getGenerativeModel({
      model,
      systemInstruction: promptComAno,
      generationConfig: {
        temperature: 0.1,
        topP: 0.9,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json'
      }
    })

    const result = await gemini.generateContent(mensagem)
    const raw = result.response.text().trim()

    if (!raw) {
      console.warn('[gemini] Resposta vazia do modelo')
      return []
    }

    console.log('[gemini] Resposta bruta:', raw.slice(0, 300))

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
      console.error('[gemini] Falha ao parsear JSON. Resposta bruta:', cleaned.slice(0, 300))
      return []
    }

    if (!Array.isArray(parsed)) {
      console.warn('[gemini] Resposta não é um array:', typeof parsed)
      return []
    }

    const validos = parsed.filter((item) => {
      const ok = item && item.doutor && item.data && item.horario
      if (!ok) console.warn('[gemini] Item inválido ignorado:', JSON.stringify(item))
      return ok
    })

    return validos
  } catch (err) {
    if (err.message?.includes('API_KEY')) {
      console.error('[gemini] Chave inválida ou não configurada. Verifique GEMINI_API_KEY no .env')
    } else if (err.message?.includes('quota') || err.status === 429) {
      console.error('[gemini] Limite de requisições atingido (quota). Tente novamente em instantes.')
    } else {
      console.error('[gemini] Erro inesperado:', err.message)
    }
    return []
  }
}

module.exports = { extractAgenda }
