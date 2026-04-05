# Guia de Deploy — Clinic SaaS (VPS Ubuntu 22.04)

> Substitua `SEU_DOMINIO.COM.BR`, `SEU_IP_DA_VPS` e `deploy` pelo seu domínio, IP e usuário real.

---

## PARTE 1 — Auditoria de Segurança (resumo das correções aplicadas)

| # | Falha | Risco | Arquivo | Status |
|---|-------|-------|---------|--------|
| 1 | URL `http://localhost:3000/api` hardcoded no frontend | CRÍTICO | `frontend/js/main.js:5` | ✅ Corrigido → `/api` |
| 2 | `JWT_SECRET` e `DB_PASSWORD` com fallback público no código | CRÍTICO | `middleware/auth.js`, `db.js` | ✅ Corrigido → process.exit(1) sem env |
| 3 | CORS aberto (`app.use(cors())`) sem restrição de origem | ALTO | `server.js` | ✅ Corrigido → lista de origens via `CORS_ORIGIN` |
| 4 | Sem headers de segurança HTTP | ALTO | `server.js` | ✅ Corrigido → `helmet` instalado |
| 5 | Sem rate limiting em `/api/auth/login` (brute force) | ALTO | `server.js` | ✅ Corrigido → 10 req/15min |
| 6 | Rotas `patients` e `doctors` sem `authMiddleware` | CRÍTICO | `routes/patients.js`, `routes/doctors.js` | ✅ Corrigido → `router.use(authMiddleware)` |
| 7 | `node_modules/` sem `.gitignore` | MÉDIO | raiz | ✅ Corrigido → `.gitignore` criado |
| 8 | Sem `.env.example` documentando variáveis necessárias | BAIXO | raiz | ✅ Criado |
| 9 | Body sem limite de tamanho (DoS via payload gigante) | MÉDIO | `server.js` | ✅ Corrigido → `express.json({ limit: '10kb' })` |

### Falhas não aplicadas automaticamente (exigem decisão de negócio)

| # | Falha | Risco | Recomendação |
|---|-------|-------|--------------|
| 10 | JWT sem refresh token (token de 8h sem renovação silenciosa) | MÉDIO | Implementar refresh token endpoint |
| 11 | Senha padrão `admin123` no `seed.js` | ALTO | Trocar imediatamente após o 1º login |
| 12 | Logs com `console.error(err)` podem expor stack traces em prod | MÉDIO | Usar `winston` ou `pino` com nível de log por ambiente |
| 13 | DELETE de paciente/médico/agendamento sem soft delete | BAIXO | Adicionar coluna `deleted_at` em vez de `DELETE` |

---

## PARTE 2 — Deploy na VPS passo a passo

### Passo 1 — Configuração inicial da VPS

```bash
# Na sua máquina local: copie a chave SSH para a VPS
ssh-copy-id root@SEU_IP_DA_VPS

# Acesse a VPS
ssh root@SEU_IP_DA_VPS

# Crie usuário de deploy (nunca rode a aplicação como root)
adduser deploy
usermod -aG sudo deploy

# Copie a chave SSH para o usuário deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

# Desabilite login por senha e root via SSH
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# Firewall UFW
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw enable
ufw status
```

### Passo 2 — Instalar Node.js, PostgreSQL e Nginx

```bash
# Acesse como deploy
ssh deploy@SEU_IP_DA_VPS

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
node -v && npm -v

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# PM2 globalmente
sudo npm install -g pm2
```

### Passo 3 — Configurar PostgreSQL

```bash
sudo -i -u postgres psql <<'SQL'
CREATE USER clinic_user WITH PASSWORD 'SENHA_FORTE_AQUI';
CREATE DATABASE clinic_saas OWNER clinic_user;
GRANT ALL PRIVILEGES ON DATABASE clinic_saas TO clinic_user;
SQL

# Aplicar migrations
cd /var/www/clinic-saas/backend
psql -U clinic_user -d clinic_saas -f migrations/init.sql
psql -U clinic_user -d clinic_saas -f migrations/002_add_users_and_audit.sql

# Criar usuário admin
node seed.js
# ⚠ Troque a senha admin123 imediatamente após o 1º login!
```

### Passo 4 — Clonar o projeto e configurar .env

