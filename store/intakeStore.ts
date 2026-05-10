import { create } from 'zustand';
import type { HCVResponse } from '../lib/hcv/types';

export interface PatientDemographics {
  legalFirstName: string;
  legalMiddleName?: string;
  legalLastName: string;
  preferredName?: string;
  dateOfBirth: string;
  sexAtBirth: 'MALE' | 'FEMALE' | 'INTERSEX' | 'PREFER_NOT_TO_SAY';
  genderIdentity?: string;
  healthCardNumber: string;
  versionCode: string;
  provinceOfCoverage: string;
  cardExpiry?: string;
  phone: string;
  email?: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
  emergencyName?: string;
  emergencyRelation?: string;
  emergencyPhone?: string;
  preferredLanguage: string;
  interpreterNeeded?: string;
}

export type IntakeStep = 'health-card' | 'demographics' | 'symptoms';
export type HCVStatus = 'idle' | 'pending' | 'valid' | 'invalid' | 'offline';

interface IntakeState {
  currentStep: IntakeStep;
  hcvStatus: HCVStatus;
  hcvResponse: HCVResponse | null;
  healthCardNumber: string;
  versionCode: string;
  demographics: Partial<PatientDemographics>;

  setHealthCardInfo: (healthCardNumber: string, versionCode: string) => void;
  setHCVResult: (status: HCVStatus, response: HCVResponse | null) => void;
  setDemographics: (data: Partial<PatientDemographics>) => void;
  advanceStep: () => void;
  resetIntake: () => void;
}

const STEP_ORDER: IntakeStep[] = ['health-card', 'demographics', 'symptoms'];

export const useIntakeStore = create<IntakeState>((set, get) => ({
  currentStep: 'health-card',
  hcvStatus: 'idle',
  hcvResponse: null,
  healthCardNumber: '',
  versionCode: '',
  demographics: {},

  setHealthCardInfo: (healthCardNumber, versionCode) =>
    set({ healthCardNumber, versionCode }),

  setHCVResult: (status, response) =>
    set({ hcvStatus: status, hcvResponse: response }),

  setDemographics: (data) =>
    set((state) => ({ demographics: { ...state.demographics, ...data } })),

  advanceStep: () => {
    const { currentStep } = get();
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx < STEP_ORDER.length - 1) {
      set({ currentStep: STEP_ORDER[idx + 1] });
    }
  },

  resetIntake: () =>
    set({
      currentStep: 'health-card',
      hcvStatus: 'idle',
      hcvResponse: null,
      healthCardNumber: '',
      versionCode: '',
      demographics: {},
    }),
}));
