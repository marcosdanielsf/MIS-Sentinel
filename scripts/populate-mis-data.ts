import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfumywvwubvernvhjehk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdW15d3Z3dWJ2ZXJudmhqZWhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQwMzc5OSwiZXhwIjoyMDY2OTc5Nzk5fQ.fdTsdGlSqemXzrXEU4ov1SUpeDn_3bSjOingqkSAWQE';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: 'mottivme_intelligence_system' }
});

async function populateSampleData() {
    console.log('🌱 Populando MOTTIVME INTELLIGENCE SYSTEM com dados de exemplo\n');
    console.log('═'.repeat(60));

    try {
        // Sample messages
        const messages = [
            {
                message_id: 'msg_001',
                group_name: 'BPOSS - Grupo Principal',
                group_id: 'bposs_main',
                sender_name: 'Isabella',
                sender_phone: '+5511999999001',
                message_content: 'Pessoal, o cliente da turma 15 está pedindo urgentemente o acesso ao módulo de vendas. Já faz 3 dias que ele solicitou.',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                sentiment: 'urgent',
                urgency_score: 8,
                category: 'client_request',
                key_topics: ['acesso', 'módulo vendas', 'cliente turma 15', 'atraso']
            },
            {
                message_id: 'msg_002',
                group_name: 'BPOSS - Grupo Principal',
                group_id: 'bposs_main',
                sender_name: 'Allesson',
                sender_phone: '+5511999999002',
                message_content: 'Marcos, consegui automatizar aquele processo de envio de certificados. Agora é automático após conclusão do curso.',
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
                sentiment: 'positive',
                urgency_score: 3,
                category: 'automation_success',
                key_topics: ['automação', 'certificados', 'melhoria processo']
            },
            {
                message_id: 'msg_003',
                group_name: 'BPOSS - Grupo Principal',
                group_id: 'bposs_main',
                sender_name: 'Arthur',
                sender_phone: '+5511999999003',
                message_content: 'Identifiquei que 80% das dúvidas dos alunos são sobre a mesma funcionalidade. Podemos criar um FAQ automático?',
                timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
                sentiment: 'neutral',
                urgency_score: 5,
                category: 'automation_opportunity',
                key_topics: ['FAQ', 'dúvidas recorrentes', 'oportunidade automação']
            },
            {
                message_id: 'msg_004',
                group_name: 'BPOSS - Suporte Técnico',
                group_id: 'bposs_support',
                sender_name: 'Hallen',
                sender_phone: '+5511999999004',
                message_content: 'Sistema de pagamentos apresentou erro nas últimas 3 transações. Clientes reportando.',
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
                sentiment: 'negative',
                urgency_score: 9,
                category: 'technical_issue',
                key_topics: ['erro pagamento', 'transações falhadas', 'urgente']
            },
            {
                message_id: 'msg_005',
                group_name: 'BPOSS - Grupo Principal',
                group_id: 'bposs_main',
                sender_name: 'Marcos Daniel',
                sender_phone: '+5511999999005',
                message_content: 'Excelente trabalho equipe! Nossos KPIs de satisfação subiram 35% este mês.',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
                sentiment: 'positive',
                urgency_score: 2,
                category: 'team_recognition',
                key_topics: ['KPIs', 'satisfação', 'resultado positivo']
            },
            {
                message_id: 'msg_006',
                group_name: 'BPOSS - Grupo Principal',
                group_id: 'bposs_main',
                sender_name: 'Isabella',
                sender_phone: '+5511999999001',
                message_content: 'Turma 18 começou hoje. Todos os 47 alunos já estão ativos na plataforma!',
                timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
                sentiment: 'positive',
                urgency_score: 2,
                category: 'milestone',
                key_topics: ['nova turma', 'onboarding', '47 alunos']
            }
        ];

        console.log('\n📨 Inserindo mensagens...');
        const { data: insertedMessages, error: messagesError } = await supabase
            .from('messages')
            .insert(messages)
            .select();

        if (messagesError) {
            console.error('❌ Erro ao inserir mensagens:', messagesError);
            throw messagesError;
        }

        console.log(`✅ ${insertedMessages?.length || 0} mensagens inseridas`);

        // Sample alerts
        const alerts = [
            {
                alert_type: 'urgent_request',
                title: 'Solicitação Urgente de Cliente - Atraso de 3 Dias',
                description: 'Cliente da turma 15 aguarda acesso ao módulo de vendas há 3 dias. Isabella reportou urgência alta.',
                severity: 'high',
                related_message_ids: insertedMessages ? [insertedMessages[0].id] : [],
                affected_team_members: ['Isabella', 'Suporte'],
                suggested_actions: [
                    'Verificar status do acesso imediatamente',
                    'Contatar cliente com atualização',
                    'Revisar processo de liberação de módulos'
                ],
                status: 'active',
                confidence_score: 0.92,
                ai_reasoning: 'Detecção de palavras-chave: "urgentemente", "3 dias", "solicitou". Score de urgência: 8/10. Padrão identificado: atraso em solicitação de cliente.'
            },
            {
                alert_type: 'technical_issue',
                title: 'CRÍTICO: Falhas no Sistema de Pagamentos',
                description: 'Sistema de pagamentos com erro nas últimas 3 transações. Clientes reportando problemas.',
                severity: 'critical',
                related_message_ids: insertedMessages ? [insertedMessages[3].id] : [],
                affected_team_members: ['Hallen', 'Desenvolvimento', 'Suporte'],
                suggested_actions: [
                    'Investigar logs do sistema de pagamento AGORA',
                    'Verificar integração com gateway',
                    'Notificar clientes afetados',
                    'Criar incident report'
                ],
                status: 'active',
                confidence_score: 0.95,
                ai_reasoning: 'Urgência máxima (9/10). Palavras críticas: "erro", "transações", "clientes reportando". Impacto financeiro direto.'
            },
            {
                alert_type: 'automation_opportunity',
                title: 'Oportunidade: Automação de FAQ',
                description: '80% das dúvidas são sobre a mesma funcionalidade. Oportunidade de criar FAQ automático identificada por Arthur.',
                severity: 'medium',
                related_message_ids: insertedMessages ? [insertedMessages[2].id] : [],
                affected_team_members: ['Arthur', 'Produto', 'Desenvolvimento'],
                suggested_actions: [
                    'Mapear as 5 dúvidas mais frequentes',
                    'Criar base de conhecimento',
                    'Implementar chatbot com respostas automáticas',
                    'Medir redução de tickets após implementação'
                ],
                status: 'active',
                confidence_score: 0.88,
                ai_reasoning: 'Padrão detectado: alta recorrência de dúvidas (80%). Categoria: automation_opportunity. ROI estimado: alto.'
            },
            {
                alert_type: 'bottleneck',
                title: 'Gargalo: Processo de Liberação de Módulos',
                description: 'Múltiplas solicitações de acesso a módulos com atraso. Possível gargalo no processo manual de liberação.',
                severity: 'medium',
                related_message_ids: insertedMessages ? [insertedMessages[0].id] : [],
                affected_team_members: ['Toda equipe'],
                suggested_actions: [
                    'Mapear processo atual de liberação',
                    'Identificar etapas manuais',
                    'Automatizar liberação pós-pagamento',
                    'Definir SLA de 24h para liberações'
                ],
                status: 'active',
                confidence_score: 0.85,
                ai_reasoning: 'Process Mining: Detectado padrão de atrasos em liberação de acesso. Sugestão: automação do fluxo.'
            },
            {
                alert_type: 'milestone',
                title: 'Marco Positivo: Crescimento de Satisfação +35%',
                description: 'KPIs de satisfação aumentaram 35% no mês. Marcos Daniel reconheceu trabalho da equipe.',
                severity: 'low',
                related_message_ids: insertedMessages ? [insertedMessages[4].id] : [],
                affected_team_members: ['Toda equipe'],
                suggested_actions: [
                    'Documentar práticas que levaram ao resultado',
                    'Compartilhar case de sucesso',
                    'Celebrar com equipe'
                ],
                status: 'acknowledged',
                acknowledged_at: new Date().toISOString(),
                acknowledged_by: 'Marcos Daniel',
                confidence_score: 0.98,
                ai_reasoning: 'Sentimento positivo forte. Métricas objetivas (+35%). Categoria: reconhecimento e milestone.'
            }
        ];

        console.log('\n🚨 Inserindo alertas...');
        const { data: insertedAlerts, error: alertsError } = await supabase
            .from('alerts')
            .insert(alerts)
            .select();

        if (alertsError) {
            console.error('❌ Erro ao inserir alertas:', alertsError);
            throw alertsError;
        }

        console.log(`✅ ${insertedAlerts?.length || 0} alertas inseridos`);

        // Alert recipients
        const recipients = [
            { alert_id: insertedAlerts![0].id, recipient_name: 'Marcos Daniel', recipient_email: 'ceo@marcosdaniels.com', notification_sent: true, notification_sent_at: new Date().toISOString() },
            { alert_id: insertedAlerts![0].id, recipient_name: 'Isabella', recipient_email: 'isabella@mottivme.com' },
            { alert_id: insertedAlerts![1].id, recipient_name: 'Marcos Daniel', recipient_email: 'ceo@marcosdaniels.com', notification_sent: true, notification_sent_at: new Date().toISOString() },
            { alert_id: insertedAlerts![1].id, recipient_name: 'Hallen', recipient_email: 'hallen@mottivme.com', notification_sent: true, notification_sent_at: new Date().toISOString() },
            { alert_id: insertedAlerts![2].id, recipient_name: 'Marcos Daniel', recipient_email: 'ceo@marcosdaniels.com' },
            { alert_id: insertedAlerts![2].id, recipient_name: 'Arthur', recipient_email: 'arthur@mottivme.com' },
        ];

        console.log('\n📬 Inserindo destinatários de alertas...');
        const { data: insertedRecipients, error: recipientsError } = await supabase
            .from('alert_recipients')
            .insert(recipients)
            .select();

        if (recipientsError) {
            console.error('❌ Erro ao inserir destinatários:', recipientsError);
            throw recipientsError;
        }

        console.log(`✅ ${insertedRecipients?.length || 0} destinatários inseridos`);

        console.log('\n═'.repeat(60));
        console.log('✅ DADOS DE EXEMPLO INSERIDOS COM SUCESSO!\n');
        console.log('📊 Resumo:');
        console.log(`   • ${insertedMessages?.length || 0} mensagens`);
        console.log(`   • ${insertedAlerts?.length || 0} alertas`);
        console.log(`   • ${insertedRecipients?.length || 0} destinatários`);
        console.log('\n🚀 Execute o dashboard: npm run dev');
        console.log('═'.repeat(60));

    } catch (error: any) {
        console.error('\n❌ ERRO:', error.message);
        console.log('\n📋 Certifique-se de que:');
        console.log('   1. O schema mottivme_intelligence_system foi criado');
        console.log('   2. As tabelas foram criadas (execute create-mis-tables.sql)');
        console.log('   3. As policies permitem acesso do service role');
    }
}

populateSampleData();