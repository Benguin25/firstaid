import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { COLORS, type Measurements } from '../../types/onboarding';
import { useOnboarding } from './OnboardingContext';
import { StepLayout } from './components/StepLayout';
import { Field } from './components/Field';

// Constants
const MIN_HEIGHT = 36; // 3 feet
const MAX_HEIGHT = 84; // 7 feet
const SLIDER_HEIGHT = 300;

function isPositiveNumber(v: string): boolean {
  if (v.trim() === '') return false;
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

function validate(m: Measurements): Partial<Record<keyof Measurements, string>> {
  const errors: Partial<Record<keyof Measurements, string>> = {};
  if (!m.weightLbs.trim()) errors.weightLbs = 'Required';
  else if (!isPositiveNumber(m.weightLbs)) errors.weightLbs = 'Enter a valid weight';
  if (!m.heightFeet.trim() || !m.heightInches.trim()) errors.heightFeet = 'Select height';
  return errors;
}

export function Step2Measurements() {
  const { state, updateMeasurements, setStep } = useOnboarding();
  const m = state.measurements;
  const [errors, setErrors] = useState<Partial<Record<keyof Measurements, string>>>({});

  // Get initial height in inches
  const initialInches = (parseInt(m.heightFeet) || 5) * 12 + (parseInt(m.heightInches) || 6);
  const [heightInches, setHeightInches] = useState(initialInches);

  // Track height at gesture start
  const startHeightRef = useRef(initialInches);

  const handleSliderMove = (event: any) => {
    const { translationY, state: gestureState } = event.nativeEvent;

    if (gestureState === State.BEGAN) {
      startHeightRef.current = heightInches;
      return;
    }

    if (gestureState === State.ACTIVE) {
      // Direct 1:1 mapping of finger movement to height
      // negative translationY (dragging up) = height increases
      const pxPerInch = SLIDER_HEIGHT / (MAX_HEIGHT - MIN_HEIGHT);
      const heightChange = -(translationY / pxPerInch);
      const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeightRef.current + heightChange));

      const feet = Math.floor(newHeight / 12);
      const inches = Math.round(newHeight % 12);

      setHeightInches(newHeight);
      updateMeasurements({
        heightFeet: feet.toString(),
        heightInches: inches.toString(),
      });
    }
  };

  const onContinue = () => {
    const errs = validate(m);
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep(3);
  };

  const feet = Math.floor(heightInches / 12);
  const inches = Math.round(heightInches % 12);
  const sliderPosition = ((heightInches - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT)) * SLIDER_HEIGHT;

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

      <Field label="Height" error={errors.heightFeet}>
        <View style={styles.container}>
          {/* Height Display */}
          <View style={styles.display}>
            <Text style={styles.heightValue}>
              {feet}'{inches}"
            </Text>
          </View>

          {/* Slider */}
          <PanGestureHandler onGestureEvent={handleSliderMove}>
            <View style={styles.sliderContainer}>
              <View style={styles.track} />
              <View style={[styles.thumb, { bottom: sliderPosition - 12 }]} />
            </View>
          </PanGestureHandler>
        </View>
      </Field>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  display: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    minWidth: 80,
  },
  heightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  sliderContainer: {
    width: 60,
    height: SLIDER_HEIGHT,
    position: 'relative',
  },
  track: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginLeft: -2,
  },
  thumb: {
    position: 'absolute',
    left: '50%',
    width: 48,
    height: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    marginLeft: -24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

