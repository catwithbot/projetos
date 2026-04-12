# AutomaticoZap — Agenda Médica via WhatsApp

Extrai automaticamente agendamentos médicos de um grupo do WhatsApp usando IA local (Ollama) e exibe num dashboard visual na porta 3000.

## Fluxo

```
Mensagem no grupo → whatsapp-web.js → Ollama (qwen2.5:7b) → db.json → Dashboard Express
```

## Pré-requisitos

- **Node.js** >= 18 (`node --version`)
- **Ollama** instalado e rodando (`ollama serve`)
- Modelo baixado: `ollama pull qwen2.5:7b`
- Google Chrome ou Chromium instalado (usado pelo whatsapp-web.js via Puppeteer)

## Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Criar o arquivo de configuração
cp .env.example .env

# 3. Editar o .env com o nome exato do grupo
nano .env   # ou code .env
```

## Configuração (.env)

```env
GRUPO_NOME=nome exato do grupo no WhatsApp
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_URL=http://localhost:11434
PORT=3000
```

> **Importante:** `GRUPO_NOME` é sensível a maiúsculas/minúsculas e deve ser idêntico ao nome exibido no WhatsApp.

### Como descobrir o nome exato do grupo

Execute o projeto uma vez (`npm start`), escaneie o QR code e envie qualquer mensagem em qualquer grupo. O nome do grupo será exibido no log:

```
[whatsapp] Mensagem recebida em "Nome Do Grupo": "..."
```

Use exatamente esse texto no `.env`.

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
| Google Calendar | Botão para abrir evento direto no Google Cal |
| Exportar .ICS | Baixa todos os eventos (ou filtrado) como arquivo .ics |
| Editar evento | Modal para correção manual de qualquer campo |
| Excluir evento | Remove evento com confirmação |
| Auto-atualização | Polling a cada 30 segundos |

## API REST

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/eventos` | Retorna todos os eventos ordenados por data/hora |
| `PATCH` | `/api/eventos/:id` | Edita campos de um evento |
| `DELETE` | `/api/eventos/:id` | Remove um evento |

## Estrutura do projeto

```
automaticozap/
├── index.js          # Entry point: Express + API REST
├── whatsapp.js       # Listener do WhatsApp (QR, grupo, mensagens)
├── ollama.js         # Integração com Ollama (prompt + parse JSON)
├── dashboard/
│   ├── index.html    # Interface do dashboard
│   ├── style.css     # Estilos (tema claro, responsivo)
│   └── app.js        # Lógica frontend (grid, polling, ICS, modal)
├── db.json           # Criado automaticamente
├── .wwebjs_auth/     # Sessão do WhatsApp (criada automaticamente)
├── .env              # Suas configurações (não commitar)
├── .env.example      # Modelo de configuração
└── package.json
```

## Schema do db.json

```json
{
  "id": "uuid-v4",
  "doutor": "Dr. Carlos Silva",
  "data": "15/04/2026",
  "horario": "09:00",
  "tipo": "Consulta",
  "observacoes": "Trazer exames anteriores",
  "criadoEm": "2026-04-11T14:23:00.000Z",
  "mensagemOriginal": "Mensagem original do WhatsApp"
}
```

## Solução de problemas

**QR code não aparece**
- Certifique-se que o Chrome/Chromium está instalado
- Em servidores sem display: os args `--no-sandbox --disable-gpu` já estão configurados

**Ollama não responde**
- Verifique: `ollama serve` está rodando?
- Verifique: `ollama list` mostra `qwen2.5:7b`?
- Teste manualmente: `curl http://localhost:11434/api/tags`

**Grupo não é monitorado**
- Confirme que `GRUPO_NOME` no `.env` é idêntico ao nome do grupo (veja os logs)
- O bot precisa ser membro do grupo

**Sessão expirada**
- Delete a pasta `.wwebjs_auth/` e escaneie o QR code novamente

## .gitignore recomendado

```
node_modules/
.env
.wwebjs_auth/
db.json
```
