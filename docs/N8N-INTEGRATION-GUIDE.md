# 🔗 Integração n8n + MIS SENTINEL CRT System

## 📋 Overview

Você já tem um workflow n8n muito avançado (`MIS - Auto Resolve Confirmed Issues.json`) que processa mensagens do WhatsApp e detecta problemas.

Agora vamos integrá-lo com o sistema CRT para **criar issues automaticamente** e **rastrear resoluções**.

---

## 🎯 Modificações Necessárias no Workflow Existente

### 1. Adicionar Node: "Criar Issue se Urgente"

**Posição**: Depois do node "Processar Dados"

**Tipo**: `IF` (Conditional)

**Condição**:
```json
{
  "conditions": {
    "number": [
      {
        "value1": "={{$json.urgency_score}}",
        "operation": "largerEqual",
        "value2": 7
      }
    ],
    "boolean": [
      {
        "value1": "={{$json.needs_attention}}",
        "value2": true
      }
    ]
  },
  "combineOperation": "any"
}
```

**Lógica**: Se `urgency_score >= 7` OU `needs_attention = true`, criar issue no CRT.

---

### 2. Adicionar Node: "HTTP - Create Issue in CRT"

**Posição**: Branch TRUE do node anterior

**Tipo**: `HTTP Request`

**Configuração**:
```json
{
  "method": "POST",
  "url": "https://seu-dominio.vercel.app/api/issues/create",
  "authentication": "none",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  },
  "sendBody": true,
  "bodyParameters": {
    "parameters": []
  },
  "specifyBody": "json",
  "jsonBody": "={\n  \"issue_type\": \"{{$json.category}}\",\n  \"customer_name\": \"{{$json.group_sender_name || $json.sender_name}}\",\n  \"customer_phone\": \"{{$json.group_sender_phone || $json.sender_phone}}\",\n  \"priority\": {{$json.urgency_score >= 9 ? '\"critical\"' : ($json.urgency_score >= 7 ? '\"high\"' : '\"medium\"')}},\n  \"metadata\": {\n    \"sentiment\": \"{{$json.sentiment}}\",\n    \"keywords\": {{JSON.stringify($json.keywords)}},\n    \"message_preview\": \"{{$json.message_body.substring(0, 100)}}\",\n    \"team_analysis\": {{$json.team_analysis || 'null'}},\n    \"group_info\": {\n      \"is_group\": {{$json.is_group_message}},\n      \"group_type\": \"{{$json.group_type}}\",\n      \"group_name\": \"{{$json.group_name}}\"\n    }\n  }\n}"
}
```

---

### 3. Adicionar Node: "Set Issue ID"

**Posição**: Depois do "Create Issue"

**Tipo**: `Set`

**Configuração**:
```json
{
  "mode": "manual",
  "duplicateItem": false,
  "assignments": {
    "assignments": [
      {
        "id": "issue_id",
        "name": "issue_id",
        "value": "={{$json.issue.id}}",
        "type": "string"
      },
      {
        "id": "message_data",
        "name": "message_data",
        "value": "={{$('Processar Dados').item.json}}",
        "type": "object"
      }
    ]
  }
}
```

---

### 4. Modificar Node Supabase: Salvar `issue_id`

**No node existente que insere em `messages`**, adicionar campo:

```json
{
  "columns": {
    "mappingMode": "defineBelow",
    "value": {
      // ... campos existentes ...
      "issue_id": "={{$json.issue_id || null}}"
    }
  }
}
```

---

## 🤖 Novo Workflow: Auto-Respond to Issues

Crie um **novo workflow** para responder automaticamente aos issues criados.

### Workflow 2: "MIS - Auto Response to Critical Issues"

