import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIntakeStore } from '../../store/intakeStore';
import { StepIndicator } from '../../components/intake/StepIndicator';
import { HealthCardStep } from '../../components/intake/HealthCardStep';
import { DemographicsForm } from '../../components/intake/DemographicsForm';

export default function IntakePage() {
  const { currentStep, resetIntake } = useIntakeStore();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 pt-2 pb-1">
        <Text className="text-lg font-bold text-blue-700">FirstAid Intake</Text>
        {currentStep !== 'health-card' && (
          <TouchableOpacity onPress={resetIntake}>
            <Text className="text-sm text-gray-400">Start over</Text>
          </TouchableOpacity>
        )}
      </View>

      <StepIndicator currentStep={currentStep} />

      <View className="flex-1">
        {currentStep === 'health-card' && <HealthCardStep />}
        {currentStep === 'demographics' && <DemographicsForm />}
        {currentStep === 'symptoms' && (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-2xl font-bold text-gray-900 mb-3">Symptoms</Text>
            <Text className="text-base text-gray-500 text-center">
              Step 3 — coming soon.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
