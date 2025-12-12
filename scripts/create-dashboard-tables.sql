-- Script para criar tabelas de messages e alerts para o Dashboard
-- Executa apenas se as tabelas não existirem

-- ============================================
-- TABELA: messages
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content TEXT,
    sender_name VARCHAR(255),
    sender_phone VARCHAR(50),
    group_sender_name VARCHAR(255),
    group_name VARCHAR(255),
    message_type VARCHAR(50) DEFAULT 'text',
    sentiment VARCHAR(50) DEFAULT 'neutral',
    urgency_score INTEGER DEFAULT 0,
    processed BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Comentário na tabela
COMMENT ON TABLE public.messages IS 'Mensagens processadas pelo MIS Sentinel';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sentiment ON public.messages(sentiment);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_name);

-- ============================================
-- TABELA: alerts
-- ============================================
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'active',
    source VARCHAR(255),
    related_message_id UUID REFERENCES public.messages(id),
    assigned_to VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Comentário na tabela
COMMENT ON TABLE public.alerts IS 'Alertas gerados pelo sistema MIS Sentinel';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Políticas para messages
DROP POLICY IF EXISTS "Allow public read for messages" ON public.messages;
CREATE POLICY "Allow public read for messages" ON public.messages
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert for messages" ON public.messages;
CREATE POLICY "Allow public insert for messages" ON public.messages
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update for messages" ON public.messages;
CREATE POLICY "Allow public update for messages" ON public.messages
    FOR UPDATE USING (true);

-- Políticas para alerts
DROP POLICY IF EXISTS "Allow public read for alerts" ON public.alerts;
CREATE POLICY "Allow public read for alerts" ON public.alerts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert for alerts" ON public.alerts;
CREATE POLICY "Allow public insert for alerts" ON public.alerts
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update for alerts" ON public.alerts;
CREATE POLICY "Allow public update for alerts" ON public.alerts
    FOR UPDATE USING (true);

-- ============================================
-- DADOS DE EXEMPLO (apenas se as tabelas estiverem vazias)
-- ============================================

-- Inserir mensagens de exemplo apenas se não existirem
INSERT INTO public.messages (content, sender_name, group_sender_name, sentiment, urgency_score, created_at)
SELECT * FROM (VALUES
    ('Cliente solicitando informações sobre o produto X', 'João Silva', 'Equipe Vendas', 'neutral', 3, NOW() - INTERVAL '2 hours'),
    ('Urgente: Cliente com problema de pagamento', 'Maria Santos', 'Suporte', 'negative', 8, NOW() - INTERVAL '1 hour'),
    ('Feedback positivo sobre o atendimento', 'Carlos Lima', 'Equipe Vendas', 'positive', 2, NOW() - INTERVAL '30 minutes'),
    ('Reclamação sobre demora na entrega', 'Ana Costa', 'Suporte', 'negative', 7, NOW() - INTERVAL '3 hours'),
    ('Dúvida sobre garantia do produto', 'Pedro Alves', 'Equipe Vendas', 'neutral', 4, NOW() - INTERVAL '4 hours'),
    ('Cliente muito satisfeito com o serviço!', 'Lucia Ferreira', 'Suporte', 'positive', 1, NOW() - INTERVAL '5 hours'),
    ('Solicitação de cancelamento de pedido', 'Roberto Santos', 'Equipe Vendas', 'negative', 6, NOW() - INTERVAL '6 hours'),
    ('Pergunta sobre promoções ativas', 'Amanda Oliveira', 'Equipe Vendas', 'neutral', 2, NOW() - INTERVAL '7 hours'),
    ('Elogio ao atendente Carlos', 'Fernanda Lima', 'Suporte', 'positive', 1, NOW() - INTERVAL '1 day'),
    ('Problema técnico com o sistema', 'Marcos Silva', 'TI', 'negative', 9, NOW() - INTERVAL '1 day 2 hours')
) AS sample_data(content, sender_name, group_sender_name, sentiment, urgency_score, created_at)
WHERE NOT EXISTS (SELECT 1 FROM public.messages LIMIT 1);

-- Inserir alertas de exemplo apenas se não existirem
INSERT INTO public.alerts (title, description, severity, status, source, created_at)
SELECT * FROM (VALUES
    ('Alto volume de reclamações detectado', 'Aumento de 150% em reclamações nas últimas 2 horas', 'high', 'active', 'sentiment_analyzer', NOW() - INTERVAL '1 hour'),
    ('Cliente VIP com problema não resolvido', 'Cliente premium aguardando resposta há mais de 4 horas', 'critical', 'active', 'customer_monitor', NOW() - INTERVAL '30 minutes'),
    ('Padrão de insatisfação identificado', 'Múltiplas mensagens negativas sobre entregas', 'medium', 'active', 'pattern_detector', NOW() - INTERVAL '2 hours'),
    ('SLA de resposta em risco', '3 tickets próximos de exceder o tempo de resposta', 'high', 'active', 'sla_monitor', NOW() - INTERVAL '45 minutes'),
    ('Pico de mensagens detectado', 'Volume 200% acima do normal para este horário', 'low', 'resolved', 'volume_monitor', NOW() - INTERVAL '3 hours')
) AS sample_data(title, description, severity, status, source, created_at)
WHERE NOT EXISTS (SELECT 1 FROM public.alerts LIMIT 1);

-- ============================================
-- OUTPUT
-- ============================================
SELECT 'Tabelas messages e alerts criadas/verificadas com sucesso!' as status;

-- Verificar contagem de registros
SELECT 'messages' as tabela, COUNT(*) as registros FROM public.messages
UNION ALL
SELECT 'alerts' as tabela, COUNT(*) as registros FROM public.alerts;