```json
{
  "name": "MIS - Auto Response to Critical Issues",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 5
            }
          ]
        }
      },
      "name": "Schedule - Every 5min",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "url": "https://seu-dominio.vercel.app/api/issues/open?priority=critical&limit=10",
        "options": {}
      },
      "name": "HTTP - Get Open Critical Issues",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [450, 300]
    },
    {
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{$json.issues.length}}",
              "operation": "larger",
              "value2": 0
            }
          ]
        }
      },
      "name": "Filter - Has Issues",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [650, 300]
    },
    {
      "parameters": {
        "fieldToSplitOut": "issues",
        "options": {}
      },
      "name": "Split Issues",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 1,
      "position": [850, 200]
    },
    {
      "parameters": {
        "jsCode": "// Gerar prompt contextual para IA\nconst issue = $input.first().json;\n\nconst metadata = typeof issue.metadata === 'string' \n  ? JSON.parse(issue.metadata) \n  : issue.metadata;\n\nconst prompt = `Você é um assistente inteligente da Mottivme.\n\nUm problema foi detectado:\n\nTipo: ${issue.issue_type}\nCliente: ${issue.customer_name || 'Não identificado'}\nPrioridade: ${issue.priority}\nDetectado em: ${new Date(issue.detected_at).toLocaleString('pt-BR')}\n\n${metadata?.message_preview ? `Mensagem do cliente:\\n${metadata.message_preview}` : ''}\n\n${metadata?.sentiment ? `Sentimento: ${metadata.sentiment}` : ''}\n${metadata?.keywords?.length > 0 ? `Palavras-chave: ${metadata.keywords.join(', ')}` : ''}\n\n${metadata?.team_analysis ? `Análise do time:\\n${metadata.team_analysis}` : ''}\n\nGere uma resposta profissional e empática para resolver este problema.\nSeja breve, direto e ofereça soluções concretas.\nSe for problema técnico, ofereça suporte imediato.\nSe for cliente insatisfeito, mostre empatia e compromisso em resolver.\n`;\n\nreturn [{\n  json: {\n    ...issue,\n    ai_prompt: prompt,\n    metadata: metadata\n  }\n}];"
      },
      "name": "Code - Prepare AI Prompt",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1050, 200]
    },
    {
      "parameters": {
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "googlePalmApi",
        "text": "={{$json.ai_prompt}}",
        "options": {
          "temperature": 0.7,
          "maxOutputTokens": 500
        }
      },
      "name": "Google Gemini - Generate Response",
      "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
      "typeVersion": 1,
      "position": [1250, 200],
      "credentials": {
        "googlePalmApi": {
          "id": "sua-credential-id",
          "name": "Google Gemini API"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.customer_phone}}",
              "operation": "isNotEmpty"
            }
          ]
        }
      },
      "name": "Filter - Has Phone",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [1450, 200]
    },
    {
      "parameters": {
        "url": "https://sua-evolution-api.com/message/sendText",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "sua-api-key"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"number\": \"{{$json.customer_phone}}\",\n  \"text\": \"{{$('Google Gemini - Generate Response').item.json.response}}\"\n}"
      },
      "name": "HTTP - Send WhatsApp",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1650, 100]
    },
    {
      "parameters": {
        "url": "https://seu-dominio.vercel.app/api/issues/action",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"issue_id\": \"{{$json.id}}\",\n  \"action_type\": \"automated_response\",\n  \"action_description\": \"Resposta automática enviada via WhatsApp: {{$('Google Gemini - Generate Response').item.json.response}}\",\n  \"taken_by\": \"SYSTEM_AUTO\",\n  \"success\": true\n}"
      },
      "name": "HTTP - Log Action in CRT",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1850, 100]
    },
    {
      "parameters": {
        "url": "https://seu-dominio.vercel.app/api/issues/action",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"issue_id\": \"{{$json.id}}\",\n  \"action_type\": \"no_phone_available\",\n  \"action_description\": \"Não foi possível enviar resposta automática - cliente sem telefone registrado\",\n  \"taken_by\": \"SYSTEM_AUTO\",\n  \"success\": false\n}"
      },
      "name": "HTTP - Log No Phone",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1650, 300]
    }
  ],
  "connections": {
    "Schedule - Every 5min": {
      "main": [[{ "node": "HTTP - Get Open Critical Issues", "type": "main", "index": 0 }]]
    },
    "HTTP - Get Open Critical Issues": {
      "main": [[{ "node": "Filter - Has Issues", "type": "main", "index": 0 }]]
    },
    "Filter - Has Issues": {
      "main": [[{ "node": "Split Issues", "type": "main", "index": 0 }]]
    },
    "Split Issues": {
      "main": [[{ "node": "Code - Prepare AI Prompt", "type": "main", "index": 0 }]]
    },
    "Code - Prepare AI Prompt": {
      "main": [[{ "node": "Google Gemini - Generate Response", "type": "main", "index": 0 }]]
    },
    "Google Gemini - Generate Response": {
      "main": [[{ "node": "Filter - Has Phone", "type": "main", "index": 0 }]]
    },
    "Filter - Has Phone": {
      "main": [
        [{ "node": "HTTP - Send WhatsApp", "type": "main", "index": 0 }],
        [{ "node": "HTTP - Log No Phone", "type": "main", "index": 0 }]
      ]
    },
    "HTTP - Send WhatsApp": {
      "main": [[{ "node": "HTTP - Log Action in CRT", "type": "main", "index": 0 }]]
    },
    "HTTP - Log Action in CRT": {
      "main": [[{ "node": "Split Issues", "type": "main", "index": 0 }]]
    },
    "HTTP - Log No Phone": {
      "main": [[{ "node": "Split Issues", "type": "main", "index": 0 }]]
    }
  }
}
```

---

## 🔧 Configuração Passo a Passo

### 1. Modificar Workflow Existente

1. Abra `MIS - Auto Resolve Confirmed Issues.json` no n8n
2. Adicione os 3 novos nodes:
   - IF: "Criar Issue se Urgente"
   - HTTP Request: "Create Issue in CRT"
   - Set: "Set Issue ID"
