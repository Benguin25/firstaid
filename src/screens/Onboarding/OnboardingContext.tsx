import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';
import { insertPatient, type PatientInsert } from '../../../lib/supabase';
import type {
  BodyRegion,
  Measurements,
  OnboardingAction,
  OnboardingState,
  PersonalInfo,
  Sensation,
  StepIndex,
} from '../../types/onboarding';

const initialState: OnboardingState = {
  step: 1,
  personal: {
    firstName: '',
    lastName: '',
    dateOfBirth: null,
    phone: '',
    email: '',
  },
  measurements: {
    weightLbs: '',
    heightFeet: '',
    heightInches: '',
  },
  symptoms: {
    regions: {},
    description: '',
  },
  submitting: false,
  submitted: false,
  submitError: null,
  patientId: null,
  errors: {},
};

function reducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'UPDATE_PERSONAL':
      return {
        ...state,
        personal: { ...state.personal, ...action.data },
      };
    case 'UPDATE_MEASUREMENTS':
      return {
        ...state,
        measurements: { ...state.measurements, ...action.data },
      };
    case 'TOGGLE_REGION_SENSATIONS': {
      const next = { ...state.symptoms.regions };
      if (action.sensations.length === 0) {
        delete next[action.region];
      } else {
        next[action.region] = action.sensations;
      }
      return {
        ...state,
        symptoms: { ...state.symptoms, regions: next },
      };
    }
    case 'CLEAR_REGION': {
      const next = { ...state.symptoms.regions };
      delete next[action.region];
      return {
        ...state,
        symptoms: { ...state.symptoms, regions: next },
      };
    }
    case 'SET_SYMPTOM_DESCRIPTION':
      return {
        ...state,
        symptoms: { ...state.symptoms, description: action.description },
      };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'CLEAR_ERRORS':
      return { ...state, errors: {} };
    case 'SUBMIT_START':
      return { ...state, submitting: true, submitError: null };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        submitting: false,
        submitted: true,
        submitError: null,
        patientId: action.patientId,
      };
    case 'SUBMIT_ERROR':
      return { ...state, submitting: false, submitError: action.error };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

function buildPatientInsert(state: OnboardingState): PatientInsert {
  const { personal, measurements, symptoms } = state;
  const dob = personal.dateOfBirth
    ? new Date(personal.dateOfBirth).toISOString().slice(0, 10)
    : '';
  return {
    first_name: personal.firstName.trim(),
    last_name: personal.lastName.trim(),
    date_of_birth: dob,
    phone: personal.phone.trim(),
    email: personal.email.trim(),
    weight_lbs: Number(measurements.weightLbs),
    height_feet: Number(measurements.heightFeet),
    height_inches: Number(measurements.heightInches),
    body_map: symptoms.regions as Record<string, string[]>,
    symptoms_text: symptoms.description.trim() || null,
  };
}

interface OnboardingContextValue {
  state: OnboardingState;
  setStep: (step: StepIndex) => void;
  updatePersonal: (data: Partial<PersonalInfo>) => void;
  updateMeasurements: (data: Partial<Measurements>) => void;
  setRegionSensations: (region: BodyRegion, sensations: Sensation[]) => void;
  clearRegion: (region: BodyRegion) => void;
  setSymptomDescription: (description: string) => void;
  setErrors: (errors: OnboardingState['errors']) => void;
  clearErrors: () => void;
  submitPatient: () => Promise<void>;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setStep = useCallback((step: StepIndex) => {
    dispatch({ type: 'SET_STEP', step });
  }, []);

  const updatePersonal = useCallback((data: Partial<PersonalInfo>) => {
    dispatch({ type: 'UPDATE_PERSONAL', data });
  }, []);

  const updateMeasurements = useCallback((data: Partial<Measurements>) => {
    dispatch({ type: 'UPDATE_MEASUREMENTS', data });
  }, []);

  const setRegionSensations = useCallback(
    (region: BodyRegion, sensations: Sensation[]) => {
      dispatch({ type: 'TOGGLE_REGION_SENSATIONS', region, sensations });
    },
    [],
  );

  const clearRegion = useCallback((region: BodyRegion) => {
    dispatch({ type: 'CLEAR_REGION', region });
  }, []);

  const setSymptomDescription = useCallback((description: string) => {
    dispatch({ type: 'SET_SYMPTOM_DESCRIPTION', description });
  }, []);

  const setErrors = useCallback((errors: OnboardingState['errors']) => {
    dispatch({ type: 'SET_ERRORS', errors });
  }, []);

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const submitPatient = useCallback(async () => {
    const payload = buildPatientInsert(state);
    console.log('submitPatient', JSON.stringify(payload, null, 2));
    dispatch({ type: 'SUBMIT_START' });
    try {
      const row = await insertPatient(payload);
      console.log('insertPatient ok', row.id);
      dispatch({ type: 'SUBMIT_SUCCESS', patientId: row.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      console.error('insertPatient failed', err);
      dispatch({ type: 'SUBMIT_ERROR', error: message });
    }
  }, [state]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      setStep,
      updatePersonal,
      updateMeasurements,
      setRegionSensations,
      clearRegion,
      setSymptomDescription,
      setErrors,
      clearErrors,
      submitPatient,
      reset,
    }),
    [
      state,
      setStep,
      updatePersonal,
      updateMeasurements,
      setRegionSensations,
      clearRegion,
      setSymptomDescription,
      setErrors,
      clearErrors,
      submitPatient,
      reset,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}
