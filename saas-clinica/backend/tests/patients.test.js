const request = require('supertest');
const app     = require('../server');

const patient = {
  id: 1, name: 'Fernando Andrade', cpf: '52998224725',
  email: 'nando@gmail.com', phone: '21999999999',
  birth_date: '1998-09-27T00:00:00.000Z',
  observations: null, unit_id: 1,
};

describe('Patients — GET /api/patients', () => {
  test('lista pacientes com token válido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [patient] });

    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe('Fernando Andrade');
  });

  test('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });
});

describe('Patients — POST /api/patients', () => {
  const newPatient = {
    cpf: '529.982.247-25', name: 'Fernando Andrade',
    email: 'nando@gmail.com', phone: '21999999999',
    birth_date: '1998-09-27', observations: '',
  };

  test('cria paciente com dados válidos', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })       // verifica CPF duplicado
      .mockResolvedValueOnce({ rows: [patient] }); // INSERT

    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(newPatient);

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Fernando Andrade');
  });

  test('retorna 400 se faltar campos obrigatórios', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ cpf: '529.982.247-25' }); // sem name, phone, birth_date

    expect(res.status).toBe(400);
  });

  test('retorna 409 se CPF já cadastrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 99 }] }); // CPF duplicado

    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(newPatient);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/CPF já cadastrado/i);
  });
});

describe('Patients — PUT /api/patients/:id', () => {
  test('atualiza paciente existente', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })              // verifica CPF duplicado em outro id
      .mockResolvedValueOnce({ rows: [{ ...patient, name: 'Fernando Editado' }] }); // UPDATE

    const res = await request(app)
      .put('/api/patients/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        cpf: '529.982.247-25', name: 'Fernando Editado',
        phone: '21999999999', birth_date: '1998-09-27',
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Fernando Editado');
  });

  test('retorna 404 se paciente não encontrado', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // sem duplicata
      .mockResolvedValueOnce({ rows: [] }); // UPDATE retorna vazio

    const res = await request(app)
      .put('/api/patients/999')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        cpf: '529.982.247-25', name: 'Ninguém',
        phone: '21999999999', birth_date: '1998-09-27',
      });

    expect(res.status).toBe(404);
  });
});

describe('Patients — DELETE /api/patients/:id', () => {
  test('remove paciente existente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/patients/1')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/sucesso/i);
  });

  test('retorna 404 se paciente não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/patients/999')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });
});
