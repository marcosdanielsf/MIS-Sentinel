import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfumywvwubvernvhjehk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdW15d3Z3dWJ2ZXJudmhqZWhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQwMzc5OSwiZXhwIjoyMDY2OTc5Nzk5fQ.fdTsdGlSqemXzrXEU4ov1SUpeDn_3bSjOingqkSAWQE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function exploreTables() {
    console.log('🔍 Explorando Supabase com Service Role...\n');

    const tablesToCheck = [
        'users',
        'profiles',
        'customers',
        'clientes',
        'membros',
        'leads',
        'contacts',
        'vendas',
        'pedidos',
        'produtos'
    ];

    for (const tableName of tablesToCheck) {
        console.log(`\n📊 Tabela: ${tableName}`);
        console.log('─'.repeat(50));

        const { data, error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact' })
            .limit(3);

        if (error) {
            console.log(`❌ Erro: ${error.message}`);
            continue;
        }

        console.log(`✅ ${count} registro(s) encontrado(s)`);

        if (data && data.length > 0) {
            console.log(`\n📋 Estrutura das colunas:`);
            console.log(Object.keys(data[0]).join(', '));

            console.log(`\n📝 Primeiros registros:`);
            data.forEach((row, idx) => {
                console.log(`\n  [${idx + 1}]`, JSON.stringify(row, null, 2));
            });
        } else {
            console.log('📭 Tabela vazia');
        }
    }

    // Verificar usuários do Auth
    console.log('\n\n👥 Usuários no Supabase Auth:');
    console.log('─'.repeat(50));

    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.log('❌ Erro ao buscar usuários:', authError.message);
    } else if (users) {
        console.log(`✅ ${users.length} usuário(s) encontrado(s)\n`);
        users.forEach((user, idx) => {
            console.log(`[${idx + 1}] ${user.email} - ID: ${user.id}`);
            console.log(`    Criado em: ${new Date(user.created_at).toLocaleString('pt-BR')}`);
            console.log(`    Metadata:`, user.user_metadata);
        });
    }
}

exploreTables();