const request = require('supertest');
const app     = require('../server');

describe('Auth — POST /api/auth/login', () => {
  const validUser = {
    id: 1, name: 'Admin', email: 'admin@clinica.com',
    role: 'admin', unit_id: null, unit_name: null,
    active: true, password_hash: 'hashed_password',
  };

  test('login com credenciais válidas retorna token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [validUser] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@clinica.com', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('admin@clinica.com');
    expect(res.body.user.role).toBe('admin');
  });

  test('login sem email ou senha retorna 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@clinica.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/obrigatórios/i);
  });

  test('login com usuário não encontrado retorna 401', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'naoexiste@clinica.com', password: '123456' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/inválidas/i);
  });

  test('login com senha errada retorna 401', async () => {
    const bcrypt = require('bcryptjs');
    bcrypt.compare.mockResolvedValueOnce(false);
    mockQuery.mockResolvedValueOnce({ rows: [validUser] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@clinica.com', password: 'senha_errada' });

    expect(res.status).toBe(401);
  });
});

describe('Auth — GET /api/auth/me', () => {
  test('retorna dados do usuário com token válido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });

  test('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('retorna 401 com token inválido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token_invalido');
    expect(res.status).toBe(401);
  });
});
