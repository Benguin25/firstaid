import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { COLORS, type PersonalInfo } from '../../types/onboarding';
import { useOnboarding } from './OnboardingContext';
import { StepLayout } from './components/StepLayout';
import { Field } from './components/Field';

const PHONE_RE = /^[\d\s\-+()]{7,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

function validate(p: PersonalInfo): Partial<Record<keyof PersonalInfo, string>> {
  const errors: Partial<Record<keyof PersonalInfo, string>> = {};
  if (!p.firstName.trim()) errors.firstName = 'Required';
  if (!p.lastName.trim()) errors.lastName = 'Required';
  if (!p.dateOfBirth) errors.dateOfBirth = 'Required';
  if (!p.phone.trim()) errors.phone = 'Required';
  else if (!PHONE_RE.test(p.phone.trim())) errors.phone = 'Enter a valid phone number';
  if (!p.email.trim()) errors.email = 'Required';
  else if (!EMAIL_RE.test(p.email.trim())) errors.email = 'Enter a valid email';
  return errors;
}

export function Step1PersonalInfo() {
  const { state, updatePersonal, setStep } = useOnboarding();
  const personal = state.personal;
  const [errors, setErrors] = useState<Partial<Record<keyof PersonalInfo, string>>>({});
  const [showPicker, setShowPicker] = useState(false);

  const onContinue = () => {
    const errs = validate(personal);
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setStep(2);
    }
  };

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) {
      updatePersonal({ dateOfBirth: selected.toISOString() });
      if (errors.dateOfBirth) setErrors({ ...errors, dateOfBirth: undefined });
    }
  };

  const dobValue = personal.dateOfBirth ? new Date(personal.dateOfBirth) : new Date(2000, 0, 1);

  return (
    <StepLayout
      step={1}
      title="Personal information"
      subtitle="We'll use this to create your record."
      onContinue={onContinue}
    >
      <View style={styles.row}>
        <View style={styles.col}>
          <Field label="First name" error={errors.firstName}>
            <TextInput
              style={[styles.input, errors.firstName && styles.inputError]}
              value={personal.firstName}
              onChangeText={(v) => updatePersonal({ firstName: v })}
              placeholder="Jane"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </Field>
        </View>
        <View style={styles.col}>
          <Field label="Last name" error={errors.lastName}>
            <TextInput
              style={[styles.input, errors.lastName && styles.inputError]}
              value={personal.lastName}
              onChangeText={(v) => updatePersonal({ lastName: v })}
              placeholder="Doe"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </Field>
        </View>
      </View>

      <Field label="Date of birth" error={errors.dateOfBirth}>
        <Pressable
          onPress={() => setShowPicker(true)}
          style={({ pressed }) => [
            styles.input,
            styles.dateBtn,
            errors.dateOfBirth && styles.inputError,
            pressed && styles.pressed,
          ]}
        >
          <Text style={personal.dateOfBirth ? styles.dateValue : styles.datePlaceholder}>
            {personal.dateOfBirth ? formatDate(personal.dateOfBirth) : 'Select date'}
          </Text>
        </Pressable>
        {showPicker ? (
          <View>
            <DateTimePicker
              value={dobValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
            {Platform.OS === 'ios' ? (
              <Pressable onPress={() => setShowPicker(false)} style={styles.iosDoneBtn}>
                <Text style={styles.iosDoneText}>Done</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Field>

      <Field label="Phone number" error={errors.phone}>
        <TextInput
          style={[styles.input, errors.phone && styles.inputError]}
          value={personal.phone}
          onChangeText={(v) => updatePersonal({ phone: v })}
          placeholder="(555) 555-5555"
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          returnKeyType="next"
        />
      </Field>

      <Field label="Email" error={errors.email}>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={personal.email}
          onChangeText={(v) => updatePersonal({ email: v })}
          placeholder="jane@example.com"
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
      </Field>
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
  pressed: {
    opacity: 0.7,
  },
  dateBtn: {
    justifyContent: 'center',
  },
  dateValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  datePlaceholder: {
    color: '#94a3b8',
    fontSize: 16,
  },
  iosDoneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iosDoneText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
