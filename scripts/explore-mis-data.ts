import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfumywvwubvernvhjehk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdW15d3Z3dWJ2ZXJudmhqZWhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQwMzc5OSwiZXhwIjoyMDY2OTc5Nzk5fQ.fdTsdGlSqemXzrXEU4ov1SUpeDn_3bSjOingqkSAWQE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function exploreMIS() {
    console.log('🔍 EXPLORANDO MOTTIVME INTELLIGENCE SYSTEM\n');
    console.log('═'.repeat(60));

    // Tables in MIS schema
    const misTables = ['messages', 'alerts', 'alert_recipients', 'profiles'];

    for (const tableName of misTables) {
        console.log(`\n📊 TABELA: ${tableName}`);
        console.log('─'.repeat(60));

        try {
            // Try direct table name first (public schema)
            const { data, error, count } = await supabase
                .from(tableName)
                .select('*', { count: 'exact' })
                .limit(5);

            if (error) {
                console.log(`❌ Erro: ${error.message}`);
                continue;
            }

            console.log(`✅ ${count || 0} registro(s) encontrado(s)`);

            if (data && data.length > 0) {
                console.log(`\n📋 Colunas:`, Object.keys(data[0]).join(', '));
                console.log(`\n📝 Exemplo de dados:\n`);
                data.slice(0, 2).forEach((row, idx) => {
                    console.log(`[${idx + 1}]`, JSON.stringify(row, null, 2));
                });
            } else {
                console.log('📭 Tabela vazia');
            }
        } catch (e: any) {
            console.log(`❌ Erro ao acessar: ${e.message}`);
        }
    }

    // Try to get some statistics
    console.log('\n\n═'.repeat(60));
    console.log('📈 ESTATÍSTICAS DO MIS');
    console.log('═'.repeat(60));

    try {
        // Count alerts by type
        const { data: alertStats } = await supabase
            .from('alerts')
            .select('alert_type');

        if (alertStats && alertStats.length > 0) {
            const typeCounts: Record<string, number> = {};
            alertStats.forEach((alert: any) => {
                typeCounts[alert.alert_type] = (typeCounts[alert.alert_type] || 0) + 1;
            });

            console.log('\n🚨 Alertas por tipo:');
            Object.entries(typeCounts).forEach(([type, count]) => {
                console.log(`   ${type}: ${count}`);
            });
        }

        // Count messages by sender
        const { data: messageStats } = await supabase
            .from('messages')
            .select('sender_name');

        if (messageStats && messageStats.length > 0) {
            const senderCounts: Record<string, number> = {};
            messageStats.forEach((msg: any) => {
                senderCounts[msg.sender_name] = (senderCounts[msg.sender_name] || 0) + 1;
            });

            console.log('\n👥 Mensagens por pessoa:');
            Object.entries(senderCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .forEach(([name, count]) => {
                    console.log(`   ${name}: ${count}`);
                });
        }
    } catch (e: any) {
        console.log(`❌ Erro ao calcular estatísticas: ${e.message}`);
    }
}

exploreMIS();