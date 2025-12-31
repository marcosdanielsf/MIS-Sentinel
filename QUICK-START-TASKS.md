# 🚀 Quick Start - Sistema de Tarefas

## ⚡ Testar Localmente (3 minutos)

### 1. Instalar dependências
```bash
cd ~/Sites/MIS-Sentinel
npm install
```

### 2. Configurar variáveis de ambiente
```bash
# Criar .env.local (se não existir)
cp .env.local.example .env.local

# Adicionar suas credenciais do Supabase
NEXT_PUBLIC_SUPABASE_URL=https://bfumywvwubvernvhjehk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_key_aqui
```

### 3. Rodar em desenvolvimento
```bash
npm run dev
```

### 4. Acessar
```
http://localhost:3000/login

Credenciais de teste:
Email: admin@example.com
Password: admin123
```

---

## 📋 Testar Funcionalidades

### ✅ Visualizar Tarefas no Dashboard
1. Login → `/dashboard`
2. Scroll até o widget de tarefas
3. Deve mostrar até 5 tarefas mais recentes

### ✅ Página Completa de Tarefas
1. Menu lateral → "Tarefas" (ícone de lista)
2. Ou acesse: `http://localhost:3000/tasks`
3. Visualize:
   - Resumo por projeto (cards com contadores)
   - Lista completa de tarefas
   - Filtros por projeto e status

### ✅ Adicionar Nova Tarefa
1. Na página `/tasks`
2. Clique em "Nova Tarefa"
3. Preencha:
   - Projeto: Selecione um dos 6 projetos
   - Título: Ex: "Implementar dark mode"
   - Descrição: Ex: "Adicionar tema escuro com Tailwind CSS"
   - Prioridade: medium/high/urgent
4. Clique em "Adicionar"
5. Tarefa aparece na lista

### ✅ Atualizar Status
1. Tarefa pendente → Botão "Iniciar"
2. Tarefa em progresso → Botão "Concluir"
3. Tarefa bloqueada → Botão "Desbloquear"

### ✅ Filtros
1. Selecione um projeto no dropdown
2. Selecione um status (pending, in_progress, etc)
3. Lista é filtrada automaticamente

---

## 🧪 Testar API de Memória

### Via Terminal
```bash
# Listar projetos
curl -X POST "https://cliente-a1.mentorfy.io/webhook/claude-memory" \
  -H "Content-Type: application/json" \
  -d '{"action": "list_projects"}'

# Listar tarefas
curl -X POST "https://cliente-a1.mentorfy.io/webhook/claude-memory" \
  -H "Content-Type: application/json" \
  -d '{"action": "list_tasks", "params": {}}'

# Criar tarefa
curl -X POST "https://cliente-a1.mentorfy.io/webhook/claude-memory" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_task",
    "params": {
      "project_key": "mottivme-geral",
      "title": "Testar integração de tarefas",
      "description": "Validar funcionalidades do novo sistema",
      "priority": "high"
    }
  }'

# Resumo de projeto
curl -X POST "https://cliente-a1.mentorfy.io/webhook/claude-memory" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "project_summary",
    "params": {"project_key": "assembly-line"}
  }'
```

---

## 🚀 Deploy para Produção

### Opção 1: Vercel (Recomendado)
```bash
# Instalar Vercel CLI (se não tiver)
npm i -g vercel

# Deploy
cd ~/Sites/MIS-Sentinel
vercel

# Configurar variáveis de ambiente no dashboard:
# https://vercel.com/dashboard
# Settings → Environment Variables
# Adicionar NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Opção 2: GitHub + Vercel Auto-Deploy
```bash
# Commitar mudanças
cd ~/Sites/MIS-Sentinel
git add .
git commit -m "feat: adicionar sistema de tarefas integrado com memória persistente"
git push origin main

# Vercel detecta automaticamente e faz deploy
# Acesse: https://mis-sentinel.vercel.app
```

---

## 📊 Status dos Projetos

| Projeto | Status | Fase | Tech Stack |
|---------|--------|------|------------|
| Assembly Line SaaS | ✅ Active | Development | Next.js 14, TypeScript, Supabase, Stripe |
| Socialfy CRM | ✅ Active | Development | GoHighLevel, n8n, Supabase |
| MOTIVE SQUAD | ✅ Active | Development | n8n, Supabase, WhatsApp |
| MOTTIVME Geral | ✅ Active | Production | n8n, GoHighLevel, Supabase |
| Segundo Cérebro | 🔄 Planning | Design | Monday.com, n8n, Supabase, pgvector |
| Context Loader | 🔄 Planning | Design | Monday.com, n8n, Supabase |

---

## 🎯 Casos de Uso

### Para CEO/Gestor
1. Ver resumo de tarefas pendentes de todos os projetos
2. Filtrar por projeto específico para acompanhar progresso
3. Identificar gargalos (tarefas bloqueadas)
4. Priorizar tarefas urgentes

### Para Desenvolvedor
1. Criar tarefas técnicas durante o desenvolvimento
2. Atualizar status conforme implementa
3. Documentar notas e observações
4. Sincronizar com sistema de memória Claude

### Para Equipe
1. Visualizar todas as tarefas do time
2. Distribuir trabalho por prioridade
3. Acompanhar progresso em tempo real
4. Manter histórico de tarefas concluídas

---

## 🔗 Links Importantes

- **Dashboard Local:** http://localhost:3000/dashboard
- **Tarefas Local:** http://localhost:3000/tasks
- **Dashboard Produção:** https://mis-sentinel.vercel.app/dashboard
- **API de Memória:** https://cliente-a1.mentorfy.io/webhook/claude-memory
- **Supabase:** https://supabase.com/dashboard/project/bfumywvwubvernvhjehk
- **Repositório:** https://github.com/marcosdanielsf/MIS-Sentinel

---

## 🐛 Troubleshooting Rápido

### Erro: "Failed to fetch tasks"
**Solução:** Verificar se API está online
```bash
curl https://cliente-a1.mentorfy.io/webhook/claude-memory
```

### Erro: "Supabase Auth"
**Solução:** Verificar .env.local tem as keys corretas

### Página em branco
**Solução:** Verificar console do navegador (F12)
```bash
# Rodar build de produção localmente para testar
npm run build
npm start
```

### Tarefas não aparecem
**Solução:** Verificar se há tarefas cadastradas
```bash
# Listar tarefas via API
curl -X POST "https://cliente-a1.mentorfy.io/webhook/claude-memory" \
  -H "Content-Type: application/json" \
  -d '{"action": "list_tasks", "params": {}}'
```

---

## 📞 Suporte

**Marcos Daniels** - CEO MOTTIVME
**Sistema:** MIS SENTINEL + Claude Memory Integration

**Documentação Completa:** `TASKS-INTEGRATION.md`

---

✅ **Sistema pronto para uso!** 🚀
