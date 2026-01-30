# 📡 API Reference - MIS Sentinel

## 📋 Visão Geral

A API do MIS Sentinel fornece endpoints RESTful para gerenciar tarefas, projetos, alertas e issues. Todas as APIs retornam JSON e seguem um padrão de resposta consistente.

## 🔐 Autenticação

A API usa autenticação via Supabase. Inclua o token de autenticação nos headers:

```http
Authorization: Bearer {supabase_access_token}
```

Para requisições públicas (com RLS configurado), use a anon key:

```http
apikey: {SUPABASE_ANON_KEY}
```

## 📦 Formato de Resposta Padrão

### Sucesso

```json
{
  "success": true,
  "data": { ... },
  "count": 10
}
```

### Erro

```json
{
  "success": false,
  "error": "Descrição do erro"
}
```

---

## 📝 Tasks API

### `GET /api/tasks`

Lista tarefas e projetos.

#### Query Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `action` | string | Não | Ação: `list_tasks`, `list_projects`, `project_summary`, `task_summaries` |
| `project_key` | string | Não | Filtrar por projeto |
| `status` | string | Não | Filtrar por status: `pending`, `in_progress`, `completed`, `blocked`, `cancelled`, `all` |

#### Exemplos

**Listar todas as tarefas:**
```bash
GET /api/tasks?action=list_tasks
```

**Listar tarefas de um projeto:**
```bash
GET /api/tasks?action=list_tasks&project_key=assembly-line
```

**Listar tarefas pendentes:**
```bash
GET /api/tasks?action=list_tasks&status=pending
```

**Listar projetos:**
```bash
GET /api/tasks?action=list_projects
```

**Resumo por projeto:**
```bash
GET /api/tasks?action=project_summary
```

#### Resposta - list_tasks

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "project_key": "assembly-line",
      "title": "Implementar feature X",
      "description": "Descrição detalhada da tarefa",
      "status": "pending",
      "priority": "high",
      "due_date": "2025-02-15T00:00:00.000Z",
      "estimated_hours": 4.5,
      "actual_hours": null,
      "assigned_to": "Marcos",
      "source": "manual",
      "position": 0,
      "created_at": "2025-01-29T10:00:00.000Z",
      "started_at": null,
      "completed_at": null,
      "time_to_start_minutes": null,
      "time_to_complete_minutes": null
    }
  ],
  "count": 1
}
```

#### Resposta - project_summary

```json
{
  "success": true,
  "data": [
    {
      "project_key": "assembly-line",
      "project_name": "Assembly Line SaaS",
      "pending": 5,
      "in_progress": 2,
      "completed": 10,
      "blocked": 1,
      "total": 18,
      "avg_completion_time_minutes": 120.5
    }
  ]
}
```

---

### `POST /api/tasks`

Criar ou atualizar tarefas.

#### Actions Disponíveis

| Action | Descrição |
|--------|-----------|
| `add_task` / `create` | Criar nova tarefa |
| `update_task` / `update` | Atualizar tarefa existente |
| `complete_task` | Marcar tarefa como concluída |
| `delete_task` / `delete` | Excluir tarefa |

---

### Criar Tarefa

```bash
POST /api/tasks
Content-Type: application/json

{
  "action": "add_task",
  "project_key": "assembly-line",
  "title": "Nova tarefa",
  "description": "Descrição opcional",
  "priority": "medium",
  "due_date": "2025-02-15",
  "estimated_hours": 3.0,
  "assigned_to": "Nome do responsável"
}
```

#### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `action` | string | ✅ | `add_task` ou `create` |
| `project_key` | string | ✅ | Chave do projeto |
| `title` | string | ✅ | Título da tarefa |
| `description` | string | ❌ | Descrição detalhada |
| `priority` | string | ❌ | `urgent`, `high`, `medium`, `low` (default: `medium`) |
| `due_date` | string | ❌ | Data limite (ISO 8601) |
| `estimated_hours` | number | ❌ | Horas estimadas |
| `assigned_to` | string | ❌ | Responsável |
| `source` | string | ❌ | `manual`, `clawdbot`, `n8n`, `api` (default: `manual`) |
| `clawdbot_session_id` | string | ❌ | ID da sessão Clawdbot |
| `clawdbot_context` | string | ❌ | Contexto JSON da conversa |
| `clawdbot_summary` | string | ❌ | Resumo gerado pelo Clawdbot |

#### Resposta

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "project_key": "assembly-line",
    "title": "Nova tarefa",
    "status": "pending",
    "priority": "medium",
    "created_at": "2025-01-29T22:00:00.000Z"
  }
}
```

---

### Atualizar Tarefa

```bash
POST /api/tasks
Content-Type: application/json

{
  "action": "update_task",
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "in_progress",
  "priority": "high",
  "assigned_to": "Novo responsável",
  "notes": "Notas adicionais"
}
```

#### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `action` | string | ✅ | `update_task` ou `update` |
| `task_id` / `id` | string | ✅ | UUID da tarefa |
| `status` | string | ❌ | Novo status |
| `priority` | string | ❌ | Nova prioridade |
| `notes` | string | ❌ | Notas/observações |
| `assigned_to` | string | ❌ | Novo responsável |
| `actual_hours` | number | ❌ | Horas reais gastas |
| `position` | number | ❌ | Posição no Kanban |

**Nota:** Ao atualizar para `in_progress`, o campo `started_at` é preenchido automaticamente.

---

### Completar Tarefa

