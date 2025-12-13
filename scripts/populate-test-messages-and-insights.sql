-- ============================================================================
-- POPULAR MENSAGENS E INSIGHTS DE TESTE
-- Execute no Supabase para alimentar o sistema SENTINEL
-- ============================================================================

-- 1. ADICIONAR COLUNA processed_by_observer SE NÃO EXISTIR
-- ============================================================================
ALTER TABLE mottivme_intelligence_system.messages
ADD COLUMN IF NOT EXISTS processed_by_observer BOOLEAN DEFAULT FALSE;

-- 2. INSERIR MENSAGENS DE TESTE (simula conversas reais)
-- ============================================================================
INSERT INTO mottivme_intelligence_system.messages
(message_id, group_name, sender_name, sender_phone, message_body, sentiment, urgency_score, category, key_topics, sender_type, is_group_message, processed_by_observer, created_at)
VALUES

-- Mensagens sobre FATURA (padrão frequente)
('msg-001', 'Suporte Geral', 'Maria Silva', '5511999990001', 'Oi, não recebi minha fatura do mês passado. Podem me enviar?', 'neutral', 5, 'client_request', ARRAY['fatura', 'cobrança'], 'client', false, false, NOW() - INTERVAL '2 hours'),
('msg-002', 'Suporte Geral', 'João Santos', '5511999990002', 'Boa tarde! Preciso da segunda via da fatura de novembro', 'neutral', 4, 'client_request', ARRAY['fatura', 'segunda-via'], 'client', false, false, NOW() - INTERVAL '1 hour 50 minutes'),
('msg-003', 'Suporte Geral', 'Ana Costa', '5511999990003', 'Como faço pra consultar minha fatura? Não achei no portal', 'negative', 6, 'client_request', ARRAY['fatura', 'portal', 'dúvida'], 'client', false, false, NOW() - INTERVAL '1 hour 40 minutes'),
('msg-004', 'Suporte Geral', 'Pedro Lima', '5511999990004', 'Minha fatura veio errada, tem uma cobrança que não reconheço', 'negative', 8, 'client_request', ARRAY['fatura', 'cobrança', 'erro'], 'client', false, false, NOW() - INTERVAL '1 hour 30 minutes'),
('msg-005', 'Suporte Geral', 'Carla Souza', '5511999990005', 'Quando vence a fatura? É dia 10 né?', 'neutral', 3, 'client_request', ARRAY['fatura', 'vencimento'], 'client', false, false, NOW() - INTERVAL '1 hour 20 minutes'),

-- Mensagens sobre ACESSO/SENHA (outro padrão frequente)
('msg-006', 'Suporte Geral', 'Roberto Alves', '5511999990006', 'Esqueci minha senha e não consigo recuperar pelo email', 'negative', 7, 'client_request', ARRAY['senha', 'acesso', 'problema'], 'client', false, false, NOW() - INTERVAL '1 hour 10 minutes'),
('msg-007', 'Suporte Geral', 'Fernanda Lima', '5511999990007', 'Tentei fazer login mas diz que usuário não existe', 'negative', 6, 'client_request', ARRAY['login', 'erro', 'acesso'], 'client', false, false, NOW() - INTERVAL '1 hour'),
('msg-008', 'Suporte Geral', 'Marcos Oliveira', '5511999990008', 'Como crio um novo usuário pra minha equipe?', 'neutral', 4, 'client_request', ARRAY['usuário', 'criar', 'equipe'], 'client', false, false, NOW() - INTERVAL '55 minutes'),
('msg-009', 'Suporte Geral', 'Julia Santos', '5511999990009', 'O link de recuperar senha não funciona, diz que expirou', 'negative', 7, 'client_request', ARRAY['senha', 'link', 'expirado'], 'client', false, false, NOW() - INTERVAL '50 minutes'),

