# 📱 EVOLUTION API - CONFIGURAÇÃO PARA N8N

## ✅ Workflow Funcionando!

O workflow **`MIS - Auto Response FINAL WORKING.json`** está 100% funcional com:
- ✅ Busca issues críticos
- ✅ AI Agent gerando respostas com Gemini
- ✅ Processamento de múltiplos issues
- ✅ Log no CRT funcionando
- ⚠️ **Falta apenas:** Configurar Evolution API para enviar WhatsApp

---

## 🔧 COMO CONFIGURAR EVOLUTION API

### **Opção 1: Você já tem Evolution API configurada**

Se você já tem uma instância da Evolution API rodando:

1. Abra o workflow no n8n
2. Vá no node **"HTTP - Send WhatsApp"**
3. Substitua:
   - URL: `https://SUA-EVOLUTION-API.com/message/sendText` → sua URL real
   - Token: `SEU_TOKEN_EVOLUTION_AQUI` → seu token real

**Exemplo:**
```json
URL: https://evolution.mottivme.com/message/sendText
Token: ABC123XYZ456
```

---

### **Opção 2: Não tem Evolution API ainda**

#### **A. Instalar Evolution API localmente:**

```bash
# Via Docker (mais fácil)
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=sua-chave-secreta-aqui \
  atendai/evolution-api:latest

# Ou via NPM
npm install -g @evolution-api/evolution-api
evolution-api start
```

Depois disso, use:
- URL: `http://localhost:8080/message/sendText`
- Token: `sua-chave-secreta-aqui`

#### **B. Usar serviço hospedado:**

Existem provedores que hospedam Evolution API:
- [Z-API](https://www.z-api.io/)
- [ChatWoot](https://www.chatwoot.com/)
- Outros provedores comerciais

---

### **Opção 3: Testar SEM Evolution API primeiro**

Você pode desabilitar o envio de WhatsApp temporariamente e apenas logar as ações:

1. No node **"Filter - Has Phone"**:
   - Redirecione AMBOS os caminhos (TRUE e FALSE) para o node **"HTTP - Log No Phone"**

2. Ou simplesmente **desconecte** o node "HTTP - Send WhatsApp"

Assim o workflow vai:
- ✅ Buscar issues
- ✅ Gerar respostas AI
- ✅ Logar tudo no CRT
- ⏸️ Não enviar WhatsApp (temporariamente)

Você pode ver as respostas geradas no dashboard `/crt` em **"Actions"**.

---

## 🧪 TESTAR EVOLUTION API

### **1. Testar endpoint manualmente:**

```bash
curl -X POST 'https://sua-evolution-api.com/message/sendText' \
  -H 'apikey: seu-token' \
  -H 'Content-Type: application/json' \
  -d '{
    "number": "+5511999999999",
    "text": "Teste de mensagem automática"
  }'
```

### **2. Resposta esperada:**

```json
{
  "success": true,
  "messageId": "ABC123",
  "status": "sent"
}
```

---

## 📊 VERIFICAR SE ESTÁ FUNCIONANDO

### **Dashboard CRT:**
Acesse: `https://admin-dashboard-6pr21y8gx-marcosdanielsfs-projects.vercel.app/crt`

Você deve ver:
- ✅ **Issues criados** com status "open"
- ✅ **Actions** registradas pelo SYSTEM_AI_AGENT
- ✅ **First Response Time** preenchido
- ✅ Descrição da ação com preview da resposta AI

### **N8N Executions:**
No n8n, vá em **Executions** e veja:
- ✅ Issues buscados
- ✅ AI gerando respostas
- ✅ WhatsApp enviado (ou log de "sem telefone")
- ✅ CRT atualizado

---

## 🎯 PRÓXIMOS PASSOS

### **Curto Prazo (Semana 1):**
1. Configurar Evolution API
2. Testar com 1-2 issues reais
3. Ajustar prompts da IA se necessário
4. Reduzir intervalo para 2-3 minutos

### **Médio Prazo (Semana 2-3):**
1. Implementar workflow de auto-resolução
2. Adicionar escalação automática
3. Fine-tune dos prompts
4. Monitorar métricas CRT

### **Longo Prazo (Meta Musk - Mês 2):**
1. Intervalo de 1 minuto
2. Tempo de resposta <30 segundos
3. 95% de automação
4. IA aprende com feedbacks

---

## 🆘 TROUBLESHOOTING

### **WhatsApp não envia:**
1. Verificar se Evolution API está rodando
2. Testar endpoint manualmente com curl
3. Verificar se número está no formato correto (+55...)
4. Verificar logs do n8n

### **AI não responde:**
1. Verificar se Gemini credentials estão ok
2. Ver logs do AI Agent node
3. Testar prompt manualmente no Gemini

### **Issues não aparecem:**
1. Criar issue de teste via API
2. Verificar se prioridade é "critical"
3. Verificar se status é "open"

---

## ✅ STATUS ATUAL

- ✅ APIs funcionando
- ✅ Database configurado
- ✅ Dashboard CRT ativo
- ✅ N8N workflow funcionando
- ✅ AI Agent gerando respostas
- ⚠️ Evolution API: **PENDENTE CONFIGURAÇÃO**

**Você está a 1 passo da automação completa!** 🚀

---

## 📞 CONTATOS ÚTEIS

**Evolution API:**
- GitHub: https://github.com/EvolutionAPI/evolution-api
- Docs: https://doc.evolution-api.com/

**Alternativas:**
- Baileys (biblioteca base): https://github.com/WhiskeySockets/Baileys
- Venom Bot: https://github.com/orkestral/venom
- WPPConnect: https://github.com/wppconnect-team/wppconnect

---

**Data:** 28 de Novembro de 2025
**Status:** Sistema 95% pronto - falta apenas Evolution API