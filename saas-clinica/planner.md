# Planner – Sistema de Gestão de Clínica (MVP)

## 1. Tecnologias Utilizadas

### 1.1 Frontend
- HTML5  
- CSS3  
- JavaScript (Vanilla)  
- FullCalendar (agenda visual com múltiplos recursos/médicos)  
- Font Awesome (ícones)  
- localStorage (armazenar preferência de tema claro/escuro)

### 1.2 Backend
- Node.js  
- Express 5 (API REST)  
- CORS (liberação de chamadas do frontend)

### 1.3 Banco de Dados
- PostgreSQL

### 1.4 Ferramentas de Desenvolvimento/Produção
- Nodemon (reload automático em desenvolvimento)  
- PM2 (gerenciar o processo em produção na VPS)

---

## 2. Módulo: Dashboard

**Objetivo:** Dar visão geral rápida da operação diária da clínica.

**Funcionalidades:**
- Exibir total de pacientes cadastrados.  
- Exibir quantidade de consultas do dia.  
- Listar consultas de hoje com:
  - Horário
  - Paciente
  - Médico
  - Status (agendado, concluído, cancelado)
- Consumir endpoints:
  - `GET /api/dashboard/stats`
  - `GET /api/appointments/today`

**Possíveis melhorias futuras:**
- Filtros por médico/especialidade.  
- Gráficos de produção por período.

---

## 3. Módulo: Pacientes

**Objetivo:** Gerenciar todo o cadastro de pacientes da clínica.

**Funcionalidades atuais:**
- Listagem de pacientes:
  - Campos: ID, Nome, CPF, E-mail, Telefone, Data de Nascimento.
  - Mensagem amigável quando não há pacientes cadastrados.
- Cadastro de novo paciente:
  - Campos:
    - CPF
    - Nome
    - E-mail
    - Telefone
    - Data de nascimento
    - Observações
  - Máscara de CPF no front.
  - Validação matemática do CPF (algoritmo Receita Federal).
  - Regras de obrigatoriedade:
    - CPF completo (11 dígitos)
    - Nome
    - Telefone
    - Data de nascimento
  - Bloqueio de CPF duplicado no backend.
- Edição de paciente:
  - Permite alterar CPF, nome, e-mail, telefone, data de nascimento e observações.
  - Valida se o novo CPF já não pertence a outro paciente.
- Exclusão de paciente:
  - Confirmação antes de excluir.
  - Aviso de que consultas vinculadas podem ser afetadas.
- Busca de paciente por CPF:
  - Endpoint para consulta por CPF (usado na tela de agendamento).
  - Normalização de CPF (remove pontos e traço para comparação).

**Endpoints principais:**
- `GET /api/patients`  
- `GET /api/patients/:id`  
- `GET /api/patients/cpf/:cpf`  
- `POST /api/patients`  
- `PUT /api/patients/:id`  
- `DELETE /api/patients/:id`

---

## 4. Módulo: Médicos

**Objetivo:** Controlar o cadastro de médicos e suas agendas de disponibilidade.

**Funcionalidades de cadastro:**
- Listagem de médicos:
  - Nome
  - Especialidade
  - E-mail
  - Telefone
  - Badge visual de status (Ativo/Inativo) baseado em campo `active`.
- Cadastro de novo médico:
  - Campos:
    - Nome
    - Especialidade
    - E-mail
    - Telefone
  - Validação: nome obrigatório.
- Edição de médico:
  - Atualização de nome, especialidade, e-mail, telefone.
- Exclusão de médico:
  - Confirmação com alerta de impacto em agenda e agendamentos vinculados.

**Funcionalidades de agenda (disponibilidades):**
- Abrir modal “Ver Agenda” de um médico.
- Cadastrar blocos de disponibilidade:
  - Campos:
    - `work_date` (data do plantão)
    - `start_time` (hora início)
    - `end_time` (hora fim)
- Listar disponibilidades abertas:
  - Ordenadas por data e horário.
- Excluir disponibilidade específica:
  - Com confirmação prévia.

**Endpoints principais (CRUD Médico):**
- `GET /api/doctors`  
- `GET /api/doctors/:id`  
- `POST /api/doctors`  
- `PUT /api/doctors/:id`  
- `DELETE /api/doctors/:id`

**Endpoints de agenda de médico:**
- `GET /api/doctors/:id/availabilities`  
- `POST /api/doctors/:id/availabilities`  
- `DELETE /api/doctors/:id/availabilities/:avail_id`

---

## 5. Módulo: Agendamentos (Consultas)

**Objetivo:** Controlar marcação, visualização, status e reagendamento das consultas.

### 5.1 Listagem e visualização

- Visualização em lista:
  - Data e hora formatadas (pt-BR).
  - Paciente (nome + CPF).
  - Médico.
  - Status com seletor:
    - agendado
    - concluído
    - cancelado
  - Ações:
    - Editar
    - Excluir
  - Mensagem amigável quando não há agendamentos.

- Visualização em calendário (FullCalendar):
  - Modos:
    - `resourceTimeGridDay` (por médico)
    - `timeGridWeek`
    - `dayGridMonth`
  - Recursos (resources) = médicos.
  - Slot de horário configurado (07:00–21:00, blocos de 15 min).
  - Evento mostra:
    - Nome do paciente
    - CPF mascarado
    - Status
    - Ícone se tiver observações
  - Clique no horário → abre modal de novo agendamento.
  - Clique em um evento → abre modal de detalhes/reagendamento.

### 5.2 Criação de agendamento

- Fluxo por CPF:
  - Campo CPF com máscara.
  - Validação matemática via `validateCpf`.
  - Busca automática:
    - Se paciente existir → preenche paciente e bloqueia CPF para edição.
    - Se não existir → exibe campos extras para cadastro rápido:
      - Nome
      - Telefone
      - Data de nascimento
