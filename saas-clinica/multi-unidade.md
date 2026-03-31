# Implementação – Multi-Unidade

## Objetivo

Separar o sistema por unidade (clínica/filial). Cada usuário pertence a uma unidade e só enxerga dados dela. O Super Admin (você) gerencia as unidades e distribui os Admins de Unidade, que por sua vez criam os funcionários de cada unidade.

Quero que me explique como criar um database novo para cada unidade quando precisar, ou se puder deixar o arquivo já pronto no migration igual aos outros quando for necessaario criar um banco só mudo algumas informações para não duplicar os bancos. Só uma pergunta, nesse caso seria necessario refazer essas configurações iniciais de instalação do banco, certo?

Pode refazer tudo, não precisa salvar nenhuma informação do banco de dados no momento

---

## Hierarquia de Papéis

```
Super Admin  (role: admin)
└── cria e gerencia Unidades
└── cria Admins de Unidade
└── enxerga dados de todas as unidades

Admin de Unidade  (role: unit_admin)
└── cria usuários da sua unidade (recepcao, medico)
└── enxerga apenas dados da própria unidade

Recepcionista  (role: recepcao)
└── gerencia agendamentos, pacientes, relatórios
└── apenas da própria unidade

Médico  (role: medico)
└── visualiza agendamentos e relatórios
└── apenas da própria unidade
```

| Role        | Cria unidades | Cria usuários              | Enxerga dados     |
|-------------|:-------------:|----------------------------|-------------------|
| `admin`     | Sim           | Qualquer role              | Todas as unidades |
| `unit_admin`| Não           | `recepcao`, `medico`       | Só sua unidade    |
| `recepcao`  | Não           | Não                        | Só sua unidade    |
| `medico`    | Não           | Não                        | Só sua unidade    |

---

## Etapa 1 – Banco de Dados (Migration)

### Nova tabela `units`

```sql
CREATE TABLE units (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  address    VARCHAR(255),
  phone      VARCHAR(20),
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Coluna `unit_id` nas tabelas existentes

```sql
-- Unidade padrão para não quebrar dados existentes
INSERT INTO units (name) VALUES ('Unidade Principal');

ALTER TABLE users        ADD COLUMN unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE patients     ADD COLUMN unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE doctors      ADD COLUMN unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL;

-- Migra dados existentes para a unidade padrão
UPDATE users        SET unit_id = 1 WHERE role != 'admin';
UPDATE patients     SET unit_id = 1;
UPDATE doctors      SET unit_id = 1;
UPDATE appointments SET unit_id = 1;
```

### Nova role no CHECK

```sql
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'unit_admin', 'recepcao', 'medico'));
```

---

## Etapa 2 – Backend

### 2.1 Middleware de unidade (`middleware/unit.js`)

Extrai `unit_id` do usuário logado e injeta em `req.unitId`.
Super admin (`admin`) recebe `null` — acesso irrestrito.

```js
function unitScope(req, res, next) {
  req.unitId = req.user.role === 'admin' ? null : req.user.unit_id;
  next();
}
```

### 2.2 Filtro nos SELECTs

Todos os endpoints de `patients`, `doctors`, `appointments` e `reports` passam a incluir:

```sql
-- Se unitId !== null
WHERE unit_id = $unitId

-- Se unitId === null (super admin) — sem filtro
```

### 2.3 Rota de Unidades (`/api/units`) — só `admin`

| Método | Rota            | Ação                        |
|--------|-----------------|-----------------------------|
| GET    | `/api/units`    | Lista todas as unidades     |
| POST   | `/api/units`    | Cria nova unidade           |
| PUT    | `/api/units/:id`| Edita unidade               |
| DELETE | `/api/units/:id`| Desativa/remove unidade     |

### 2.4 Rota de Usuários — ajustes

- `admin`: pode criar qualquer role, em qualquer unidade
- `unit_admin`: pode criar apenas `recepcao` e `medico`, com `unit_id` forçado ao seu
- Listagem filtra por `unit_id` para `unit_admin`

---

## Etapa 3 – Frontend

### 3.1 Página de Unidades (`units.html`) — só `admin`

- Tabela: Nome, Endereço, Telefone, Status, Ações
- Modal criar/editar unidade
- Link no sidebar visível apenas para `admin`

### 3.2 Painel de Usuários — ajustes

- Visível também para `unit_admin` (além de `admin`)
- `unit_admin` não vê o campo "Unidade" no formulário (fixado automaticamente)
- `unit_admin` não pode criar `admin` ou `unit_admin`
- Listagem já filtrada pelo backend

### 3.3 Sidebar

- Exibe o nome da unidade do usuário abaixo do nome/role
- Super admin vê "(Super Admin)" em vez de nome de unidade
- Link "Unidades" visível apenas para `admin`
- Link "Usuários" visível para `admin` e `unit_admin`

### 3.4 Demais páginas

Sem mudança visual — o filtro é transparente via backend.

---

## Ordem de Implementação Sugerida

1. [ ] Migration `003_add_units.sql`
2. [ ] Seed: unidade padrão + migrar dados existentes
3. [ ] `middleware/unit.js`
4. [ ] Rota `/api/units`
5. [ ] Atualizar `/api/users` (permissões por role)
6. [ ] Filtrar `/api/patients`, `/api/doctors`, `/api/appointments`, `/api/reports`
7. [ ] Frontend: `units.html` + `js/units.js`
8. [ ] Frontend: ajustes em `users.html` e sidebar

---

## Observações

- O `admin` (super admin) **não precisa** ter `unit_id` — pode ser `NULL`
- Pacientes são vinculados à unidade onde foram cadastrados; se forem para outra unidade, precisam de novo cadastro (ou futuramente: transferência)
- O campo `unit_id` nos agendamentos é redundante com o médico/paciente, mas facilita queries de relatório por unidade
