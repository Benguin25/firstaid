import React from 'react';
import { View, Text } from 'react-native';
import type { IntakeStep } from '../../store/intakeStore';

const STEPS: { key: IntakeStep; label: string }[] = [
  { key: 'health-card', label: 'Health Card' },
  { key: 'demographics', label: 'Personal Info' },
  { key: 'symptoms', label: 'Symptoms' },
];

interface Props {
  currentStep: IntakeStep;
}

export function StepIndicator({ currentStep }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        return (
          <React.Fragment key={step.key}>
            <View className="items-center">
              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  isCompleted || isCurrent ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                {isCompleted ? (
                  <Text className="text-white text-sm font-bold">✓</Text>
                ) : (
                  <Text className={`text-sm font-bold ${isCurrent ? 'text-white' : 'text-gray-400'}`}>
                    {idx + 1}
                  </Text>
                )}
              </View>
              <Text className={`text-xs mt-1 ${isCurrent ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                {step.label}
              </Text>
            </View>
            {idx < STEPS.length - 1 && (
              <View className={`flex-1 h-0.5 mx-2 mb-4 ${isCompleted ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