- Criação de paciente “on-the-fly” se CPF ainda não cadastrado.
- Seleção obrigatória de:
  - Médico (`doctor_id`)
  - Data/hora (`appointment_date`)
- Campo opcional:
  - Observações (`notes`)
- Validação de disponibilidade do médico:
  - Backend consulta tabela `doctor_availabilities`:
    - Mesmo médico
    - Mesma data (`work_date`)
    - Horário dentro do intervalo `start_time` e `end_time`
  - Se não houver disponibilidade:
    - Retorna erro: médico não possui agenda aberta para aquela data/hora.
- Salva agendamento com:
  - `status = 'agendado'` por padrão.

### 5.3 Edição / Reagendamento

- Abrir modal de edição:
  - Carrega dados atuais do agendamento.
  - Campos:
    - Médico (alterável)
    - Data/hora (alterável)
    - Observações (alterável)
    - Paciente exibido em modo somente leitura.
  - Botão:
    - “Salvar Alterações” → chama endpoint de reagendamento.
    - “Excluir” → remove o agendamento.

- Backend:
  - Rota de reagendamento atualiza:
    - `appointment_date`
    - `doctor_id`
    - `notes` (mantém se não enviado)

### 5.4 Status e exclusão

- Atualização de status:
  - Seletor na lista que dispara chamada para:
    - `PUT /api/appointments/:id/status`
  - Valores possíveis:
    - agendado
    - concluido
    - cancelado

- Exclusão de agendamento:
  - Confirmação de remoção.
  - Chamada para:
    - `DELETE /api/appointments/:id`
  - Atualiza lista e calendário após exclusão.

### 5.5 Endpoints principais

- `GET /api/appointments`  
- `GET /api/appointments/today`  
- `POST /api/appointments`  
- `PUT /api/appointments/:id/status`  
- `PUT /api/appointments/:id/reschedule`  
- `DELETE /api/appointments/:id`

---

## 6. Experiência de Uso / Interface

**Objetivo:** Garantir usabilidade simples e moderna para recepção/secretaria.

**Itens implementados:**
- Modais reutilizáveis para:
  - Pacientes
  - Médicos
  - Agenda de médico
  - Agendamentos (novo e edição)
- Máscara de CPF consistente em:
  - Tela de pacientes
  - Tela de agendamentos
- Mensagens de feedback:
  - Alerts para erros de validação (CPF inválido, campos obrigatórios).
  - Mensagens amigáveis quando não há dados em tabelas.
- Tema claro/escuro:
  - Botão de alternância de tema.
  - Uso de `localStorage` para lembrar tema escolhido.
  - Atualização de ícone (lua/sol) de acordo com o tema.

---

## 7. Ideias de Próximos Passos (Backlog Futuro)
 
- Bloquear marcação em horários já ocupados (além de horário de disponibilidade).  
- Relatórios:
  - Consultas por médico/período.
  - Faltas/cancelamentos.  
- Controle de usuários e permissões (admin, recepção, médico).
- Uma aba no modal de agendamento que mostra quem criou e quem alterou o horário (essencial já que a mudança manual exige mais cliques e responsabilidade).
- Sistema de login
- O sistema precisa ser alinhado para suportar multiplos usuarios
- Campo de convênio/plano de saúde no paciente.  


Funcionalidade	Status
Bloquear horários ocupados	Parcialmente implementado
Relatórios (médico/período, faltas)	Não implementado
Controle de usuários e permissões	Não implementado
Aba de auditoria no modal	Não implementado
Sistema de login	Não implementado
Suporte a múltiplos usuários	Não implementado

Você é um especialista em segurança de aplicações web. Quero que você faça uma auditoria de segurança detalhada.

Segurança:
Analise os seguintes vetores de ataque e me diga o status de cada um (vulnerável / parcialmente protegido / protegido) com explicação e recomendação de correção:

SQL Injection
XSS (Cross-Site Scripting)
CSRF (Cross-Site Request Forgery)
Autenticação e gerenciamento de sessão
Exposição de dados sensíveis (senhas, tokens, dados de pacientes)
Controle de acesso e autorização (ex: um usuário acessar dados de outra clínica)
Rate limiting e proteção contra brute force
Cabeçalhos HTTP de segurança
Dependências desatualizadas ou vulneráveis
Segurança do banco de dados SQLite em produção


Falta:

- Verificar sobre a agenda, se tem alguma alternativa sobre a visualização dela, parece um pouco poluída e não aparece o dia inteiro, na tela vai até 20h

- Colocar status de confirmado para as confirmações que o paciente disse que comparecerá
- Implementar o sistema de integração com whatsapp para enviar mensagens automaticamente para confirmar consultas e no sistema ter como editar essa mensagem

- Separar algumas funções entre recepção, administrador e etc
Médico não pode ver o relatorio da clínica, apenas o administador, ainda não sei se é bom deixar o recepcionista ver
Médico não podem conseguir ver e alterar nem cadastrar pacientes 
Recepção não pode conseguir ver o painel nem cadastrar médicos (verificar sobre ver médicos)

- Data no sistema está um pouco bugada quando crio o agendamento em alguns locais ficam invalid data, a logica parece funcional. (Verificar se ficou ok)

- Separar o sistema por unidade, cada usuario pertencerá a uma unidade, só o login de adm (o meu login de adm) poderá distribuir, acho que seria melhor criar um login de adm de unidade agora para separar bem, e no painel de criar novos usuario consigo criar esses novos adm de unidade, no painel desses adm de unidade eles poderão criar a base de funcionarios, recepção médicos e etc (multi-unidade.md)