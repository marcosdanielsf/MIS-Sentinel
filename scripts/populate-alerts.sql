-- ============================================================================
-- POPULAR TABELA ALERTS - CORRIGIDO
-- ============================================================================

-- 1. CORRIGIR CONSTRAINT DE STATUS
ALTER TABLE mottivme_intelligence_system.alerts
DROP CONSTRAINT IF EXISTS alerts_status_check;

ALTER TABLE mottivme_intelligence_system.alerts
ADD CONSTRAINT alerts_status_check CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed'));

-- 2. ADICIONAR COLUNAS FALTANTES
ALTER TABLE mottivme_intelligence_system.alerts ADD COLUMN IF NOT EXISTS suggested_actions TEXT[];
ALTER TABLE mottivme_intelligence_system.alerts ADD COLUMN IF NOT EXISTS affected_team_members TEXT[];
ALTER TABLE mottivme_intelligence_system.alerts ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.8;
ALTER TABLE mottivme_intelligence_system.alerts ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;
ALTER TABLE mottivme_intelligence_system.alerts ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE mottivme_intelligence_system.alerts ADD COLUMN IF NOT EXISTS acknowledged_by TEXT;
ALTER TABLE mottivme_intelligence_system.alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE mottivme_intelligence_system.alerts ADD COLUMN IF NOT EXISTS resolved_by TEXT;

-- 3. ATUALIZAR REGISTROS COM STATUS INVÁLIDO
UPDATE mottivme_intelligence_system.alerts SET status = 'active' WHERE status NOT IN ('active', 'acknowledged', 'resolved', 'dismissed');

-- 4. INSERIR ALERTAS
INSERT INTO mottivme_intelligence_system.alerts
(alert_type, title, description, severity, status, affected_team_members, suggested_actions, confidence_score, ai_reasoning, created_at)
VALUES
('churn_risk', 'RISCO DE CHURN: 2 clientes querem cancelar', 'Dois clientes manifestaram intenção de cancelamento.', 'critical', 'active', ARRAY['Isabella Santos'], ARRAY['Ligar imediatamente'], 0.97, 'Análise de sentimento.', NOW() - INTERVAL '25 minutes'),
('technical_issue', 'INCIDENTE: Sistema com lentidão', '3 clientes reportaram problemas.', 'critical', 'active', ARRAY['Arthur Lima'], ARRAY['Verificar servidores'], 0.95, 'Múltiplos relatos.', NOW() - INTERVAL '40 minutes'),
('bottleneck', 'Gargalo: Pico de mensagens 9h-11h', '78% das mensagens chegam nesse horário.', 'high', 'active', ARRAY['Coordenador'], ARRAY['Realocar equipe'], 0.93, 'Análise de volume.', NOW() - INTERVAL '1 hour'),
('urgent_request', 'Cliente VIP com problema há 4 horas', 'Tech Solutions com chamado aberto.', 'high', 'active', ARRAY['Arthur Lima'], ARRAY['Escalar urgente'], 0.92, 'Cliente VIP.', NOW() - INTERVAL '3 hours'),
('automation_opportunity', 'Oportunidade: 25% sobre fatura', 'Perguntas repetitivas sobre fatura.', 'medium', 'active', ARRAY['Product Owner'], ARRAY['Criar bot'], 0.85, 'Padrão identificado.', NOW() - INTERVAL '2 hours'),
('milestone', 'Marco: Tempo resposta -23%', 'Tempo caiu de 8.2 para 6.3 min.', 'medium', 'active', ARRAY['Equipe'], ARRAY['Compartilhar conquista'], 0.88, 'Melhoria consistente.', NOW() - INTERVAL '5 hours'),
('pattern_detected', 'Padrão: Problemas de senha', '20% das mensagens sobre login.', 'low', 'active', ARRAY['Product Owner'], ARRAY['Revisar fluxo'], 0.82, 'Volume consistente.', NOW() - INTERVAL '6 hours'),
('feedback', 'Feedback positivo: 2 elogios', 'Clientes elogiaram atendimento.', 'low', 'acknowledged', ARRAY['Equipe'], ARRAY['Compartilhar'], 0.95, 'Sentimento positivo.', NOW() - INTERVAL '1 hour'),
('technical_issue', 'RESOLVIDO: Timeout corrigido', 'Problema de timeout corrigido.', 'high', 'resolved', ARRAY['DevOps'], ARRAY['Monitorar'], 0.91, 'Incidente resolvido.', NOW() - INTERVAL '1 day'),
('churn_risk', 'RESOLVIDO: Cliente retido', 'Finance Corp retido com desconto.', 'high', 'resolved', ARRAY['Isabella Santos'], ARRAY['Follow-up 30 dias'], 0.94, 'Retenção sucesso.', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- 5. VERIFICAÇÃO
SELECT 'Alertas: ' || COUNT(*) as total FROM mottivme_intelligence_system.alerts;
