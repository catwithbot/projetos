# ClinicaOS

Sistema de gestão e agendamento para clínicas. MVP com dashboard, cadastro de pacientes, médicos, disponibilidades e agendamentos com visualização em calendário.

---

## Tecnologias

- **Frontend:** HTML5, CSS3, JavaScript Vanilla, FullCalendar, Font Awesome
- **Backend:** Node.js, Express 5
- **Banco de dados:** PostgreSQL

---

## Rodando Localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/download/) v14+

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/clinicaos.git
cd clinicaos
```

### 2. Criar o banco de dados

Abra o pgAdmin ou o psql e execute:

```sql
CREATE DATABASE clinic_saas;
```

Em seguida rode o script de criação das tabelas:

```bash
psql -U postgres -d clinic_saas -f backend/migrations/init.sql
```

Ou abra o arquivo `backend/migrations/init.sql` no **Query Tool** do pgAdmin com o banco `clinic_saas` selecionado e execute com `F5`.

### 3. Configurar as credenciais do banco

Edite o arquivo `backend/db.js` com os dados do seu PostgreSQL local:

```js
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'clinic_saas',
  user: 'postgres',
  password: 'sua_senha',
});
```

### 4. Instalar dependências e iniciar

```bash
cd backend
npm install
npm run dev
```

O servidor sobe em `http://localhost:3000`.
Abra esse endereço no navegador para acessar o sistema.

---

## Deploy em VPS (Ubuntu/Debian)

### 1. Acessar a VPS

```bash
ssh usuario@ip-da-sua-vps
```

### 2. Instalar dependências do sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm postgresql postgresql-contrib git
```

Verifique as versões:

```bash
node -v   # precisa ser v18+
psql --version
```

> Se o Node.js estiver desatualizado, instale via [NodeSource](https://github.com/nodesource/distributions):
> ```bash
> curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
> sudo apt install -y nodejs
> ```

### 3. Configurar o PostgreSQL

```bash
sudo -u postgres psql
```

Dentro do psql:

```sql
CREATE DATABASE clinic_saas;
CREATE USER clinica_user WITH PASSWORD 'senha_forte_aqui';
GRANT ALL PRIVILEGES ON DATABASE clinic_saas TO clinica_user;
\q
```

### 4. Clonar o projeto na VPS

```bash
cd /home/usuario
git clone https://github.com/seu-usuario/clinicaos.git
cd clinicaos
```

### 5. Rodar a migration

```bash
psql -U clinica_user -d clinic_saas -f backend/migrations/init.sql
```

### 6. Configurar variáveis de ambiente

Crie o arquivo `.env` dentro da pasta `backend/`:

```bash
nano backend/.env
```

Conteúdo:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clinic_saas
DB_USER=clinica_user
DB_PASSWORD=senha_forte_aqui
PORT=3000
```

Atualize o `backend/db.js` para ler as variáveis de ambiente (já está configurado para isso por padrão).

### 7. Instalar dependências

```bash
cd backend
npm install --omit=dev
```

### 8. Instalar e configurar o PM2

```bash
sudo npm install -g pm2
pm2 start server.js --name clinicaos
pm2 startup     # gera o comando para iniciar automaticamente no boot
pm2 save
```

Comandos úteis do PM2:

```bash
pm2 status          # ver status dos processos
pm2 logs clinicaos  # ver logs em tempo real
pm2 restart clinicaos
pm2 stop clinicaos
```

### 9. Configurar o Nginx como proxy reverso

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/clinicaos
```

Conteúdo do arquivo:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;  # ou o IP da VPS

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar e reiniciar o Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/clinicaos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 10. (Opcional) HTTPS com Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

O Certbot configura o HTTPS automaticamente e renova o certificado.

---

## Estrutura do Projeto

```
clinicaos/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   ├── routes/
│   │   ├── dashboard.js
│   │   ├── patients.js
│   │   ├── doctors.js
│   │   └── appointments.js
│   └── migrations/
│       └── init.sql
└── frontend/
    ├── index.html
    ├── patients.html
    ├── doctors.html
    ├── appointments.html
    ├── css/
    │   └── style.css
    └── js/
        ├── main.js
        ├── dashboard.js
        ├── patients.js
        ├── doctors.js
        └── appointments.js
```

---

## Variáveis de Ambiente

| Variável      | Padrão      | Descrição                  |
|---------------|-------------|----------------------------|
| `DB_HOST`     | `localhost` | Host do PostgreSQL         |
| `DB_PORT`     | `5432`      | Porta do PostgreSQL        |
| `DB_NAME`     | `clinic_saas` | Nome do banco            |
| `DB_USER`     | `postgres`  | Usuário do banco           |
| `DB_PASSWORD` | `postgres`  | Senha do banco             |
| `PORT`        | `3000`      | Porta do servidor Node.js  |
