# 📋 Changelog - MIS Sentinel

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [2.0.0] - 2025-01-29

### 🎉 Kanban + Clawdbot Integration Release

Esta versão maior adiciona um sistema completo de gerenciamento de tarefas estilo Kanban com integração nativa ao Clawdbot para automação via IA.

### ✨ Adicionado

#### Quadro Kanban (`/tasks`)
- **Visualização Kanban completa** com 5 colunas de status (Pendentes, Em Progresso, Concluídas, Bloqueadas, Canceladas)
- **Sistema de prioridades** com cores visuais (Urgente, Alta, Média, Baixa)
- **Cards de resumo por projeto** com métricas em tempo real
- **Filtros avançados** por projeto e status
- **Métricas de tempo automáticas**:
  - Tempo até iniciar (time_to_start_minutes)
  - Tempo de execução (time_to_complete_minutes)
  - Tempo total (total_duration_minutes)
- **Indicadores visuais de prazo** (amarelo para próximo, vermelho para atrasado)
- **Modal de criação de tarefas** com campos completos

#### Integração Clawdbot
- **Novos campos na tabela tasks**:
  - `clawdbot_session_id` - Rastreamento de sessões
  - `clawdbot_context` - Contexto da conversa em JSON
  - `clawdbot_summary` - Resumo gerado pela IA
  - `source` - Origem da tarefa (manual, clawdbot, n8n, api)
  - `position` - Ordenação no Kanban
- **View `clawdbot_tasks`** para consultas específicas
- **Projeto dedicado `clawdbot-tasks`** para tarefas criadas via IA
- **Índices otimizados** para performance

#### API Expandida
- **GET `/api/tasks`** com novos parâmetros:
  - `action=list_tasks` - Listar tarefas
  - `action=list_projects` - Listar projetos
  - `action=project_summary` - Resumo por projeto
  - `action=task_summaries` - Métricas agregadas
- **POST `/api/tasks`** com novas actions:
  - `add_task` / `create` - Criar tarefa
  - `update_task` / `update` - Atualizar tarefa
  - `complete_task` - Concluir tarefa
  - `delete_task` / `delete` - Excluir tarefa
- **Suporte a campos Clawdbot** em todas as operações

#### Dependências
- Adicionado `@dnd-kit/core` ^6.3.1
- Adicionado `@dnd-kit/sortable` ^10.0.0
- Adicionado `@dnd-kit/utilities` ^3.2.2
- Atualizado `next` para ^15.5.9
- Atualizado `lucide-react` para ^0.555.0

#### Documentação
- **docs/CLAWDBOT-INTEGRATION.md** - Guia completo de integração
- **docs/API-REFERENCE.md** - Referência da API com exemplos
- **docs/KANBAN-USAGE.md** - Manual de uso do Kanban
- **docs/CHANGELOG.md** - Este arquivo

#### Scripts SQL
- **scripts/create-tasks-table.sql** - Criação da estrutura de tarefas
- **scripts/migration-clawdbot-integration.sql** - Migration para campos Clawdbot

### 🔧 Alterado

- **Sidebar** atualizada com link para o Gerenciador de Tarefas
- **Estrutura de rotas** reorganizada para incluir `/tasks`
- **Componentes** refatorados para usar Lucide React consistentemente

### 🐛 Corrigido

- Correções de tipagem TypeScript em componentes React
- Ajustes de responsividade no layout do dashboard
- Melhorias de performance em queries do Supabase

### 📦 Migrations Necessárias

Para atualizar da versão 1.x para 2.0.0, execute no Supabase SQL Editor:

```sql
-- 1. Criar estrutura de tarefas
-- Execute: scripts/create-tasks-table.sql

-- 2. Adicionar campos Clawdbot
-- Execute: scripts/migration-clawdbot-integration.sql
```

---

## [1.5.0] - 2025-01-01

### ✨ Adicionado

- Integração Stripe Connect para parceiros/afiliados
- Sistema de gestão de parceiros (`/partners`)
- Dashboard de ganhos para afiliados
- APIs de parceiros e comissões

### 🔧 Alterado

- Sidebar reorganizada com seção Partners
- Melhorias no sistema de autenticação

---

## [1.4.0] - 2024-12-16

### ✨ Adicionado

- Sistema CRT (Customer Response Time) completo
- Página de Issues com workflow de resolução
- Métricas de tempo de resposta
- Ações registradas em issues

---

## [1.3.0] - 2024-12-14

### ✨ Adicionado

- Dashboard de Performance
- Página de Processos
- Filtros de data avançados (DateFilter component)
- Integração com Evolution API para WhatsApp

---

## [1.2.0] - 2024-12-12

### ✨ Adicionado

- Knowledge Base (`/knowledge`)
- Sistema de Engajamento (`/engagement`)
- Análise de mensagens com IA
- Categorização automática de mensagens

---

## [1.1.0] - 2024-12-11

### ✨ Adicionado

- Dashboard principal com métricas em tempo real
- Sistema de Alertas (`/alerts`) com severidades
- Histórico de Mensagens (`/messages`)
- Atividade da Equipe (`/team`)
- Integração completa com Supabase
- Integração n8n para automação

---

## [1.0.0] - 2024-12-10

### 🎉 Release Inicial

- Estrutura base Next.js 14 com App Router
- Autenticação Supabase
- Layout responsivo com Tailwind CSS
- Sidebar de navegação
- Página de login
- Configuração inicial do projeto

---

## Legenda

- ✨ **Adicionado** - Novas funcionalidades
- 🔧 **Alterado** - Mudanças em funcionalidades existentes
- 🐛 **Corrigido** - Correção de bugs
- 🗑️ **Removido** - Funcionalidades removidas
- ⚠️ **Deprecated** - Funcionalidades marcadas para remoção futura
- 🔒 **Segurança** - Correções de vulnerabilidades

---

**Mantido por:** Equipe MOTTIVME  
**Última atualização:** Janeiro 2025
