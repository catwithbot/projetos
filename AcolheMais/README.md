# AcolheMais — Saúde mental acessível para todos

> Plataforma que conecta pessoas de baixa renda a estagiários supervisionados e psicólogos com vagas a preço social, via WhatsApp, sem burocracia.

---

## O Problema

No Brasil, **mais de 30 mil estagiários de psicologia** se formam por ano, mas enfrentam dificuldade em encontrar pacientes para cumprir as horas obrigatórias de estágio supervisionado. Ao mesmo tempo, milhões de brasileiros precisam de apoio psicológico e não têm acesso — seja por custo, por falta de informação ou por barreiras burocráticas.

---

## A Solução

O **AcolheMais** é uma plataforma que resolve os dois lados do problema:

- **Para quem precisa de atendimento:** triagem gratuita e encaminhamento para um profissional compatível, com agendamento direto pelo WhatsApp.
- **Para estagiários e psicólogos:** dashboard completo para gerenciar pacientes, agenda e sessões — com supervisão integrada.
- **Para supervisores:** painel de acompanhamento de estagiários, revisão de sessões e alertas em tempo real.

---

## Páginas do Protótipo

| Página | Arquivo | Descrição |
|---|---|---|
| Landing Page | `index.html` | Apresentação do produto, proposta de valor e CTA |
| Triagem | `triagem.html` | Fluxo de triagem em etapas para o paciente |
| Dashboard Profissional | `dashboard-pro.html` | Painel do psicólogo/estagiário |
| Painel de Supervisão | `dashboard-sup.html` | Painel do supervisor com revisão de sessões |

---

## Como Apresentar

### 1. Landing Page (`index.html`)
Abra o arquivo e mostre:
- O **hero** com a proposta de valor: *"Você merece apoio psicológico. Independente da renda."*
- Os **três diferenciais** da plataforma: gratuito para o paciente, via WhatsApp, e com estagiários supervisionados
- A seção **Como funciona** para demonstrar o fluxo completo
- A seção **Para profissionais** mostrando o valor para os dois lados do mercado

### 2. Triagem (`triagem.html`)
Simule o fluxo de um paciente:
- Preencha o formulário de triagem em etapas (progress bar)
- Mostre o **encaminhamento ao final**, com o profissional sugerido e o botão de contato via WhatsApp

### 3. Dashboard Profissional (`dashboard-pro.html`)
Mostre a visão do psicólogo/estagiário:
- Agenda do dia com próximas sessões
- Lista de pacientes e status
- Notificações e mensagens via WhatsApp integrado

### 4. Painel de Supervisão (`dashboard-sup.html`)
Mostre a visão do supervisor:
- Lista de estagiários sob supervisão
- Sessões pendentes de revisão
- Alertas de casos que precisam de atenção

---

## Diferenciais Competitivos

- **R$0 para o paciente** — modelo de acesso universal
- **WhatsApp-first** — sem app para baixar, zero fricção
- **Supervisão integrada** — estagiários atuam com segurança e conformidade legal
- **Triagem inteligente** — matching entre paciente e profissional por perfil e disponibilidade
- **Impacto social duplo** — resolve o problema do paciente e do estagiário ao mesmo tempo

---

## Modelo de Negócio (hipótese)

| Fonte | Descrição |
|---|---|
| Empresas / RH | Planos corporativos de saúde mental para funcionários |
| Psicólogos formados | Assinatura para acesso à fila de pacientes a preço social |
| Faculdades de psicologia | Licença institucional para gestão de estágio supervisionado |

---

## Stack do Protótipo

- HTML5 + CSS3 (variáveis CSS, responsivo)
- JavaScript puro (sem framework)
- Font Awesome 6 (ícones)
- Design system próprio com tokens de cor e tipografia

---

## Como Rodar Localmente

Basta abrir qualquer arquivo `.html` diretamente no navegador — não há dependências de servidor ou build.

```bash
# Opção 1: abrir diretamente
open index.html

# Opção 2: servidor local simples
python3 -m http.server 8080
# Acesse: http://localhost:8080
```

---

*Protótipo desenvolvido para competição de startup — AcolheMais, 2026.*
