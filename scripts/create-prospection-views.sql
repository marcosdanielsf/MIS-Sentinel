-- ============================================================================
-- PROSPECTION VIEWS - Extrair prospecções das mensagens do Lucas
-- Não cria tabela nova - usa dados REAIS da tabela messages
-- ============================================================================

-- ============================================================================
-- 1. VIEW: Mensagens de Prospecção do Lucas (dados brutos)
-- Detecta mensagens com padrão: "Nome X novos seguidores" ou "Nome X seguidores"
-- ============================================================================

CREATE OR REPLACE VIEW mottivme_intelligence_system.lucas_prospection_messages AS
SELECT
  id,
  created_at,
  message_body,
  group_sender_name,
  group_name,
  TRIM(REGEXP_REPLACE(message_body, '\s*\d+\s*(novos?\s+)?seguidores?.*', '', 'i')) as client_name_extracted,
  (REGEXP_MATCH(message_body, '(\d+)\s*(novos?\s+)?seguidores?', 'i'))[1]::INTEGER as followers_count,
  DATE(created_at) as report_date
FROM mottivme_intelligence_system.messages
WHERE
  (LOWER(group_sender_name) LIKE '%lucas%' OR message_body ILIKE '%lucas%')
  AND message_body ~ '\d+\s*(novos?\s+)?seguidores?'
ORDER BY created_at DESC;

-- ============================================================================
-- 2. VIEW: Totais Diários de Prospecção por Cliente
-- ============================================================================

CREATE OR REPLACE VIEW mottivme_intelligence_system.daily_prospection_by_client AS
SELECT
  DATE(created_at) as report_date,
  TRIM(REGEXP_REPLACE(message_body, '\s*\d+\s*(novos?\s+)?seguidores?.*', '', 'i')) as client_name,
  SUM((REGEXP_MATCH(message_body, '(\d+)\s*(novos?\s+)?seguidores?', 'i'))[1]::INTEGER) as total_followers,
  COUNT(*) as messages_count,
  MAX(created_at) as last_update
FROM mottivme_intelligence_system.messages
WHERE
  (LOWER(group_sender_name) LIKE '%lucas%' OR message_body ILIKE '%lucas%')
  AND message_body ~ '\d+\s*(novos?\s+)?seguidores?'
GROUP BY DATE(created_at), TRIM(REGEXP_REPLACE(message_body, '\s*\d+\s*(novos?\s+)?seguidores?.*', '', 'i'))
ORDER BY report_date DESC, total_followers DESC;

-- ============================================================================
-- 3. VIEW: Ranking de Clientes (Total Acumulado)
-- ============================================================================

CREATE OR REPLACE VIEW mottivme_intelligence_system.client_prospection_ranking AS
SELECT
  TRIM(REGEXP_REPLACE(message_body, '\s*\d+\s*(novos?\s+)?seguidores?.*', '', 'i')) as client_name,
  SUM((REGEXP_MATCH(message_body, '(\d+)\s*(novos?\s+)?seguidores?', 'i'))[1]::INTEGER) as total_followers,
  COUNT(*) as total_reports,
  COUNT(DISTINCT DATE(created_at)) as days_reported,
  ROUND(AVG((REGEXP_MATCH(message_body, '(\d+)\s*(novos?\s+)?seguidores?', 'i'))[1]::INTEGER), 1) as avg_daily_followers,
  MIN(DATE(created_at)) as first_report,
  MAX(DATE(created_at)) as last_report
FROM mottivme_intelligence_system.messages
WHERE
  (LOWER(group_sender_name) LIKE '%lucas%' OR message_body ILIKE '%lucas%')
  AND message_body ~ '\d+\s*(novos?\s+)?seguidores?'
GROUP BY TRIM(REGEXP_REPLACE(message_body, '\s*\d+\s*(novos?\s+)?seguidores?.*', '', 'i'))
ORDER BY total_followers DESC;

-- ============================================================================
-- 4. VIEW: Resumo Semanal (últimos 7 dias)
-- ============================================================================

CREATE OR REPLACE VIEW mottivme_intelligence_system.weekly_prospection_summary AS
SELECT
  TRIM(REGEXP_REPLACE(message_body, '\s*\d+\s*(novos?\s+)?seguidores?.*', '', 'i')) as client_name,
  SUM((REGEXP_MATCH(message_body, '(\d+)\s*(novos?\s+)?seguidores?', 'i'))[1]::INTEGER) as followers_7d,
  COUNT(*) as reports_7d,
  COUNT(DISTINCT DATE(created_at)) as active_days
