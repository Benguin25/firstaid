import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../types/onboarding';
import { useQueue } from '../../hooks/useQueue';
import { useEstimateWait } from '../../hooks/useEstimateWait';
import { formatWait } from '../../lib/estimateWait';
import { STATUS_COLORS, type TriageStatus } from '../../types/supabase';
import { useOnboarding } from './OnboardingContext';

interface StatusIcon {
  color: string;
  path: string;
  strokeWidth: number;
}

const STATUS_COPY: Record<
  TriageStatus,
  { title: string; body: string; icon: StatusIcon }
> = {
  waiting: {
    title: "You're checked in",
    body: 'Please take a seat — a nurse will call your name shortly.',
    icon: {
      color: COLORS.primary,
      path: 'M5 12.5l4.5 4.5L19 7',
      strokeWidth: 3,
    },
  },
  'in-progress': {
    title: "You're being seen",
    body: 'A clinician is with you now.',
    icon: {
      color: '#1d4ed8',
      // Right-pointing arrow ("you've been called in")
      path: 'M5 12h14M13 6l6 6-6 6',
      strokeWidth: 3,
    },
  },
  escalated: {
    title: 'Your case has been escalated',
    body: 'A senior clinician will see you immediately.',
    icon: {
      color: '#D97706',
      // Exclamation mark
      path: 'M12 4v10M12 18.5v1.5',
      strokeWidth: 3.5,
    },
  },
  discharged: {
    title: "You've been discharged",
    body: 'Thank you. You are free to leave.',
    icon: {
      color: '#DC2626',
      // X
      path: 'M6 6l12 12M18 6L6 18',
      strokeWidth: 3,
    },
  },
};

export function SuccessScreen() {
  const { state } = useOnboarding();
  const { data: queue } = useQueue();
  const estimateFor = useEstimateWait(queue);

  const patientId = state.patientId;
  const myEntry = patientId
    ? queue.find((q) => q.patient.id === patientId)
    : undefined;
  const status: TriageStatus = myEntry?.triage.status ?? 'waiting';
  const statusMeta = STATUS_COLORS[status];
  const copy = STATUS_COPY[status];

  const minutes = patientId ? estimateFor(patientId) : null;
  const showWait = status === 'waiting';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View
          style={[
            styles.checkCircle,
            { backgroundColor: copy.icon.color, shadowColor: copy.icon.color },
          ]}
        >
          <Svg width={56} height={56} viewBox="0 0 24 24">
            <Path
              d={copy.icon.path}
              stroke="#ffffff"
              strokeWidth={copy.icon.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>

        <Text style={styles.title}>{copy.title}</Text>

        <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusMeta.fg }]} />
          <Text style={[styles.statusText, { color: statusMeta.fg }]}>
            {statusMeta.label}
          </Text>
        </View>

        {showWait && (
          <View style={styles.waitBlock}>
            <Text style={styles.waitLabel}>Estimated wait</Text>
            <Text style={styles.waitValue}>
              {minutes === null ? '—' : formatWait(minutes)}
            </Text>
          </View>
        )}

        <Text style={styles.body}>{copy.body}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  checkCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 14,
    textAlign: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 8,
    marginBottom: 24,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  waitBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  waitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  waitValue: {
    fontSize: 44,
    fontWeight: '800',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
  },
  body: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
