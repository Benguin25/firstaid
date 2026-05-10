export type TriageStatus =
  | 'waiting'
  | 'in-progress'
  | 'escalated'
  | 'discharged';

export type CtasLevel = 1 | 2 | 3 | 4 | 5;

export type ConditionProbability = 'High' | 'Moderate' | 'Low';

export interface ProbableCondition {
  condition: string;
  probability: ConditionProbability;
}

export interface PatientRow {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  email: string;
  weight_lbs: number;
  height_feet: number;
  height_inches: number;
  body_map: Record<string, string[]> | null;
  symptoms_text: string | null;
  status?: string | null;
}

export interface TriageRow {
  id: string;
  patient_id: string;
  ctas_level: CtasLevel;
  priority_score: number;
  nurse_summary: string | null;
  probable_conditions: ProbableCondition[];
  status: TriageStatus;
  created_at: string;
  updated_at: string;
}

export interface PatientWithTriage {
  patient: PatientRow;
  triage: TriageRow;
}

export const CTAS_COLORS: Record<CtasLevel, string> = {
  1: '#DC2626',
  2: '#EA580C',
  3: '#CA8A04',
  4: '#16A34A',
  5: '#2563EB',
};

export const CTAS_LABELS: Record<CtasLevel, string> = {
  1: 'Resuscitation',
  2: 'Emergent',
  3: 'Urgent',
  4: 'Less Urgent',
  5: 'Non-Urgent',
};

export const STATUS_COLORS: Record<
  TriageStatus,
  { bg: string; fg: string; label: string }
> = {
  waiting: { bg: '#e2e8f0', fg: '#475569', label: 'Waiting' },
  'in-progress': { bg: '#dbeafe', fg: '#1d4ed8', label: 'In Progress' },
  escalated: { bg: '#fee2e2', fg: '#991b1b', label: 'Escalated' },
  discharged: { bg: '#dcfce7', fg: '#166534', label: 'Discharged' },
};

export const DASHBOARD_COLORS = {
  primary: '#1D9E75',
  background: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
} as const;
