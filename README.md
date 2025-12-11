# 🤖 MIS SENTINEL - Mottivme Intelligence System

Dashboard de Inteligência Artificial para monitoramento de mensagens WhatsApp, análise de sentimento, detecção de padrões e geração de alertas automáticos.

## 📋 Visão Geral

O **MIS SENTINEL** é um sistema completo de inteligência que integra:

- **n8n**: Captura mensagens do WhatsApp via webhook
- **Google Gemini AI**: Analisa mensagens e gera insights
- **Supabase**: Armazena dados e alertas
- **Next.js Dashboard**: Visualiza tudo em tempo real

## 🎯 Funcionalidades

### 1. Dashboard Principal (`/dashboard`)
- **Métricas em Tempo Real**: Total de mensagens, alertas ativos, alertas críticos
- **Análise de Sentimento**: Gráfico de pizza mostrando distribuição de sentimentos
- **Histórico de Mensagens**: Gráfico de barras dos últimos 7 dias
- **Score de Urgência Médio**: Métrica de priorização
- **Alertas Recentes**: 5 alertas mais recentes para ação imediata

### 2. Alertas do SENTINEL (`/alerts`)
- **Visualização de Todos os Alertas**: Gerados pela AI
- **Filtros Avançados**: Por status (ativo, reconhecido, resolvido) e severidade
- **Tipos de Alerta**:
  - 🔴 **Critical**: Falhas de sistema, pagamentos
  - 🟠 **High**: Solicitações urgentes de clientes
  - 🟡 **Medium**: Oportunidades de automação, gargalos
  - 🔵 **Low**: Marcos positivos, reconhecimentos

- **Ações Sugeridas pela AI**: Para cada alerta
- **Workflow de Resolução**: Reconhecer → Resolver
- **Confiança da AI**: Score de 0-100%

### 3. Mensagens Monitoradas (`/messages`)
- **Histórico Completo**: Todas as mensagens capturadas
- **Busca Avançada**: Por conteúdo, remetente, tópicos
- **Filtros Múltiplos**: Remetente, grupo, sentimento, urgência
- **Análise AI em Cada Mensagem**:
  - Sentimento (😊 positivo, 😐 neutro, 😞 negativo, ⚡ urgente)
  - Score de urgência (0-10)
  - Categoria (client_request, automation_opportunity, etc.)
  - Tópicos-chave extraídos

### 4. Atividade da Equipe (`/team`)
- **Performance Individual**: Métricas por membro
- **Gráficos de Comparação**: Mensagens e urgência
- **Análise de Sentimento por Pessoa**: Gráfico de pizza
- **Distribuição de Categorias**: O que cada membro está fazendo
- **Última Atividade**: Timestamp e preview da mensagem

## 🚀 Setup Rápido

### Passo 1: Criar Schema no Supabase

1. Acesse: https://supabase.com/dashboard/project/bfumywvwubvernvhjehk/sql
2. Cole o conteúdo de `scripts/create-mis-tables.sql`
3. Clique em **RUN**

### Passo 2: Popular com Dados de Exemplo

```bash
npm run setup-mis-data
```

Isso insere:
- 6 mensagens de exemplo (Isabella, Allesson, Arthur, Hallen, Marcos)
- 5 alertas com diferentes severidades
- Destinatários de notificações

### Passo 3: Executar Dashboard

```bash
npm run dev
```

Acesse: http://localhost:3000

Login: **admin@example.com** / **admin123**

## 📊 Estrutura de Dados

### Tabela `messages`
```typescript
{
  id: UUID,
  message_id: string,
  group_name: string,
  sender_name: string,
  message_content: text,
  timestamp: timestamptz,

  // Análise AI
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent',
  urgency_score: 0-10,
  category: string,
  key_topics: string[]
}
```

### Tabela `alerts`
```typescript
{
  id: UUID,
  alert_type: string, // urgent_request, technical_issue, etc.
  title: string,
  description: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  status: 'active' | 'acknowledged' | 'resolved',

  // Metadados AI
  confidence_score: 0-1,
  ai_reasoning: text,
  suggested_actions: string[]
}
```

## 🔄 Integração com n8n

O workflow n8n deve:

