-- ============================================================================
-- POPULAR TABELA PROCESS_MAPS COM DADOS COMPLETOS
-- ============================================================================

-- Limpar processos existentes para recriar com dados completos
DELETE FROM mottivme_intelligence_system.process_maps;

-- ============================================================================
-- 1. ATENDIMENTO INICIAL - DUVIDA FATURA (Processo completo)
-- ============================================================================
INSERT INTO mottivme_intelligence_system.process_maps
(process_name, category, description, status, avg_resolution_time, success_rate, steps, bottlenecks, optimization_suggestions)
VALUES
(
    'Atendimento Inicial - Duvida Fatura',
    'atendimento',
    'Processo de atendimento para clientes com duvidas sobre fatura',
    'active',
    15,
    92.5,
    '[
        {"order": 1, "name": "Receber mensagem", "description": "Cliente envia duvida pelo WhatsApp", "responsible": "Atendente", "avg_time_minutes": 2},
        {"order": 2, "name": "Identificar cliente", "description": "Buscar dados do cliente no sistema", "responsible": "Atendente", "avg_time_minutes": 3},
        {"order": 3, "name": "Analisar fatura", "description": "Verificar detalhes da fatura em questao", "responsible": "Atendente", "avg_time_minutes": 5},
        {"order": 4, "name": "Responder cliente", "description": "Enviar explicacao detalhada", "responsible": "Atendente", "avg_time_minutes": 5}
    ]'::jsonb,
    '["Tempo de busca no sistema legado", "Multiplas abas abertas para consulta"]'::jsonb,
    '["Integrar sistemas para consulta unica", "Criar respostas template para duvidas frequentes"]'::jsonb
);

-- ============================================================================
-- 2. TRATAMENTO DE RISCO DE CHURN (Completo)
-- ============================================================================
INSERT INTO mottivme_intelligence_system.process_maps
(process_name, category, description, status, avg_resolution_time, success_rate, steps, bottlenecks, optimization_suggestions)
VALUES
(
    'Tratamento de Risco de Churn',
    'suporte',
    'Fluxo completo para identificar, tratar e reter clientes em risco de cancelamento',
    'active',
    45,
    78.5,
    '[
        {"order": 1, "name": "Identificacao do Risco", "description": "Sistema SENTINEL detecta sinais de churn via analise de sentimento", "responsible": "SENTINEL AI", "avg_time_minutes": 1},
        {"order": 2, "name": "Alerta para CS", "description": "Notificacao automatica enviada para equipe de Customer Success", "responsible": "Sistema", "avg_time_minutes": 1},
        {"order": 3, "name": "Analise do Historico", "description": "CS analisa historico de interacoes, tickets e engajamento do cliente", "responsible": "Customer Success", "avg_time_minutes": 10},
        {"order": 4, "name": "Contato Proativo", "description": "Ligacao ou mensagem personalizada para entender a situacao", "responsible": "Customer Success", "avg_time_minutes": 15},
        {"order": 5, "name": "Proposta de Retencao", "description": "Apresentar solucoes: desconto, upgrade, suporte dedicado", "responsible": "Customer Success", "avg_time_minutes": 10},
        {"order": 6, "name": "Documentacao", "description": "Registrar resultado e acoes no sistema", "responsible": "Customer Success", "avg_time_minutes": 5},
        {"order": 7, "name": "Follow-up", "description": "Agendar acompanhamento em 7, 15 e 30 dias", "responsible": "Customer Success", "avg_time_minutes": 3}
    ]'::jsonb,
    '["Tempo entre deteccao e contato pode passar de 4 horas", "Falta de autonomia para oferecer descontos", "Historico fragmentado em varios sistemas"]'::jsonb,
    '["Implementar SLA de 2 horas para contato pos-alerta", "Criar matriz de autonomia para descontos por tier de cliente", "Unificar historico em dashboard unico", "Automatizar envio de mensagem inicial de retencao"]'::jsonb
);

