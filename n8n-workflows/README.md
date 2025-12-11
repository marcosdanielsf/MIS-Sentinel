# SENTINEL n8n Workflows

Workflows de automação para alimentar o MIS Sentinel Dashboard.

## Arquitetura dos Agentes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SENTINEL MULTI-AGENT SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────┐      ┌─────────────────┐      ┌──────────────┐   │
│   │   MESSAGES      │      │    ISSUES       │      │    ALERTS    │   │
│   │   (Supabase)    │      │   (Supabase)    │      │  (Supabase)  │   │
│   └────────┬────────┘      └────────┬────────┘      └──────────────┘   │
│            │                        │                       ▲          │
│            ▼                        ▼                       │          │
│   ┌────────────────────────────────────────────────────────┐│          │
│   │              SENTINEL OBSERVER AGENT                    ││          │
│   │              (Existing - Message Analysis)              ││          │
│   │                                                        ││          │
│   │   • Analisa mensagens em tempo real                    ││          │
│   │   • Detecta issues e problemas                         ││          │
│   │   • Gera insights e recomendações                      │├──────────┤
│   └──────────────────────┬─────────────────────────────────┘│          │
│                          │                                  │          │
│                          ▼                                  │          │
│   ┌──────────────────────────────────────────────────────┐  │          │
│   │                 SENTINEL_INSIGHTS                     │  │          │
│   │                    (Supabase)                         │  │          │
│   └──────────────────────┬───────────────────────────────┘  │          │
│                          │                                  │          │
│            ┌─────────────┼─────────────┐                    │          │
│            ▼             ▼             ▼                    │          │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐             │          │
│   │ KNOWLEDGE  │ │  PROCESS   │ │   SALES    │             │          │
│   │   AGENT    │ │   AGENT    │ │   AGENT    │             │          │
│   │            │ │            │ │            │             │          │
│   │ 01-*.json  │ │ 02-*.json  │ │ 03-*.json  │             │          │
│   └─────┬──────┘ └─────┬──────┘ └─────┬──────┘             │          │
│         │              │              │                     │          │
│         ▼              ▼              ▼                     │          │
│   ┌──────────┐  ┌───────────┐  ┌────────────┐              │          │
│   │KNOWLEDGE │  │ PROCESS   │  │   SALES    │              │          │
│   │  _BASE   │  │  _MAPS    │  │  _METRICS  │              │          │
│   └──────────┘  └───────────┘  └────────────┘              │          │
│         │              │                                    │          │
│         │              ▼                                    │          │
│         │       ┌──────────────┐                           │          │
│         │       │ AUTOMATION   │                           │          │
│         │       │ OPPORTUNITIES│                           │          │
│         │       └──────────────┘                           │          │
│         │                                                   │          │
│         └───────────────────────────────────────────────────┘          │
│                                                                         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      CS ENGAGEMENT AGENT                        │   │
│   │                         04-*.json                               │   │
│   │                                                                 │   │
│   │   • Monitora engajamento de clientes                           │   │
│   │   • Calcula health score e churn risk                          │   │
│   │   • Gera alertas para clientes críticos                        │   │
│   └─────────────────────────────────┬───────────────────────────────┘   │
│                                     │                                   │
│                                     ▼                                   │
│                           ┌────────────────┐                           │
│                           │   CUSTOMER     │                           │
│                           │  _ENGAGEMENT   │                           │
│                           └────────────────┘                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Workflows

### 01. SENTINEL Knowledge Agent
**Arquivo:** `01-sentinel-knowledge-agent.json`

**Função:** Transforma insights do SENTINEL em entradas de Knowledge Base (FAQ, soluções, processos).

**Schedule:** A cada 6 horas

**Fluxo:**
1. Busca insights não processados (`processed_for_kb = false`)
2. Envia para Groq LLaMA 3.3 70B para categorização
3. Cria entrada na `knowledge_base` se relevante
4. Marca insight como processado

**Tabelas:**
- Input: `sentinel_insights`
- Output: `knowledge_base`

---

### 02. SENTINEL Process Agent
**Arquivo:** `02-sentinel-process-agent.json`

**Função:** Analisa padrões de issues para identificar gargalos, sugerir processos e oportunidades de automação.

**Schedule:** A cada 12 horas

**Fluxo:**
1. Busca issues dos últimos 7 dias
2. Busca mensagens dos últimos 7 dias
3. Agrega dados por tipo de issue
4. Envia para IA analisar padrões
5. Cria:
   - Mapas de processo (`process_maps`)
   - Oportunidades de automação (`automation_opportunities`)
   - Insights de gargalos (`sentinel_insights`)

**Tabelas:**
- Input: `issues`, `messages`
- Output: `process_maps`, `automation_opportunities`, `sentinel_insights`

---

### 03. Sales Metrics Collector
**Arquivo:** `03-sales-metrics-collector.json`

**Função:** Coleta métricas diárias de prospecção da equipe de vendas (BDR).