1. Receber mensagem do WhatsApp via webhook
2. Enviar para Google Gemini AI para análise
3. Extrair: sentimento, urgência, categoria, tópicos
4. Salvar na tabela `messages`
5. Se urgência > 7 → Criar alerta na tabela `alerts`

### Exemplo de Resposta da AI Gemini

```json
{
  "sentiment": "urgent",
  "urgency_score": 8,
  "category": "client_request",
  "key_topics": ["acesso módulo", "atraso", "cliente turma 15"],
  "should_alert": true,
  "alert_reasoning": "Cliente aguarda há 3 dias - intervenção necessária"
}
```

## 📱 Páginas do Dashboard

| Rota | Descrição | Funcionalidades |
|------|-----------|-----------------|
| `/dashboard` | Visão geral | Métricas principais, gráficos, alertas recentes |
| `/alerts` | Gerenciar alertas | Filtros, reconhecer, resolver, expandir detalhes |
| `/messages` | Histórico de mensagens | Busca, filtros múltiplos, análise AI |
| `/team` | Monitor de equipe | Performance, sentimento, comparações |
| `/users` | Gerenciar usuários | Lista de usuários do sistema |

## 🎨 Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: Google Gemini (via n8n)
- **Automation**: n8n
- **Deploy**: Vercel

## 🔐 Autenticação

O sistema usa Supabase Auth com JWT tokens. Usuários devem fazer login para acessar qualquer página.

### Criar Novo Usuário

```bash
# Via script (já existe admin@example.com)
npx tsx scripts/create-test-user.ts

# Ou via Supabase Dashboard
# Authentication > Users > Add User
```

## 📈 Métricas e KPIs

O sistema rastreia:

- **Volume de Mensagens**: Total e por período
- **Distribuição de Sentimento**: Positivo, neutro, negativo, urgente
- **Score Médio de Urgência**: Indicador de carga de trabalho
- **Alertas Ativos**: Itens pendentes de ação
- **Alertas Críticos**: Prioridade máxima
- **Performance da Equipe**: Mensagens, sentimento, categorias
- **Taxa de Resolução**: Alertas resolvidos vs. criados

## 🚨 Tipos de Alertas

1. **urgent_request** ⚡: Solicitação urgente de cliente
2. **technical_issue** ❌: Problema técnico ou bug
3. **automation_opportunity** 🤖: Oportunidade de automatizar processo
4. **bottleneck** 🚧: Gargalo detectado no fluxo
5. **milestone** 🎉: Marco positivo ou resultado excepcional
6. **pattern_detected** 🔍: Padrão identificado pela AI

## 📚 Scripts Úteis

```bash
# Desenvolvimento
npm run dev              # Executar em modo dev

# Build
npm run build           # Build para produção
npm start               # Executar build de produção

# MIS Scripts
npm run setup-mis-data  # Popular dados de exemplo

# Exploração
npx tsx scripts/explore-mis-data.ts    # Ver dados atuais
npx tsx scripts/full-supabase-scan.ts  # Scan completo do Supabase
```

## 🔗 Links Importantes

- **Vercel Deploy**: https://admin-dashboard-[seu-deploy].vercel.app
- **Supabase**: https://supabase.com/dashboard/project/bfumywvwubvernvhjehk
- **n8n Workflow**: https://cliente-a1.mentorfy.io/workflow/wnceqwQ2x01AX5pg/5ace1f
- **Webhook**: https://cliente-a1.mentorfy.io/webhook/grupo-bposs

## 🎯 Próximos Passos

1. ✅ Criar schema no Supabase
2. ✅ Popular dados de exemplo
3. ✅ Testar todas as páginas
4. 🔲 Configurar n8n para salvar mensagens reais
5. 🔲 Ajustar prompts da AI Gemini
6. 🔲 Deploy para produção
7. 🔲 Configurar notificações de alertas (email/WhatsApp)

## 🤝 Equipe Mottivme

- **Marcos Daniel**: CEO
- **Isabella**: Team Member
- **Allesson**: Team Member
- **Arthur**: Team Member
- **Hallen**: Team Member

---

**Desenvolvido por Claude Code** 🤖

Sistema de Inteligência Artificial para Gestão de Comunicações