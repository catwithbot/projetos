const request = require('supertest');
const app     = require('../server');

const appointment = {
  id: 1,
  patient_id: 1, patient_name: 'Fernando Andrade', patient_cpf: '17546592763',
  doctor_id: 1,  doctor_name: 'Dr. João Silva',    doctor_specialty: 'Cardiologia',
  appointment_date: '2026-04-10T10:00:00.000Z',
  status: 'agendado', notes: null, unit_id: 1,
  created_by_name: 'Admin', updated_by_name: 'Admin',
};

describe('Appointments — GET /api/appointments', () => {
  test('lista agendamentos com token válido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [appointment] });

    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].patient_name).toBe('Fernando Andrade');
  });

  test('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/appointments');
    expect(res.status).toBe(401);
  });
});

describe('Appointments — POST /api/appointments', () => {
  const payload = {
    cpf: '175.465.927-63',
    doctor_id: 1,
    appointment_date: '2026-04-10T10:00:00.000Z',
  };

  test('cria agendamento com médico disponível', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })           // disponibilidade OK
      .mockResolvedValueOnce({ rows: [] })                     // sem conflito
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })           // paciente encontrado por CPF
      .mockResolvedValueOnce({ rows: [appointment] });         // INSERT

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(payload);

    expect(res.status).toBe(201);
  });

  test('retorna 400 sem CPF, médico ou data', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ cpf: '175.465.927-63' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/obrigatórios/i);
  });

  test('retorna 400 se médico sem agenda disponível', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // sem disponibilidade

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/agenda disponível/i);
  });

  test('retorna 409 se conflito de horário', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 5 }] })  // disponibilidade OK
      .mockResolvedValueOnce({ rows: [{ id: 9 }] }); // conflito encontrado

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(payload);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/horário/i);
  });
});

describe('Appointments — PUT /api/appointments/:id/status', () => {
  test('atualiza status para concluido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...appointment, status: 'concluido' }] });

    const res = await request(app)
      .put('/api/appointments/1/status')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'concluido' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('concluido');
  });

  test('retorna 400 para status inválido', async () => {
    const res = await request(app)
      .put('/api/appointments/1/status')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'invalido' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inválido/i);
  });
});

describe('Appointments — DELETE /api/appointments/:id', () => {
  test('remove agendamento existente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/appointments/1')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/sucesso/i);
  });

  test('retorna 404 se agendamento não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/appointments/999')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });
});
