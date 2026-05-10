import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { validateHealthCard } from '../../lib/hcv/client';
import { useIntakeStore } from '../../store/intakeStore';
import { HCVStatusBadge } from './HCVStatusBadge';

function formatHealthCard(digits: string): string {
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export function HealthCardStep() {
  const { hcvStatus, hcvResponse, setHCVResult, setHealthCardInfo, setDemographics, advanceStep } =
    useIntakeStore();

  const [digits, setDigits] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [displayCard, setDisplayCard] = useState('');

  const isReadyToValidate = digits.length === 10;
  const isLoading = hcvStatus === 'pending';
  const canProceed = hcvStatus === 'valid' || hcvStatus === 'offline';

  function handleCardInput(text: string) {
    const d = text.replace(/\D/g, '').slice(0, 10);
    setDigits(d);
    setDisplayCard(formatHealthCard(d));
  }

  function handleVersionCode(text: string) {
    setVersionCode(text.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2));
  }

  async function handleValidate() {
    setHCVResult('pending', null);
    const today = new Date().toISOString().split('T')[0];
    const response = await validateHealthCard({
      healthCardNumber: digits,
      versionCode: versionCode || '  ',
      serviceDate: today,
    });

    if (response.offline) {
      setHCVResult('offline', response);
    } else if (response.isValid) {
      setHCVResult('valid', response);
    } else {
      setHCVResult('invalid', response);
    }
  }

  function handleProceed() {
    setHealthCardInfo(digits, versionCode);

    if (hcvStatus === 'valid' && hcvResponse) {
      setDemographics({
        legalFirstName: hcvResponse.firstName ?? '',
        legalLastName: hcvResponse.lastName ?? '',
        dateOfBirth: hcvResponse.dateOfBirth ?? '',
        sexAtBirth:
          hcvResponse.gender === 'M'
            ? 'MALE'
            : hcvResponse.gender === 'F'
              ? 'FEMALE'
              : 'PREFER_NOT_TO_SAY',
      });
    }

    advanceStep();
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      <Text className="text-2xl font-bold text-gray-900 mb-2">Health Card</Text>
      <Text className="text-base text-gray-500 mb-8">
        Enter your Ontario Health Card (OHIP) number to begin.
      </Text>

      {hcvStatus === 'offline' && (
        <View className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <Text className="text-amber-800 text-sm font-medium">Validation unavailable</Text>
          <Text className="text-amber-700 text-sm mt-1">
            You may proceed with manual entry. Ensure details match your physical card.
          </Text>
        </View>
      )}

      <View className="mb-5">
        <Text className="text-sm font-medium text-gray-700 mb-1.5">
          Health Card Number <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
          value={displayCard}
          onChangeText={handleCardInput}
          placeholder="#### ### ###"
          keyboardType="numeric"
          maxLength={12}
          editable={!isLoading}
          placeholderTextColor="#9ca3af"
        />
        <Text className="text-xs text-gray-400 mt-1.5">10-digit number on your green OHIP card</Text>
      </View>

      <View className="mb-6">
        <Text className="text-sm font-medium text-gray-700 mb-1.5">
          Version Code{' '}
          <Text className="text-xs text-gray-400 font-normal">(optional for older cards)</Text>
        </Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
          style={{ width: 96 }}
          value={versionCode}
          onChangeText={handleVersionCode}
          placeholder="AB"
          maxLength={2}
          autoCapitalize="characters"
          editable={!isLoading}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View className="mb-6">
        <HCVStatusBadge status={hcvStatus} responseCode={hcvResponse?.responseCode} />
      </View>

      <TouchableOpacity
        className={`py-4 rounded-xl items-center mb-3 ${
          isReadyToValidate && !isLoading ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        onPress={handleValidate}
        disabled={!isReadyToValidate || isLoading}
      >
        <Text
          className={`text-base font-semibold ${
            isReadyToValidate && !isLoading ? 'text-white' : 'text-gray-400'
          }`}
        >
          {isLoading ? 'Validating…' : 'Validate Card'}
        </Text>
      </TouchableOpacity>

      {canProceed && (
        <TouchableOpacity className="py-4 rounded-xl items-center bg-blue-600" onPress={handleProceed}>
          <Text className="text-white text-base font-semibold">Continue →</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
