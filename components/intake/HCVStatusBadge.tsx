import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import type { HCVStatus } from '../../store/intakeStore';

const REJECTION_REASONS: Record<string, string> = {
  '72': 'Card number not on file',
  '73': 'Card has expired',
  '74': 'Invalid version code',
};

interface Props {
  status: HCVStatus;
  responseCode?: string;
}

export function HCVStatusBadge({ status, responseCode }: Props) {
  if (status === 'idle') return null;

  if (status === 'pending') {
    return (
      <View className="flex-row items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
        <ActivityIndicator size="small" color="#6b7280" />
        <Text className="text-sm text-gray-600">Validating...</Text>
      </View>
    );
  }

  if (status === 'valid') {
    return (
      <View className="flex-row items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
        <Text className="text-green-600 font-bold">✓</Text>
        <Text className="text-sm text-green-700 font-medium">Card verified</Text>
      </View>
    );
  }

  if (status === 'invalid') {
    const reason = responseCode
      ? (REJECTION_REASONS[responseCode] ?? `Rejected (code ${responseCode})`)
      : 'Card validation failed';
    return (
      <View className="flex-row items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200">
        <Text className="text-red-500 font-bold">✗</Text>
        <Text className="text-sm text-red-700">{reason}</Text>
      </View>
    );
  }

  if (status === 'offline') {
    return (
      <View className="flex-row items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
        <Text className="text-amber-600 font-bold">⚠</Text>
        <Text className="text-sm text-amber-700">Validation offline</Text>
      </View>
    );
  }

  return null;
}
