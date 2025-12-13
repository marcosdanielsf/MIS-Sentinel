-- ============================================================================
-- FIX KNOWLEDGE BASE - Correção de Schema e População de Dados
-- Executa no Supabase para corrigir a tabela knowledge_base
-- ============================================================================

-- 1. ADICIONAR COLUNAS FALTANTES
-- ============================================================================

-- Adicionar campos question e answer para FAQs
ALTER TABLE mottivme_intelligence_system.knowledge_base
ADD COLUMN IF NOT EXISTS question TEXT;

ALTER TABLE mottivme_intelligence_system.knowledge_base
ADD COLUMN IF NOT EXISTS answer TEXT;

-- Adicionar campos de métricas que o frontend espera
ALTER TABLE mottivme_intelligence_system.knowledge_base
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

ALTER TABLE mottivme_intelligence_system.knowledge_base
ADD COLUMN IF NOT EXISTS helpful_votes INTEGER DEFAULT 0;

-- Adicionar campo source para rastrear origem (manual vs sentinel_ai)
ALTER TABLE mottivme_intelligence_system.knowledge_base
ADD COLUMN IF NOT EXISTS source VARCHAR(100) DEFAULT 'manual';

-- Adicionar campo para linkar ao insight original
ALTER TABLE mottivme_intelligence_system.knowledge_base
ADD COLUMN IF NOT EXISTS source_insight_id UUID;

-- Adicionar campo priority
ALTER TABLE mottivme_intelligence_system.knowledge_base
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5);

-- Adicionar campo not_helpful_count para feedback negativo
ALTER TABLE mottivme_intelligence_system.knowledge_base
ADD COLUMN IF NOT EXISTS not_helpful_count INTEGER DEFAULT 0;

-- 2. MIGRAR DADOS EXISTENTES (se houver)
-- ============================================================================

-- Copiar views_count para usage_count se existir
UPDATE mottivme_intelligence_system.knowledge_base
SET usage_count = COALESCE(views_count, 0)
WHERE usage_count = 0 OR usage_count IS NULL;

-- Copiar helpful_count para helpful_votes se existir
UPDATE mottivme_intelligence_system.knowledge_base
SET helpful_votes = COALESCE(helpful_count, 0)
WHERE helpful_votes = 0 OR helpful_votes IS NULL;

-- 3. LIMPAR E POPULAR COM DADOS RELEVANTES
-- ============================================================================

-- Limpar dados antigos para repopular
DELETE FROM mottivme_intelligence_system.knowledge_base;

-- FAQs - Perguntas Frequentes
INSERT INTO mottivme_intelligence_system.knowledge_base
(category, question, answer, title, content, tags, status, usage_count, helpful_votes, source, priority, created_by) VALUES

-- FAQs de Faturamento
('faq',
 'Como consultar minha fatura?',
 'Para consultar sua fatura:\n\n1. Acesse o portal do cliente em portal.mottivme.com\n2. Faça login com seu e-mail e senha\n3. Clique em "Minhas Faturas" no menu lateral\n4. Você pode visualizar, baixar em PDF ou solicitar segunda via\n\nDica: As faturas ficam disponíveis até o 5º dia útil de cada mês.',
 'Consulta de Fatura',
 'Processo de consulta de fatura no portal do cliente',
 ARRAY['fatura', 'portal', 'consulta', 'financeiro'],
 'published', 245, 89, 'manual', 4, 'Sistema'),

('faq',
 'Quando minha fatura vence?',
 'O vencimento padrão das faturas é todo dia 10 de cada mês.\n\nCaso precise alterar a data de vencimento, entre em contato com nosso financeiro pelo WhatsApp (11) 99999-9999 ou pelo e-mail financeiro@mottivme.com.\n\nDatas disponíveis: 5, 10, 15 ou 20 de cada mês.',
 'Data de Vencimento da Fatura',
 'Informações sobre vencimento e alteração de data',
 ARRAY['fatura', 'vencimento', 'data', 'financeiro'],
 'published', 189, 72, 'manual', 3, 'Sistema'),

