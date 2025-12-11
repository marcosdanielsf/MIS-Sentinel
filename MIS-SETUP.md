# MOTTIVME INTELLIGENCE SYSTEM (MIS) - Setup

## 📋 Passo 1: Criar Schema e Tabelas no Supabase

1. Acesse o SQL Editor do Supabase:
   https://supabase.com/dashboard/project/bfumywvwubvernvhjehk/sql

2. Cole TODO o conteúdo do arquivo `scripts/create-mis-tables.sql`

3. Clique em **RUN** para executar

4. Verifique se as tabelas foram criadas:
   - mottivme_intelligence_system.messages
   - mottivme_intelligence_system.alerts
   - mottivme_intelligence_system.alert_recipients
   - mottivme_intelligence_system.profiles

## 📊 Passo 2: Popular com Dados de Exemplo

Após criar o schema, execute:

```bash
npm run setup-mis-data
```

Ou manualmente:

```bash
npx tsx scripts/populate-mis-data.ts
```

## 🎯 Estrutura do Sistema

### Messages (Mensagens)
Armazena todas as mensagens do WhatsApp capturadas pelo n8n:
- Conteúdo da mensagem
- Remetente e grupo
- Análise de sentimento (AI)
- Score de urgência (0-10)
- Tópicos-chave extraídos

### Alerts (Alertas)
Alertas gerados pela análise AI das mensagens:
- Tipo: bottleneck, opportunity, urgent_request, pattern_detected
- Severidade: low, medium, high, critical
- Ações sugeridas
- Status: active, acknowledged, resolved, dismissed

### Alert Recipients (Destinatários)
Quem deve ser notificado sobre cada alerta

### Profiles (Perfis)
Membros da equipe monitorados:
- Marcos Daniel (CEO)
- Isabella
- Allesson
- Arthur
- Hallen

## 🔗 Integração com n8n

O workflow n8n deve salvar dados nas tabelas usando o nó Supabase:

```
Webhook (WhatsApp) →
  Gemini AI (Análise) →
    Supabase (Salvar message) →
      Se urgência > 7 → Criar alert
```

## 🚀 Executar Dashboard

```bash
npm run dev
```

Acesse: http://localhost:3000

## 📱 URLs Importantes

- **Dashboard Vercel**: https://admin-dashboard-[seu-deploy].vercel.app
- **Supabase Project**: https://supabase.com/dashboard/project/bfumywvwubvernvhjehk
- **n8n Workflow**: https://cliente-a1.mentorfy.io/workflow/wnceqwQ2x01AX5pg/5ace1f
- **Webhook**: https://cliente-a1.mentorfy.io/webhook/grupo-bposs