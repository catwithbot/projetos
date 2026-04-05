const request = require('supertest');
const app     = require('../server');

const unit = {
  id: 1, name: 'Unidade Principal', address: 'Rua A, 100',
  phone: '2133334444', active: true, user_count: '0',
};

describe('Units — acesso restrito a admin', () => {
  test('retorna 403 para usuário não-admin', async () => {
    const res = await request(app)
      .get('/api/units')
      .set('Authorization', `Bearer ${userToken('recepcao', 1)}`);

    expect(res.status).toBe(403);
  });

  test('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/units');
    expect(res.status).toBe(401);
  });
});

describe('Units — GET /api/units', () => {
  test('lista unidades para admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [unit] });

    const res = await request(app)
      .get('/api/units')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe('Unidade Principal');
  });
});

describe('Units — POST /api/units', () => {
  test('cria unidade com nome válido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [unit] });

    const res = await request(app)
      .post('/api/units')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Unidade Principal', address: 'Rua A, 100', phone: '2133334444' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Unidade Principal');
  });

  test('retorna 400 se nome não informado', async () => {
    const res = await request(app)
      .post('/api/units')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ address: 'Rua A' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/obrigatório/i);
  });
});

describe('Units — PUT /api/units/:id', () => {
  test('atualiza unidade existente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...unit, name: 'Unidade Editada' }] });

    const res = await request(app)
      .put('/api/units/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Unidade Editada', active: true });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Unidade Editada');
  });

  test('retorna 404 se unidade não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/units/999')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Nenhuma' });

    expect(res.status).toBe(404);
  });
});

describe('Units — DELETE /api/units/:id (desativar)', () => {
  test('desativa unidade sem usuários ativos', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })          // verifica usuários ativos
      .mockResolvedValueOnce({ rows: [{ ...unit, active: false }] }); // UPDATE

    const res = await request(app)
      .delete('/api/units/1')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/desativada/i);
  });

  test('retorna 409 se houver usuários ativos vinculados', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] }); // 3 usuários ativos

    const res = await request(app)
      .delete('/api/units/1')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/usuários ativos/i);
  });
});
