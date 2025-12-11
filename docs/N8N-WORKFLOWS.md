# 🤖 n8n Workflows para Automação do MIS SENTINEL

## 📦 Workflows Prontos para Importar

### Workflow 1: Auto-Criar Issues de Alertas Críticos

```json
{
  "name": "MIS - Auto Create Issues from Critical Alerts",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "alert-webhook",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Webhook - Receive Alert",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.severity}}",
              "operation": "equals",
              "value2": "critical"
            },
            {
              "value1": "={{$json.severity}}",
              "operation": "equals",
              "value2": "high"
            }
          ]
        },
        "combineOperation": "any"
      },
      "name": "Filter - Only Critical/High",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "url": "https://seu-dominio.vercel.app/api/issues/create",
        "options": {},
        "bodyParametersJson": "={\n  \"alert_id\": \"{{$json.id}}\",\n  \"issue_type\": \"{{$json.alert_type}}\",\n  \"customer_name\": \"{{$json.affected_team_members[0]}}\",\n  \"customer_phone\": null,\n  \"priority\": \"{{$json.severity}}\"\n}"
      },
      "name": "HTTP - Create Issue",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [650, 200]
    },
    {
      "parameters": {
        "respondWith": "allIncomingItems",
        "options": {}
      },
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [850, 200]
    }
  ],
  "connections": {
    "Webhook - Receive Alert": {
      "main": [[{ "node": "Filter - Only Critical/High", "type": "main", "index": 0 }]]
    },
    "Filter - Only Critical/High": {
      "main": [[{ "node": "HTTP - Create Issue", "type": "main", "index": 0 }]]
    },
    "HTTP - Create Issue": {
      "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]]
    }
  }
}
```

**Como Usar**:
1. Copie o JSON acima
2. No n8n: Settings → Import from File → Cole o JSON
3. Atualize `seu-dominio.vercel.app` com seu domínio
4. Ative o workflow
5. Copie a URL do webhook
6. Configure seu sistema de alertas para chamar essa URL quando criar alertas

---

