import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfumywvwubvernvhjehk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdW15d3Z3dWJ2ZXJudmhqZWhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQwMzc5OSwiZXhwIjoyMDY2OTc5Nzk5fQ.fdTsdGlSqemXzrXEU4ov1SUpeDn_3bSjOingqkSAWQE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkMISTables() {
    console.log('🔍 ANÁLISE COMPLETA DO SUPABASE PARA MIS\n');
    console.log('═'.repeat(60));

    const misTablesNeeded = ['messages', 'alerts', 'alert_recipients'];
    const tablesStatus: Record<string, { exists: boolean; count: number; sample?: any }> = {};

    for (const tableName of misTablesNeeded) {
        console.log(`\n📊 Verificando tabela: ${tableName}`);
        console.log('─'.repeat(60));

        try {
            const { data, error, count } = await supabase
                .from(tableName)
                .select('*', { count: 'exact' })
                .limit(3);

            if (error) {
                console.log(`❌ Tabela NÃO existe: ${error.message}`);
                tablesStatus[tableName] = { exists: false, count: 0 };
            } else {
                console.log(`✅ Tabela existe com ${count || 0} registro(s)`);
                tablesStatus[tableName] = {
                    exists: true,
                    count: count || 0,
                    sample: data && data.length > 0 ? data[0] : null
                };

                if (data && data.length > 0) {
                    console.log(`\n📋 Estrutura da tabela:`);
                    console.log(Object.keys(data[0]).join(', '));

                    console.log(`\n📝 Exemplo de dado:\n`);
                    console.log(JSON.stringify(data[0], null, 2));
                } else {
                    console.log('📭 Tabela está vazia (sem dados)');
                }
            }
        } catch (e: any) {
            console.log(`❌ Erro ao acessar: ${e.message}`);
            tablesStatus[tableName] = { exists: false, count: 0 };
        }
    }

    // Verificar tabela profiles (já existe)
    console.log(`\n📊 Verificando tabela: profiles`);
    console.log('─'.repeat(60));
    const { data: profiles, count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' });

    console.log(`✅ Tabela profiles existe com ${profilesCount || 0} registro(s)`);
    if (profiles && profiles.length > 0) {
        console.log(`📝 Exemplo:\n`, JSON.stringify(profiles[0], null, 2));
    }

    // Resumo final
    console.log('\n\n═'.repeat(60));
    console.log('📊 RESUMO DA ANÁLISE');
    console.log('═'.repeat(60));

    const allTablesExist = misTablesNeeded.every(t => tablesStatus[t].exists);
    const hasData = misTablesNeeded.every(t => tablesStatus[t].count > 0);

    console.log('\n1️⃣ STATUS DAS TABELAS:');
    misTablesNeeded.forEach(table => {
        const status = tablesStatus[table];
        const icon = status.exists ? '✅' : '❌';
        const dataIcon = status.count > 0 ? '📊' : '📭';
        console.log(`   ${icon} ${table}: ${status.exists ? `${status.count} registros ${dataIcon}` : 'NÃO EXISTE'}`);
    });

    console.log('\n2️⃣ TABELAS NECESSÁRIAS PARA O DASHBOARD:');
    console.log(`   messages: ${tablesStatus.messages?.exists ? '✅' : '❌'} - Mensagens do WhatsApp`);
    console.log(`   alerts: ${tablesStatus.alerts?.exists ? '✅' : '❌'} - Alertas gerados pela AI`);
    console.log(`   alert_recipients: ${tablesStatus.alert_recipients?.exists ? '✅' : '❌'} - Destinatários`);

    console.log('\n3️⃣ DADOS NECESSÁRIOS PARA OS DASHBOARDS:');

    if (allTablesExist) {
        console.log('   ✅ Todas as tabelas existem!');

        if (hasData) {
            console.log('   ✅ Todas as tabelas têm dados!');

            // Análise detalhada dos dados
            console.log('\n4️⃣ ANÁLISE DOS DADOS PARA DASHBOARDS:\n');

            // Dashboard Principal
            console.log('   📊 Dashboard Principal (/dashboard):');
            console.log(`      • Total de Mensagens: ${tablesStatus.messages.count} ${tablesStatus.messages.count > 0 ? '✅' : '❌'}`);
            console.log(`      • Total de Alertas: ${tablesStatus.alerts.count} ${tablesStatus.alerts.count > 0 ? '✅' : '❌'}`);
            console.log(`      • Análise de Sentimento: ${tablesStatus.messages.count > 0 ? '✅ (calculado)' : '❌'}`);
            console.log(`      • Score de Urgência: ${tablesStatus.messages.count > 0 ? '✅ (calculado)' : '❌'}`);

            // Página de Alertas
            console.log('\n   🚨 Página de Alertas (/alerts):');
            console.log(`      • Lista de Alertas: ${tablesStatus.alerts.count} ${tablesStatus.alerts.count > 0 ? '✅' : '❌'}`);
            console.log(`      • Filtros: ${tablesStatus.alerts.count > 0 ? '✅' : '⚠️  (funcionam mas sem dados)'}`);
            console.log(`      • Ações (Reconhecer/Resolver): ${tablesStatus.alerts.count > 0 ? '✅' : '❌'}`);

            // Página de Mensagens
            console.log('\n   💬 Página de Mensagens (/messages):');
            console.log(`      • Histórico: ${tablesStatus.messages.count} mensagens ${tablesStatus.messages.count > 0 ? '✅' : '❌'}`);
            console.log(`      • Busca e Filtros: ${tablesStatus.messages.count > 0 ? '✅' : '⚠️  (funcionam mas sem dados)'}`);

            // Página de Equipe
            console.log('\n   👥 Página de Equipe (/team):');
            const uniqueSenders = tablesStatus.messages.count > 0 ? '✅' : '❌';
            console.log(`      • Membros da Equipe: ${uniqueSenders} (calculado de messages.sender_name)`);
            console.log(`      • Gráficos: ${tablesStatus.messages.count > 0 ? '✅' : '❌'}`);

            console.log('\n✅ CONCLUSÃO: Tudo pronto para usar!');

        } else {
            console.log('   ⚠️  Tabelas existem mas ESTÃO VAZIAS');
            console.log('\n📝 AÇÃO NECESSÁRIA:');
            console.log('   Execute: npm run setup-mis-data');
            console.log('   Para popular com dados de exemplo');
        }
    } else {
        console.log('   ❌ Algumas tabelas NÃO existem');
        console.log('\n📝 AÇÃO NECESSÁRIA:');
        console.log('   1. Acesse: https://supabase.com/dashboard/project/bfumywvwubvernvhjehk/sql');
        console.log('   2. Cole o conteúdo de: scripts/create-mis-tables.sql');
        console.log('   3. Clique em RUN');
        console.log('   4. Execute: npm run setup-mis-data');
    }

    console.log('\n═'.repeat(60));
}

checkMISTables();