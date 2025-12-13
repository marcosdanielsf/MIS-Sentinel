-- ============================================================================
-- FIX: Query para buscar messages recentes (7 dias)
-- PROBLEMA: A query original usava colunas que não existem
--   - content -> deve ser message_body
--   - sender_name está ok mas também tem group_sender_name
--   - direction -> não existe na tabela
-- ============================================================================

-- Estrutura REAL da tabela messages (baseado no código existente):
-- id, created_at, sender_name, sender_phone, sender_type, message_body,
-- sentiment, urgency_score, needs_attention, keywords, is_group_message,
-- group_type, group_name, group_sender_phone, group_sender_name,
-- team_analysis, workflow_name, location_name

-- ============================================================================
-- QUERY CORRIGIDA para N8N - Buscar Messages Recentes (7 dias)
-- ============================================================================

SELECT
  id,
  message_body as content,  -- alias para manter compatibilidade
  sentiment,
  urgency_score,
  COALESCE(group_sender_name, sender_name) as sender_name,
  group_name,
  'inbound' as direction,  -- valor fixo já que não existe a coluna
  created_at
FROM mottivme_intelligence_system.messages
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 200;

-- ============================================================================
-- ALTERNATIVA: Query mais completa com todos os campos úteis
-- ============================================================================

SELECT
  id,
  group_name,
  sender_name,
  sender_phone,
  group_sender_name,
  group_sender_phone,
  message_body,
  sentiment,
  urgency_score,
  needs_attention,
  keywords,
  is_group_message,
  group_type,
  team_analysis,
  workflow_name,
  location_name,
  created_at
FROM mottivme_intelligence_system.messages
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 200;

-- ============================================================================
-- VIEW para facilitar queries do N8N (RECOMENDADO)
-- ============================================================================

DROP VIEW IF EXISTS public.recent_messages_7days;
CREATE VIEW public.recent_messages_7days AS
SELECT
  id,
  message_id,
  group_name,
  group_id,
  sender_name,
  sender_phone,
  message_content as content,  -- alias para compatibilidade
  message_content,
  timestamp,
  sentiment,
  urgency_score,
  category,
  key_topics,
  'inbound' as direction,  -- campo virtual
  created_at
FROM mottivme_intelligence_system.messages
WHERE timestamp >= NOW() - INTERVAL '7 days';

GRANT SELECT ON public.recent_messages_7days TO anon, authenticated, service_role;

-- ============================================================================
-- VIEW para mensagens com análise de sentimento
-- ============================================================================

DROP VIEW IF EXISTS public.messages_sentiment_analysis;
CREATE VIEW public.messages_sentiment_analysis AS
SELECT
  id,
  sender_name,
  group_name,
  message_content,
  sentiment,
  urgency_score,
  category,
  timestamp,
  CASE
    WHEN sentiment = 'negative' AND urgency_score >= 7 THEN 'critical'
    WHEN sentiment = 'negative' OR urgency_score >= 5 THEN 'attention'
    ELSE 'normal'
  END as alert_level
FROM mottivme_intelligence_system.messages
WHERE timestamp >= NOW() - INTERVAL '7 days'
ORDER BY
  CASE WHEN sentiment = 'negative' THEN 0 ELSE 1 END,
  urgency_score DESC NULLS LAST,
  timestamp DESC;

GRANT SELECT ON public.messages_sentiment_analysis TO anon, authenticated, service_role;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

SELECT 'Views de messages criadas com sucesso!' as status;

-- Verificar colunas da tabela messages
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'mottivme_intelligence_system'
AND table_name = 'messages'
ORDER BY ordinal_position;

-- Testar view
SELECT * FROM public.recent_messages_7days LIMIT 5;