-- Mensagens sobre LENTIDÃO/PROBLEMAS TÉCNICOS
('msg-010', 'Suporte Técnico', 'Tech Solutions', '5511999990010', 'O sistema tá muito lento hoje, demora pra carregar o dashboard', 'negative', 8, 'technical_issue', ARRAY['lentidão', 'dashboard', 'performance'], 'client', false, false, NOW() - INTERVAL '45 minutes'),
('msg-011', 'Suporte Técnico', 'Digital Marketing', '5511999990011', 'Desde ontem o relatório não carrega, fica na tela branca', 'negative', 8, 'technical_issue', ARRAY['relatório', 'erro', 'tela branca'], 'client', false, false, NOW() - INTERVAL '40 minutes'),
('msg-012', 'Suporte Técnico', 'E-commerce Plus', '5511999990012', 'A integração com WhatsApp parou de funcionar', 'urgent', 9, 'technical_issue', ARRAY['integração', 'whatsapp', 'erro'], 'client', false, false, NOW() - INTERVAL '35 minutes'),

-- Mensagens sobre CANCELAMENTO (críticas)
('msg-013', 'CS - Retenção', 'Startup ABC', '5511999990013', 'Quero cancelar minha assinatura. Não estou usando mais', 'negative', 9, 'churn_risk', ARRAY['cancelamento', 'assinatura'], 'client', false, false, NOW() - INTERVAL '30 minutes'),
('msg-014', 'CS - Retenção', 'Empresa XYZ', '5511999990014', 'Vocês podem me dar um desconto? Se não vou ter que cancelar', 'negative', 8, 'churn_risk', ARRAY['desconto', 'cancelamento', 'negociação'], 'client', false, false, NOW() - INTERVAL '25 minutes'),

-- Mensagens POSITIVAS
('msg-015', 'Suporte Geral', 'Cliente Feliz', '5511999990015', 'Muito obrigado pelo atendimento rápido! Vocês são demais!', 'positive', 2, 'feedback', ARRAY['elogio', 'atendimento'], 'client', false, false, NOW() - INTERVAL '20 minutes'),
('msg-016', 'Suporte Geral', 'Maria Eduarda', '5511999990016', 'Resolveram meu problema em 5 minutos, parabéns!', 'positive', 1, 'feedback', ARRAY['elogio', 'resolução'], 'client', false, false, NOW() - INTERVAL '15 minutes'),

-- Mensagens da EQUIPE (conhecimento tácito)
('msg-017', 'Equipe Interna', 'Isabella CS', '5511999990017', 'Pessoal, quando cliente pede desconto acima de 20%, encaminhar pro gerente antes de responder', 'neutral', 5, 'team_communication', ARRAY['processo', 'desconto', 'escalação'], 'team', true, false, NOW() - INTERVAL '10 minutes'),
('msg-018', 'Equipe Interna', 'Arthur Suporte', '5511999990018', 'Dica: se o cliente está com erro no login, pede pra limpar cache primeiro. Resolve 80% dos casos', 'neutral', 3, 'team_communication', ARRAY['dica', 'login', 'cache'], 'team', true, false, NOW() - INTERVAL '8 minutes'),
('msg-019', 'Equipe Interna', 'Marcos BDR', '5511999990019', 'Melhor horário pra ligar pra lead é entre 10h e 11h, taxa de atendimento dobra', 'neutral', 4, 'team_communication', ARRAY['dica', 'lead', 'horário'], 'team', true, false, NOW() - INTERVAL '5 minutes'),
('msg-020', 'Equipe Interna', 'Coordenador', '5511999990020', 'ATENÇÃO: Cliente VIP Tech Solutions com problema crítico. Prioridade máxima!', 'urgent', 10, 'team_communication', ARRAY['urgente', 'vip', 'prioridade'], 'team', true, false, NOW() - INTERVAL '2 minutes')

ON CONFLICT (message_id) DO NOTHING;

-- 3. INSERIR INSIGHTS DIRETAMENTE (para alimentar Knowledge Agent)
-- ============================================================================
INSERT INTO mottivme_intelligence_system.sentinel_insights
(insight_type, content, confidence_score, metadata, processed_for_kb) VALUES