FROM mottivme_intelligence_system.messages
WHERE
  (LOWER(group_sender_name) LIKE '%lucas%' OR message_body ILIKE '%lucas%')
  AND message_body ~ '\d+\s*(novos?\s+)?seguidores?'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY TRIM(REGEXP_REPLACE(message_body, '\s*\d+\s*(novos?\s+)?seguidores?.*', '', 'i'))
ORDER BY followers_7d DESC;

-- ============================================================================
-- 5. VIEW: Totais Gerais (KPIs)
-- ============================================================================

CREATE OR REPLACE VIEW mottivme_intelligence_system.prospection_kpis AS
SELECT
  COUNT(DISTINCT TRIM(REGEXP_REPLACE(message_body, '\s*\d+\s*(novos?\s+)?seguidores?.*', '', 'i'))) as total_clients,
  COALESCE(SUM((REGEXP_MATCH(message_body, '(\d+)\s*(novos?\s+)?seguidores?', 'i'))[1]::INTEGER), 0) as total_followers_all_time,
  COUNT(*) as total_reports,
  COUNT(DISTINCT DATE(created_at)) as total_days_reported,
  ROUND(AVG((REGEXP_MATCH(message_body, '(\d+)\s*(novos?\s+)?seguidores?', 'i'))[1]::INTEGER), 1) as avg_followers_per_report,
  COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days'
      THEN (REGEXP_MATCH(message_body, '(\d+)\s*(novos?\s+)?seguidores?', 'i'))[1]::INTEGER
      ELSE 0 END), 0) as followers_last_7d,
  COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days'
      THEN (REGEXP_MATCH(message_body, '(\d+)\s*(novos?\s+)?seguidores?', 'i'))[1]::INTEGER
      ELSE 0 END), 0) as followers_last_30d,
  COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE
      THEN (REGEXP_MATCH(message_body, '(\d+)\s*(novos?\s+)?seguidores?', 'i'))[1]::INTEGER
      ELSE 0 END), 0) as followers_today
FROM mottivme_intelligence_system.messages
WHERE
  (LOWER(group_sender_name) LIKE '%lucas%' OR message_body ILIKE '%lucas%')
  AND message_body ~ '\d+\s*(novos?\s+)?seguidores?';

-- ============================================================================
-- 6. VIEWS NO PUBLIC SCHEMA (para API Supabase)
-- ============================================================================

DROP VIEW IF EXISTS public.lucas_prospection_messages;
CREATE VIEW public.lucas_prospection_messages AS
SELECT * FROM mottivme_intelligence_system.lucas_prospection_messages;

DROP VIEW IF EXISTS public.daily_prospection_by_client;
CREATE VIEW public.daily_prospection_by_client AS
SELECT * FROM mottivme_intelligence_system.daily_prospection_by_client;

DROP VIEW IF EXISTS public.client_prospection_ranking;
CREATE VIEW public.client_prospection_ranking AS
SELECT * FROM mottivme_intelligence_system.client_prospection_ranking;

DROP VIEW IF EXISTS public.weekly_prospection_summary;
CREATE VIEW public.weekly_prospection_summary AS
SELECT * FROM mottivme_intelligence_system.weekly_prospection_summary;

DROP VIEW IF EXISTS public.prospection_kpis;
CREATE VIEW public.prospection_kpis AS
SELECT * FROM mottivme_intelligence_system.prospection_kpis;

-- ============================================================================
-- 7. PERMISSÕES
-- ============================================================================

GRANT SELECT ON public.lucas_prospection_messages TO anon, authenticated, service_role;
GRANT SELECT ON public.daily_prospection_by_client TO anon, authenticated, service_role;
GRANT SELECT ON public.client_prospection_ranking TO anon, authenticated, service_role;
GRANT SELECT ON public.weekly_prospection_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.prospection_kpis TO anon, authenticated, service_role;

-- ============================================================================
-- 8. VERIFICAÇÃO
-- ============================================================================

SELECT 'Views de Prospecção criadas com sucesso!' as status;

-- Ver mensagens do Lucas com dados de prospecção
SELECT * FROM mottivme_intelligence_system.lucas_prospection_messages LIMIT 10;

-- Ver ranking de clientes
SELECT * FROM mottivme_intelligence_system.client_prospection_ranking;

-- Ver KPIs
SELECT * FROM mottivme_intelligence_system.prospection_kpis;