**Schedule:** Diariamente às 23:00 (dias úteis)

**Fluxo:**
1. Busca mensagens do dia
2. Busca membros da equipe de vendas
3. Calcula métricas por vendedor:
   - Quantidade de prospecções
   - Contatos feitos
   - Reuniões agendadas
   - Tempo médio entre prospecções
   - Taxa de conversão
4. Salva métricas em `sales_metrics`
5. Gera resumo diário em `sentinel_insights`

**Métricas Calculadas:**
- `prospections_count` - Total de prospecções no dia
- `contacts_made` - Total de contatos realizados
- `meetings_scheduled` - Reuniões agendadas
- `avg_time_between_prospections` - Tempo médio entre prospecções (minutos)
- `total_prospection_time_minutes` - Tempo total de prospecção
- `conversion_rate` - Taxa de conversão (%)

**Tabelas:**
- Input: `messages`, `team_members`
- Output: `sales_metrics`, `sentinel_insights`

---

### 04. Customer Engagement Tracker
**Arquivo:** `04-customer-engagement-tracker.json`

**Função:** Monitora engajamento e saúde dos clientes para prevenção de churn.

**Schedule:** A cada 4 horas

**Fluxo:**
1. Busca mensagens dos últimos 30 dias
2. Agrupa por cliente
3. Calcula:
   - **Engagement Score (0-100):**
     - Volume de mensagens (max 30 pts)
     - Recência da interação (max 30 pts)
     - Proporção de resposta (max 20 pts)
     - Sentimento das mensagens (max 20 pts)
   - **Churn Risk Score (0-100):**
     - Dias sem contato
     - Proporção de sentimentos negativos
     - Mensagens de alta urgência
     - Baixo engajamento
   - **Health Status:**
     - `healthy`: churn_risk < 30
     - `at_risk`: churn_risk 30-59
     - `critical`: churn_risk >= 60
4. Salva em `customer_engagement`
5. Cria alertas para clientes críticos
6. Gera resumo CS em `sentinel_insights`

**Tabelas:**
- Input: `messages`
- Output: `customer_engagement`, `alerts`, `sentinel_insights`

---

## Configuração

### 1. Credenciais Necessárias

No n8n, configure as seguintes credenciais:

#### Supabase API
```
Name: Supabase MIS
Host: https://[YOUR_PROJECT].supabase.co
API Key: [YOUR_SERVICE_ROLE_KEY]
```

#### Groq API
```
Name: Groq API
API Key: [YOUR_GROQ_API_KEY]
```

### 2. Importar Workflows

1. Acesse seu n8n
2. Vá em **Workflows** > **Import**
3. Selecione cada arquivo JSON desta pasta
4. Após importar, edite cada workflow:
   - Atualize as credenciais nos nodes de Supabase
   - Atualize as credenciais nos nodes de Groq
5. Ative os workflows

### 3. Variáveis de Ambiente

Substitua nos JSONs:
- `SUPABASE_CREDENTIALS_ID` → ID real das credenciais Supabase
- `GROQ_CREDENTIALS_ID` → ID real das credenciais Groq

### 4. Tabelas Supabase Necessárias

Certifique-se que as seguintes tabelas existem (execute o SQL de setup):

```sql
-- Views no schema public (já devem existir)
sentinel_insights
knowledge_base
process_maps
automation_opportunities
sales_metrics
customer_engagement
```

---

## Monitoramento

### Logs de Execução

Verifique no n8n:
- **Executions** > Filtrar por workflow
- Verifique erros e warnings
- Monitore tempo de execução

### Métricas Esperadas

| Workflow | Frequência | Duração Esperada |
|----------|------------|------------------|
| Knowledge Agent | 6h | 1-5 min |
| Process Agent | 12h | 2-10 min |
| Sales Metrics | Diário | 1-3 min |
| Engagement Tracker | 4h | 2-8 min |

### Alertas Recomendados

Configure alertas no n8n para:
- Falha de execução
- Tempo > 15 min
- Erros de conexão com Supabase

---

## Troubleshooting

### Workflow não executa

1. Verifique se está ativo (toggle verde)
2. Verifique credenciais do Supabase
3. Teste manualmente com "Execute Workflow"

### Dados não aparecem no Dashboard

1. Verifique as views no Supabase
2. Confirme que as tabelas têm dados
3. Verifique RLS policies

### Groq retorna erro

1. Verifique se a API key é válida
2. Verifique limites de rate
3. Tente reduzir `maxTokens`

### Métricas de vendas zeradas

1. Verifique se há mensagens com `direction = 'outbound'`
2. Verifique se `team_members` tem roles de vendas
3. Ajuste lógica de detecção de prospecção

---

## Extensões Futuras

- [ ] Integração com WhatsApp Business API
- [ ] Webhook para alertas em tempo real (Slack/Discord)
- [ ] Dashboard de métricas do n8n
- [ ] Backup automático de workflows
- [ ] Integração com CRM (GoHighLevel)
