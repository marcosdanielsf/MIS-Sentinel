import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfumywvwubvernvhjehk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdW15d3Z3dWJ2ZXJudmhqZWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MDM3OTksImV4cCI6MjA2Njk3OTc5OX0.60VyeZ8XaD6kz7Eh5Ov_nEeDtu5woMwMJYgUM-Sruao';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
    console.log('🔍 Verificando tabelas no Supabase...\n');

    // Query para listar tabelas no schema público
    const { data: publicTables, error: publicError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (publicError) {
        console.log('❌ Erro ao buscar tabelas do schema public:', publicError.message);
    } else if (publicTables && publicTables.length > 0) {
        console.log('📊 Tabelas no schema PUBLIC:');
        publicTables.forEach((t: any) => console.log(`  - ${t.table_name}`));
    } else {
        console.log('📊 Schema PUBLIC: Nenhuma tabela encontrada');
    }

    console.log('\n---\n');

    // Tentar buscar dados de algumas tabelas comuns
    const commonTables = ['users', 'profiles', 'customers', 'clientes', 'membros', 'leads', 'contacts'];

    for (const tableName of commonTables) {
        const { data, error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

        if (!error) {
            console.log(`✅ Tabela "${tableName}" encontrada! (${count} registros)`);

            // Buscar um exemplo
            const { data: sample } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);

            if (sample && sample.length > 0) {
                console.log(`   Exemplo de estrutura:`, Object.keys(sample[0]));
            }
        }
    }

    console.log('\n---\n');

    // Verificar usuários no auth
    console.log('👤 Verificando usuários no Supabase Auth...');
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Usuário logado:', user?.email || 'Nenhum');
}

checkTables();