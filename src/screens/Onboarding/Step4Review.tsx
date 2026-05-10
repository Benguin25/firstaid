import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, type StepIndex } from '../../types/onboarding';
import { useOnboarding } from './OnboardingContext';
import { StepLayout } from './components/StepLayout';

function titleCase(s: string): string {
  return s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

interface SectionProps {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}

function Section({ title, onEdit, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
        >
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

interface RowProps {
  label: string;
  value: string;
}

function Row({ label, value }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

export function Step4Review() {
  const { state, setStep, submitPatient } = useOnboarding();
  const { personal, measurements, symptoms, submitting, submitError } = state;

  const goEdit = (step: StepIndex) => () => setStep(step);

  const regionEntries = Object.entries(symptoms.regions) as Array<
    [string, ReturnType<typeof Object.values>[number]]
  >;

  const handleSubmit = () => {
    if (submitting) return;
    void submitPatient();
  };

  return (
    <StepLayout
      step={4}
      title="Review & submit"
      subtitle="Make sure everything looks right before you check in."
      onBack={() => setStep(3)}
      onContinue={handleSubmit}
      continueLabel={submitting ? 'Submitting…' : 'Submit'}
      continueDisabled={submitting}
    >
      <Section title="Personal info" onEdit={goEdit(1)}>
        <Row label="Name" value={`${personal.firstName} ${personal.lastName}`.trim()} />
        <Row label="Date of birth" value={formatDate(personal.dateOfBirth)} />
        <Row label="Phone" value={personal.phone} />
        <Row label="Email" value={personal.email} />
      </Section>

      <Section title="Body measurements" onEdit={goEdit(2)}>
        <Row label="Weight" value={measurements.weightLbs ? `${measurements.weightLbs} lbs` : ''} />
        <Row
          label="Height"
          value={
            measurements.heightFeet || measurements.heightInches
              ? `${measurements.heightFeet || '0'}' ${measurements.heightInches || '0'}"`
              : ''
          }
        />
      </Section>

      <Section title="Symptoms" onEdit={goEdit(3)}>
        {regionEntries.length === 0 ? (
          <Text style={styles.emptyText}>No body regions selected.</Text>
        ) : (
          <View style={styles.regionList}>
            {regionEntries.map(([region, sensations]) => (
              <View key={region} style={styles.regionRow}>
                <Text style={styles.regionName}>{titleCase(region)}</Text>
                <Text style={styles.regionSensations}>
                  {(sensations as string[]).join(', ')}
                </Text>
              </View>
            ))}
          </View>
        )}
        {symptoms.description ? (
          <View style={styles.descriptionWrap}>
            <Text style={styles.rowLabel}>Description</Text>
            <Text style={styles.descriptionText}>{symptoms.description}</Text>
          </View>
        ) : null}
      </Section>

      {submitError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTitle}>Couldn't submit</Text>
          <Text style={styles.errorBody}>{submitError}</Text>
        </View>
      ) : null}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  editBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    width: 110,
  },
  rowValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  regionList: {
    gap: 6,
  },
  regionRow: {
    paddingVertical: 4,
  },
  regionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  regionSensations: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  descriptionWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 4,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: 4,
  },
  errorBody: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
});
