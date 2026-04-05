# ClinicaOS

Sistema de gestão e agendamento para clínicas médicas. MVP com dashboard, cadastro de pacientes, médicos, disponibilidades, agendamentos com visualização em calendário, controle de usuários e relatórios.

---

## Tecnologias

### Backend

| Tecnologia | Versão | Função |
|---|---|---|
| [Node.js](https://nodejs.org/) | v20+ | Runtime JavaScript |
| [Express](https://expressjs.com/) | v5 | Framework HTTP |
| [PostgreSQL](https://www.postgresql.org/) | v14+ | Banco de dados relacional |
| [pg](https://node-postgres.com/) | v8 | Driver PostgreSQL para Node.js |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | v9 | Autenticação via JWT |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | v3 | Hash de senhas |
| [helmet](https://helmetjs.github.io/) | v8 | Headers de segurança HTTP |
| [cors](https://github.com/expressjs/cors) | v2 | Controle de CORS por origem |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | v8 | Rate limiting (proteção brute force) |
| [PM2](https://pm2.keymetrics.io/) | latest | Gerenciador de processos em produção |

### Frontend

| Tecnologia | Função |
|---|---|
| HTML5 + CSS3 | Estrutura e estilo das páginas |
| JavaScript Vanilla (ES6+) | Lógica do cliente sem frameworks |
| [FullCalendar](https://fullcalendar.io/) | Visualização de agendamentos em calendário |
| [Font Awesome](https://fontawesome.com/) | Ícones |

### Infraestrutura (VPS)

| Tecnologia | Função |
|---|---|
| [Nginx](https://nginx.org/) | Reverse proxy + servir frontend estático |
| [Certbot / Let's Encrypt](https://certbot.eff.org/) | Certificado SSL gratuito (HTTPS) |
| UFW | Firewall |
| GitHub Actions | CI/CD — deploy automático via SSH |

---

## Rodando Localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) v20+
- [PostgreSQL](https://www.postgresql.org/download/) v14+

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/clinicaos.git
cd clinicaos
```

### 2. Criar o banco de dados e rodar as migrations

```bash
# Crie o banco via psql ou pgAdmin
psql -U postgres -c "CREATE DATABASE clinic_saas;"

# Funcionou esse para instalar local (Alternativa caso o outro não funcione):
sudo -i -u postgres psql -c "CREATE DATABASE clinic_saas;"

# Rode as migrations em ordem
psql -U postgres -d clinic_saas -f backend/migrations/init.sql
psql -U postgres -d clinic_saas -f backend/migrations/002_add_users_and_audit.sql
```
#Funcionou alterantivamente esse comando (Alternativa caso o outro não funcione, primeiro vai até a pasta do projeto):

cd /home/venom/Documents/Github/projetos/saas-clinica
venom@venom:~/Documents/Github/projetos/saas-clinica$ chmod +r backend/migrations/init.sql backend/migrations/002_add_users_and_audit.sql

sudo -u postgres psql -d clinic_saas -f backend/migrations/init.sql
sudo -u postgres psql -d clinic_saas -f backend/migrations/002_add_users_and_audit.sql


### 3. Configurar variáveis de ambiente

```bash
cp .env.example backend/.env
```

Edite `backend/.env` com as credenciais do seu PostgreSQL local:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clinic_saas
DB_USER=postgres
DB_PASSWORD=sua_senha
JWT_SECRET=qualquer_string_longa_para_dev
CORS_ORIGIN=http://localhost:3000
```

### 4. Instalar dependências e iniciar

```bash
cd backend
npm install
npm run dev
```

Acesse `http://localhost:3000` no navegador.

> **Usuário padrão:** admin / admin123 — troque a senha após o primeiro login.

---

## Deploy em VPS (Ubuntu 22.04)

> Para o guia completo com CI/CD, backup automático e auditoria de segurança, veja [DEPLOY.md](DEPLOY.md).

### Passo 1 — Preparar a VPS

```bash
# Na sua máquina local
ssh-copy-id root@SEU_IP_DA_VPS
ssh root@SEU_IP_DA_VPS

# Criar usuário de deploy (nunca rode a aplicação como root)
adduser deploy
usermod -aG sudo deploy
cp -r ~/.ssh /home/deploy/.ssh
chown -R deploy:deploy /home/deploy/.ssh

# Desabilitar login por senha e acesso root via SSH
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd ou systemctl restart ssh

# Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw enable
```

### Passo 2 — Instalar Node.js, PostgreSQL e Nginx

```bash
ssh deploy@SEU_IP_DA_VPS

sudo apt update && sudo apt upgrade -y

# Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Confirmar versão (precisa ser v20+)
node -v && npm -v

# PostgreSQL e Nginx
sudo apt install -y postgresql postgresql-contrib nginx

# PM2 globalmente
sudo npm install -g pm2
```

### Passo 3 — Configurar o PostgreSQL

```bash
sudo -i -u postgres psql <<'SQL'
CREATE USER clinic_user WITH PASSWORD 'SENHA_FORTE_AQUI';
CREATE DATABASE clinic_saas OWNER clinic_user;
GRANT ALL PRIVILEGES ON DATABASE clinic_saas TO clinic_user;
SQL
```

### Passo 4 — Clonar o projeto e configurar o ambiente

```bash
sudo mkdir -p /var/www/clinic-saas
sudo chown deploy:deploy /var/www/clinic-saas

cd /var/www
git clone https://github.com/SEU_USUARIO/SEU_REPO.git clinic-saas
cd clinic-saas/backend
npm ci --omit=dev

# Criar o arquivo .env (NUNCA commitar este arquivo)
cp /var/www/clinic-saas/.env.example /var/www/clinic-saas/backend/.env
nano /var/www/clinic-saas/backend/.env
chmod 600 /var/www/clinic-saas/backend/.env
```

Conteúdo do `.env` em produção:

```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clinic_saas
DB_USER=clinic_user
DB_PASSWORD=SENHA_FORTE_AQUI
JWT_SECRET=GERE_COM_node_-e_"console.log(require('crypto').randomBytes(64).toString('hex'))"
CORS_ORIGIN=https://SEU_DOMINIO.COM.BR
```

> Gere o `JWT_SECRET` com: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Passo 5 — Rodar as migrations e seed

```bash
cd /var/www/clinic-saas/backend

psql -U clinic_user -d clinic_saas -f migrations/init.sql
psql -U clinic_user -d clinic_saas -f migrations/002_add_users_and_audit.sql

node seed.js
# ⚠ Troque a senha admin123 imediatamente após o 1º login!
```

### Passo 6 — Configurar o Nginx como reverse proxy

```bash
sudo nano /etc/nginx/sites-available/clinic-saas
```

Cole o conteúdo abaixo (substitua `SEU_DOMINIO.COM.BR`):

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO.COM.BR www.SEU_DOMINIO.COM.BR;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/clinic-saas /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### Passo 7 — HTTPS gratuito com Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx

# Certifique-se de que o domínio já aponta para o IP da VPS
sudo certbot --nginx -d SEU_DOMINIO.COM.BR -d www.SEU_DOMINIO.COM.BR

# Testar renovação automática
sudo certbot renew --dry-run
```

### Passo 8 — Iniciar a aplicação com PM2

```bash
cd /var/www/clinic-saas

# Criar diretório de logs
sudo mkdir -p /var/log/clinic-saas
sudo chown deploy:deploy /var/log/clinic-saas

# Iniciar usando o ecosystem.config.js
pm2 start ecosystem.config.js --env production

# Persistir para reiniciar após reboot da VPS
pm2 save
pm2 startup systemd -u deploy --hp /home/deploy
# Execute o comando sudo que o PM2 exibir no terminal
```

Comandos úteis do PM2:

```bash
pm2 status                    # ver estado dos processos
pm2 logs clinic-saas          # logs em tempo real
pm2 logs clinic-saas --lines 100  # últimas 100 linhas
pm2 restart clinic-saas       # reiniciar
pm2 reload clinic-saas        # reload sem downtime (zero-downtime)
pm2 stop clinic-saas          # parar
```

### Checklist antes de ir ao ar

- [ ] `.env` criado na VPS com valores reais
- [ ] Senha `admin123` trocada após o primeiro login
- [ ] Domínio apontando para o IP da VPS (DNS propagado)
- [ ] SSL ativo (`https://` sem aviso de certificado)
- [ ] `pm2 status` mostrando `online`
- [ ] Firewall UFW ativo (`sudo ufw status`)
- [ ] Login root via SSH desabilitado

---

## Estrutura do Projeto

```
clinicaos/
├── .env.example               # Variáveis de ambiente necessárias
├── ecosystem.config.js        # Configuração do PM2
├── DEPLOY.md                  # Guia completo de deploy (CI/CD, backup, segurança)
├── .github/
│   └── workflows/
│       └── deploy.yml         # CI/CD: deploy automático via GitHub Actions
├── backend/
│   ├── server.js              # Entry point
│   ├── db.js                  # Pool de conexão PostgreSQL
│   ├── seed.js                # Criação do usuário admin inicial
│   ├── package.json
│   ├── middleware/
│   │   ├── auth.js            # Verificação JWT
│   │   └── unit.js            # Middleware de unidade (multi-unidade)
│   ├── routes/
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── patients.js
│   │   ├── doctors.js
│   │   ├── appointments.js
│   │   ├── users.js
│   │   ├── reports.js
│   │   └── units.js
│   └── migrations/
│       ├── init.sql
│       ├── 002_add_users_and_audit.sql
│       └── 003_add_units.sql
└── frontend/
    ├── index.html             # Dashboard
    ├── login.html
    ├── patients.html
    ├── doctors.html
    ├── appointments.html
    ├── users.html
    ├── reports.html
    ├── units.html
    ├── css/
    │   └── style.css
    └── js/
        ├── main.js
        ├── users.js
        └── units.js
```

---

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `NODE_ENV` | `development` | Ambiente (`development` / `production`) |
| `PORT` | `3000` | Porta do servidor Node.js |
| `DB_HOST` | `localhost` | Host do PostgreSQL |
| `DB_PORT` | `5432` | Porta do PostgreSQL |
| `DB_NAME` | `clinic_saas` | Nome do banco de dados |
| `DB_USER` | `postgres` | Usuário do banco |
| `DB_PASSWORD` | — | Senha do banco (obrigatória) |
| `JWT_SECRET` | — | Segredo para assinar tokens JWT (obrigatório, mín. 64 bytes) |
| `CORS_ORIGIN` | `http://localhost:3000` | Domínio(s) permitidos pelo CORS (separados por vírgula) |

#Para deletar algo do banco:

sql -d clinic_saas -c "DELETE FROM units WHERE name = 'Centro2';"