```bash
POST /api/tasks
Content-Type: application/json

{
  "action": "complete_task",
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "actual_hours": 5.5,
  "notes": "Tarefa finalizada com sucesso"
}
```

O campo `completed_at` é preenchido automaticamente e as métricas de tempo são calculadas.

---

### Excluir Tarefa

```bash
POST /api/tasks
Content-Type: application/json

{
  "action": "delete_task",
  "task_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 🚨 Alerts API

### `GET /api/issues/open`

Lista alertas/issues abertos.

```bash
GET /api/issues/open
```

#### Resposta

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "issue_type": "urgent_request",
      "customer_name": "João Silva",
      "customer_phone": "5511999999999",
      "status": "open",
      "priority": "high",
      "detected_at": "2025-01-29T10:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/issues/create`

Criar novo issue/alerta.

```bash
POST /api/issues/create
Content-Type: application/json

{
  "issue_type": "technical_issue",
  "customer_name": "Maria Santos",
  "customer_phone": "5511988888888",
  "priority": "critical",
  "description": "Descrição do problema"
}
```

---

### `POST /api/issues/action`

Registrar ação em um issue.

```bash
POST /api/issues/action
Content-Type: application/json

{
  "issue_id": "uuid-do-issue",
  "action_type": "manual_action",
  "action_description": "Entrei em contato com o cliente",
  "taken_by": "Marcos"
}
```

---

### `POST /api/issues/resolve`

Resolver um issue.

```bash
POST /api/issues/resolve
Content-Type: application/json

{
  "issue_id": "uuid-do-issue",
  "resolution_notes": "Problema resolvido após ajuste no sistema",
  "customer_satisfaction": 5
}
```

---

## 📊 Messages API

### `GET /api/messages/unprocessed`

Lista mensagens não processadas.

```bash
GET /api/messages/unprocessed
```

---

## 🤝 Partners API

### `GET /api/partners`

Lista parceiros/afiliados.

```bash
GET /api/partners
```

### `GET /api/partners/{partnerId}`

Detalhes de um parceiro específico.

```bash
GET /api/partners/partner-uuid-here
```

### `GET /api/partners/{partnerId}/clients`

Lista clientes de um parceiro.

```bash
GET /api/partners/partner-uuid-here/clients
```

### `GET /api/partners/{partnerId}/earnings`

Ganhos de um parceiro.

```bash
GET /api/partners/partner-uuid-here/earnings
```

---

## 🔧 Debug API

### `GET /api/debug`

Informações de debug (apenas desenvolvimento).

```bash
GET /api/debug
```

---

## ❌ Códigos de Erro

| Código HTTP | Significado | Descrição |
|-------------|-------------|-----------|
| 200 | OK | Requisição bem-sucedida |
| 201 | Created | Recurso criado com sucesso |
| 400 | Bad Request | Parâmetros inválidos ou faltando |
| 401 | Unauthorized | Token de autenticação inválido |
| 403 | Forbidden | Sem permissão para acessar o recurso |
| 404 | Not Found | Recurso não encontrado |
| 500 | Internal Server Error | Erro interno do servidor |

### Exemplos de Erros

**Campo obrigatório faltando:**
```json
{
  "success": false,
  "error": "project_key and title are required"
}
```

**Recurso não encontrado:**
```json
{
  "success": false,
  "error": "Task not found"
}
```

**Valor inválido:**
```json
{
  "success": false,
  "error": "Invalid status value"
}
```

---

## ⏱️ Rate Limits

| Endpoint | Limite | Janela |
|----------|--------|--------|
| GET endpoints | 100 req | 1 minuto |
| POST endpoints | 30 req | 1 minuto |
| Webhooks | 60 req | 1 minuto |

**Headers de Rate Limit:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706570400
```

---

## 🔄 Webhooks (n8n)

O MIS Sentinel pode enviar webhooks para n8n em eventos específicos:

### Eventos Disponíveis

| Evento | Descrição |
|--------|-----------|
| `task.created` | Nova tarefa criada |
| `task.updated` | Tarefa atualizada |
| `task.completed` | Tarefa concluída |
| `issue.created` | Novo issue detectado |
| `issue.resolved` | Issue resolvido |
| `alert.triggered` | Alerta acionado |

### Payload do Webhook

```json
{
  "event": "task.created",
  "timestamp": "2025-01-29T22:00:00.000Z",
  "data": {
    "id": "uuid",
    "title": "Nova tarefa",
    "project_key": "assembly-line",
    "priority": "high",
    "source": "clawdbot"
  }
}
```

---

## 📚 SDKs e Exemplos

### JavaScript/TypeScript

```typescript
// Usando fetch
async function createTask(task: {
  project_key: string;
  title: string;
  priority?: string;
}) {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'add_task',
      ...task
    })
  });
  
  return response.json();
}

// Exemplo de uso
const result = await createTask({
  project_key: 'assembly-line',
  title: 'Minha nova tarefa',
  priority: 'high'
});
```

### cURL

```bash
# Criar tarefa
curl -X POST https://seu-dominio.com/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_task",
    "project_key": "assembly-line",
    "title": "Tarefa via cURL",
    "priority": "medium"
  }'

# Listar tarefas
curl "https://seu-dominio.com/api/tasks?action=list_tasks&status=pending"
```

---

## 📖 Referências

- [Clawdbot Integration](./CLAWDBOT-INTEGRATION.md)
- [Kanban Usage](./KANBAN-USAGE.md)
- [Changelog](./CHANGELOG.md)

---

**Última atualização:** Janeiro 2025  
**Versão da API:** 2.0.0
