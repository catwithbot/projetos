/**
 * setup.js — Mocks globais para todos os testes
 *
 * Substitui o pool do PostgreSQL e o JWT por mocks controlados,
 * evitando a necessidade de banco real nos testes unitários.
 */

process.env.NODE_ENV  = 'test';
process.env.JWT_SECRET = 'test_secret_123';
process.env.DB_PASSWORD = 'test';

// ── Mock do pool pg ───────────────────────────────────────────────────────────
const mockQuery = jest.fn();
const mockPool  = { query: mockQuery };

jest.mock('../db', () => mockPool);

// ── Mock do bcryptjs ──────────────────────────────────────────────────────────
jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Exporta helpers reutilizáveis nos testes
global.mockQuery = mockQuery;

// Token JWT válido para admin (super) — gerado com JWT_SECRET = 'test_secret_123'
const jwt = require('jsonwebtoken');
global.adminToken = () =>
  jwt.sign({ id: 1, role: 'admin', unit_id: null }, process.env.JWT_SECRET);

global.userToken = (role = 'recepcao', unit_id = 1) =>
  jwt.sign({ id: 2, role, unit_id }, process.env.JWT_SECRET);

beforeEach(() => {
  mockQuery.mockReset();
});