('faq',
 'Como solicitar segunda via da fatura?',
 'Para solicitar segunda via:\n\n**Opção 1 - Portal:**\n1. Acesse portal.mottivme.com\n2. Vá em "Minhas Faturas"\n3. Clique em "Segunda Via" na fatura desejada\n\n**Opção 2 - WhatsApp:**\nEnvie "segunda via" para nosso número e informe seu CNPJ/CPF.\n\nA segunda via é gerada automaticamente em até 5 minutos.',
 'Segunda Via de Fatura',
 'Como solicitar segunda via pelo portal ou WhatsApp',
 ARRAY['fatura', 'segunda-via', 'boleto', 'financeiro'],
 'published', 312, 156, 'manual', 4, 'Sistema'),

-- FAQs de Acesso
('faq',
 'Esqueci minha senha, como recuperar?',
 'Para recuperar sua senha:\n\n1. Clique em "Esqueci minha senha" na tela de login\n2. Informe o e-mail cadastrado\n3. Verifique sua caixa de entrada (e spam)\n4. Clique no link recebido\n5. Crie uma nova senha (mínimo 8 caracteres)\n\n⚠️ O link expira em 24 horas.\n\nSe não receber o e-mail, verifique se está usando o e-mail correto ou entre em contato com o suporte.',
 'Recuperação de Senha',
 'Processo de recuperação de senha',
 ARRAY['senha', 'recuperacao', 'acesso', 'login'],
 'published', 532, 201, 'manual', 5, 'Sistema'),

('faq',
 'Como criar um novo usuário no sistema?',
 'Para criar um novo usuário:\n\n1. Acesse Configurações > Usuários\n2. Clique em "Novo Usuário"\n3. Preencha:\n   - Nome completo\n   - E-mail (será o login)\n   - Perfil de acesso\n   - Departamento\n4. Clique em "Criar"\n\nO novo usuário receberá um e-mail para definir a senha.\n\n**Perfis disponíveis:**\n- Administrador: acesso total\n- Gestor: relatórios e equipe\n- Operador: atendimento básico',
 'Criação de Novos Usuários',
 'Como adicionar usuários ao sistema',
 ARRAY['usuario', 'acesso', 'permissao', 'admin'],
 'published', 178, 89, 'manual', 3, 'Sistema'),

-- FAQs de Atendimento
('faq',
 'Qual o horário de atendimento?',
 'Nosso atendimento funciona:\n\n**WhatsApp e Chat:**\n- Segunda a Sexta: 8h às 18h\n- Sábado: 8h às 12h\n\n**E-mail (suporte@mottivme.com):**\n- Respondemos em até 4 horas úteis\n\n**Urgências:**\n- Telefone: (11) 3333-4444\n- Disponível 24/7 para clientes Premium\n\nFora do horário comercial, nosso bot pode ajudar com dúvidas frequentes!',
 'Horário de Atendimento',
 'Horários de funcionamento dos canais de suporte',
 ARRAY['atendimento', 'horario', 'suporte', 'contato'],
 'published', 423, 198, 'manual', 4, 'Sistema'),

('faq',
 'Como acompanhar meu chamado de suporte?',
 'Para acompanhar seus chamados:\n\n1. Acesse portal.mottivme.com\n2. Clique em "Meus Chamados"\n3. Veja o status de cada chamado:\n   - 🟡 Aberto: aguardando análise\n   - 🔵 Em andamento: sendo tratado\n   - 🟢 Resolvido: finalizado\n   - 🔴 Aguardando você: precisa de resposta\n\nVocê também recebe atualizações por e-mail a cada mudança de status.',
 'Acompanhamento de Chamados',
 'Como verificar o status dos chamados de suporte',
 ARRAY['chamado', 'suporte', 'acompanhamento', 'status'],
 'published', 267, 134, 'manual', 3, 'Sistema'),

