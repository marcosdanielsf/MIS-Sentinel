# 📋 Integração de Tarefas - MIS Sentinel

## 🎯 Visão Geral

Sistema de gerenciamento de tarefas integrado ao **MIS Sentinel Dashboard**, sincronizado com o **sistema de memória persistente** via webhook n8n.

---

## ✨ Funcionalidades Implementadas

### 1. **Widget de Tarefas (TasksWidget)**
Componente reutilizável para exibir tarefas em qualquer página.

**Localização:** `/components/TasksWidget.tsx`

**Props:**
- `projectKey?: string` - Filtrar por projeto específico
- `limit?: number` - Limite de tarefas exibidas (padrão: 10)
- `showFilters?: boolean` - Mostrar filtros de projeto/status

**Funcionalidades:**
- ✅ Listar tarefas por status (pending, in_progress, blocked, completed)
- ✅ Filtrar por projeto
- ✅ Filtrar por status
- ✅ Atualizar status de tarefas (iniciar, concluir, desbloquear)
- ✅ Ícones visuais por status
- ✅ Badges de prioridade (urgent, high, medium, low)
- ✅ Auto-atualização

---

### 2. **Página de Gerenciamento de Tarefas**
Interface completa para gerenciar todas as tarefas.

**Localização:** `/app/tasks/page.tsx`

**Funcionalidades:**
- ✅ Visualização de resumo por projeto (pending, in_progress, completed, blocked)
- ✅ Adicionar novas tarefas
- ✅ Filtros avançados (projeto + status)
- ✅ Modal para criação de tarefas
- ✅ Listagem completa de tarefas (até 50)

**Campos do Formulário:**
- Projeto (seleção dos projetos ativos)
- Título (obrigatório)
- Descrição
- Prioridade (low, medium, high, urgent)

---

### 3. **Integração no Dashboard**
Widget de tarefas exibido no dashboard principal.

**Localização:** `/app/dashboard/page.tsx`

**Funcionalidades:**
- ✅ 5 tarefas mais recentes
- ✅ Sem filtros (visão geral)
- ✅ Link para página completa de tarefas

---

### 4. **Menu de Navegação**
Link adicionado ao sidebar.

**Localização:** `/components/Sidebar.tsx`

**Menu Item:**
```typescript
{
  name: 'Tarefas',
  href: '/tasks',
  icon: ListTodo,
}
```

---

## 🔌 API de Memória (Webhook n8n)

### Endpoint
```
POST https://cliente-a1.mentorfy.io/webhook/claude-memory
Content-Type: application/json
```

### Ações Disponíveis

#### 1. `list_projects` - Listar Projetos
```json
{
  "action": "list_projects"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "project_key": "assembly-line",
      "project_name": "Assembly Line SaaS",
      "current_status": "active",
      "tech_stack": ["Next.js 14", "TypeScript", "Supabase"]
    }
  ]
}
```

---

#### 2. `list_tasks` - Listar Tarefas
```json
{
  "action": "list_tasks",
  "params": {
    "project_key": "assembly-line" // opcional
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "project_key": "assembly-line",
      "project_name": "Assembly Line SaaS",
      "title": "Implementar autenticação",
      "description": "Adicionar JWT auth com Supabase",
      "status": "in_progress",
      "priority": "high",
      "created_at": "2025-12-31T12:00:00Z",
      "updated_at": "2025-12-31T14:00:00Z",
      "notes": "Usar Supabase Auth"
    }
  ]
}
```

---

#### 3. `add_task` - Adicionar Tarefa
```json
{
  "action": "add_task",
  "params": {
    "project_key": "assembly-line",
    "title": "Implementar dark mode",
    "description": "Adicionar tema escuro com Tailwind",
    "priority": "medium"
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "Task created successfully"
  }
}
```

---

#### 4. `complete_task` - Concluir Tarefa
```json
{
  "action": "complete_task",
  "params": {
    "task_id": "uuid"
  }
}
```

---

#### 5. `update_task` - Atualizar Tarefa
```json
{
  "action": "update_task",
  "params": {
    "task_id": "uuid",
    "status": "in_progress",
    "priority": "urgent",
    "notes": "Bloqueado aguardando API externa"
  }
}
```

**Status válidos:**
- `pending` - Pendente
- `in_progress` - Em progresso
- `completed` - Concluído
- `blocked` - Bloqueado
- `cancelled` - Cancelado

**Prioridades válidas:**
- `low` - Baixa
- `medium` - Média
- `high` - Alta
- `urgent` - Urgente

---

