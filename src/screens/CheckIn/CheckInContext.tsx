import { createContext, ReactNode, useContext, useState } from 'react';

export type Onset =
  | 'within_hour'
  | 'few_hours'
  | '1_3_days'
  | 'more_than_3_days';

export type Pattern = 'constant' | 'comes_and_goes' | 'getting_worse';

export type BodyRegion =
  | 'head'
  | 'neck'
  | 'chest'
  | 'abdomen'
  | 'upper_back'
  | 'lower_back'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_upper_arm'
  | 'right_upper_arm'
  | 'left_elbow'
  | 'right_elbow'
  | 'left_forearm'
  | 'right_forearm'
  | 'left_wrist'
  | 'right_wrist'
  | 'left_hand'
  | 'right_hand'
  | 'left_thigh'
  | 'right_thigh'
  | 'left_knee'
  | 'right_knee'
  | 'left_lower_leg'
  | 'right_lower_leg'
  | 'left_foot'
  | 'right_foot';

export type DOB = { day: string; month: string; year: string };

export type ChiefComplaint = {
  description: string;
  symptoms: string[];
};

export type CheckInData = {
  firstName: string;
  lastName: string;
  dob: DOB;
  phone: string;
  email: string;
  bodyRegions: BodyRegion[];
  chiefComplaint: ChiefComplaint;
  onset: Onset | null;
  pattern: Pattern | null;
  painLevel: number | null;
  allergies: string;
};

const initialData: CheckInData = {
  firstName: '',
  lastName: '',
  dob: { day: '', month: '', year: '' },
  phone: '',
  email: '',
  bodyRegions: [],
  chiefComplaint: { description: '', symptoms: [] },
  onset: null,
  pattern: null,
  painLevel: null,
  allergies: '',
};

export const TOTAL_STEPS = 6;

type CheckInContextValue = {
  data: CheckInData;
  update: <K extends keyof CheckInData>(key: K, value: CheckInData[K]) => void;
  step: number;
  setStep: (n: number) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
};

const CheckInContext = createContext<CheckInContextValue | null>(null);

export function CheckInProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CheckInData>(initialData);
  const [step, setStep] = useState(0);

  const update: CheckInContextValue['update'] = (key, value) =>
    setData((d) => ({ ...d, [key]: value }));

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setData(initialData);
    setStep(0);
  };

  return (
    <CheckInContext.Provider
      value={{ data, update, step, setStep, next, back, reset }}
    >
      {children}
    </CheckInContext.Provider>
  );
}

export function useCheckIn() {
  const ctx = useContext(CheckInContext);
  if (!ctx) throw new Error('useCheckIn must be used within CheckInProvider');
  return ctx;
}

export const ONSET_OPTIONS: { value: Onset; label: string }[] = [
  { value: 'within_hour', label: 'Within the hour' },
  { value: 'few_hours', label: 'A few hours ago' },
  { value: '1_3_days', label: '1–3 days ago' },
  { value: 'more_than_3_days', label: 'More than 3 days' },
];

export const PATTERN_OPTIONS: { value: Pattern; label: string }[] = [
  { value: 'constant', label: 'Constant' },
  { value: 'comes_and_goes', label: 'Comes and goes' },
  { value: 'getting_worse', label: 'Getting worse' },
];

export const REGION_LABEL: Record<BodyRegion, string> = {
  head: 'Head',
  neck: 'Neck',
  chest: 'Chest',
  abdomen: 'Abdomen',
  upper_back: 'Upper back',
  lower_back: 'Lower back',
  left_shoulder: 'Left shoulder',
  right_shoulder: 'Right shoulder',
  left_upper_arm: 'Left upper arm',
  right_upper_arm: 'Right upper arm',
  left_elbow: 'Left elbow',
  right_elbow: 'Right elbow',
  left_forearm: 'Left forearm',
  right_forearm: 'Right forearm',
  left_wrist: 'Left wrist',
  right_wrist: 'Right wrist',
  left_hand: 'Left hand',
  right_hand: 'Right hand',
  left_thigh: 'Left thigh',
  right_thigh: 'Right thigh',
  left_knee: 'Left knee',
  right_knee: 'Right knee',
  left_lower_leg: 'Left lower leg',
  right_lower_leg: 'Right lower leg',
  left_foot: 'Left foot',
  right_foot: 'Right foot',
};