-- Soluções
('solution',
 NULL,
 NULL,
 'Integração com WhatsApp Business API',
 'Passo a passo para configurar a integração com WhatsApp Business API:\n\n**Pré-requisitos:**\n- Conta Meta Business verificada\n- Número de telefone dedicado\n- Token de acesso da API\n\n**Configuração:**\n1. Acesse Configurações > Integrações\n2. Selecione "WhatsApp Business"\n3. Clique em "Nova Conexão"\n4. Insira o Phone Number ID\n5. Insira o Access Token\n6. Configure o Webhook URL fornecido\n7. Teste enviando uma mensagem\n\n**Webhook URL:** https://api.mottivme.com/webhook/whatsapp/{seu_id}\n\n**Troubleshooting:**\n- Token inválido: regenere no Meta Business\n- Webhook não recebe: verifique firewall\n- Mensagens não enviam: verifique limite de templates',
 ARRAY['whatsapp', 'integracao', 'api', 'meta', 'webhook'],
 'published', 178, 67, 'manual', 5, 'Sistema'),

('solution',
 NULL,
 NULL,
 'Configurar Notificações por E-mail',
 'Para configurar notificações por e-mail:\n\n**1. Acessar Configurações de Notificações:**\nConfigurações > Notificações > E-mail\n\n**2. Tipos de Notificações Disponíveis:**\n- Nova mensagem recebida\n- Chamado atribuído\n- Chamado resolvido\n- Relatório diário/semanal\n- Alertas de sistema\n\n**3. Frequência:**\n- Imediato: recebe na hora\n- Resumo diário: 1x por dia às 8h\n- Resumo semanal: toda segunda às 9h\n\n**4. Para Desativar:**\nDesmarque as opções que não deseja receber.\n\n**Não está recebendo e-mails?**\n1. Verifique a pasta de spam\n2. Adicione noreply@mottivme.com aos contatos\n3. Verifique se o e-mail cadastrado está correto',
 ARRAY['notificacao', 'email', 'configuracao', 'alertas'],
 'published', 145, 78, 'manual', 3, 'Sistema'),

('solution',
 NULL,
 NULL,
 'Resolver Erro de Login "Usuário não encontrado"',
 'Se você está recebendo o erro "Usuário não encontrado":\n\n**Causas Comuns:**\n1. E-mail digitado incorretamente\n2. Conta ainda não foi criada\n3. Conta foi desativada\n\n**Soluções:**\n\n**1. Verifique o E-mail:**\n- Use o mesmo e-mail do convite inicial\n- Verifique maiúsculas/minúsculas\n- Remova espaços extras\n\n**2. Se Nunca Acessou:**\n- Procure o e-mail de convite na caixa de entrada\n- Peça ao administrador para reenviar o convite\n\n**3. Se Acessava Antes:**\n- Sua conta pode ter sido desativada\n- Entre em contato com o administrador da sua empresa\n\n**Ainda com problemas?**\nEnvie um e-mail para suporte@mottivme.com com:\n- Nome da empresa\n- E-mail que está tentando usar\n- Print da tela de erro',
 ARRAY['login', 'erro', 'usuario', 'acesso', 'problema'],
 'published', 289, 167, 'manual', 5, 'Sistema'),

-- Boas Práticas
('best_practice',
 NULL,
 NULL,
 'Tempo de Resposta Ideal no WhatsApp',
 'O tempo de resposta é crucial para satisfação do cliente:\n\n**Benchmarks Recomendados:**\n- ⚡ Excelente: até 2 minutos\n- ✅ Bom: até 5 minutos\n- ⚠️ Aceitável: até 15 minutos\n- ❌ Ruim: acima de 30 minutos\n\n**Por que isso importa:**\n- Respostas em até 5 min aumentam satisfação em 40%\n- Clientes esperam resposta mais rápida no WhatsApp que em outros canais\n- Taxa de conversão cai 7% a cada minuto de espera\n\n**Dicas para Melhorar:**\n1. Use respostas rápidas para perguntas comuns\n2. Configure mensagens automáticas fora do horário\n3. Distribua atendimentos entre a equipe\n4. Priorize por urgência (SENTINEL faz isso automaticamente)\n\n**Métricas para Acompanhar:**\n- Tempo médio de primeira resposta\n- Tempo médio de resolução\n- % de atendimentos dentro do SLA',
 ARRAY['atendimento', 'whatsapp', 'tempo', 'resposta', 'sla'],
 'published', 89, 34, 'manual', 4, 'Sistema'),

