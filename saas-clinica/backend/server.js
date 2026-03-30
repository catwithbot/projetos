const express = require('express');
const cors = require('cors');
const path = require('path');

const dashboardRoutes = require('./routes/dashboard');
const patientsRoutes = require('./routes/patients');
const doctorsRoutes = require('./routes/doctors');
const appointmentsRoutes = require('./routes/appointments');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir frontend estático
app.use(express.static(path.join(__dirname, '../frontend')));

// Rotas da API
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/appointments', appointmentsRoutes);

// Fallback para SPA
app.get('*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
