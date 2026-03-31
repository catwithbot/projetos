const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes         = require('./routes/auth');
const usersRoutes        = require('./routes/users');
const dashboardRoutes    = require('./routes/dashboard');
const patientsRoutes     = require('./routes/patients');
const doctorsRoutes      = require('./routes/doctors');
const appointmentsRoutes = require('./routes/appointments');
const reportsRoutes      = require('./routes/reports');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir frontend estático
app.use(express.static(path.join(__dirname, '../frontend')));

// Autenticação (pública)
app.use('/api/auth', authRoutes);

// Rotas protegidas por JWT
app.use('/api/dashboard',    authMiddleware, dashboardRoutes);
app.use('/api/patients',     authMiddleware, patientsRoutes);
app.use('/api/doctors',      authMiddleware, doctorsRoutes);
app.use('/api/appointments', appointmentsRoutes);  // auth aplicado internamente
app.use('/api/users',        usersRoutes);          // auth + role admin internamente
app.use('/api/reports',      reportsRoutes);        // auth aplicado internamente

// Fallback para SPA
app.get('*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