-- ============================================================================
-- 3. ONBOARDING DE NOVO CLIENTE
-- ============================================================================
INSERT INTO mottivme_intelligence_system.process_maps
(process_name, category, description, status, avg_resolution_time, success_rate, steps, bottlenecks, optimization_suggestions)
VALUES
(
    'Onboarding de Novo Cliente',
    'onboarding',
    'Processo completo de ativacao e treinamento de novos clientes',
    'active',
    120,
    88.0,
    '[
        {"order": 1, "name": "Boas-vindas", "description": "Envio de email e WhatsApp de boas-vindas com credenciais", "responsible": "Sistema", "avg_time_minutes": 2},
        {"order": 2, "name": "Agendamento Kick-off", "description": "Agendar reuniao de kick-off com cliente", "responsible": "CS", "avg_time_minutes": 10},
        {"order": 3, "name": "Reuniao Kick-off", "description": "Apresentacao da plataforma e coleta de necessidades", "responsible": "CS", "avg_time_minutes": 45},
        {"order": 4, "name": "Configuracao Inicial", "description": "Setup do ambiente conforme necessidades do cliente", "responsible": "Suporte Tecnico", "avg_time_minutes": 30},
        {"order": 5, "name": "Treinamento Basico", "description": "Sessao de treinamento para usuarios principais", "responsible": "CS", "avg_time_minutes": 60},
        {"order": 6, "name": "Validacao", "description": "Cliente confirma que esta operacional", "responsible": "Cliente", "avg_time_minutes": 15},
        {"order": 7, "name": "Handoff para Suporte", "description": "Transicao do cliente para equipe de suporte regular", "responsible": "CS", "avg_time_minutes": 10}
    ]'::jsonb,
    '["Demora no agendamento do kick-off (media 3 dias)", "Cliente nao comparece ao treinamento agendado", "Configuracoes customizadas atrasam o processo"]'::jsonb,
    '["Implementar auto-agendamento via Calendly", "Criar trilha de onboarding self-service em video", "Padronizar configuracoes com templates por segmento", "Enviar lembretes automaticos 24h e 1h antes"]'::jsonb
);

-- ============================================================================
-- 4. ESCALONAMENTO TECNICO
-- ============================================================================
INSERT INTO mottivme_intelligence_system.process_maps
(process_name, category, description, status, avg_resolution_time, success_rate, steps, bottlenecks, optimization_suggestions)
VALUES
(
    'Escalonamento Tecnico N2/N3',
    'suporte',
    'Processo de escalonamento de chamados tecnicos complexos',
    'active',
    180,
    95.0,
    '[
        {"order": 1, "name": "Triagem N1", "description": "Atendente identifica que problema precisa escalonamento", "responsible": "Atendente N1", "avg_time_minutes": 15},
        {"order": 2, "name": "Documentacao do Caso", "description": "Preparar descricao detalhada com logs e evidencias", "responsible": "Atendente N1", "avg_time_minutes": 20},
        {"order": 3, "name": "Escalonamento N2", "description": "Transferir para equipe especializada", "responsible": "Sistema", "avg_time_minutes": 5},
        {"order": 4, "name": "Analise N2", "description": "Especialista analisa e tenta resolver", "responsible": "Suporte N2", "avg_time_minutes": 60},
        {"order": 5, "name": "Escalonamento N3 (se necessario)", "description": "Enviar para desenvolvimento se N2 nao resolver", "responsible": "Suporte N2", "avg_time_minutes": 10},
        {"order": 6, "name": "Resolucao e Teste", "description": "Aplicar correcao e validar em ambiente", "responsible": "Dev/N3", "avg_time_minutes": 45},
        {"order": 7, "name": "Comunicacao ao Cliente", "description": "Informar resolucao e validar com cliente", "responsible": "Atendente N1", "avg_time_minutes": 15},
        {"order": 8, "name": "Documentacao Final", "description": "Registrar solucao na base de conhecimento", "responsible": "Suporte N2", "avg_time_minutes": 10}
    ]'::jsonb,
    '["Documentacao incompleta no escalonamento", "Fila de N2 com mais de 20 chamados", "Comunicacao fragmentada entre niveis"]'::jsonb,
    '["Criar checklist obrigatorio para escalonamento", "Implementar sistema de priorizacao automatica", "Usar canal unico de comunicacao por chamado", "Criar dashboard de visibilidade cross-nivel"]'::jsonb
);

