import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export interface PatientInsert {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  email: string;
  weight_lbs: number;
  height_feet: number;
  height_inches: number;
  body_map: Record<string, string[]>;
  symptoms_text: string | null;
}

export interface PatientRow extends PatientInsert {
  id: string;
  created_at: string;
  status: string;
}

export async function insertPatient(data: PatientInsert): Promise<PatientRow> {
  const { data: row, error } = await supabase
    .from('patients')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return row as PatientRow;
}