```bash
sudo mkdir -p /var/www/clinic-saas
sudo chown deploy:deploy /var/www/clinic-saas

cd /var/www
git clone https://github.com/SEU_USUARIO/SEU_REPO.git clinic-saas
cd clinic-saas/backend
npm ci --omit=dev

# Criar .env com variáveis reais (NUNCA commitar este arquivo)
cat > /var/www/clinic-saas/backend/.env <<'EOF'
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clinic_saas
DB_USER=clinic_user
DB_PASSWORD=SENHA_FORTE_AQUI
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
CORS_ORIGIN=https://SEU_DOMINIO.COM.BR
EOF

chmod 600 /var/www/clinic-saas/backend/.env
```

> **Atenção:** gere o `JWT_SECRET` manualmente e cole o resultado no `.env`. Não use o subshell direto no heredoc em produção.

### Passo 5 — Configurar Nginx como reverse proxy

```bash
# Copie o arquivo de configuração
sudo cp /var/www/clinic-saas/deploy/nginx.conf /etc/nginx/sites-available/clinic-saas

# Edite substituindo SEU_DOMINIO.COM.BR
sudo nano /etc/nginx/sites-available/clinic-saas

# Ative o site
sudo ln -s /etc/nginx/sites-available/clinic-saas /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Teste e reinicie
sudo nginx -t && sudo systemctl reload nginx
```

### Passo 6 — Certificado SSL com Certbot (HTTPS gratuito)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Garanta que o domínio aponta para o IP da VPS antes de rodar
sudo certbot --nginx -d SEU_DOMINIO.COM.BR -d www.SEU_DOMINIO.COM.BR

# Teste renovação automática
sudo certbot renew --dry-run
```

O Certbot atualiza automaticamente o `nginx.conf` com os caminhos dos certificados.

### Passo 7 — Iniciar aplicação com PM2

```bash
cd /var/www/clinic-saas

# Criar diretório de logs
sudo mkdir -p /var/log/clinic-saas
sudo chown deploy:deploy /var/log/clinic-saas

# Carregar variáveis de ambiente e iniciar
cd backend && export $(cat .env | xargs) && cd ..
pm2 start ecosystem.config.js --env production

# Salvar para reiniciar após reboot
pm2 save
pm2 startup systemd -u deploy --hp /home/deploy
# Execute o comando que o PM2 exibir (começa com sudo)

# Verificar status
pm2 status
pm2 logs clinic-saas --lines 50
```

### Passo 8 — Backup automático do PostgreSQL

```bash
# Instalar script de backup
sudo mkdir -p /home/deploy/scripts
sudo cp /var/www/clinic-saas/deploy/backup-db.sh /home/deploy/scripts/
sudo chmod +x /home/deploy/scripts/backup-db.sh

# Criar diretório de backups
sudo mkdir -p /var/backups/clinic-saas
sudo chown deploy:deploy /var/backups/clinic-saas

# Configurar pg_passfile para evitar prompt de senha
echo "localhost:5432:clinic_saas:clinic_user:SENHA_FORTE_AQUI" > ~/.pgpass
chmod 600 ~/.pgpass

# Adicionar ao cron (backup diário às 02:00)
crontab -e
# Adicione a linha:
# 0 2 * * * /home/deploy/scripts/backup-db.sh >> /var/log/clinic-saas/backup.log 2>&1

# Testar manualmente
/home/deploy/scripts/backup-db.sh
ls -lh /var/backups/clinic-saas/
```

### Passo 9 — CI/CD com GitHub Actions

Configure os **Secrets** no repositório GitHub:
`Settings → Secrets and variables → Actions → New repository secret`

| Secret | Valor |
|--------|-------|
| `VPS_HOST` | IP ou domínio da VPS |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Conteúdo da chave privada SSH (`cat ~/.ssh/id_ed25519`) |
| `VPS_PORT` | `22` (opcional) |

O workflow em [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) faz deploy automático a cada push na branch `main`.

---

## Checklist final antes de ir ao ar

- [ ] `.env` criado na VPS com valores reais (não os do `.env.example`)
- [ ] Senha `admin123` trocada após primeiro login
- [ ] Domínio apontando para o IP da VPS (DNS propagado)
- [ ] SSL ativo (`https://` funcionando sem aviso)
- [ ] `pm2 status` mostrando `online`
- [ ] Backup manual testado com sucesso
- [ ] Secrets do GitHub Actions configurados
- [ ] Push para `main` → Actions executando e deploy automático confirmado
- [ ] Firewall UFW ativo (`sudo ufw status`)
- [ ] Login root via SSH desabilitado