-- ============================================================================
-- 5. PROCESSO DE VENDA - LEAD INBOUND
-- ============================================================================
INSERT INTO mottivme_intelligence_system.process_maps
(process_name, category, description, status, avg_resolution_time, success_rate, steps, bottlenecks, optimization_suggestions)
VALUES
(
    'Qualificacao de Lead Inbound',
    'vendas',
    'Processo de qualificacao e conversao de leads que chegam via site/marketing',
    'active',
    30,
    35.0,
    '[
        {"order": 1, "name": "Captura do Lead", "description": "Lead preenche formulario no site ou landing page", "responsible": "Marketing", "avg_time_minutes": 1},
        {"order": 2, "name": "Enriquecimento", "description": "Sistema busca dados complementares (LinkedIn, CNPJ)", "responsible": "Sistema", "avg_time_minutes": 2},
        {"order": 3, "name": "Lead Scoring", "description": "Pontuacao automatica baseada em fit e engajamento", "responsible": "Sistema", "avg_time_minutes": 1},
        {"order": 4, "name": "Primeiro Contato", "description": "SDR faz contato em ate 5 minutos", "responsible": "SDR", "avg_time_minutes": 5},
        {"order": 5, "name": "Qualificacao BANT", "description": "Validar Budget, Authority, Need, Timeline", "responsible": "SDR", "avg_time_minutes": 15},
        {"order": 6, "name": "Agendamento Demo", "description": "Agendar demonstracao com Account Executive", "responsible": "SDR", "avg_time_minutes": 5},
        {"order": 7, "name": "Handoff para AE", "description": "Transferir lead qualificado com contexto completo", "responsible": "SDR", "avg_time_minutes": 3}
    ]'::jsonb,
    '["Tempo de primeiro contato acima de 30 minutos", "SDRs sobrecarregados em horario de pico", "Leads sem telefone valido"]'::jsonb,
    '["Implementar chatbot para qualificacao inicial", "Distribuir leads por round-robin inteligente", "Validar telefone no formulario em tempo real", "Criar sequencia de emails automatica para leads frios"]'::jsonb
);

-- ============================================================================
-- 6. PROCESSO DE CANCELAMENTO
-- ============================================================================
INSERT INTO mottivme_intelligence_system.process_maps
(process_name, category, description, status, avg_resolution_time, success_rate, steps, bottlenecks, optimization_suggestions)
VALUES
(
    'Processamento de Cancelamento',
    'cancelamento',
    'Fluxo para processar solicitacoes de cancelamento de forma estruturada',
    'active',
    60,
    100.0,
    '[
        {"order": 1, "name": "Receber Solicitacao", "description": "Cliente solicita cancelamento via canal de atendimento", "responsible": "Atendente", "avg_time_minutes": 5},
        {"order": 2, "name": "Registrar Motivo", "description": "Documentar razao detalhada do cancelamento", "responsible": "Atendente", "avg_time_minutes": 10},
        {"order": 3, "name": "Tentativa de Retencao", "description": "Oferecer alternativas (desconto, pausa, downgrade)", "responsible": "CS/Retencao", "avg_time_minutes": 20},
        {"order": 4, "name": "Aprovacao Gerencial", "description": "Gestor aprova cancelamento se retencao falhar", "responsible": "Gerente CS", "avg_time_minutes": 10},
        {"order": 5, "name": "Processamento Financeiro", "description": "Calcular valores pro-rata e processar reembolso", "responsible": "Financeiro", "avg_time_minutes": 15},
        {"order": 6, "name": "Desativacao Tecnica", "description": "Desativar acessos e fazer backup de dados", "responsible": "Suporte Tecnico", "avg_time_minutes": 10},
        {"order": 7, "name": "Comunicacao Final", "description": "Enviar confirmacao e pesquisa de saida", "responsible": "Sistema", "avg_time_minutes": 2}
    ]'::jsonb,
    '["Aprovacao gerencial demora mais de 24h", "Calculos financeiros manuais causam erros", "Cliente desiste de cancelar mas processo ja iniciou"]'::jsonb,
    '["Implementar aprovacao automatica para casos padrao", "Automatizar calculo pro-rata no sistema", "Criar periodo de cooling-off de 48h antes de processar", "Enviar pesquisa de NPS pos-cancelamento"]'::jsonb
);

