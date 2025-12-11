import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfumywvwubvernvhjehk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdW15d3Z3dWJ2ZXJudmhqZWhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQwMzc5OSwiZXhwIjoyMDY2OTc5Nzk5fQ.fdTsdGlSqemXzrXEU4ov1SUpeDn_3bSjOingqkSAWQE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkMISSchema() {
    console.log('🔍 VERIFICANDO SCHEMA: mottivme_intelligence_system\n');
    console.log('═'.repeat(60));

    const tables = ['messages', 'alerts', 'alert_recipients', 'profiles'];

    for (const tableName of tables) {
        console.log(`\n📊 Tabela: mottivme_intelligence_system.${tableName}`);
        console.log('─'.repeat(60));

        try {
            // Tentar query direto com schema via SQL
            const { data, error } = await supabase.rpc('exec_sql', {
                query: `SELECT * FROM mottivme_intelligence_system.${tableName} LIMIT 5`
            });

            if (error) {
                // Tentar usando REST API com schema header
                const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?limit=5`, {
                    headers: {
                        'apikey': serviceRoleKey,
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'Accept-Profile': 'mottivme_intelligence_system',
                        'Content-Profile': 'mottivme_intelligence_system'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Tabela existe com ${data.length} registro(s) (via REST API)`);

                    if (data.length > 0) {
                        console.log(`\n📋 Colunas:`, Object.keys(data[0]).join(', '));
                        console.log(`\n📝 Exemplo de dados:\n`, JSON.stringify(data[0], null, 2));
                    } else {
                        console.log('📭 Tabela vazia');
                    }
                } else {
                    const errorText = await response.text();
                    console.log(`❌ Erro: ${response.status} - ${errorText}`);
                }
            } else {
                console.log(`✅ Dados encontrados:`, data);
            }
        } catch (e: any) {
            console.log(`❌ Erro: ${e.message}`);
        }
    }

    console.log('\n═'.repeat(60));
}

checkMISSchema();