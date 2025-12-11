import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfumywvwubvernvhjehk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdW15d3Z3dWJ2ZXJudmhqZWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MDM3OTksImV4cCI6MjA2Njk3OTc5OX0.60VyeZ8XaD6kz7Eh5Ov_nEeDtu5woMwMJYgUM-Sruao';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestUser() {
    console.log('🔐 Criando usuário de teste...');

    const { data, error } = await supabase.auth.signUp({
        email: 'admin@example.com',
        password: 'admin123',
        options: {
            data: {
                username: 'Admin',
                role: 'admin',
            },
        },
    });

    if (error) {
        console.error('❌ Erro ao criar usuário:', error.message);
        return;
    }

    console.log('✅ Usuário criado com sucesso!');
    console.log('📧 Email:', 'admin@example.com');
    console.log('🔑 Senha:', 'admin123');
    console.log('\n🎉 Agora você pode fazer login em http://localhost:3000');
}

createTestUser();