-- ============================================================================
-- 7. ATENDIMENTO FINANCEIRO - 2A VIA BOLETO
-- ============================================================================
INSERT INTO mottivme_intelligence_system.process_maps
(process_name, category, description, status, avg_resolution_time, success_rate, steps, bottlenecks, optimization_suggestions)
VALUES
(
    'Emissao de 2a Via de Boleto',
    'financeiro',
    'Processo para gerar e enviar segunda via de boleto ao cliente',
    'active',
    8,
    98.5,
    '[
        {"order": 1, "name": "Identificar Cliente", "description": "Validar identidade do solicitante", "responsible": "Atendente", "avg_time_minutes": 2},
        {"order": 2, "name": "Verificar Pendencia", "description": "Confirmar boleto em aberto no sistema financeiro", "responsible": "Atendente", "avg_time_minutes": 2},
        {"order": 3, "name": "Gerar 2a Via", "description": "Emitir novo boleto com data atualizada", "responsible": "Sistema", "avg_time_minutes": 1},
        {"order": 4, "name": "Enviar ao Cliente", "description": "Disparar boleto por email e WhatsApp", "responsible": "Sistema", "avg_time_minutes": 1},
        {"order": 5, "name": "Confirmar Recebimento", "description": "Verificar se cliente recebeu o documento", "responsible": "Atendente", "avg_time_minutes": 2}
    ]'::jsonb,
    '["Sistema financeiro lento em horarios de pico", "Boleto vai para spam do cliente"]'::jsonb,
    '["Implementar self-service no portal do cliente", "Adicionar opcao de Pix como alternativa", "Configurar dominio de email para evitar spam"]'::jsonb
);

-- ============================================================================
-- 8. SUPORTE TECNICO - RESET DE SENHA
-- ============================================================================
INSERT INTO mottivme_intelligence_system.process_maps
(process_name, category, description, status, avg_resolution_time, success_rate, steps, bottlenecks, optimization_suggestions)
VALUES
(
    'Reset de Senha de Usuario',
    'suporte',
    'Processo para redefinir senha de acesso ao sistema',
    'active',
    5,
    99.0,
    '[
        {"order": 1, "name": "Validar Identidade", "description": "Confirmar que solicitante e o titular da conta", "responsible": "Atendente", "avg_time_minutes": 2},
        {"order": 2, "name": "Gerar Link de Reset", "description": "Sistema envia link de redefinicao por email", "responsible": "Sistema", "avg_time_minutes": 1},
        {"order": 3, "name": "Confirmar Recebimento", "description": "Verificar se cliente recebeu o email", "responsible": "Atendente", "avg_time_minutes": 2}
    ]'::jsonb,
    '["Cliente nao tem acesso ao email cadastrado", "20% das solicitacoes sao sobre este tema"]'::jsonb,
    '["Implementar autenticacao por SMS como alternativa", "Adicionar opcao de reset self-service", "Criar FAQ com passo-a-passo em video"]'::jsonb
);