3. Conecte após o node "Processar Dados"
4. Modifique o node Supabase para incluir `issue_id`

### 2. Criar Novo Workflow de Auto-Resposta

1. No n8n: **Workflows** → **Import from File**
2. Cole o JSON do Workflow 2 acima
3. Configure credentials:
   - Google Gemini API
   - Evolution API (HTTP Header Auth)
4. Atualize URLs:
   - Substitua `seu-dominio.vercel.app` pela URL real
   - Substitua `sua-evolution-api.com` pela URL da Evolution API

### 3. Testar Integração

#### Teste 1: Criar Issue Automaticamente
```bash
# Envie mensagem urgente para o webhook
curl -X POST https://n8n.seu-dominio.com/webhook/grupo-bposs \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "BPOSS - Cliente Teste",
    "phone": "+5511999999999",
    "message": {
      "body": "36451974701117 Isabella Delduco:\n\nCliente reclamou que a IA não está funcionando! Urgente!"
    },
    "tags": ["client"]
  }'

# Verificar se issue foi criado
curl https://seu-dominio.vercel.app/api/issues/open
```

#### Teste 2: Resposta Automática
```bash
# Aguardar 5 minutos ou executar workflow manualmente
# Verificar ação registrada no issue
curl https://seu-dominio.vercel.app/api/issues/open?priority=critical
```

---

## 📊 Métricas de Sucesso

### KPIs para Acompanhar

**Dashboard CRT** (`/crt`):
- ✅ Tempo médio de resposta (<60min → meta: <5min com automação)
- ✅ Taxa de automação (% issues com primeira ação = SYSTEM_AUTO)
- ✅ Satisfação do cliente (manter ≥4/5)

**n8n Executions**:
- ✅ Issues criados automaticamente vs manualmente
- ✅ Taxa de sucesso envio WhatsApp (≥95%)
- ✅ Tempo médio de resposta automática (<5min)

---

## 🚀 Roadmap de Automação

### Fase 1: Semi-Automação (Semana 1) ✅
- [x] Workflow existente detecta problemas
- [x] Sistema CRT rastreia resoluções
- [ ] **PRÓXIMO**: Integrar workflows (criar issues auto)
- [ ] **PRÓXIMO**: Auto-resposta em 5min

### Fase 2: Automação Inteligente (Semana 2-3)
- [ ] Fine-tune prompts da IA com histórico
- [ ] Reduzir intervalo para 1min
- [ ] Auto-resolver quando cliente confirmar positivo
- [ ] Escalação automática após 2h sem resolução

### Fase 3: Full Automation - Musk Level (Mês 2)
- [ ] 95% de automação
- [ ] <30s tempo de resposta
- [ ] IA aprende sozinha melhores respostas
- [ ] Predição: prevenir problemas antes de acontecer

---

## 🆘 Troubleshooting

### Issue não foi criado
1. Verificar logs do workflow no n8n
2. Verificar se `urgency_score >= 7` ou `needs_attention = true`
3. Verificar URL da API no node HTTP

### Resposta automática não enviada
1. Verificar se issue tem `customer_phone`
2. Verificar credential Evolution API
3. Verificar quota Google Gemini API
4. Verificar logs do workflow

### Métricas CRT não aparecem
1. Verificar se issues estão sendo criados com `priority` correto
2. Verificar se `first_response_at` está sendo setado quando ação é registrada
3. Aguardar triggers do Supabase calcularem métricas

---

## ✅ Checklist de Go-Live

### Pré-Produção
- [ ] Workflow existente modificado com novos nodes
- [ ] Workflow 2 (Auto-Response) importado e configurado
- [ ] Credentials configuradas (Gemini + Evolution)
- [ ] URLs atualizadas para produção
- [ ] Testes realizados com dados reais

### Produção
- [ ] Ativar modificações no workflow existente
- [ ] Ativar Workflow 2 com intervalo conservador (10min)
- [ ] Monitorar execuções por 24h
- [ ] Validar taxa de sucesso >90%
- [ ] Reduzir intervalo gradualmente (5min → 1min → 30s)

### Pós-Produção
- [ ] Medir CRT antes vs depois
- [ ] Medir % automação atingida
- [ ] Otimizar prompts da IA baseado em feedback
- [ ] Documentar casos edge
- [ ] Compartilhar insights com o time

---

## 🎉 Resultado Esperado

Com essa integração você terá:

1. ✅ **Detecção Automática**: Issues criados automaticamente quando problemas são detectados
2. ✅ **Resposta Rápida**: IA responde em <5min para issues críticos
3. ✅ **Rastreamento Completo**: Todas ações registradas no CRT
4. ✅ **Métricas em Tempo Real**: Dashboard CRT mostra performance
5. ✅ **Time Menos Sobrecarregado**: 60-70% de automação inicial

**Meta Final**: 95% automação + <30s resposta (Musk Level) 🚀