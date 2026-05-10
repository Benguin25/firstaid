import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../../types/onboarding';

interface Props {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, error, hint, children }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  error: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 6,
  },
  hint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
});
