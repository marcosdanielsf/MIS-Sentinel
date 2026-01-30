# Schema Changelog - MIS Sentinel

Histórico de todas as alterações no schema do banco de dados.

---

## [2025-02-01] Clawdbot Integration

**Arquivo:** `scripts/migration-clawdbot-integration.sql`

### Novas Colunas (tabela `tasks`)

| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `clawdbot_session_id` | TEXT | NULL | ID da sessão do Clawdbot para rastreamento |
| `clawdbot_context` | TEXT | NULL | Contexto JSON da conversa para continuidade |
| `clawdbot_summary` | TEXT | NULL | Resumo gerado pelo AI |
| `source` | TEXT | 'manual' | Origem: manual, clawdbot, n8n, api |
| `position` | INTEGER | 0 | Posição para ordenação no kanban |

### Novos Índices

| Índice | Colunas | Propósito |
|--------|---------|-----------|
| `idx_tasks_clawdbot_session` | `clawdbot_session_id` | Busca rápida por sessão |
| `idx_tasks_source` | `source` | Filtro por origem |
| `idx_tasks_position` | `project_key, status, position` | Ordenação kanban |

### Nova View

**`clawdbot_tasks`** - View filtrada para tarefas relacionadas ao Clawdbot:
- Filtra onde `source = 'clawdbot'` OU `clawdbot_session_id IS NOT NULL`
- Campos: id, project_key, title, description, status, priority, clawdbot_*, timestamps

### Novo Projeto

| project_key | project_name | current_status | current_phase |
|-------------|--------------|----------------|---------------|
| `clawdbot-tasks` | Tarefas Clawdbot | active | production |

### Como Aplicar

```bash
# Via Supabase SQL Editor ou psql
psql -h bfumywvwubvernvhjehk.supabase.co -U postgres -d postgres -f scripts/migration-clawdbot-integration.sql
```

### Rollback

Script de rollback incluído no final do arquivo de migration.

---

## Histórico Anterior

*Migrações anteriores a este changelog não foram documentadas.*

---

## Convenções

- Sempre usar `IF NOT EXISTS` / `IF EXISTS` para idempotência
- Incluir script de rollback em cada migration
- Nomear arquivos: `migration-<feature>.sql`
- Documentar aqui imediatamente após criar migration
