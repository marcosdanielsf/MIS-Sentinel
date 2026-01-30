# 📋 Guia de Uso do Kanban - MIS Sentinel

## 📋 Visão Geral

O quadro Kanban do MIS Sentinel permite visualizar e gerenciar tarefas de forma visual e intuitiva. Organizado por status, ele oferece uma visão clara do progresso de cada projeto.

## 🎯 Acessando o Kanban

1. Acesse o dashboard em `http://localhost:3000` (ou seu domínio)
2. Faça login com suas credenciais
3. No menu lateral, clique em **"Gerenciador de Tarefas"** (ícone ✅)

## 📊 Estrutura do Quadro

### Colunas de Status

O Kanban é organizado em 5 colunas que representam o ciclo de vida de uma tarefa:

| Coluna | Status | Ícone | Cor | Descrição |
|--------|--------|-------|-----|-----------|
| **Pendentes** | `pending` | ⏰ | Cinza | Tarefas aguardando início |
| **Em Progresso** | `in_progress` | ▶️ | Azul | Tarefas sendo executadas |
| **Concluídas** | `completed` | ✅ | Verde | Tarefas finalizadas |
| **Bloqueadas** | `blocked` | ⏸️ | Vermelho | Tarefas impedidas |
| **Canceladas** | `cancelled` | ❌ | Cinza claro | Tarefas descartadas |

### Prioridades

Cada tarefa tem uma prioridade indicada por cores:

| Prioridade | Cor | Uso |
|------------|-----|-----|
| 🔴 **Urgente** | Vermelho | Precisa de ação imediata |
| 🟠 **Alta** | Laranja | Prioridade elevada |
| 🟡 **Média** | Amarelo | Prioridade normal |
| 🔵 **Baixa** | Azul | Pode esperar |

## 🖱️ Operações Básicas

### Criar Nova Tarefa

1. Clique no botão **"+ Nova Tarefa"** (canto superior direito)
2. Preencha os campos:
   - **Projeto** (obrigatório) - Selecione o projeto relacionado
   - **Título** (obrigatório) - Nome da tarefa
   - **Descrição** - Detalhes opcionais
   - **Prioridade** - Urgente, Alta, Média ou Baixa
   - **Horas Estimadas** - Previsão de tempo
   - **Prazo** - Data limite opcional
3. Clique em **"Criar Tarefa"**

### Iniciar uma Tarefa

1. Localize a tarefa na coluna **Pendentes**
2. Clique no botão **"Iniciar"** (azul)
3. A tarefa move automaticamente para **Em Progresso**
4. O campo `started_at` é preenchido automaticamente

### Concluir uma Tarefa

1. Na coluna **Em Progresso**, localize a tarefa
2. Clique no botão **"Concluir"** (verde)
3. A tarefa move para **Concluídas**
4. Métricas de tempo são calculadas automaticamente:
   - `time_to_start_minutes` - Tempo até iniciar
   - `time_to_complete_minutes` - Tempo de execução
   - `total_duration_minutes` - Tempo total

### Bloquear uma Tarefa

1. Em **Em Progresso**, clique em **"Bloquear"** (vermelho)
2. A tarefa move para **Bloqueadas**
3. Use quando há impedimentos externos

### Desbloquear uma Tarefa

1. Na coluna **Bloqueadas**, clique em **"Desbloquear"**
2. A tarefa retorna para **Em Progresso**

## 🔍 Filtros e Navegação

### Filtrar por Projeto

1. Use o seletor **"Todos os Projetos"** no topo
2. Escolha um projeto específico para ver apenas suas tarefas
3. Clique novamente para voltar a "Todos"

### Filtrar por Status

Use o seletor de status para visualizar:
- **Ativos** - Pendentes, Em Progresso e Bloqueadas (padrão)
- **Pendentes** - Apenas tarefas não iniciadas
- **Em Progresso** - Apenas tarefas em execução
- **Concluídas** - Histórico de tarefas finalizadas
- **Bloqueadas** - Tarefas com impedimentos

### Cards de Projeto

Na parte superior, cards mostram resumos de cada projeto:
- Clique em um card para filtrar por aquele projeto
- O card selecionado fica destacado com borda azul
- Clique novamente para desmarcar

## 📈 Métricas e Estatísticas

### Painel de Métricas Globais

No topo da página, 5 cards mostram:

