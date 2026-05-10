import type { CategoryCode } from '../data/questionBank';
import type {
  AnsweredQuestion,
  Priority,
  Tier,
  TriageScore,
} from '../lib/triage';

export type StepIndex = 1 | 2 | 3 | 4 | 5;  // 3 = body map (new), 4 = symptoms, 5 = review

export const TOTAL_STEPS = 5 as const;

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  phone: string;
  email: string;
  healthCardNumber: string;
}

export interface Measurements {
  weightLbs: string;
  heightFeet: string;
  heightInches: string;
}

export interface TriageState {
  category: CategoryCode | null;
  asked: AnsweredQuestion[];
  selfSeverity: number | null;
  score: TriageScore | null;
  finished: boolean;
}

export interface OnboardingState {
  step: StepIndex;
  personal: PersonalInfo;
  measurements: Measurements;
  bodyMap: string[];             // NEW: selected area keys from the body diagram, e.g. ["4","10","3"]
  triage: TriageState;
  submitting: boolean;
  submitted: boolean;
  submitError: string | null;
  patientId: string | null;
  errors: Partial<Record<keyof PersonalInfo | keyof Measurements, string>>;
}

export type OnboardingAction =
  | { type: 'SET_STEP'; step: StepIndex }
  | { type: 'UPDATE_PERSONAL'; data: Partial<PersonalInfo> }
  | { type: 'UPDATE_MEASUREMENTS'; data: Partial<Measurements> }
  | { type: 'UPDATE_BODY_MAP'; bodyMap: string[] }  // NEW
  | { type: 'TRIAGE_SET_CATEGORY'; category: CategoryCode | null }
  | { type: 'TRIAGE_ADD_ANSWER'; answer: AnsweredQuestion }
  | { type: 'TRIAGE_SET_SEVERITY'; selfSeverity: number | null }
  | { type: 'TRIAGE_FINISH'; score: TriageScore }
  | { type: 'TRIAGE_RESET' }
  | {
      type: 'SET_ERRORS';
      errors: Partial<Record<keyof PersonalInfo | keyof Measurements, string>>;
    }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; patientId: string }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'RESET' };

export const COLORS = {
  primary: '#1D9E75',
  background: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  error: '#ef4444',
  warning: '#f59e0b',
  danger: '#dc2626',
} as const;

export const PRIORITY_TONE: Record<Priority, { bg: string; fg: string; border: string }> = {
  HIGH: { bg: '#fee2e2', fg: '#991b1b', border: COLORS.danger },
  LOW: { bg: '#fef3c7', fg: '#92400e', border: COLORS.warning },
  DISMISSED: { bg: '#dcfce7', fg: '#166534', border: COLORS.primary },
};

export type { Priority, Tier, TriageScore, AnsweredQuestion };