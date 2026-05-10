import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { COLORS, type Measurements } from '../../types/onboarding';
import { useOnboarding } from './OnboardingContext';
import { StepLayout } from './components/StepLayout';
import { Field } from './components/Field';

function isPositiveNumber(v: string): boolean {
  if (v.trim() === '') return false;
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

function isNonNegativeNumber(v: string): boolean {
  if (v.trim() === '') return false;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
}

function validate(m: Measurements): Partial<Record<keyof Measurements, string>> {
  const errors: Partial<Record<keyof Measurements, string>> = {};
  if (!m.weightLbs.trim()) errors.weightLbs = 'Required';
  else if (!isPositiveNumber(m.weightLbs)) errors.weightLbs = 'Enter a valid weight';
  if (!m.heightFeet.trim()) errors.heightFeet = 'Required';
  else if (!isPositiveNumber(m.heightFeet)) errors.heightFeet = 'Enter feet';
  if (!m.heightInches.trim()) errors.heightInches = 'Required';
  else if (!isNonNegativeNumber(m.heightInches) || Number(m.heightInches) >= 12)
    errors.heightInches = '0–11';
  return errors;
}

export function Step2Measurements() {
  const { state, updateMeasurements, setStep } = useOnboarding();
  const m = state.measurements;
  const [errors, setErrors] = useState<Partial<Record<keyof Measurements, string>>>({});

  const onContinue = () => {
    const errs = validate(m);
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setStep(3);
    }
  };

  return (
    <StepLayout
      step={2}
      title="Body measurements"
      subtitle="A few quick numbers help us tailor your care."
      onBack={() => setStep(1)}
      onContinue={onContinue}
    >
      <Field
        label="Weight (lbs)"
        error={errors.weightLbs}
        hint="Used to assist with dosage calculations"
      >
        <TextInput
          style={[styles.input, errors.weightLbs && styles.inputError]}
          value={m.weightLbs}
          onChangeText={(v) => updateMeasurements({ weightLbs: v })}
          placeholder="e.g. 165"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          returnKeyType="next"
        />
      </Field>

      <View style={styles.row}>
        <View style={styles.col}>
          <Field label="Height (feet)" error={errors.heightFeet}>
            <TextInput
              style={[styles.input, errors.heightFeet && styles.inputError]}
              value={m.heightFeet}
              onChangeText={(v) => updateMeasurements({ heightFeet: v })}
              placeholder="5"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              returnKeyType="next"
              maxLength={1}
            />
          </Field>
        </View>
        <View style={styles.col}>
          <Field label="Height (inches)" error={errors.heightInches}>
            <TextInput
              style={[styles.input, errors.heightInches && styles.inputError]}
              value={m.heightInches}
              onChangeText={(v) => updateMeasurements({ heightInches: v })}
              placeholder="10"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              returnKeyType="done"
              maxLength={2}
            />
          </Field>
        </View>
      </View>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    minHeight: 48,
  },
  inputError: {
    borderColor: COLORS.error,
  },
});
