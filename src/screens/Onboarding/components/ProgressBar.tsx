import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, TOTAL_STEPS } from '../../../types/onboarding';

interface Props {
  step: number;
}

export function ProgressBar({ step }: Props) {
  const pct = Math.max(0, Math.min(1, step / TOTAL_STEPS));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
});
