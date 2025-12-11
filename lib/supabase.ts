import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente principal usando schema mottivme_intelligence_system
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'mottivme_intelligence_system' }
});

// Cliente para schema public (para views e tabelas auxiliares)
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' }
});