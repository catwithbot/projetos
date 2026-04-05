const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// ── Validação de variáveis de ambiente obrigatórias ──────────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'DB_PASSWORD'];
if (process.env.NODE_ENV === 'production') {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[FATAL] Variáveis de ambiente ausentes: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const authRoutes         = require('./routes/auth');
const unitsRoutes        = require('./routes/units');
const usersRoutes        = require('./routes/users');
const dashboardRoutes    = require('./routes/dashboard');
const patientsRoutes     = require('./routes/patients');
const doctorsRoutes      = require('./routes/doctors');
const appointmentsRoutes = require('./routes/appointments');
const reportsRoutes      = require('./routes/reports');
const { authMiddleware } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Segurança: headers HTTP ──────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
        styleSrc:   ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com', 'fonts.googleapis.com'],
        fontSrc:    ["'self'", 'fonts.gstatic.com', 'cdnjs.cloudflare.com'],
        imgSrc:     ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

// ── CORS restrito ao domínio configurado ─────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (ex: curl, Postman em dev)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Origem não permitida pelo CORS'));
    },
    credentials: true,
  })
);

// ── Rate limiting global ─────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
  })
);

// ── Rate limiting estrito para login (anti brute-force) ──────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

app.use(express.json({ limit: '10kb' }));

// ── Frontend estático ────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Autenticação (pública, com rate limit extra) ─────────────────────────────
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth',  authRoutes);
app.use('/api/units', unitsRoutes); // auth + requireRole('admin') internamente

// ── Rotas protegidas por JWT ─────────────────────────────────────────────────
// dashboard: auth no server (router não tem uso interno)
app.use('/api/dashboard',    authMiddleware, dashboardRoutes);
// patients, doctors, appointments, users, reports: auth aplicado internamente via router.use
app.use('/api/patients',     patientsRoutes);
app.use('/api/doctors',      doctorsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/users',        usersRoutes);
app.use('/api/reports',      reportsRoutes);

// ── Fallback para SPA ────────────────────────────────────────────────────────
app.get('*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
