# Sistema de Gestão de Clínica (MVP)

Um sistema web completo para gestão de clínicas, focado em facilidade de uso e funcionalidades essenciais, como cadastro de pacientes, médicos e controle de agendamentos.

## 🚀 Funcionalidades

- **Dashboard:** Visão geral do sistema com contadores estáticos/dinâmicos de pacientes totais e agendamentos do dia.
- **Gestão de Pacientes (CRUD):** 
  - Cadastro de novos pacientes com validação de formato e validade de CPF.
  - Edição de dados existentes.
  - Exclusão de pacientes do sistema.
- **Gestão de Médicos (CRUD):** 
  - Cadastro, listagem, edição e exclusão de médicos e suas respectivas especialidades e CRM.
- **Controle de Agendamentos (CRUD):**
  - Marcação de consultas, vinculando o médico, o paciente, a data e o horário.
  - Atualização do status da consulta e edições nos horários.
  - Visualização unificada e opção de cancelamento/exclusão da consulta.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript Vanilla (Interface limpa construída para rodar rapidamente nos navegadores).
- **Backend:** Node.js com o framework Express.js, proporcionando uma API REST simples.
- **Banco de Dados:** SQLite3 (arquivo `clinic.db` no backend garante persistência de dados de forma leve e local, sem necessidade de servidores externos).

## ⚙️ Pré-requisitos e Instalação

Antes de começar, certifique-se de ter o [Node.js](https://nodejs.org/pt-br/) instalado no seu computador.

### Passo 1: Acesse a pasta do projeto
Usando o terminal do VSCode ou o Prompt de Comando/PowerShell do Windows, certifique-se de estar dentro do diretório do projeto:
```bash
cd teste-saas
```

### Passo 2: Instale as Dependências
O projeto possui bibliotecas backend (como Express e o conector do SQLite). Para instalá-las, basta executar o comando abaixo:
```bash
npm install
```

### ⚠️ Importante: Configurar caminho da API (Local vs VPS)
Abra o arquivo `frontend/js/api.js` e preste atenção nas duas primeiras linhas do código:
- **Para testar localmente na sua máquina:** Descomente (remova as `//`) da linha `const API_BASE = 'http://localhost:3000/api';` e comente a linha de cima que tem apenas `'/api'`.
- **Para colocar na VPS / Produção:** Mantenha ativa apenas a linha `const API_BASE = '/api';` para evitar problemas de conexão.


### Passo 3: Inicialize a Aplicação
Para ligar o servidor responsável por receber as informações e mostrar o site, digite:
```bash
node backend/server.js
```
*O sistema criará o banco de dados `clinic.db` automaticamente (caso os scripts de tabelas já estejam no `db.js`) e inicializará a porta no localhost.*

### Passo 4: Acesse pelo Navegador
Abra o seu navegador (Google Chrome, Edge, etc) e acesse o endereço onde a aplicação está rodando:
```text
http://localhost:3000
```

---

## ☁️ Instalação em Servidor (VPS / Produção)

Para colocar o sistema online em uma VPS (ex: Ubuntu), a melhor abordagem é usar o **PM2** para manter a aplicação rodando continuamente.

### Passo 1: Atualizações e Instalação do Node.js
Acesse sua VPS pelo terminal (SSH) e garanta que o sistema e o Node.js estão atualizados:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Passo 2: Transferir o projeto e Instalar
Faça o upload dos arquivos ou clone via git para a VPS (ex: `/var/www/teste-saas`):
```bash
cd /var/www/teste-saas
npm install
```

### Passo 3: Iniciar a aplicação em Segundo Plano (PM2)
O PM2 vai monitorar o aplicativo para que ele nunca saia do ar:
```bash
sudo npm install -g pm2
pm2 start backend/server.js --name "clinic-saas"
```

### Passo 4: Configurar o Auto-Start
Para que o programa reinicie sozinho em caso de queda do servidor inteiro:
```bash
pm2 startup
pm2 save
```
O sistema já estará rodando disponível de qualquer lugar através do seu `IP-DA-VPS:3000` (Certifique-re de que a porta 3000 está liberada no seu Firewall da VPS).

---

## 📂 Estrutura de Arquivos Principal

- `backend/`: Código de infraestrutura e rotas da API (`server.js`, `db.js`, `routes/`).
- `frontend/`: Telas e design da aplicação (`index.html`, `js/`, `css/`).
- `package.json`: Mapeamento das dependências do Node.js.