('best_practice',
 NULL,
 NULL,
 'Como Lidar com Clientes Insatisfeitos',
 'Protocolo para atendimento de clientes insatisfeitos:\n\n**1. ESCUTE (não interrompa)**\n- Deixe o cliente desabafar\n- Use frases como "Entendo sua frustração"\n- Não leve para o lado pessoal\n\n**2. AGRADEÇA**\n- "Obrigado por nos informar"\n- Mostra que você valoriza o feedback\n\n**3. PEÇA DESCULPAS**\n- Mesmo que não seja culpa sua\n- "Sinto muito pela experiência negativa"\n\n**4. RESOLVA**\n- Ofereça solução concreta\n- Se não puder resolver, escale imediatamente\n- Dê prazo realista\n\n**5. ACOMPANHE**\n- Retorne antes do prazo prometido\n- Confirme se ficou satisfeito\n\n**Frases que FUNCIONAM:**\n- "Vou resolver isso pessoalmente"\n- "Entendo como isso é frustrante"\n- "Você está certo em estar chateado"\n\n**Frases para EVITAR:**\n- "Isso não é comigo"\n- "Você precisa entender que..."\n- "Calma, não é pra tanto"',
 ARRAY['atendimento', 'cliente', 'insatisfacao', 'reclamacao', 'conflito'],
 'published', 234, 156, 'manual', 5, 'Sistema'),

('best_practice',
 NULL,
 NULL,
 'Estrutura de Mensagem de Follow-up',
 'Template para mensagens de follow-up eficazes:\n\n**Estrutura Recomendada:**\n\n```\nOlá [Nome]! 👋\n\n[Contexto - relembre a última interação]\n\n[Motivo do contato]\n\n[Pergunta ou CTA claro]\n\nFico no aguardo!\n[Seu nome]\n```\n\n**Exemplo Prático:**\n\n"Olá Maria! 👋\n\nTudo bem? Na semana passada conversamos sobre a integração com seu ERP.\n\nPassando para saber se conseguiu testar a conexão que configuramos. Teve alguma dúvida?\n\nSe precisar, posso agendar uma call rápida para ajudar!\n\nAbraços,\nCarlos"\n\n**Timing Ideal:**\n- 1º follow-up: 2-3 dias depois\n- 2º follow-up: 5-7 dias depois\n- 3º follow-up: 14 dias depois (último)\n\n**Dica:** Não faça mais de 3 follow-ups sem resposta. Envie um último dizendo que está à disposição quando precisar.',
 ARRAY['followup', 'mensagem', 'template', 'vendas', 'cs'],
 'published', 178, 89, 'manual', 4, 'Sistema'),

-- Processos
('process',
 NULL,
 NULL,
 'Fluxo de Qualificação de Leads',
 'Processo padrão de qualificação de leads:\n\n**ETAPA 1: Entrada do Lead**\n- Lead entra via formulário/WhatsApp/indicação\n- Sistema cria registro automaticamente\n- Responsável: Sistema/Marketing\n\n**ETAPA 2: Primeiro Contato (até 24h)**\n- SDR faz primeiro contato\n- Objetivo: agendar call de qualificação\n- Se não responder: 3 tentativas em 7 dias\n\n**ETAPA 3: Qualificação BANT**\n- Budget: tem orçamento?\n- Authority: decide ou influencia?\n- Need: tem necessidade real?\n- Timeline: quando pretende resolver?\n\n**ETAPA 4: Scoring**\n- Score >= 70: Passar para Closer\n- Score 40-69: Nurturing com conteúdo\n- Score < 40: Marketing automation\n\n**ETAPA 5: Handoff para Closer**\n- SDR agenda reunião com Closer\n- Envia briefing completo\n- Closer assume o lead\n\n**SLAs:**\n- Primeiro contato: 24h\n- Qualificação: 72h\n- Handoff: mesmo dia da qualificação',
 ARRAY['vendas', 'leads', 'qualificacao', 'bant', 'sdr'],
 'published', 156, 45, 'manual', 5, 'Sistema'),