### Workflow 2: Resposta Automática para Issues Críticos

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
              "value1": "={{$json.count}}",
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
      "name": "Split In Batches",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 1,
      "position": [850, 200]
    },
    {
      "parameters": {
        "operation": "text",
        "resource": "text",
        "text": "=Você é um assistente de atendimento ao cliente da Mottivme.\n\nO cliente {{$json.customer_name}} ({{$json.customer_phone}}) tem o seguinte problema:\nTipo: {{$json.issue_type}}\nPrioridade: {{$json.priority}}\n\nGere uma resposta empática e profissional para resolver este problema. Seja breve, direto e ofereça soluções concretas."
      },
      "name": "Google Gemini - Generate Response",
      "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
      "typeVersion": 1,
      "position": [1050, 200],
      "credentials": {
        "googleGeminiApi": {
          "id": "sua-credential-id",
          "name": "Google Gemini API"
        }
      }
    },
    {
      "parameters": {
        "url": "https://sua-evolution-api.com/message/sendText",
        "options": {},
        "bodyParametersJson": "={\n  \"number\": \"{{$json.customer_phone}}\",\n  \"text\": \"{{$json.response}}\"\n}"
      },
      "name": "HTTP - Send WhatsApp",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1250, 200]
    },
    {
      "parameters": {
        "url": "https://seu-dominio.vercel.app/api/issues/action",
        "options": {},
        "bodyParametersJson": "={\n  \"issue_id\": \"{{$json.id}}\",\n  \"action_type\": \"automated_response\",\n  \"action_description\": \"Resposta automática enviada: {{$json.response}}\",\n  \"taken_by\": \"SYSTEM_AUTO\",\n  \"success\": true\n}"
      },
      "name": "HTTP - Log Action",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1450, 200]
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
      "main": [[{ "node": "Split In Batches", "type": "main", "index": 0 }]]
    },
    "Split In Batches": {
      "main": [[{ "node": "Google Gemini - Generate Response", "type": "main", "index": 0 }]]
    },
    "Google Gemini - Generate Response": {
      "main": [[{ "node": "HTTP - Send WhatsApp", "type": "main", "index": 0 }]]
    },
    "HTTP - Send WhatsApp": {
      "main": [[{ "node": "HTTP - Log Action", "type": "main", "index": 0 }]]
    },
    "HTTP - Log Action": {
      "main": [[{ "node": "Split In Batches", "type": "main", "index": 0 }]]
    }
  }
}
```

**Como Usar**:
1. Copie o JSON acima
2. No n8n: Settings → Import from File → Cole o JSON
3. Atualize os domínios e credentials
4. Configure sua Google Gemini API credential
5. Configure sua Evolution API credential
6. Ative o workflow
7. Issues críticos receberão resposta automática a cada 5 minutos

---

### Workflow 3: Auto-Resolver Issues Confirmados pelo Cliente

```json
{
  "name": "MIS - Auto Resolve Confirmed Issues",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "whatsapp-message",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Webhook - WhatsApp Message",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "operation": "text",
        "resource": "text",
        "text": "=Analise a seguinte mensagem do cliente e determine:\n1. Sentimento (positive, neutral, negative)\n2. O problema está resolvido? (true/false)\n3. Nível de satisfação (1-5)\n\nMensagem: {{$json.message}}\n\nResponda APENAS em formato JSON:\n{\n  \"sentiment\": \"positive\",\n  \"is_resolved\": true,\n  \"satisfaction\": 5\n}"
      },
      "name": "Google Gemini - Analyze Response",
      "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
      "typeVersion": 1,
      "position": [450, 300],
      "credentials": {
        "googleGeminiApi": {
          "id": "sua-credential-id",
          "name": "Google Gemini API"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const analysis = JSON.parse($input.first().json.response);\nreturn [{ json: { ...analysis, ...$input.first().json } }];"
      },
      "name": "Code - Parse JSON",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [650, 300]
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{$json.is_resolved}}",
              "value2": true
            }
          ],
          "string": [
            {
              "value1": "={{$json.sentiment}}",
              "operation": "equals",
              "value2": "positive"
            }
          ]
        }
      },
      "name": "Filter - Is Resolved & Positive",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [850, 300]
    },
    {
      "parameters": {
        "url": "=https://seu-dominio.vercel.app/api/issues/open?limit=100",
        "options": {}
      },
      "name": "HTTP - Find Issue by Phone",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1050, 200]
    },
    {
      "parameters": {
        "jsCode": "// Find issue matching customer phone\nconst customerPhone = $input.first().json.from;\nconst issues = $input.first().json.issues || [];\n\nconst matchingIssue = issues.find(issue => \n  issue.customer_phone === customerPhone\n);\n\nif (matchingIssue) {\n  return [{\n    json: {\n      ...matchingIssue,\n      customer_message: $input.first().json.message,\n      satisfaction: $input.first().json.satisfaction\n    }\n  }];\n}\n\nreturn [];"
      },
      "name": "Code - Match Issue",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [1250, 200]
    },
    {
      "parameters": {
        "url": "https://seu-dominio.vercel.app/api/issues/resolve",
        "options": {},
        "bodyParametersJson": "={\n  \"issue_id\": \"{{$json.id}}\",\n  \"resolution_notes\": \"Cliente confirmou resolução. Mensagem: {{$json.customer_message}}\",\n  \"customer_satisfaction\": {{$json.satisfaction}},\n  \"resolved_by\": \"SYSTEM_AUTO\"\n}"
      },
      "name": "HTTP - Resolve Issue",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1450, 200]
    },
    {
      "parameters": {
        "respondWith": "allIncomingItems",
        "options": {}
      },
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [1650, 200]
    }
  ],
  "connections": {
    "Webhook - WhatsApp Message": {
      "main": [[{ "node": "Google Gemini - Analyze Response", "type": "main", "index": 0 }]]
    },
    "Google Gemini - Analyze Response": {
      "main": [[{ "node": "Code - Parse JSON", "type": "main", "index": 0 }]]
    },
    "Code - Parse JSON": {
      "main": [[{ "node": "Filter - Is Resolved & Positive", "type": "main", "index": 0 }]]
    },
    "Filter - Is Resolved & Positive": {
      "main": [[{ "node": "HTTP - Find Issue by Phone", "type": "main", "index": 0 }]]
    },
    "HTTP - Find Issue by Phone": {
      "main": [[{ "node": "Code - Match Issue", "type": "main", "index": 0 }]]
    },
    "Code - Match Issue": {
      "main": [[{ "node": "HTTP - Resolve Issue", "type": "main", "index": 0 }]]
    },
    "HTTP - Resolve Issue": {
      "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]]
    }
  }
}
```

**Como Usar**:
1. Copie o JSON acima
2. No n8n: Settings → Import from File → Cole o JSON
3. Atualize os domínios e credentials
4. Configure sua Google Gemini API credential
5. Ative o workflow
6. Configure Evolution API para enviar mensagens recebidas para este webhook
7. Quando cliente confirmar resolução com sentimento positivo, issue será auto-resolvido

---

## 🔧 Configuração Passo a Passo

### 1. Pré-requisitos

- ✅ n8n instalado e rodando
- ✅ Credenciais configuradas:
  - Google Gemini API Key
  - Evolution API URL + Token
  - Supabase URL + Service Role Key (se necessário)

### 2. Importar Workflows

1. Acesse n8n → **Workflows** → **Import from File**
2. Cole cada JSON acima (um por vez)
3. Salve cada workflow

### 3. Configurar Credentials

#### Google Gemini API
1. Acesse [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crie uma API Key
3. No n8n: **Credentials** → **Add Credential** → **Google Gemini API**
4. Cole a API Key
5. Salve

#### Evolution API
1. Obtenha URL da sua Evolution API
2. Obtenha API Token
3. No n8n: **Credentials** → **Add Credential** → **HTTP Header Auth**
4. Header: `apikey`
5. Value: `seu-token`
6. Salve

### 4. Atualizar URLs nos Workflows

Substitua `seu-dominio.vercel.app` pela URL real do seu dashboard:
- Desenvolvimento: `http://localhost:3000`
- Produção: `https://seu-app.vercel.app`

