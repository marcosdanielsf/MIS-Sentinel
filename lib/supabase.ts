import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Using public schema - custom schema (mottivme_intelligence_system) needs to be exposed
// in Supabase Dashboard > Settings > API > Exposed schemas
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Alias for backwards compatibility
export const supabasePublic = supabase;