('process',
 NULL,
 NULL,
 'Protocolo de Escalação de Chamados',
 'Quando e como escalar chamados:\n\n**NÍVEL 1 - Atendente**\n- Dúvidas simples\n- Problemas conhecidos com solução documentada\n- Tempo máximo: 15 minutos\n\n**NÍVEL 2 - Especialista (escalar se):**\n- Problema técnico sem solução conhecida\n- Cliente insatisfeito (sentimento negativo)\n- Urgência >= 8 no SENTINEL\n- Tempo máximo: 2 horas\n\n**NÍVEL 3 - Coordenador (escalar se):**\n- Cliente VIP\n- Risco de churn identificado\n- Impacto em múltiplos clientes\n- Problema não resolvido em N2\n- Tempo máximo: 4 horas\n\n**NÍVEL 4 - Gerência (escalar se):**\n- Crise/incidente grave\n- Solicitação de desconto > 30%\n- Ameaça jurídica\n- Resolução imediata\n\n**Como Escalar:**\n1. Documente tudo que já foi tentado\n2. Inclua contexto completo\n3. Marque urgência correta\n4. Notifique via canal apropriado',
 ARRAY['escalacao', 'suporte', 'chamado', 'niveis', 'protocolo'],
 'published', 198, 87, 'manual', 5, 'Sistema');

-- 4. CRIAR ÍNDICES ADICIONAIS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_knowledge_base_question ON mottivme_intelligence_system.knowledge_base(question);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source ON mottivme_intelligence_system.knowledge_base(source);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_priority ON mottivme_intelligence_system.knowledge_base(priority DESC);

-- 5. POPULAR SENTINEL_INSIGHTS PARA ALIMENTAR O AGENTE
-- ============================================================================

-- Inserir alguns insights que o Knowledge Agent pode processar
INSERT INTO mottivme_intelligence_system.sentinel_insights
(insight_type, content, confidence_score, metadata, processed_for_kb) VALUES

('pattern',
 'Detectado padrão recorrente: 34% das mensagens de clientes nas últimas 2 semanas são sobre "como alterar dados cadastrais". Sugestão: criar FAQ específico sobre alteração de cadastro.',
 0.87,
 '{"source": "message_analysis", "sample_count": 156, "category": "cadastro"}',
 false),

('solution',
 'Solução identificada para erro "Timeout na API": Aumentar o timeout para 30 segundos resolve 92% dos casos. Clientes com conexões lentas estavam sendo desconectados prematuramente.',
 0.91,
 '{"source": "incident_resolution", "incidents_resolved": 23, "success_rate": 0.92}',
 false),

('recommendation',
 'Recomendação baseada em análise de churn: Clientes que não interagem há mais de 14 dias têm 3x mais chance de cancelar. Sugestão: implementar campanha de reengajamento automática.',
 0.85,
 '{"source": "churn_analysis", "risk_factor": 3.2, "sample_size": 89}',
 false),

('pattern',
 'Horário de pico identificado: 78% das mensagens urgentes chegam entre 9h e 11h. Sugestão: escalar equipe nesse horário para garantir SLA.',
 0.93,
 '{"source": "volume_analysis", "peak_hours": ["09:00", "10:00", "11:00"], "percentage": 78}',
 false),

('solution',
 'Melhoria no processo de onboarding: Clientes que recebem ligação de boas-vindas nas primeiras 24h têm NPS 40% maior. Implementar ligação automática após contrato assinado.',
 0.88,
 '{"source": "nps_correlation", "nps_improvement": 40, "sample_size": 234}',
 false);

-- 6. VERIFICAÇÃO FINAL
-- ============================================================================

SELECT 'Knowledge Base atualizada com sucesso!' as status;

SELECT
    category,
    COUNT(*) as total,
    ROUND(AVG(usage_count)) as avg_views,
    ROUND(AVG(helpful_votes)) as avg_votes
FROM mottivme_intelligence_system.knowledge_base
GROUP BY category
ORDER BY total DESC;

SELECT
    'Insights pendentes para Knowledge Agent: ' || COUNT(*) as pending_insights
FROM mottivme_intelligence_system.sentinel_insights
WHERE processed_for_kb = false;