-- ============================================================================
-- 9. PROSPECAO ATIVA - OUTBOUND
-- ============================================================================
INSERT INTO mottivme_intelligence_system.process_maps
(process_name, category, description, status, avg_resolution_time, success_rate, steps, bottlenecks, optimization_suggestions)
VALUES
(
    'Prospecao Ativa Outbound',
    'vendas',
    'Processo de abordagem proativa de potenciais clientes',
    'active',
    25,
    12.0,
    '[
        {"order": 1, "name": "Pesquisa do Lead", "description": "Identificar informacoes relevantes sobre a empresa", "responsible": "BDR", "avg_time_minutes": 8},
        {"order": 2, "name": "Personalizar Abordagem", "description": "Criar mensagem customizada para o contexto do lead", "responsible": "BDR", "avg_time_minutes": 5},
        {"order": 3, "name": "Primeira Tentativa", "description": "Enviar email/LinkedIn com proposta de valor", "responsible": "BDR", "avg_time_minutes": 3},
        {"order": 4, "name": "Follow-up 1", "description": "Segunda tentativa apos 3 dias sem resposta", "responsible": "BDR", "avg_time_minutes": 3},
        {"order": 5, "name": "Follow-up 2", "description": "Terceira tentativa com abordagem diferente", "responsible": "BDR", "avg_time_minutes": 3},
        {"order": 6, "name": "Qualificacao", "description": "Se responder, qualificar interesse e fit", "responsible": "BDR", "avg_time_minutes": 10},
        {"order": 7, "name": "Agendamento", "description": "Marcar reuniao com Account Executive", "responsible": "BDR", "avg_time_minutes": 3}
    ]'::jsonb,
    '["Taxa de resposta abaixo de 5%", "Tempo excessivo em pesquisa manual", "Listas de leads desatualizadas"]'::jsonb,
    '["Usar ferramentas de enriquecimento automatico", "Implementar cadencias automatizadas de follow-up", "Integrar com LinkedIn Sales Navigator", "A/B testar templates de abordagem"]'::jsonb
);

-- ============================================================================
-- 10. GESTAO DE INCIDENTES
-- ============================================================================
INSERT INTO mottivme_intelligence_system.process_maps
(process_name, category, description, status, avg_resolution_time, success_rate, steps, bottlenecks, optimization_suggestions)
VALUES
(
    'Gestao de Incidentes Criticos',
    'suporte',
    'Processo de resposta a incidentes que afetam multiplos clientes',
    'active',
    90,
    97.0,
    '[
        {"order": 1, "name": "Deteccao", "description": "Monitoramento identifica anomalia ou cliente reporta", "responsible": "Sistema/Suporte", "avg_time_minutes": 5},
        {"order": 2, "name": "Classificacao", "description": "Definir severidade (P1, P2, P3) e impacto", "responsible": "Plantao", "avg_time_minutes": 5},
        {"order": 3, "name": "Acionamento War Room", "description": "Reunir equipe de resposta conforme severidade", "responsible": "Plantao", "avg_time_minutes": 10},
        {"order": 4, "name": "Comunicacao Status Page", "description": "Publicar incidente na pagina de status", "responsible": "Comunicacao", "avg_time_minutes": 5},
        {"order": 5, "name": "Investigacao", "description": "Identificar causa raiz do problema", "responsible": "Engenharia", "avg_time_minutes": 30},
        {"order": 6, "name": "Mitigacao", "description": "Aplicar solucao temporaria se necessario", "responsible": "Engenharia", "avg_time_minutes": 15},
        {"order": 7, "name": "Resolucao", "description": "Implementar correcao definitiva", "responsible": "Engenharia", "avg_time_minutes": 20},
        {"order": 8, "name": "Comunicacao Final", "description": "Atualizar status page e notificar clientes", "responsible": "Comunicacao", "avg_time_minutes": 5},
        {"order": 9, "name": "Post-mortem", "description": "Documentar aprendizados e acoes preventivas", "responsible": "Engenharia", "avg_time_minutes": 60}
    ]'::jsonb,
    '["Demora na comunicacao inicial aos clientes", "Falta de runbook para incidentes comuns", "Post-mortem nao e feito consistentemente"]'::jsonb,
    '["Automatizar comunicacao na status page", "Criar runbooks para os 10 incidentes mais comuns", "Implementar template obrigatorio de post-mortem", "Configurar alertas proativos antes de falha total"]'::jsonb
);

-- ============================================================================
-- VERIFICACAO FINAL
-- ============================================================================
SELECT
    process_name,
    category,
    status,
    avg_resolution_time || ' min' as tempo,
    success_rate || '%' as taxa_sucesso,
    jsonb_array_length(steps) as qtd_etapas,
    jsonb_array_length(bottlenecks) as qtd_gargalos,
    jsonb_array_length(optimization_suggestions) as qtd_sugestoes
FROM mottivme_intelligence_system.process_maps
ORDER BY created_at;
