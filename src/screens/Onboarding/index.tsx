import React from 'react';
import { OnboardingProvider, useOnboarding } from './OnboardingContext';
import { Step1PersonalInfo } from './Step1PersonalInfo';
import { Step2Measurements } from './Step2Measurements';
import { StepSymptoms } from './StepSymptoms';
import { Step4Review } from './Step4Review';
import { SuccessScreen } from './SuccessScreen';

function OnboardingFlow() {
  const { state } = useOnboarding();

  if (state.submitted) return <SuccessScreen />;

  switch (state.step) {
    case 1:
      return <Step1PersonalInfo />;
    case 2:
      return <Step2Measurements />;
    case 3:
      return <StepSymptoms />;
    case 4:
      return <Step4Review />;
    default:
      return <Step1PersonalInfo />;
  }
}

export default function OnboardingScreen() {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
}
