import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfumywvwubvernvhjehk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdW15d3Z3dWJ2ZXJudmhqZWhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQwMzc5OSwiZXhwIjoyMDY2OTc5Nzk5fQ.fdTsdGlSqemXzrXEU4ov1SUpeDn_3bSjOingqkSAWQE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fullScan() {
    console.log('🔍 ESCANEAMENTO COMPLETO DO SUPABASE\n');
    console.log('═'.repeat(60));

    // Lista de possíveis schemas
    const schemas = ['public', 'mottivme_intelligence_system'];

    for (const schema of schemas) {
        console.log(`\n📂 SCHEMA: ${schema}`);
        console.log('─'.repeat(60));

        // Tentar listar tabelas do schema
        const { data: tables, error } = await supabase
            .rpc('get_tables', { schema_name: schema })
            .single();

        // Se não funcionar, tentar tabelas conhecidas
        const commonTables = [
            'profiles',
            'users',
            'clientes',
            'leads',
            'vendas',
            'produtos',
            'pedidos',
            'conversas',
            'mensagens',
            'campanhas',
            'mentoria',
            'alunos',
            'cursos',
            'modulos',
            'aulas',
            'progresso',
            'pagamentos',
            'assinaturas',
            'grupos',
            'membros',
            'tarefas',
            'metas',
            'avaliacoes',
            'feedback',
            'notificacoes',
            'logs',
            'analytics',
            'metricas',
            'kpis',
            'relatorios',
            'dashboards'
        ];

        for (const tableName of commonTables) {
            try {
                const { data, error, count } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact' })
                    .limit(2);

                if (!error && data !== null) {
                    console.log(`\n✅ TABELA: ${tableName}`);
                    console.log(`   📊 Registros: ${count || 0}`);

                    if (data && data.length > 0) {
                        console.log(`   📋 Colunas: ${Object.keys(data[0]).join(', ')}`);
                        console.log(`\n   📝 Exemplo de dados:`);
                        console.log(JSON.stringify(data[0], null, 4));
                    } else {
                        console.log(`   📭 (vazia)`);
                    }
                }
            } catch (e) {
                // Ignorar erros
            }
        }
    }

    console.log('\n\n═'.repeat(60));
    console.log('🔍 BUSCA EM STORAGE (Arquivos)');
    console.log('═'.repeat(60));

    const { data: buckets } = await supabase.storage.listBuckets();

    if (buckets && buckets.length > 0) {
        console.log(`\n✅ ${buckets.length} bucket(s) encontrado(s):\n`);
        for (const bucket of buckets) {
            console.log(`📦 ${bucket.name} (${bucket.public ? 'Público' : 'Privado'})`);

            const { data: files } = await supabase.storage
                .from(bucket.name)
                .list('', { limit: 5 });

            if (files && files.length > 0) {
                console.log(`   📁 ${files.length} arquivo(s):`);
                files.forEach(f => console.log(`      - ${f.name}`));
            }
        }
    }

    console.log('\n\n═'.repeat(60));
    console.log('📊 RESUMO FINAL');
    console.log('═'.repeat(60));
}

fullScan();