### 5. Testar Workflows

#### Workflow 1: Auto-Criar Issues
```bash
curl -X POST https://n8n.seu-dominio.com/webhook/alert-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-alert-123",
    "severity": "critical",
    "alert_type": "customer_complaint",
    "affected_team_members": ["João Silva"]
  }'
```

#### Workflow 2: Resposta Automática
1. Crie um issue crítico manualmente no dashboard
2. Aguarde 5 minutos
3. Verifique se recebeu WhatsApp
4. Verifique ação registrada no issue

#### Workflow 3: Auto-Resolver
```bash
curl -X POST https://n8n.seu-dominio.com/webhook/whatsapp-message \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+5511999999999",
    "message": "Obrigado! O problema foi resolvido!"
  }'
```

---

## 📊 Monitoramento dos Workflows

### KPIs para Acompanhar

1. **Workflow 1 - Auto-Criar Issues**
   - ✅ Issues criados automaticamente vs manualmente
   - ✅ Taxa de sucesso (200 OK)
   - ⚠️ Alertas perdidos (erros 500)

2. **Workflow 2 - Resposta Automática**
   - ✅ Issues respondidos em <5min
   - ✅ Taxa de sucesso no envio WhatsApp
   - ⚠️ Issues sem número de telefone

3. **Workflow 3 - Auto-Resolver**
   - ✅ Issues auto-resolvidos vs manualmente
   - ✅ Satisfação média dos auto-resolvidos
   - ⚠️ Falsos positivos (resolvido mas não estava)

### Dashboard n8n

Acesse **Executions** de cada workflow para ver:
- Total de execuções
- Taxa de sucesso
- Tempo médio de execução
- Erros recentes

---

## 🚀 Otimizações Avançadas

### 1. Reduzir Intervalo de Resposta (30s target - Musk Level)

Atualmente: 5 minutos
Meta: 30 segundos

**Como**:
```json
{
  "rule": {
    "interval": [
      {
        "field": "seconds",
        "secondsInterval": 30
      }
    ]
  }
}
```

⚠️ **Atenção**: Isso aumenta uso de recursos. Monitore custos da API Gemini.

### 2. Priorização Inteligente

Adicionar filtro para responder primeiro os mais urgentes:

```json
{
  "parameters": {
    "url": "https://seu-dominio.vercel.app/api/issues/open?priority=critical&limit=5",
  }
}
```

Depois criar segundo workflow para `priority=high` com intervalo de 10min.

### 3. Contexto da Conversa

Salvar histórico de mensagens e incluir no prompt da IA:

```javascript
// No node Code
const previousMessages = await supabase
  .from('issue_actions')
  .select('action_description')
  .eq('issue_id', $json.id)
  .order('taken_at', { ascending: false })
  .limit(5);

const context = previousMessages.map(m => m.action_description).join('\n');

return [{
  json: {
    ...$json,
    conversation_context: context
  }
}];
```

Depois no prompt Gemini:
```
Histórico da conversa:
{{$json.conversation_context}}

Nova mensagem do cliente:
{{$json.customer_message}}

Gere resposta considerando o histórico.
```