-- Padrões identificados
('pattern',
 'PADRÃO IDENTIFICADO: Dúvidas sobre Fatura\n\n5 de 20 mensagens (25%) nas últimas 2 horas são sobre faturas. Principais dúvidas:\n- Como consultar fatura no portal\n- Solicitar segunda via\n- Data de vencimento\n- Contestação de cobrança\n\nSugestão: Criar FAQ automatizado sobre faturas e botão de "Segunda Via" no WhatsApp.',
 0.92,
 '{"source": "message_analysis", "sample_count": 5, "total_analyzed": 20, "category": "faturamento", "priority": "high", "evidence_ids": ["msg-001", "msg-002", "msg-003", "msg-004", "msg-005"]}',
 false),

('pattern',
 'PADRÃO IDENTIFICADO: Problemas de Acesso e Senha\n\n4 de 20 mensagens (20%) são sobre dificuldades de login e recuperação de senha. Problemas comuns:\n- Link de recuperação expira muito rápido\n- Usuário não encontrado\n- Criação de novos usuários\n\nSugestão: Aumentar tempo de expiração do link de 24h para 48h. Criar guia visual de recuperação de senha.',
 0.88,
 '{"source": "message_analysis", "sample_count": 4, "total_analyzed": 20, "category": "acesso", "priority": "high", "evidence_ids": ["msg-006", "msg-007", "msg-008", "msg-009"]}',
 false),

('bottleneck_detected',
 'GARGALO DETECTADO: Lentidão no Sistema\n\n3 clientes reportaram lentidão/problemas de carregamento nas últimas 2 horas. Sintomas:\n- Dashboard demora para carregar\n- Relatórios não abrem (tela branca)\n- Integração WhatsApp instável\n\nAÇÃO URGENTE: Verificar status dos servidores e banco de dados. Possível problema de infraestrutura.',
 0.95,
 '{"source": "incident_detection", "sample_count": 3, "severity": "high", "category": "technical", "priority": "critical", "evidence_ids": ["msg-010", "msg-011", "msg-012"]}',
 false),

('tacit_knowledge',
 'CONHECIMENTO TÁCITO CAPTURADO: Dicas da Equipe\n\nConhecimento valioso compartilhado pela equipe:\n\n1. **Desconto acima de 20%**: Escalar para gerente antes de responder (Isabella CS)\n2. **Erro de login**: Pedir para limpar cache resolve 80% dos casos (Arthur Suporte)\n3. **Melhor horário para ligar leads**: 10h-11h, taxa de atendimento dobra (Marcos BDR)\n\nSugestão: Documentar essas práticas na Knowledge Base e incluir no onboarding de novos atendentes.',
 0.90,
 '{"source": "team_communication", "sample_count": 3, "category": "best_practice", "priority": "medium", "evidence_ids": ["msg-017", "msg-018", "msg-019"]}',
 false),

('alert',
 'ALERTA DE CHURN: 2 Clientes em Risco\n\n2 clientes manifestaram intenção de cancelamento nas últimas horas:\n\n1. **Startup ABC** - Diz que não está usando mais o sistema\n2. **Empresa XYZ** - Pedindo desconto, ameaçando cancelar\n\nAÇÃO RECOMENDADA:\n- Contatar imediatamente via ligação\n- Preparar ofertas de retenção\n- Agendar reunião para entender necessidades',
 0.97,
 '{"source": "churn_detection", "sample_count": 2, "severity": "critical", "category": "retention", "priority": "critical", "evidence_ids": ["msg-013", "msg-014"]}',
 false),

('automation_opportunity',
 'OPORTUNIDADE DE AUTOMAÇÃO: Respostas sobre Fatura\n\nCom base na análise de mensagens, identificamos que 25% das interações são perguntas repetitivas sobre fatura que poderiam ser automatizadas:\n\n1. **Bot para segunda via**: Cliente digita "segunda via" e recebe PDF automaticamente\n2. **Consulta de vencimento**: Resposta automática com data de vencimento\n3. **Link do portal**: Envio automático do link portal.mottivme.com\n\nEconomia estimada: 40 horas/mês de atendimento humano.',
 0.85,
 '{"source": "automation_analysis", "estimated_savings_hours": 40, "implementation_complexity": "medium", "priority": "high", "affected_percentage": 25}',
 false),

