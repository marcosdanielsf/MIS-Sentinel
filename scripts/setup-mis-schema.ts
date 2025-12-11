import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = 'https://bfumywvwubvernvhjehk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdW15d3Z3dWJ2ZXJudmhqZWhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQwMzc5OSwiZXhwIjoyMDY2OTc5Nzk5fQ.fdTsdGlSqemXzrXEU4ov1SUpeDn_3bSjOingqkSAWQE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setupMISSchema() {
    console.log('🚀 Configurando MOTTIVME INTELLIGENCE SYSTEM\n');
    console.log('═'.repeat(60));

    try {
        // Read the SQL file
        const sqlPath = join(__dirname, 'create-mis-tables.sql');
        const sql = readFileSync(sqlPath, 'utf-8');

        console.log('📝 Executando SQL...\n');

        // Execute the SQL using Supabase RPC
        // Note: Supabase doesn't have a direct way to execute arbitrary SQL from the client
        // We need to use the REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({ query: sql })
        });

        if (!response.ok) {
            console.log('❌ Método exec_sql não disponível.');
            console.log('\n📋 Por favor, execute o SQL manualmente:');
            console.log('   1. Acesse: https://supabase.com/dashboard/project/bfumywvwubvernvhjehk/sql');
            console.log('   2. Cole o conteúdo de scripts/create-mis-tables.sql');
            console.log('   3. Clique em "Run"\n');
            return;
        }

        console.log('✅ Schema MIS criado com sucesso!');

    } catch (error: any) {
        console.error('❌ Erro:', error.message);
        console.log('\n📋 Execute manualmente em:');
        console.log('   https://supabase.com/dashboard/project/bfumywvwubvernvhjehk/sql');
    }

    console.log('\n═'.repeat(60));
    console.log('✅ Próximos passos:');
    console.log('   1. Verifique as tabelas criadas');
    console.log('   2. Configure o n8n para salvar mensagens nas tabelas');
    console.log('   3. Execute o dashboard para visualizar os dados');
}

setupMISSchema();