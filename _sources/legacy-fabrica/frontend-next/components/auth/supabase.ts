import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pmcnripjowwvtncgflpc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtY25yaXBqb3d3dnRuY2dmbHBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MjAwMTUsImV4cCI6MjEwMDE5NjAxNX0.WiNMqphLYhaG5ETOOWRx6cRDDEtWNODoV4irjwyOe7s';

// Create a single Supabase client initialized via server-declared environment variables
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Helper to check if Supabase is fully configured and active
 */
export function isSupabaseConfigured(): boolean {
  return !!supabase;
}