### 4. Escalação Automática

Se issue não resolver em 2h, escalar para humano:

```json
{
  "name": "MIS - Auto Escalate Stuck Issues",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [{ "field": "hours", "hoursInterval": 1 }]
        }
      },
      "name": "Schedule - Every 1h"
    },
    {
      "parameters": {
        "url": "https://seu-dominio.vercel.app/api/issues/open"
      },
      "name": "HTTP - Get Open Issues"
    },
    {
      "parameters": {
        "jsCode": "// Filter issues stuck for >2h\nconst now = new Date();\nconst twoHoursAgo = new Date(now - 2*60*60*1000);\n\nconst stuckIssues = $input.first().json.issues.filter(issue => {\n  const detectedAt = new Date(issue.detected_at);\n  return detectedAt < twoHoursAgo && issue.status !== 'escalated';\n});\n\nreturn stuckIssues.map(issue => ({ json: issue }));"
      },
      "name": "Code - Filter Stuck >2h"
    },
    {
      "parameters": {
        "url": "=https://seu-dominio.vercel.app/api/issues/{{$json.id}}",
        "method": "PATCH",
        "bodyParametersJson": "={\n  \"status\": \"escalated\",\n  \"escalated_to\": \"team_lead\"\n}"
      },
      "name": "HTTP - Escalate Issue"
    },
    {
      "parameters": {
        "url": "https://hooks.slack.com/services/seu-webhook",
        "bodyParametersJson": "={\n  \"text\": \"🚨 Issue escalado! {{$json.issue_type}} - Cliente: {{$json.customer_name}} - Tempo: >2h\"\n}"
      },
      "name": "HTTP - Notify Slack"
    }
  ]
}
```

---

## 🎯 Roadmap de Automação

### Fase 1: Semi-Automação (Semana 1-2) ✅
- [x] Workflow 1: Auto-criar issues ✅
- [x] Workflow 2: Resposta automática ✅
- [x] Workflow 3: Auto-resolver confirmados ✅

### Fase 2: Automação Inteligente (Semana 3-4)
- [ ] Workflow 4: Escalação automática >2h
- [ ] Workflow 5: Predição de problemas (antes de cliente reclamar)
- [ ] Workflow 6: Análise de padrões (top issues recorrentes)

### Fase 3: Full Automation (Mês 2)
- [ ] Fine-tune modelo Gemini com histórico de resoluções bem-sucedidas
- [ ] Sistema aprende sozinho melhores respostas
- [ ] 95% de automação, 30s resposta
- [ ] Intervenção humana apenas em casos complexos

---

## 📝 Checklist de Go-Live

Antes de colocar em produção:

### Pré-Produção
- [ ] Todos workflows importados e salvos
- [ ] Credentials configuradas corretamente
- [ ] URLs atualizadas para produção
- [ ] Testes realizados com dados reais
- [ ] Monitoramento configurado

### Produção
- [ ] Iniciar com intervalo conservador (10min)
- [ ] Monitorar execuções por 24h
- [ ] Validar taxa de sucesso >90%
- [ ] Ajustar intervalo gradualmente (5min → 1min → 30s)
- [ ] Configurar alertas para erros

### Pós-Produção
- [ ] Medir CRT antes vs depois
- [ ] Medir % automação atingida
- [ ] Coletar feedback da equipe
- [ ] Otimizar prompts da IA
- [ ] Documentar casos edge

---

## 🆘 Suporte

### Erros Comuns

1. **"Cannot find module '@n8n/n8n-nodes-langchain'"**
   - Solução: Instalar pacote n8n-nodes-langchain
   - `npm install @n8n/n8n-nodes-langchain`

2. **"Unauthorized" ao chamar APIs**
   - Solução: Verificar SUPABASE_SERVICE_ROLE_KEY no .env
   - Verificar token Evolution API

3. **"Issue not found" ao auto-resolver**
   - Solução: Certificar que customer_phone está sendo salvo corretamente
   - Verificar formato do número (+55...)

4. **Gemini não responde**
   - Solução: Verificar quota da API Key
   - Testar com modelo menor (gemini-1.5-flash)

---

## 🎉 Pronto!

Agora você tem 3 workflows prontos para:
1. ✅ Auto-criar issues de alertas críticos
2. ✅ Responder automaticamente em <5min
3. ✅ Auto-resolver quando cliente confirmar

**Próximo passo**: Ativar os workflows e começar a medir o CRT! 🚀