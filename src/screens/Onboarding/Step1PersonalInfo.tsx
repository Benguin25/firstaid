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

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION RULES
// ─────────────────────────────────────────────────────────────────────────────

// Ontario OHIP health card: 10 digits + optional 2-letter version code.
// Accepted formats (all equivalent):
//   1234567890
//   1234 567 890
//   1234-567-890
//   1234567890AB
//   1234 567 890 AB
//   1234-567-890-AB
const OHIP_RE = /^\d{4}[\s-]?\d{3}[\s-]?\d{3}([\s-]?[A-Za-z]{2})?$/;

// Phone: 10 digits (North American), allowing spaces, dashes, dots, parentheses.
// Must resolve to exactly 10 digits after stripping formatting.
function stripPhone(p: string): string {
  return p.replace(/[\s\-().+]/g, '');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Name: letters, spaces, hyphens, apostrophes only. No numbers or symbols.
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/;

// Age bounds: must be between 0 and 120 years old.
const MAX_AGE_YEARS = 120;

// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL FIELD VALIDATORS
// Each returns an error string or null if valid.
// ─────────────────────────────────────────────────────────────────────────────

function validateFirstName(v: string): string | null {
  const t = v.trim();
  if (!t) return 'First name is required';
  if (t.length < 2) return 'Must be at least 2 characters';
  if (t.length > 50) return 'Must be 50 characters or fewer';
  if (!NAME_RE.test(t)) return 'Letters, hyphens, and apostrophes only';
  return null;
}

function validateLastName(v: string): string | null {
  const t = v.trim();
  if (!t) return 'Last name is required';
  if (t.length < 2) return 'Must be at least 2 characters';
  if (t.length > 50) return 'Must be 50 characters or fewer';
  if (!NAME_RE.test(t)) return 'Letters, hyphens, and apostrophes only';
  return null;
}

function validateDateOfBirth(iso: string | null): string | null {
  if (!iso) return 'Date of birth is required';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Invalid date';

  const now = new Date();

  // Cannot be in the future
  if (d > now) return 'Date of birth cannot be in the future';

  // Age ceiling
  const minDate = new Date(
    now.getFullYear() - MAX_AGE_YEARS,
    now.getMonth(),
    now.getDate(),
  );
  if (d < minDate) return `Age cannot exceed ${MAX_AGE_YEARS} years`;

  return null;
}

function validatePhone(v: string): string | null {
	const t = v.trim();
  
	if (!t) return 'Phone number is required';
  
	const digits = stripPhone(t);
  
	if (!/^\d+$/.test(digits)) {
	  return 'Phone number contains invalid characters';
	}
  
	// North American Numbering Plan
	if (digits.length < 10) {
	  return 'Phone number must be exactly 10 digits';
	}
  
	// Area code and exchange cannot start with 0 or 1
	if (/^[01]/.test(digits.slice(0, 3))) {
	  return 'Area code cannot start with 0 or 1';
	}
  
	if (/^[01]/.test(digits.slice(3, 6))) {
	  return 'Phone exchange cannot start with 0 or 1';
	}
  
	return null;
  }

function validateEmail(v: string): string | null {
  const t = v.trim();
  if (!t) return 'Email is required';
  if (!EMAIL_RE.test(t)) return 'Enter a valid email address';
  if (t.length > 254) return 'Email address is too long';
  return null;
}

function validateHealthCard(v: string): string | null {
  // Health card is optional — blank is fine
  if (!v.trim()) return null;

  const t = v.trim();

  // Strip all formatting to count raw digits
  const digitsOnly = t.replace(/[\s\-]/g, '').replace(/[A-Za-z]/g, '');
  const lettersOnly = t.replace(/[\s\-\d]/g, '');

  // Must start with 10 digits
  if (digitsOnly.length < 10) {
    return `OHIP number needs 10 digits — you've entered ${digitsOnly.length}`;
  }
  if (digitsOnly.length > 10) {
    return 'OHIP number has too many digits (max 10)';
  }

  // Version code: if present must be exactly 2 letters
  if (lettersOnly.length > 0 && lettersOnly.length !== 2) {
    return 'Version code must be exactly 2 letters (e.g. AB)';
  }

  // Full format check
  if (!OHIP_RE.test(t)) {
    return 'Format should be 1234 567 890 or 1234 567 890 AB';
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL FORM VALIDATOR — runs on submit
// ─────────────────────────────────────────────────────────────────────────────

type Errors = Partial<Record<keyof PersonalInfo, string>>;

function validateAll(p: PersonalInfo): Errors {
  const errors: Errors = {};

  const fn = validateFirstName(p.firstName);
  if (fn) errors.firstName = fn;

  const ln = validateLastName(p.lastName);
  if (ln) errors.lastName = ln;

  const dob = validateDateOfBirth(p.dateOfBirth);
  if (dob) errors.dateOfBirth = dob;

  const ph = validatePhone(p.phone);
  if (ph) errors.phone = ph;

  const em = validateEmail(p.email);
  if (em) errors.email = em;

  const hc = validateHealthCard(p.healthCardNumber ?? '');
  if (hc) errors.healthCardNumber = hc;

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS — auto-format as the user types
// ─────────────────────────────────────────────────────────────────────────────

// Auto-format OHIP: "1234567890AB" → "1234 567 890 AB"
function formatOhip(raw: string): string {
  // Strip everything that isn't a digit or letter
  const cleaned = raw.toUpperCase().replace(/[^\dA-Z]/g, '');
  const digits  = cleaned.replace(/[A-Z]/g, '');
  const letters = cleaned.replace(/\d/g, '');

  if (digits.length === 0) return '';

  const d1 = digits.slice(0, 4);
  const d2 = digits.slice(4, 7);
  const d3 = digits.slice(7, 10);

  let result = d1;
  if (d2) result += ' ' + d2;
  if (d3) result += ' ' + d3;
  if (letters && digits.length >= 10) result += ' ' + letters.slice(0, 2);

  return result;
}

// Auto-format phone for display: 10 digits → (555) 555-5555
function formatPhone(raw: string): string {
	const digits = raw.replace(/\D/g, '').slice(0, 15);
  
	if (digits.length <= 3) {
	  return digits;
	}
  
	if (digits.length <= 6) {
	  return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
	}
  
	return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function Step1PersonalInfo() {
  const { state, updatePersonal, setStep } = useOnboarding();
  const personal = state.personal;

  // errors: shown after submit attempt or on blur
  const [errors, setErrors] = useState<Errors>({});

  // touched: tracks which fields the user has interacted with
  // so we only show errors on untouched fields after submit, not immediately
  const [touched, setTouched] = useState<Partial<Record<keyof PersonalInfo, boolean>>>({});

  const [showPicker, setShowPicker] = useState(false);

  // ── Blur handler — validate a single field when focus leaves ────────────────
  function handleBlur(field: keyof PersonalInfo) {
    setTouched((t) => ({ ...t, [field]: true }));
    let error: string | null = null;

    switch (field) {
      case 'firstName':       error = validateFirstName(personal.firstName); break;
      case 'lastName':        error = validateLastName(personal.lastName); break;
      case 'dateOfBirth':     error = validateDateOfBirth(personal.dateOfBirth); break;
      case 'phone':           error = validatePhone(personal.phone); break;
      case 'email':           error = validateEmail(personal.email); break;
      case 'healthCardNumber':
        error = validateHealthCard(personal.healthCardNumber ?? '');
        break;
    }

    setErrors((e) => ({ ...e, [field]: error ?? undefined }));
  }

  // ── Change handlers ─────────────────────────────────────────────────────────
  // Clear the error for a field as soon as the user starts editing it again.

  function handleChange(field: keyof PersonalInfo, value: string) {
    updatePersonal({ [field]: value });
    if (touched[field]) {
      // Re-validate immediately after first blur so feedback is live
      let error: string | null = null;
      switch (field) {
        case 'firstName':        error = validateFirstName(value); break;
        case 'lastName':         error = validateLastName(value); break;
        case 'phone':            error = validatePhone(value); break;
        case 'email':            error = validateEmail(value); break;
        case 'healthCardNumber': error = validateHealthCard(value); break;
      }
      setErrors((e) => ({ ...e, [field]: error ?? undefined }));
    }
  }

  // ── Date picker ─────────────────────────────────────────────────────────────

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) {
      const iso = selected.toISOString();
      updatePersonal({ dateOfBirth: iso });
      setTouched((t) => ({ ...t, dateOfBirth: true }));
      const error = validateDateOfBirth(iso);
      setErrors((e) => ({ ...e, dateOfBirth: error ?? undefined }));
    }
  };

  const dobValue = personal.dateOfBirth
    ? new Date(personal.dateOfBirth)
    : new Date(2000, 0, 1);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const onContinue = () => {
    // Mark all fields as touched so every error becomes visible
    setTouched({
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      phone: true,
      email: true,
      healthCardNumber: true,
    });

    const errs = validateAll(personal);
    setErrors(errs);

    if (Object.keys(errs).length === 0) {
      setStep(2);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <StepLayout
      step={1}
      title="Personal information"
      subtitle="We'll use this to create your record."
      onBack={() => setStep(0)}
      onContinue={onContinue}
    >
      {/* ── Name row ── */}
      <View style={styles.row}>
        <View style={styles.col}>
          <Field label="First name" error={errors.firstName}>
            <TextInput
              style={[styles.input, errors.firstName && styles.inputError]}
              value={personal.firstName}
              onChangeText={(v) => handleChange('firstName', v)}
              onBlur={() => handleBlur('firstName')}
              placeholder="Jane"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              maxLength={50}
            />
          </Field>
        </View>
        <View style={styles.col}>
          <Field label="Last name" error={errors.lastName}>
            <TextInput
              style={[styles.input, errors.lastName && styles.inputError]}
              value={personal.lastName}
              onChangeText={(v) => handleChange('lastName', v)}
              onBlur={() => handleBlur('lastName')}
              placeholder="Doe"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              maxLength={50}
            />
          </Field>
        </View>
      </View>

      {/* ── Date of birth ── */}
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
          <Text
            style={
              personal.dateOfBirth ? styles.dateValue : styles.datePlaceholder
            }
          >
            {personal.dateOfBirth
              ? formatDate(personal.dateOfBirth)
              : 'Select date'}
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
              minimumDate={
                new Date(
                  new Date().getFullYear() - MAX_AGE_YEARS,
                  new Date().getMonth(),
                  new Date().getDate(),
                )
              }
            />
            {Platform.OS === 'ios' ? (
              <Pressable
                onPress={() => setShowPicker(false)}
                style={styles.iosDoneBtn}
              >
                <Text style={styles.iosDoneText}>Done</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Field>

      {/* ── Health card ── */}
      <Field
        label="Health card number"
        hint="Ontario OHIP — e.g. 1234 567 890 AB"
        error={errors.healthCardNumber}
      >
        <TextInput
          style={[
            styles.input,
            styles.monoInput,
            errors.healthCardNumber && styles.inputError,
          ]}
          value={personal.healthCardNumber ?? ''}
          onChangeText={(v) => {
            // Auto-format as they type, but only if they're adding characters
            // (don't reformat mid-delete — it's jarring)
            const formatted =
              v.length > (personal.healthCardNumber?.length ?? 0)
                ? formatOhip(v)
                : v.toUpperCase();
            handleChange('healthCardNumber', formatted);
          }}
          onBlur={() => handleBlur('healthCardNumber')}
          placeholder="1234 567 890 AB"
          placeholderTextColor="#94a3b8"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="next"
          maxLength={16}               // "1234 567 890 AB" = 16 chars with spaces
          keyboardType="default"
        />
        {/* Live digit counter */}
        {(personal.healthCardNumber ?? '').length > 0 && (
          <DigitCounter value={personal.healthCardNumber ?? ''} />
        )}
      </Field>

      {/* ── Phone ── */}
      <Field label="Phone number" error={errors.phone}>
        <TextInput
          style={[styles.input, errors.phone && styles.inputError]}
          value={personal.phone}
          onChangeText={(v) => {
            const formatted = formatPhone(v);
            handleChange('phone', formatted);
          }}
          onBlur={() => handleBlur('phone')}
          placeholder="(555) 555-5555"
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          returnKeyType="next"
          maxLength={20}
        />
      </Field>

      {/* ── Email ── */}
      <Field label="Email" error={errors.email}>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={personal.email}
          onChangeText={(v) => handleChange('email', v)}
          onBlur={() => handleBlur('email')}
          placeholder="jane@example.com"
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          maxLength={254}
        />
      </Field>
    </StepLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DIGIT COUNTER — shows "X / 10 digits" below the OHIP field
// ─────────────────────────────────────────────────────────────────────────────

function DigitCounter({ value }: { value: string }) {
  const digits = value.replace(/\D/g, '').length;
  const isComplete = digits === 10;
  const isOver     = digits > 10;

  return (
    <Text
      style={[
        styles.digitCounter,
        isComplete && styles.digitCounterOk,
        isOver && styles.digitCounterError,
      ]}
    >
      {digits} / 10 digits{isComplete ? ' ✓' : ''}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

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
  monoInput: {
    // Monospace font makes the spaced OHIP number easier to read
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 1,
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: '#fff8f8',
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
  digitCounter: {
    marginTop: 4,
    fontSize: 12,
    color: '#94a3b8',
    paddingHorizontal: 2,
  },
  digitCounterOk: {
    color: '#16a34a',
    fontWeight: '600',
  },
  digitCounterError: {
    color: COLORS.error,
    fontWeight: '600',
  },
});