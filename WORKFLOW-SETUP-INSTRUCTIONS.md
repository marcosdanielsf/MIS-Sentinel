# 🚀 Configuração Final dos Workflows n8n - MIS SENTINEL

## ✅ INFORMAÇÕES DO SEU PROJETO

**Domínio Vercel**: `https://admin-dashboard-marcosdanielsfs-projects.vercel.app`
**Bypass Token**: `k0YEgeZz2JylRDNETMuJKnk4SpUWTaeH`

---

## 📋 PASSO A PASSO PARA CONFIGURAR

### **1. Importar Workflow Atualizado no n8n**

1. Abra seu n8n
2. Vá em **Workflows** → **Import from File**
3. Importe: `MIS - Auto Response to Critical Issues.json`

---

### **2. Adicionar Bypass Token em TODOS os nodes HTTP**

Para **CADA node HTTP Request** no workflow, você precisa adicionar o header de autenticação:

#### **Nodes que precisam do token:**

1. **HTTP - Get Open Critical Issues**
2. **HTTP - Send WhatsApp** (se chamar Evolution API em Vercel)
3. **HTTP - Log Action in CRT**
4. **HTTP - Log No Phone**

#### **Como adicionar o header:**

Para cada node HTTP acima:

1. Clique no node
2. Vá em **Headers**
3. Clique em **Add Parameter**
4. Configure assim:

```
Name: x-vercel-protection-bypass
Value: k0YEgeZz2JylRDNETMuJKnk4SpUWTaeH
```

---

### **3. Configurar URLs Corretas**

Todos os nodes HTTP que chamam sua API devem usar:

```
https://admin-dashboard-marcosdanielsfs-projects.vercel.app/api/issues/...
```

**Verificar nodes:**
- ✅ HTTP - Get Open Critical Issues: `/api/issues/open?priority=critical&limit=10`
- ✅ HTTP - Log Action in CRT: `/api/issues/action`
- ✅ HTTP - Log No Phone: `/api/issues/action`

---

### **4. Configurar Google Gemini API**

1. No node **"Google Gemini - Generate Response"**
2. Você precisa adicionar sua **API Key do Google Gemini**

#### **Como obter a API Key:**

1. Vá para: https://makersuite.google.com/app/apikey
2. Clique em **"Create API Key"**
3. Copie a key

#### **Como configurar no n8n:**

1. No node HTTP Request do Gemini
2. Em **Headers**, adicione:

```
Name: x-goog-api-key
Value: SUA_API_KEY_AQUI
```

3. A URL deve ser:
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=SUA_API_KEY_AQUI
```

---

### **5. Configurar Evolution API (WhatsApp)**

Se você usa Evolution API, configure:

1. No node **"HTTP - Send WhatsApp"**
2. Atualize a URL para sua Evolution API
3. Adicione o header `apikey` com seu token

**Exemplo:**
```
URL: https://sua-evolution-api.com/message/sendText
Header: apikey = seu-token-evolution
```

---

## 🧪 TESTAR O WORKFLOW

### **Teste 1: Buscar Issues Abertos**

Execute manualmente o workflow ou apenas o node **"HTTP - Get Open Critical Issues"**.

**Resultado esperado:**
```json
{
  "success": true,
  "issues": [],
  "count": 0
}
```

Se retornar isso, **FUNCIONOU!** ✅ (lista vazia porque ainda não tem issues)

**Se der erro 401**: Verifique se o bypass token está correto no header.

---

### **Teste 2: Criar Issue Manualmente**

Use o Bash para criar um issue de teste:

```bash
curl -X POST https://admin-dashboard-marcosdanielsfs-projects.vercel.app/api/issues/create \
  -H "Content-Type: application/json" \
  -H "x-vercel-protection-bypass: k0YEgeZz2JylRDNETMuJKnk4SpUWTaeH" \
  -d '{
    "issue_type": "test_automation",
    "customer_name": "Cliente Teste",
    "customer_phone": "+5511999999999",
    "priority": "critical"
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "issue": {
    "id": "uuid-aqui",
    ...
  }
}
```

---

### **Teste 3: Workflow Completo**

1. Crie um issue crítico (use o curl acima)
2. Execute o workflow manualmente
3. Aguarde processar
4. Verifique se a IA gerou resposta
5. Verifique se a ação foi registrada

---

## 📊 VERSÃO SIMPLIFICADA - EXEMPLO DE NODE HTTP

Aqui está como deve ficar o node **"HTTP - Get Open Critical Issues"**:

```json
{
  "parameters": {
    "method": "GET",
    "url": "https://admin-dashboard-marcosdanielsfs-projects.vercel.app/api/issues/open?priority=critical&limit=10",
    "authentication": "none",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "x-vercel-protection-bypass",
          "value": "k0YEgeZz2JylRDNETMuJKnk4SpUWTaeH"
        }
      ]
    },
    "options": {}
  },
  "name": "HTTP - Get Open Critical Issues",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4
}
```

---

## 🔧 TROUBLESHOOTING

### Erro: "Authorization failed - 401"
**Solução**: Adicionar/verificar header `x-vercel-protection-bypass`

### Erro: "Cannot reach Gemini API"
**Solução**:
1. Verificar API Key do Google Gemini
2. Verificar quota da API (pode ter limite gratuito atingido)
3. Usar modelo alternativo: `gemini-1.5-flash` (mais barato)

### Workflow não executa automaticamente
**Solução**:
1. Verificar se workflow está **ativado** (toggle no canto superior direito)
2. Verificar schedule (cada 5min está correto?)

### Issues não aparecem no dashboard
**Solução**:
1. Verificar se SQL foi executado no Supabase
2. Acessar: https://admin-dashboard-marcosdanielsfs-projects.vercel.app/crt
3. Login com suas credenciais

---

## ✅ CHECKLIST FINAL

Antes de ativar em produção:

- [ ] Workflow importado no n8n
- [ ] Bypass token adicionado em todos nodes HTTP
- [ ] URLs atualizadas para o domínio correto
- [ ] Google Gemini API configurada
- [ ] Evolution API configurada (se usar)
- [ ] Teste manual executado com sucesso
- [ ] Issue de teste criado e processado
- [ ] Workflow ativado

---

## 🎯 PRÓXIMO PASSO

Depois que tudo estiver funcionando:

1. **Modificar workflow existente** (`MIS - Auto Resolve Confirmed Issues.json`)
   - Adicionar nodes para criar issues automaticamente
   - Usar mesmo bypass token

2. **Reduzir intervalo** de 5min → 1min → 30s (gradualmente)

3. **Monitorar métricas** no dashboard `/crt`

4. **Atingir 60-70% de automação**!

---

## 📞 NEED HELP?

Se der algum erro, me mande:
1. Print do erro no n8n
2. Qual node está falhando
3. Response da API (se tiver)

Vou te ajudar a resolver! 🚀