| Métrica | Descrição |
|---------|-----------|
| **Pendentes** | Total de tarefas aguardando |
| **Em Progresso** | Tarefas em execução |
| **Concluídas** | Tarefas finalizadas |
| **Bloqueadas** | Tarefas com impedimentos |
| **Tempo Médio** | Média de conclusão |

### Métricas por Tarefa

Cada card de tarefa exibe:
- 📅 **Criada em** - Data de criação
- ▶️ **Início** - Quando foi iniciada
- ✅ **Fim** - Quando foi concluída
- ⏱️ **Duração** - Tempo de execução
- 📊 **Estimado** - Horas previstas
- ✓ **Real** - Horas reais gastas
- 📆 **Prazo** - Data limite (vermelho se atrasado)

### Cards de Resumo por Projeto

Cada projeto exibe:
- Quantidade de tarefas por status
- Total de tarefas
- Tempo médio de conclusão (se houver)

## ⌨️ Atalhos e Dicas

### Atalhos de Produtividade

| Ação | Como fazer |
|------|------------|
| Atualizar dados | Botão **"Atualizar"** ou F5 |
| Nova tarefa rápida | Botão **"+ Nova Tarefa"** |
| Filtrar projeto | Clique no card do projeto |
| Limpar filtro projeto | Clique no card novamente |

### Dicas de Uso

1. **Mantenha o quadro atualizado** - Atualize os status regularmente
2. **Use prioridades corretamente** - Urgente deve ser realmente urgente
3. **Estime horas** - Ajuda a medir produtividade
4. **Defina prazos** - Visualize tarefas atrasadas em vermelho
5. **Bloqueie quando necessário** - Não deixe tarefas "paradas" como Em Progresso
6. **Revise concluídas** - Use para retrospectivas e métricas

## 🔄 Integração com Clawdbot

Tarefas podem ser criadas via Clawdbot com comandos naturais:

**Exemplos:**
- "Cria uma tarefa urgente para revisar o código"
- "Adiciona uma task de baixa prioridade para documentação"
- "Conclui a tarefa de deploy"

Tarefas do Clawdbot são identificadas com:
- `source: "clawdbot"` no banco de dados
- Aparecem normalmente no Kanban

## 🎨 Indicadores Visuais

### Cores de Prioridade nos Cards

Os cards de tarefa têm uma borda colorida à esquerda indicando prioridade:
- 🔴 Borda vermelha = Urgente
- 🟠 Borda laranja = Alta
- 🟡 Borda amarela = Média
- 🔵 Borda azul = Baixa

### Tags de Tempo

| Tag | Cor | Significado |
|-----|-----|-------------|
| ⏱️ Duração | Roxo | Tempo real de execução |
| 📊 Estimado | Azul | Previsão inicial |
| ✓ Real | Verde | Horas registradas |
| 📆 Prazo | Amarelo/Vermelho | Data limite |

### Status dos Cards

| Ícone | Status |
|-------|--------|
| ⏰ Cinza | Pendente |
| ▶️ Azul | Em Progresso |
| ✅ Verde | Concluída |
| ⏸️ Vermelho | Bloqueada |
| ❌ Cinza claro | Cancelada |

## 🛠️ Troubleshooting

### Problema: Tarefa não aparece no Kanban

**Soluções:**
1. Verifique se o filtro de projeto está correto
2. Verifique o filtro de status (padrão mostra apenas ativos)
3. Clique em "Atualizar" para recarregar os dados
4. Confirme se a tarefa foi criada com projeto válido

### Problema: Botões de ação não funcionam

**Soluções:**
1. Verifique sua conexão com a internet
2. Confirme que está logado
3. Tente atualizar a página (F5)
4. Verifique o console do navegador por erros

### Problema: Métricas de tempo incorretas

**Causa:** Triggers do banco podem não ter executado

**Solução:** Execute a migration novamente:
```sql
-- No Supabase SQL Editor
-- Rode scripts/create-tasks-table.sql
```

### Problema: Projeto não aparece no seletor

**Solução:** Adicione o projeto no banco:
```sql
INSERT INTO projects (project_key, project_name, current_status)
VALUES ('meu-projeto', 'Meu Novo Projeto', 'active');
```

## 📚 Referências

- [API Reference](./API-REFERENCE.md) - Endpoints da API
- [Clawdbot Integration](./CLAWDBOT-INTEGRATION.md) - Integração com IA
- [Changelog](./CHANGELOG.md) - Histórico de versões

---

**Última atualização:** Janeiro 2025  
**Versão:** 2.0.0
