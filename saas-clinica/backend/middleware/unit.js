/**
 * unit.js — Middleware de escopo por unidade
 *
 * Injeta req.unitId:
 *   - null  → admin (super), acesso irrestrito a todas as unidades
 *   - N     → qualquer outra role, acesso limitado à sua unidade
 */

function unitScope(req, res, next) {
  req.unitId = req.user.role === 'admin' ? null : (req.user.unit_id || null);
  next();
}

/**
 * Monta cláusula WHERE e array de parâmetros para filtrar por unidade.
 *
 * @param {number|null} unitId  - req.unitId (null = sem filtro)
 * @param {string}      alias   - alias da tabela (ex: 'p', 'a'). Vazio = sem prefixo.
 * @param {number}      startAt - índice inicial do $N (default 1)
 * @returns {{ clause: string, params: any[], nextIdx: number }}
 *
 * Exemplo:
 *   const { clause, params, nextIdx } = unitFilter(req.unitId, 'p');
 *   pool.query(`SELECT * FROM patients p ${clause} ORDER BY name`, params)
 */
function unitFilter(unitId, alias = '', startAt = 1) {
  const col = alias ? `${alias}.unit_id` : 'unit_id';
  if (unitId === null) {
    return { clause: '', params: [], nextIdx: startAt };
  }
  return {
    clause: `WHERE ${col} = $${startAt}`,
    params: [unitId],
    nextIdx: startAt + 1,
  };
}

/**
 * Versão para quando já existe uma cláusula WHERE.
 * Adiciona AND unit_id = $N ao invés de WHERE.
 */
function unitAnd(unitId, alias = '', startAt = 1) {
  const col = alias ? `${alias}.unit_id` : 'unit_id';
  if (unitId === null) {
    return { clause: '', params: [], nextIdx: startAt };
  }
  return {
    clause: `AND ${col} = $${startAt}`,
    params: [unitId],
    nextIdx: startAt + 1,
  };
}

module.exports = { unitScope, unitFilter, unitAnd };
