// Re-export the Supabase client from the existing root-level lib/supabase.ts
// so the dashboard shares a single client (and a single realtime connection)
// with the onboarding flow.
export { supabase } from '../../lib/supabase';
