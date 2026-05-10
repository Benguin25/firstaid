export const BODY_REGIONS = [
  'head',
  'neck',
  'chest',
  'abdomen',
  'upper back',
  'lower back',
  'left shoulder',
  'right shoulder',
  'left upper arm',
  'right upper arm',
  'left elbow',
  'right elbow',
  'left forearm',
  'right forearm',
  'left wrist',
  'right wrist',
  'left hand',
  'right hand',
  'left thigh',
  'right thigh',
  'left knee',
  'right knee',
  'left lower leg',
  'right lower leg',
  'left foot',
  'right foot',
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];

export const SENSATIONS = [
  'Pain',
  'Pressure',
  'Burning',
  'Numbness',
  'Tingling',
  'Swelling',
  'Tenderness',
  'Stiffness',
  'Weakness',
  'Cramping',
] as const;

export type Sensation = (typeof SENSATIONS)[number];

export type BodyView = 'front' | 'back';

export type StepIndex = 1 | 2 | 3 | 4;

export const TOTAL_STEPS = 4 as const;

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  phone: string;
  email: string;
}

export interface Measurements {
  weightLbs: string;
  heightFeet: string;
  heightInches: string;
}

export type RegionSensations = Partial<Record<BodyRegion, Sensation[]>>;

export interface SymptomData {
  regions: RegionSensations;
  description: string;
}

export interface OnboardingState {
  step: StepIndex;
  personal: PersonalInfo;
  measurements: Measurements;
  symptoms: SymptomData;
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
  | { type: 'TOGGLE_REGION_SENSATIONS'; region: BodyRegion; sensations: Sensation[] }
  | { type: 'CLEAR_REGION'; region: BodyRegion }
  | { type: 'SET_SYMPTOM_DESCRIPTION'; description: string }
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
} as const;
