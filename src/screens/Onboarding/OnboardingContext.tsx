import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';
import {
  insertPatient,
  insertTriage,
  type PatientInsert,
  type TriageInsert,
} from '../../../lib/supabase';
import type { CategoryCode } from '../../data/questionBank';
import type { AnsweredQuestion, TriageScore } from '../../lib/triage';
import type {
  Measurements,
  OnboardingAction,
  OnboardingState,
  PersonalInfo,
  StepIndex,
} from '../../types/onboarding';

const initialState: OnboardingState = {
  step: 0,
  personal: {
    firstName: '',
    lastName: '',
    dateOfBirth: null,
    phone: '',
    email: '',
    healthCardNumber: '',
  },
  measurements: {
    weightLbs: '',
    heightFeet: '5',
    heightInches: '6',
  },
  medicalHistory: [],
  // NEW: body map selections from the interactive body diagram
  bodyMap: [],
  triage: {
    category: null,
    asked: [],
    selfSeverity: null,
    score: null,
    finished: false,
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
      return { ...state, personal: { ...state.personal, ...action.data } };
    case 'UPDATE_MEASUREMENTS':
      return {
        ...state,
        measurements: { ...state.measurements, ...action.data },
      };
    case 'UPDATE_MEDICAL_HISTORY':
      return { ...state, medicalHistory: action.medicalHistory };
    // NEW: replace the entire bodyMap array with whatever the WebView sends back
    case 'UPDATE_BODY_MAP':
      return { ...state, bodyMap: action.bodyMap };
    case 'TRIAGE_SET_CATEGORY':
      return {
        ...state,
        triage: { ...state.triage, category: action.category },
      };
    case 'TRIAGE_ADD_ANSWER':
      return {
        ...state,
        triage: {
          ...state.triage,
          asked: [...state.triage.asked, action.answer],
        },
      };
    case 'TRIAGE_SET_SEVERITY':
      return {
        ...state,
        triage: { ...state.triage, selfSeverity: action.selfSeverity },
      };
    case 'TRIAGE_FINISH':
      return {
        ...state,
        triage: { ...state.triage, score: action.score, finished: true },
      };
    case 'TRIAGE_RESET':
      return { ...state, triage: initialState.triage };
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
  const { personal, measurements, triage, bodyMap, medicalHistory } = state;
  const dob = personal.dateOfBirth
    ? new Date(personal.dateOfBirth).toISOString().slice(0, 10)
    : '';

  const triagePayload = {
    category: triage.category,
    score: triage.score,
    asked: [...medicalHistory, ...triage.asked],
  };

  const healthCard = personal.healthCardNumber.trim();

  return {
    first_name: personal.firstName.trim(),
    last_name: personal.lastName.trim(),
    date_of_birth: dob,
    phone: personal.phone.trim(),
    email: personal.email.trim(),
    health_card_number: healthCard.length > 0 ? healthCard : null,
    weight_lbs: Number(measurements.weightLbs),
    height_feet: Number(measurements.heightFeet),
    height_inches: Number(measurements.heightInches),
    // bodyMap is now a real array of selected part keys, e.g. ["3","4","10"]
    body_map: bodyMap,
    symptoms_text: JSON.stringify(triagePayload),
  };
}

function buildTriageInsert(
  patientId: string,
  state: OnboardingState,
): TriageInsert {
  const { triage, medicalHistory } = state;
  const tier = triage.score?.tier ?? 5;
  const score01 = triage.score?.score ?? 0;
  const priorityScore = Math.max(0, Math.min(100, Math.round(score01 * 100)));

  const summaryParts: string[] = [];
  if (triage.category) {
    summaryParts.push(
      `Chief complaint: ${triage.category.toLowerCase().replace(/_/g, ' ')}.`,
    );
  }
  if (triage.selfSeverity !== null) {
    summaryParts.push(`Self-reported severity: ${triage.selfSeverity}/10.`);
  }
  summaryParts.push(
    `${medicalHistory.length + triage.asked.length} clinical answers on file.`,
  );

  return {
    patient_id: patientId,
    ctas_level: tier,
    priority_score: priorityScore,
    nurse_summary: summaryParts.join(' '),
    probable_conditions: [],
    status: 'waiting',
  };
}

interface OnboardingContextValue {
  state: OnboardingState;
  setStep: (step: StepIndex) => void;
  updatePersonal: (data: Partial<PersonalInfo>) => void;
  updateMeasurements: (data: Partial<Measurements>) => void;
  updateMedicalHistory: (medicalHistory: AnsweredQuestion[]) => void;
  // NEW
  updateBodyMap: (bodyMap: string[]) => void;
  setTriageCategory: (category: CategoryCode | null) => void;
  addTriageAnswer: (answer: AnsweredQuestion) => void;
  setSelfSeverity: (selfSeverity: number | null) => void;
  finishTriage: (score: TriageScore) => void;
  resetTriage: () => void;
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

  const updateMedicalHistory = useCallback((medicalHistory: AnsweredQuestion[]) => {
    dispatch({ type: 'UPDATE_MEDICAL_HISTORY', medicalHistory });
  }, []);

  // NEW
  const updateBodyMap = useCallback((bodyMap: string[]) => {
    dispatch({ type: 'UPDATE_BODY_MAP', bodyMap });
  }, []);

  const setTriageCategory = useCallback((category: CategoryCode | null) => {
    dispatch({ type: 'TRIAGE_SET_CATEGORY', category });
  }, []);

  const addTriageAnswer = useCallback((answer: AnsweredQuestion) => {
    dispatch({ type: 'TRIAGE_ADD_ANSWER', answer });
  }, []);

  const setSelfSeverity = useCallback((selfSeverity: number | null) => {
    dispatch({ type: 'TRIAGE_SET_SEVERITY', selfSeverity });
  }, []);

  const finishTriage = useCallback((score: TriageScore) => {
    dispatch({ type: 'TRIAGE_FINISH', score });
  }, []);

  const resetTriage = useCallback(() => {
    dispatch({ type: 'TRIAGE_RESET' });
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
    dispatch({ type: 'SUBMIT_START' });
    try {
      const row = await insertPatient(payload);
      const triagePayload = buildTriageInsert(row.id, state);
      await insertTriage(triagePayload);
      dispatch({ type: 'SUBMIT_SUCCESS', patientId: row.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      console.error('patient/triage insert failed', err);
      dispatch({ type: 'SUBMIT_ERROR', error: message });
    }
  }, [state]);

  
  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      setStep,
      updatePersonal,
      updateMeasurements,
      updateMedicalHistory,
      updateBodyMap,
      setTriageCategory,
      addTriageAnswer,
      setSelfSeverity,
      finishTriage,
      resetTriage,
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
      updateMedicalHistory,
      updateBodyMap,
      setTriageCategory,
      addTriageAnswer,
      setSelfSeverity,
      finishTriage,
      resetTriage,
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