('recommendation',
 'RECOMENDAÇÃO: Campanha de Reengajamento\n\nAnálise de engajamento mostra que clientes inativos por mais de 14 dias têm 3x mais chance de cancelar.\n\nProposta de campanha:\n1. **Dia 7 sem acesso**: Email "Sentimos sua falta" + dica de funcionalidade\n2. **Dia 14 sem acesso**: WhatsApp do CS perguntando se precisa de ajuda\n3. **Dia 21 sem acesso**: Ligação do gerente de conta\n\nMeta: Reduzir churn em 20% nos próximos 90 dias.',
 0.82,
 '{"source": "engagement_analysis", "churn_risk_multiplier": 3, "suggested_actions": ["email_day_7", "whatsapp_day_14", "call_day_21"], "expected_churn_reduction": 0.20}',
 false),

('solution',
 'SOLUÇÃO DOCUMENTADA: Erro de Login "Usuário não encontrado"\n\nPasso a passo para resolver:\n\n1. Verificar se cliente está usando email correto (maiúsculas/minúsculas importam)\n2. Pedir para verificar spam pelo email de convite original\n3. Se nunca acessou, admin pode reenviar convite\n4. Se conta desativada, encaminhar para gerente\n\nTaxa de resolução com esse protocolo: 94%',
 0.91,
 '{"source": "solution_mining", "resolution_rate": 0.94, "category": "troubleshooting", "priority": "high"}',
 false),

('process_identified',
 'PROCESSO IDENTIFICADO: Escalação de Desconto\n\nProcesso implícito identificado na comunicação da equipe:\n\n1. Cliente solicita desconto\n2. Se desconto ≤ 20%: Atendente pode aprovar\n3. Se desconto > 20%: Escalar para gerente\n4. Gerente avalia histórico do cliente\n5. Gerente retorna com aprovação/contraproposta\n\nTempo médio de escalação: 2-4 horas\n\nSugestão: Formalizar processo e dar autonomia limitada para retenção.',
 0.87,
 '{"source": "process_mining", "process_type": "escalation", "avg_time_hours": 3, "category": "sales", "priority": "medium"}',
 false),

('pattern',
 'PADRÃO DE HORÁRIO: Pico de Mensagens 9h-11h\n\n78% das mensagens urgentes chegam entre 9h e 11h.\nDistribuição por horário:\n- 8h-9h: 8%\n- 9h-10h: 35%\n- 10h-11h: 43%\n- 11h-12h: 14%\n\nEquipe atual no horário de pico: 2 atendentes\nMédia de mensagens no pico: 45/hora\nCapacidade ideal: 4 atendentes\n\nSugestão: Realocar equipe para garantir 4 atendentes das 9h às 11h.',
 0.93,
 '{"source": "volume_analysis", "peak_hours": ["09:00", "10:00", "11:00"], "peak_percentage": 78, "current_staff": 2, "recommended_staff": 4}',
 false)

ON CONFLICT DO NOTHING;

-- 4. ATUALIZAR sentinel_insights para incluir campo updated_at se não existir
-- ============================================================================
ALTER TABLE mottivme_intelligence_system.sentinel_insights
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. VERIFICAÇÃO FINAL
-- ============================================================================
SELECT '====== RESUMO DA POPULAÇÃO ======' as info;

SELECT 'Mensagens inseridas: ' || COUNT(*) as mensagens
FROM mottivme_intelligence_system.messages
WHERE created_at >= NOW() - INTERVAL '3 hours';

SELECT 'Insights pendentes para KB: ' || COUNT(*) as insights_pendentes
FROM mottivme_intelligence_system.sentinel_insights
WHERE processed_for_kb = false;

SELECT 'Total na Knowledge Base: ' || COUNT(*) as kb_total
FROM mottivme_intelligence_system.knowledge_base;

SELECT '=================================' as info;
SELECT 'Pronto! Execute o workflow "SENTINEL Knowledge Agent v2" no n8n para processar os insights.' as proximo_passo;
