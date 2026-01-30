# 🤖 Clawdbot API Integration

Endpoint dedicado para o Clawdbot criar e gerenciar tasks no MIS Sentinel.

## 🔐 Autenticação

Todas as requisições precisam do header:

```
X-Clawdbot-Key: <CLAWDBOT_API_KEY>
```

A chave é definida em `.env.local`:
```env
CLAWDBOT_API_KEY=sua-chave-segura
```

## 📍 Endpoints

### Base URL
```
POST /api/tasks/clawdbot
GET  /api/tasks/clawdbot
```

---

## 📝 Criar Task

**POST /api/tasks/clawdbot**

```json
{
  "action": "create",
  "project_key": "socialfy",
  "title": "Implementar filtro por data",
  "description": "Adicionar filtro de data no dashboard...",
  "priority": "high",
  "due_date": "2025-02-15T18:00:00Z",
  "estimated_hours": 4,
  "assigned_to": "Marcos",
  "clawdbot_session_id": "abc123",
  "clawdbot_context": "Marcos pediu durante conversa sobre métricas"
}
```

**Campos obrigatórios:**
- `action`: "create"
- `project_key`: chave do projeto (ex: "socialfy", "assembly-line")
- `title`: título da task

**Campos opcionais:**
- `description`: descrição detalhada
- `priority`: "critical" | "high" | "medium" | "low" (default: "medium")
- `due_date`: ISO 8601 datetime
- `estimated_hours`: número positivo
- `assigned_to`: nome do responsável
- `clawdbot_session_id`: ID da sessão do Clawdbot
- `clawdbot_context`: contexto da solicitação

**Resposta (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-da-task",
    "project_key": "socialfy",
    "title": "Implementar filtro por data",
    "status": "pending",
    "priority": "high",
    "created_at": "2025-01-30T12:00:00Z",
    ...
  },
  "message": "Task created successfully"
}
```

---

## ✏️ Atualizar Task

**POST /api/tasks/clawdbot**

```json
{
  "action": "update",
  "task_id": "uuid-da-task",
  "status": "completed",
  "actual_hours": 3.5,
  "clawdbot_summary": "Implementado filtro com DatePicker, suporte a ranges e preset 'últimos 7 dias'"
}
```

**Campos obrigatórios:**
- `action`: "update"
- `task_id`: UUID da task

**Campos opcionais (pelo menos um):**
- `status`: "pending" | "in_progress" | "completed" | "blocked" | "cancelled"
- `priority`: "critical" | "high" | "medium" | "low"
- `title`: novo título
- `description`: nova descrição
- `notes`: notas adicionais
- `actual_hours`: horas reais gastas
- `assigned_to`: responsável
- `clawdbot_session_id`: ID da sessão
- `clawdbot_summary`: resumo do que foi feito

**Comportamento automático:**
- `status: "in_progress"` → define `started_at`
- `status: "completed"` → define `completed_at`

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": { ... task atualizada ... },
  "message": "Task updated successfully"
}
```

---

## 📋 Listar Tasks

**GET /api/tasks/clawdbot**

Query params:
- `status`: filtrar por status (pending, in_progress, completed, blocked, cancelled)
- `project_key`: filtrar por projeto
- `clawdbot_session_id`: filtrar por sessão do Clawdbot
- `limit`: máximo de resultados (1-100, default: 50)
- `offset`: paginação (default: 0)

**Exemplos:**
```
GET /api/tasks/clawdbot?status=pending
GET /api/tasks/clawdbot?project_key=socialfy&limit=10
GET /api/tasks/clawdbot?clawdbot_session_id=abc123
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": [ ... tasks ... ],
  "meta": {
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

---

## ⚠️ Erros

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "fieldErrors": {
      "title": ["title is required"]
    }
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Project 'invalid-key' not found"
}
```

### 429 Rate Limited
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again later."
}
```

---

## 🔒 Rate Limiting

- **100 requests** por minuto por API key
- Header `X-RateLimit-Remaining` indica requests restantes

---

## 📊 Projetos Disponíveis

| project_key | Projeto |
|-------------|---------|
| assembly-line | Assembly Line SaaS |
| socialfy | Socialfy CRM |
| motive-squad | MOTIVE SQUAD |
| segundo-cerebro | Segundo Cerebro MOTTIVME |
| context-loader | Context Loader |
| mottivme-geral | MOTTIVME Geral |
| bposs-white-label | BPOSS White Label |

---

## 🛠️ Setup

### 1. Configurar env

```env
# .env.local
CLAWDBOT_API_KEY=sua-chave-segura
```

### 2. Executar migration no Supabase

```sql
-- Execute scripts/add-clawdbot-fields.sql no Supabase
```

### 3. Testar

```bash
curl -X POST http://localhost:3000/api/tasks/clawdbot \
  -H "Content-Type: application/json" \
  -H "X-Clawdbot-Key: sua-chave-segura" \
  -d '{"action":"create","project_key":"socialfy","title":"Test task"}'
```

---

## 📝 Audit Logs

Todas as ações são logadas em `clawdbot_audit_logs` com:
- timestamp
- action (create_task, update_task, list_tasks, auth_failed)
- session_id (se fornecido)
- details (payload resumido)
