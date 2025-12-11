# 🚀 N8N WORKFLOW - GUIA RÁPIDO DE CONFIGURAÇÃO

## ✅ PRÉ-REQUISITOS

Antes de começar, você precisa ter:

1. ✅ Sistema MIS SENTINEL funcionando (já está!)
2. ✅ Conta n8n ativa
3. 🔑 Google Gemini API Key ([obter aqui](https://makersuite.google.com/app/apikey))
4. 🔑 Evolution API configurada para WhatsApp

---

## 📥 PASSO 1: IMPORTAR WORKFLOW

1. Acesse seu n8n
2. Clique em **"Import from File"**
3. Selecione: `MIS - Auto Response to Critical Issues.json`
4. Clique em **"Import"**

---

## 🔧 PASSO 2: CONFIGURAR HEADERS (MUITO IMPORTANTE!)

Em **CADA** node HTTP Request, adicione o header de autenticação:

### **Nodes que precisam do header:**
1. `HTTP - Get Open Critical Issues`
2. `HTTP - Log Action in CRT`
3. `HTTP - Log No Phone`

### **Como adicionar:**

No node HTTP Request, vá em **"Headers"** e adicione:

```
Name: x-vercel-protection-bypass
Value: k0YEgeZz2JylRDNETMuJKnk4SpUWTaeH
```

---

## 🌐 PASSO 3: ATUALIZAR URLs

Substitua todas as URLs placeholder por:

### **Base URL:**
```
https://admin-dashboard-6pr21y8gx-marcosdanielsfs-projects.vercel.app
```

### **URLs Completas:**

**Node "HTTP - Get Open Critical Issues":**
```
GET https://admin-dashboard-6pr21y8gx-marcosdanielsfs-projects.vercel.app/api/issues/open?priority=critical&limit=10
```

**Node "HTTP - Log Action in CRT":**
```
POST https://admin-dashboard-6pr21y8gx-marcosdanielsfs-projects.vercel.app/api/issues/action
```

**Node "HTTP - Log No Phone":**
```
POST https://admin-dashboard-6pr21y8gx-marcosdanielsfs-projects.vercel.app/api/issues/action
```

---

## 🤖 PASSO 4: CONFIGURAR GOOGLE GEMINI

### **Opção A: Usar HTTP Request Node (Recomendado)**

No node **"Google Gemini - Generate Response"**:

**URL:**
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=SUA_API_KEY_AQUI
```

**Method:** `POST`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "contents": [{
    "parts": [{"text": "{{$json.ai_prompt}}"}]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 500
  }
}
```

### **Opção B: Usar n8n Native Node**

1. Instalar: `npm install @n8n/n8n-nodes-langchain`
2. Adicionar node: **"Google Gemini Chat Model"**
3. Configurar API Key nas credentials

---

## 📱 PASSO 5: CONFIGURAR EVOLUTION API (WhatsApp)

No node **"HTTP - Send WhatsApp"**:

**URL:**
```
https://SUA-EVOLUTION-API.com/message/sendText
```

**Method:** `POST`

**Headers:**
```json
{
  "apikey": "SEU_TOKEN_EVOLUTION",
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "number": "{{$json.customer_phone}}",
  "text": "{{$json.ai_response}}"
}
```

---

## ⏱️ PASSO 6: CONFIGURAR TRIGGER

No node **"Schedule Trigger"**:

**Configuração Inicial (Teste):**
- Interval: `Every 5 minutes`

**Configuração Produção (Depois dos testes):**
- Interval: `Every 1 minute` (meta Musk!)

---

## ✅ PASSO 7: ATIVAR WORKFLOW

1. Clique no toggle superior direito (deve ficar verde)
2. O workflow começará a executar automaticamente

---

## 🧪 TESTE COMPLETO

### **1. Criar Issue de Teste**

```bash
curl -X POST 'https://admin-dashboard-6pr21y8gx-marcosdanielsfs-projects.vercel.app/api/issues/create' \
  -H 'x-vercel-protection-bypass: k0YEgeZz2JylRDNETMuJKnk4SpUWTaeH' \
  -H 'Content-Type: application/json' \
  -d '{
    "issue_type": "customer_complaint",
    "customer_name": "João Silva",
    "customer_phone": "+5511999999999",
    "priority": "critical"
  }'
```

### **2. Verificar Execução no n8n**

1. Aguardar 5 minutos (ou executar manualmente)
2. Ir em **"Executions"** no n8n
3. Verificar se workflow executou com sucesso

### **3. Verificar Resposta IA**

No log de execução, procure pelo node **"Google Gemini"** e veja a resposta gerada.

### **4. Verificar Dashboard**

Acesse: `https://admin-dashboard-6pr21y8gx-marcosdanielsfs-projects.vercel.app/crt`

Você deve ver:
- ✅ Issue criado
- ✅ Ação registrada ("automated_response")
- ✅ Timestamp da primeira resposta (first_response_at)

---

## 📊 MÉTRICAS DE SUCESSO

### **Semana 1 (Meta):**
- ⏱️ Tempo de resposta: De ~60min → **<5min**
- 🤖 Taxa de automação: **60-70%**
- ✅ Taxa de sucesso envio: **≥95%**

### **Mês 2 (Meta Musk):**
- ⚡ Tempo de resposta: **<30 segundos**
- 🚀 Taxa de automação: **95%**
- 🎯 Satisfação cliente: **≥4.5/5**

---

## 🔥 TROUBLESHOOTING

### **Erro: 401 Unauthorized**
**Solução:** Verificar se header `x-vercel-protection-bypass` está em TODOS os nodes HTTP

### **Erro: Workflow não executa**
**Solução:**
1. Verificar se workflow está ativado (toggle verde)
2. Verificar credenciais Gemini e Evolution API
3. Executar manualmente para testar

### **Erro: IA não responde**
**Solução:**
1. Verificar se API Key do Gemini está correta
2. Testar URL do Gemini no Postman
3. Verificar quota da API

### **Erro: WhatsApp não envia**
**Solução:**
1. Verificar se Evolution API está online
2. Testar envio manual via Postman
3. Verificar formato do número (+55...)

---

## 🎯 CHECKLIST FINAL

Antes de colocar em produção, verifique:

- [ ] Header `x-vercel-protection-bypass` em todos os nodes HTTP
- [ ] URLs atualizadas para produção
- [ ] Google Gemini API Key configurada
- [ ] Evolution API configurada e testada
- [ ] Workflow ativado
- [ ] Teste completo executado com sucesso
- [ ] Dashboard mostrando métricas
- [ ] Trigger configurado (5min ou 1min)

---

## 🚀 PRÓXIMA FASE

Depois que estiver funcionando:

1. **Otimizar Prompts IA** - Fine-tune para respostas melhores
2. **Reduzir Intervalo** - De 5min para 1min
3. **Adicionar Escalação** - Auto-escalar para humano se necessário
4. **Monitorar CRT** - Acompanhar métricas diariamente

---

**Status:** ✅ Sistema 100% pronto para n8n
**Meta:** 🚀 95% de automação + <30s resposta (Musk Level)