#### 6. `project_summary` - Resumo do Projeto
```json
{
  "action": "project_summary",
  "params": {
    "project_key": "assembly-line"
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "pending": 5,
    "in_progress": 3,
    "completed": 12,
    "blocked": 1
  }
}
```

---

## 🎨 Componentes Visuais

### Status Icons
- ✅ **Completed:** CheckCircle (verde)
- ⏳ **In Progress:** Clock (azul)
- ⚠️ **Blocked:** AlertTriangle (vermelho)
- ⚪ **Pending:** Circle (cinza)

### Badges de Prioridade
- 🔴 **Urgent:** Fundo vermelho
- 🟠 **High:** Fundo laranja
- 🟡 **Medium:** Fundo amarelo
- 🔵 **Low:** Fundo azul

### Badges de Status
- 🟢 **Completed:** Verde
- 🔵 **In Progress:** Azul
- 🔴 **Blocked:** Vermelho
- ⚪ **Pending:** Cinza

---

## 📊 Estrutura de Dados

### Interface Task
```typescript
interface Task {
  id: string;
  project_key: string;
  project_name: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  notes?: string;
}
```

---

## 🚀 Como Usar

### 1. No Dashboard Principal
```typescript
import TasksWidget from '@/components/TasksWidget';

// Widget simples (5 tarefas, sem filtros)
<TasksWidget limit={5} showFilters={false} />
```

### 2. Página Dedicada
```typescript
// Widget completo (50 tarefas, com filtros)
<TasksWidget limit={50} showFilters={true} />
```

### 3. Filtrado por Projeto
```typescript
// Apenas tarefas do Assembly Line
<TasksWidget projectKey="assembly-line" limit={20} />
```

---

## 🔄 Fluxo de Trabalho

### Criação de Tarefa
1. Usuário clica em "Nova Tarefa"
2. Preenche formulário (projeto, título, descrição, prioridade)
3. Sistema envia `add_task` para API
4. API retorna confirmação
5. Lista de tarefas é recarregada

### Atualização de Status
1. Usuário clica em botão de ação (Iniciar, Concluir, Desbloquear)
2. Sistema envia `update_task` ou `complete_task`
3. API atualiza status
4. Lista é recarregada automaticamente

### Visualização
1. Componente carrega projetos via `list_projects`
2. Carrega tarefas via `list_tasks`
3. Aplica filtros (projeto/status) se necessário
4. Renderiza lista ordenada por prioridade

---

## 🎯 Projetos Disponíveis

| Project Key | Nome | Status | Fase |
|-------------|------|--------|------|
| assembly-line | Assembly Line SaaS | active | development |
| socialfy | Socialfy CRM | active | development |
| motive-squad | MOTIVE SQUAD | active | development |
| mottivme-geral | MOTTIVME Geral | active | production |
| segundo-cerebro | Segundo Cérebro MOTTIVME | planning | design |
| context-loader | Context Loader | planning | design |

---

## 🔐 Segurança

- ✅ Autenticação via Supabase Auth (JWT)
- ✅ Todas as requisições passam por middleware de auth
- ✅ API externa (n8n) protegida por domínio
- ✅ Validação de dados no frontend

---

## 🐛 Troubleshooting

### Tarefas não carregam
1. Verificar se API está online: `https://cliente-a1.mentorfy.io/webhook/claude-memory`
2. Verificar se projeto existe na base
3. Checar console do navegador para erros

### Erro ao criar tarefa
1. Verificar se `project_key` é válido
2. Verificar campos obrigatórios (title)
3. Verificar formato de prioridade (low/medium/high/urgent)

### Filtros não funcionam
1. Verificar se projetos foram carregados
2. Verificar se há tarefas cadastradas
3. Limpar cache do navegador

---

## 📈 Próximas Melhorias

- [ ] Drag & drop para reordenar tarefas
- [ ] Assignação de tarefas para usuários
- [ ] Comentários em tarefas
- [ ] Anexos e arquivos
- [ ] Subtarefas (checklist)
- [ ] Notificações de vencimento
- [ ] Calendário de tarefas
- [ ] Integração com GitHub Issues
- [ ] Export para CSV/Excel
- [ ] Dashboard de produtividade

---

## 🤝 Integração com Outros Sistemas

### Supabase
- Autenticação de usuários
- Possibilidade de armazenar tarefas localmente (cache)

### n8n
- Webhook de memória persistente
- Automações baseadas em status de tarefas
- Notificações automáticas

### Claude Code
- Comandos via CLI para criar tarefas
- Sincronização de contexto entre sessões
- Sugestões automáticas de tarefas baseadas em conversas

---

**Desenvolvido por Claude Code** 🤖
**Última atualização:** 31/12/2025
