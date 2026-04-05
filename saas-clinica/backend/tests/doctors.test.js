const request = require('supertest');
const app     = require('../server');

const doctor = {
  id: 1, name: 'Dr. João Silva', specialty: 'Cardiologia',
  email: 'joao@clinica.com', phone: '21999990000',
  active: true, unit_id: 1,
};

describe('Doctors — GET /api/doctors', () => {
  test('lista médicos com token válido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [doctor] });

    const res = await request(app)
      .get('/api/doctors')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].specialty).toBe('Cardiologia');
  });

  test('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/doctors');
    expect(res.status).toBe(401);
  });

  test('usuário de unidade só vê médicos da sua unidade', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [doctor] });

    const res = await request(app)
      .get('/api/doctors')
      .set('Authorization', `Bearer ${userToken('recepcao', 1)}`);

    expect(res.status).toBe(200);
    // Verifica que a query usou filtro de unit_id
    expect(mockQuery.mock.calls[0][1]).toContain(1); // params inclui unitId=1
  });
});

describe('Doctors — POST /api/doctors', () => {
  test('cria médico com dados válidos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [doctor] });

    const res = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Dr. João Silva', specialty: 'Cardiologia', phone: '21999990000' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Dr. João Silva');
  });

  test('retorna 400 se nome não informado', async () => {
    const res = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ specialty: 'Cardiologia' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/obrigatório/i);
  });
});

describe('Doctors — PUT /api/doctors/:id', () => {
  test('atualiza médico existente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...doctor, specialty: 'Neurologia' }] });

    const res = await request(app)
      .put('/api/doctors/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Dr. João Silva', specialty: 'Neurologia' });

    expect(res.status).toBe(200);
    expect(res.body.specialty).toBe('Neurologia');
  });

  test('retorna 404 se médico não encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/doctors/999')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Ninguém' });

    expect(res.status).toBe(404);
  });
});

describe('Doctors — DELETE /api/doctors/:id', () => {
  test('remove médico existente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/doctors/1')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/sucesso/i);
  });

  test('retorna 404 se médico não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/doctors/999')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });
});
