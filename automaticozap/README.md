# AutomaticoZap — Agenda Médica via WhatsApp

Extrai automaticamente agendamentos médicos de um grupo do WhatsApp usando IA e exibe num dashboard visual na porta 3000.

## Fluxo

```
Mensagem no grupo → whatsapp-web.js → Ollama ou Gemini → db.json → Dashboard Express
```

## Pré-requisitos

- **Node.js** >= 18 (`node --version`)
- **Google Chrome ou Chromium** instalado (usado pelo whatsapp-web.js via Puppeteer)
- **Backend de IA** — escolha um dos dois:
  - **Ollama** (local, gratuito): `ollama serve` + `ollama pull qwen2.5:7b`
  - **Gemini** (API do Google): chave `GEMINI_API_KEY` obtida em [aistudio.google.com](https://aistudio.google.com)

## Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Criar o arquivo de configuração
cp .env.example .env

# 3. Editar o .env com o nome exato do grupo e as credenciais de IA
nano .env   # ou code .env
```

## Configuração (.env)

```env
GRUPO_NOME=nome exato do grupo no WhatsApp
PORT=3000

# Backend Ollama (padrão)
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_URL=http://localhost:11434

# Backend Gemini (alternativa — descomente e preencha a chave)
# GEMINI_API_KEY=sua-chave-aqui
# GEMINI_MODEL=gemini-2.0-flash
```

> **Importante:** `GRUPO_NOME` é sensível a maiúsculas/minúsculas e deve ser idêntico ao nome exibido no WhatsApp.

### Como descobrir o nome exato do grupo

Execute o projeto uma vez (`npm start`), escaneie o QR code e aguarde uma mensagem chegar no grupo. O nome será exibido no log:

```
[whatsapp] Nova msg: "..."
[whatsapp] Monitorando: "Nome Do Grupo"
```

Assim que o WhatsApp conectar, o nome configurado aparece na linha:

```
[whatsapp] Conectado. Monitorando: "Nome Do Grupo"
```

Use exatamente esse texto no `.env`.

## Escolhendo o backend de IA

O projeto suporta dois backends. Por padrão usa **Ollama** (local). Para trocar para **Gemini**, edite a linha 4 de [whatsapp.js](whatsapp.js):

```js
// Ollama (padrão)
const { extractAgenda } = require('./ollama')

// Gemini (alternativa)
const { extractAgenda } = require('./gemini')
```

| Backend | Vantagem | Requisito |
|---|---|---|
| Ollama | Gratuito, roda localmente, privacidade total | Ollama instalado + modelo baixado |
| Gemini | Mais rápido, sem instalação local | Chave de API do Google (gratuita com limites) |

## Uso

```bash
# Inicia o servidor
npm start

# Com auto-reload para desenvolvimento
npm run dev
```

1. Um QR code aparece no terminal
2. Abra o WhatsApp no celular → **Dispositivos conectados** → **Conectar dispositivo**
3. Escaneie o QR code
4. Acesse o dashboard em **http://localhost:3000**

A sessão é salva em `.wwebjs_auth/` — você não precisará escanear novamente nas próximas execuções.

## Dashboard

| Funcionalidade | Descrição |
|---|---|
| Agenda semanal | Visualização em 7 colunas (seg–dom) |
| Navegação | Botões de semana anterior/próxima + "Hoje" |
| Filtro | Filtrar por médico via dropdown |
| Importar histórico | Reprocessa mensagens antigas do grupo (até 90 dias ou por mês) |
| Google Calendar | Botão para abrir evento direto no Google Cal |
| Exportar .ICS | Baixa todos os eventos (ou filtrado) como arquivo .ics |
| Exportar .XLSX | Baixa planilha Excel com células coloridas: **azul** para Abertura de Agenda e **vermelho** para Cancelamento/Fechamento |
| Editar evento | Modal para correção manual de qualquer campo |
| Excluir evento | Remove evento com confirmação |
| Auto-atualização | Polling a cada 30 segundos |

## API REST

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/eventos` | Retorna todos os eventos ordenados por data/hora |
| `PATCH` | `/api/eventos/:id` | Edita campos de um evento |
| `DELETE` | `/api/eventos/:id` | Remove um evento |
| `POST` | `/api/importar` | Importa histórico do grupo (corpo: `{ dias: 30 }` ou `{ mes: "2026-04" }`) |
| `GET` | `/api/exportar-xlsx` | Baixa planilha Excel colorida (query opcional: `?doutor=Nome`) |

## Estrutura do projeto

```
automaticozap/
├── index.js          # Entry point: Express + API REST
├── whatsapp.js       # Listener do WhatsApp (QR, grupo, mensagens, importação)
├── ollama.js         # Backend de IA: Ollama (padrão)
├── gemini.js         # Backend de IA: Gemini (alternativa)
├── dashboard/
│   ├── index.html    # Interface do dashboard
│   ├── style.css     # Estilos (tema claro, responsivo)
│   └── app.js        # Lógica frontend (grid, polling, ICS, modal)
├── db.json           # Criado automaticamente (não commitado)
├── .wwebjs_auth/     # Sessão do WhatsApp (criada automaticamente, não commitada)
├── .env              # Suas configurações (não commitado)
├── .env.example      # Modelo de configuração
└── package.json
```

## Schema do db.json

```json
{
  "id": "uuid-v4",
  "mensagemId": "id-serialized-da-mensagem",
  "doutor": "Dr. Carlos Silva",
  "data": "15/04/2026",
  "horario": "09:00",
  "tipo": "Abertura de Agenda",
  "observacoes": null,
  "criadoEm": "2026-04-11T14:23:00.000Z",
  "mensagemOriginal": "Mensagem original do WhatsApp"
}
```

**Tipos de evento reconhecidos:** `Abertura de Agenda`, `Cancelamento`, `Cirurgia`, `Plantão`, `Retorno`, `Exame`

## Solução de problemas

**QR code não aparece**
- Certifique-se que o Chrome/Chromium está instalado
- Em servidores sem display: os args `--no-sandbox --disable-gpu` já estão configurados

**Ollama não responde**
- Verifique: `ollama serve` está rodando?
- Verifique: `ollama list` mostra `qwen2.5:7b`?
- Teste manualmente: `curl http://localhost:11434/api/tags`

**Gemini retorna erro de chave**
- Confirme que `GEMINI_API_KEY` está preenchida no `.env`
- Verifique se a chave está ativa em [aistudio.google.com](https://aistudio.google.com)

**Grupo não é monitorado**
- Confirme que `GRUPO_NOME` no `.env` é idêntico ao nome do grupo (veja os logs ao iniciar)
- O número do WhatsApp precisa ser membro do grupo

**Sessão expirada**
- Delete a pasta `.wwebjs_auth/` e escaneie o QR code novamente

**Importação não encontra mensagens antigas**
- O WhatsApp Web limita o histórico carregável — mensagens muito antigas podem não estar disponíveis
- Tente períodos menores (ex: 7 ou 15 dias) em vez de 90 dias
