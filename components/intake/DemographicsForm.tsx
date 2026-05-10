import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useIntakeStore } from '../../store/intakeStore';
import { insertPatient, insertHCVCheck, findPatientByHealthCard } from '../../lib/db/client';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  legalFirstName: z.string().min(1, 'Required').max(100),
  legalMiddleName: z.string().max(100).optional(),
  legalLastName: z.string().min(1, 'Required').max(100),
  preferredName: z.string().max(100).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
    .refine((val) => {
      const d = new Date(val);
      if (isNaN(d.getTime())) return false;
      const age = new Date().getFullYear() - d.getFullYear();
      return age >= 0 && age <= 120;
    }, 'Must be between 0 and 120 years old'),
  sexAtBirth: z.enum(['MALE', 'FEMALE', 'INTERSEX', 'PREFER_NOT_TO_SAY'], { error: 'Required' }),
  genderIdentity: z.string().optional(),
  provinceOfCoverage: z.string().min(1, 'Required'),
  cardExpiry: z.string().optional(),
  phone: z
    .string()
    .refine((v) => v.replace(/\D/g, '').length === 10, 'Enter a 10-digit Canadian phone number'),
  email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  addressLine1: z.string().min(1, 'Required'),
  city: z.string().min(1, 'Required'),
  province: z.string().min(1, 'Required'),
  postalCode: z
    .string()
    .regex(/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, 'Enter a valid postal code (e.g. M5V 2T6)'),
  emergencyName: z.string().optional(),
  emergencyRelation: z.string().optional(),
  emergencyPhone: z.string().optional(),
  preferredLanguage: z.string().min(1, 'Required'),
  interpreterNeeded: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ─── Option constants ─────────────────────────────────────────────────────────

interface SelectOption { label: string; value: string }

const SEX_OPTIONS: SelectOption[] = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Intersex', value: 'INTERSEX' },
  { label: 'Prefer not to say', value: 'PREFER_NOT_TO_SAY' },
];

const GENDER_OPTIONS: SelectOption[] = [
  { label: 'Man', value: 'Man' },
  { label: 'Woman', value: 'Woman' },
  { label: 'Non-binary', value: 'Non-binary' },
  { label: 'Two-spirit', value: 'Two-spirit' },
  { label: 'Prefer not to say', value: 'Prefer not to say' },
  { label: 'Not listed', value: 'Not listed' },
];

const PROVINCE_OPTIONS: SelectOption[] = [
  { label: 'Ontario', value: 'ON' },
  { label: 'British Columbia', value: 'BC' },
  { label: 'Alberta', value: 'AB' },
  { label: 'Quebec', value: 'QC' },
  { label: 'Manitoba', value: 'MB' },
  { label: 'Saskatchewan', value: 'SK' },
  { label: 'Nova Scotia', value: 'NS' },
  { label: 'New Brunswick', value: 'NB' },
  { label: 'Newfoundland and Labrador', value: 'NL' },
  { label: 'Prince Edward Island', value: 'PE' },
  { label: 'Northwest Territories', value: 'NT' },
  { label: 'Nunavut', value: 'NU' },
  { label: 'Yukon', value: 'YT' },
];

const RELATION_OPTIONS: SelectOption[] = [
  { label: 'Spouse / Partner', value: 'Spouse' },
  { label: 'Parent', value: 'Parent' },
  { label: 'Child', value: 'Child' },
  { label: 'Sibling', value: 'Sibling' },
  { label: 'Friend', value: 'Friend' },
  { label: 'Other', value: 'Other' },
];

const LANGUAGE_OPTIONS: SelectOption[] = [
  { label: 'English', value: 'English' },
  { label: 'French', value: 'French' },
  { label: 'Mandarin', value: 'Mandarin' },
  { label: 'Cantonese', value: 'Cantonese' },
  { label: 'Punjabi', value: 'Punjabi' },
  { label: 'Spanish', value: 'Spanish' },
  { label: 'Arabic', value: 'Arabic' },
  { label: 'Tagalog', value: 'Tagalog' },
  { label: 'Urdu', value: 'Urdu' },
  { label: 'Other', value: 'Other' },
];

const INTERPRETER_OPTIONS: SelectOption[] = [
  { label: 'No', value: 'No' },
  { label: 'Yes — in person preferred', value: 'Yes-InPerson' },
  { label: 'Yes — phone acceptable', value: 'Yes-Phone' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={{ marginTop: 24, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
        {title}
      </Text>
    </View>
  );
}

interface FieldWrapperProps {
  label: string;
  error?: string;
  required?: boolean;
  mismatch?: boolean;
  children: React.ReactNode;
}

function FieldWrapper({ label, error, required, mismatch, children }: FieldWrapperProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <Text className="text-red-500"> *</Text>}
      </Text>
      {children}
      {mismatch && (
        <Text className="text-xs text-amber-600 mt-1">
          This field was pre-filled from OHIP — your edit may affect card matching.
        </Text>
      )}
      {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
    </View>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  error?: string;
  required?: boolean;
  placeholder?: string;
}

function SelectField({ label, value, onChange, options, error, required, placeholder = 'Select…' }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <Text className="text-red-500"> *</Text>}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          borderWidth: 1,
          borderColor: '#d1d5db',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: 'white',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: selectedLabel ? '#111827' : '#9ca3af', fontSize: 16 }}>
          {selectedLabel ?? placeholder}
        </Text>
        <Text style={{ color: '#9ca3af', fontSize: 12 }}>▾</Text>
      </TouchableOpacity>
      {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 36 }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', textAlign: 'center', color: '#111827' }}>
                {label}
              </Text>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { onChange(opt.value); setOpen(false); }}
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    backgroundColor: value === opt.value ? '#eff6ff' : 'white',
                  }}
                >
                  <Text style={{
                    fontSize: 16,
                    color: value === opt.value ? '#2563eb' : '#111827',
                    fontWeight: value === opt.value ? '500' : '400',
                  }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function DemographicsForm() {
  const {
    hcvStatus,
    hcvResponse,
    healthCardNumber,
    versionCode,
    demographics,
    advanceStep,
    setDemographics,
  } = useIntakeStore();

  const [submitting, setSubmitting] = useState(false);

  const hcvOriginals = useMemo<Record<string, string>>(() => {
    if (hcvStatus !== 'valid' || !hcvResponse) return {};
    const o: Record<string, string> = {};
    if (hcvResponse.firstName) o.legalFirstName = hcvResponse.firstName;
    if (hcvResponse.lastName) o.legalLastName = hcvResponse.lastName;
    if (hcvResponse.dateOfBirth) o.dateOfBirth = hcvResponse.dateOfBirth;
    if (hcvResponse.gender) o.sexAtBirth = hcvResponse.gender === 'M' ? 'MALE' : 'FEMALE';
    return o;
  }, [hcvStatus, hcvResponse]);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      legalFirstName: demographics.legalFirstName ?? '',
      legalMiddleName: demographics.legalMiddleName ?? '',
      legalLastName: demographics.legalLastName ?? '',
      preferredName: demographics.preferredName ?? '',
      dateOfBirth: demographics.dateOfBirth ?? '',
      sexAtBirth: demographics.sexAtBirth ?? undefined,
      genderIdentity: demographics.genderIdentity ?? '',
      provinceOfCoverage: demographics.provinceOfCoverage ?? 'ON',
      cardExpiry: demographics.cardExpiry ?? '',
      phone: demographics.phone ?? '',
      email: demographics.email ?? '',
      addressLine1: demographics.addressLine1 ?? '',
      city: demographics.city ?? '',
      province: demographics.province ?? 'ON',
      postalCode: demographics.postalCode ?? '',
      emergencyName: demographics.emergencyName ?? '',
      emergencyRelation: demographics.emergencyRelation ?? '',
      emergencyPhone: demographics.emergencyPhone ?? '',
      preferredLanguage: demographics.preferredLanguage ?? 'English',
      interpreterNeeded: demographics.interpreterNeeded ?? '',
    },
  });

  const watched = watch();

  function isMismatch(field: string): boolean {
    if (!(field in hcvOriginals)) return false;
    return watched[field as keyof FormData] !== hcvOriginals[field];
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const existing = findPatientByHealthCard(healthCardNumber);
      if (existing) {
        Alert.alert(
          'Existing Patient Found',
          `A record already exists for ${existing.legal_first_name} ${existing.legal_last_name} with this OHIP card. Continue to record a new visit?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setSubmitting(false) },
            { text: 'Continue', onPress: () => saveAndAdvance(data, existing.id) },
          ]
        );
        return;
      }
      await saveAndAdvance(data, null);
    } catch {
      Alert.alert('Error', 'Failed to save patient record. Please try again.');
      setSubmitting(false);
    }
  }

  async function saveAndAdvance(data: FormData, existingPatientId: string | null) {
    const patientId = existingPatientId ?? crypto.randomUUID();

    if (!existingPatientId) {
      insertPatient({
        id: patientId,
        created_at: '',
        updated_at: '',
        legal_first_name: data.legalFirstName,
        legal_middle_name: data.legalMiddleName ?? null,
        legal_last_name: data.legalLastName,
        preferred_name: data.preferredName ?? null,
        date_of_birth: data.dateOfBirth,
        sex_at_birth: data.sexAtBirth,
        gender_identity: data.genderIdentity ?? null,
        health_card_number: healthCardNumber,
        version_code: versionCode,
        province_of_coverage: data.provinceOfCoverage,
        card_expiry: data.cardExpiry ?? null,
        phone: data.phone,
        email: data.email ?? null,
        address_line1: data.addressLine1,
        city: data.city,
        province: data.province,
        postal_code: data.postalCode,
        emergency_name: data.emergencyName ?? null,
        emergency_relation: data.emergencyRelation ?? null,
        emergency_phone: data.emergencyPhone ?? null,
        preferred_language: data.preferredLanguage,
        interpreter_needed: data.interpreterNeeded ?? null,
      });
    }

    const nameMatch =
      hcvStatus === 'valid' && hcvResponse
        ? data.legalFirstName.toLowerCase() === (hcvResponse.firstName ?? '').toLowerCase() &&
          data.legalLastName.toLowerCase() === (hcvResponse.lastName ?? '').toLowerCase()
        : null;
    const dobMatch =
      hcvStatus === 'valid' && hcvResponse ? data.dateOfBirth === hcvResponse.dateOfBirth : null;

    insertHCVCheck({
      id: crypto.randomUUID(),
      created_at: '',
      patient_id: patientId,
      health_card_number: healthCardNumber,
      version_code: versionCode,
      response_code: hcvResponse?.responseCode ?? '99',
      is_valid: hcvStatus === 'valid' ? 1 : 0,
      name_match: nameMatch === null ? null : nameMatch ? 1 : 0,
      dob_match: dobMatch === null ? null : dobMatch ? 1 : 0,
      raw_response: hcvResponse ? JSON.stringify(hcvResponse) : null,
    });

    setDemographics({
      legalFirstName: data.legalFirstName,
      legalMiddleName: data.legalMiddleName,
      legalLastName: data.legalLastName,
      preferredName: data.preferredName,
      dateOfBirth: data.dateOfBirth,
      sexAtBirth: data.sexAtBirth,
      genderIdentity: data.genderIdentity,
      provinceOfCoverage: data.provinceOfCoverage,
      cardExpiry: data.cardExpiry,
      phone: data.phone,
      email: data.email,
      addressLine1: data.addressLine1,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      emergencyName: data.emergencyName,
      emergencyRelation: data.emergencyRelation,
      emergencyPhone: data.emergencyPhone,
      preferredLanguage: data.preferredLanguage,
      interpreterNeeded: data.interpreterNeeded,
    });

    advanceStep();
    setSubmitting(false);
  }

  const provinceNote = watched.provinceOfCoverage === 'QC'
    ? 'Quebec patients require private invoicing.'
    : watched.provinceOfCoverage && watched.provinceOfCoverage !== 'ON'
      ? 'Reciprocal billing applies for out-of-province patients.'
      : null;

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 64 }}>
      <Text className="text-2xl font-bold text-gray-900 mb-2">Personal Information</Text>

      {hcvStatus === 'offline' && (
        <View className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <Text className="text-amber-800 text-sm font-medium">Health card could not be verified.</Text>
          <Text className="text-amber-700 text-sm mt-1">
            Please ensure details match the physical card.
          </Text>
        </View>
      )}
      {hcvStatus === 'valid' && (
        <View className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <Text className="text-green-800 text-sm">
            Details pre-filled from OHIP. Review and correct if needed.
          </Text>
        </View>
      )}

      {/* ── OHIP & Coverage ── */}
      <SectionHeader title="OHIP & Coverage" />

      <View className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <Text className="text-xs text-gray-500 mb-0.5">Health Card Number</Text>
        <Text className="text-base font-semibold text-gray-900">
          {healthCardNumber.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}
          {versionCode ? `  ${versionCode}` : ''}
        </Text>
        <Text className="text-xs text-green-600 mt-1">
          {hcvStatus === 'valid' ? '✓ Verified' : hcvStatus === 'offline' ? '⚠ Not verified' : ''}
        </Text>
      </View>

      <Controller
        control={control}
        name="provinceOfCoverage"
        render={({ field: { value, onChange } }) => (
          <SelectField
            label="Province of Coverage"
            value={value}
            onChange={onChange}
            options={PROVINCE_OPTIONS}
            error={errors.provinceOfCoverage?.message}
            required
          />
        )}
      />
      {provinceNote && (
        <View className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Text className="text-amber-800 text-sm">{provinceNote}</Text>
        </View>
      )}

      <Controller
        control={control}
        name="cardExpiry"
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrapper label="Card Expiry" error={errors.cardExpiry?.message}>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="YYYY-MM-DD (optional)"
              placeholderTextColor="#9ca3af"
            />
          </FieldWrapper>
        )}
      />

      {/* ── Personal Information ── */}
      <SectionHeader title="Personal Information" />

      <Controller
        control={control}
        name="legalFirstName"
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrapper
            label="Legal First Name"
            required
            error={errors.legalFirstName?.message}
            mismatch={isMismatch('legalFirstName')}
          >
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
            />
          </FieldWrapper>
        )}
      />
      <Controller
        control={control}
        name="legalMiddleName"
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrapper label="Legal Middle Name" error={errors.legalMiddleName?.message}>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
              placeholder="Optional"
              placeholderTextColor="#9ca3af"
            />
          </FieldWrapper>
        )}
      />
      <Controller
        control={control}
        name="legalLastName"
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrapper
            label="Legal Last Name"
            required
            error={errors.legalLastName?.message}
            mismatch={isMismatch('legalLastName')}
          >
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
            />
          </FieldWrapper>
        )}
      />
      <Controller
        control={control}
        name="preferredName"
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrapper label="Preferred Name" error={errors.preferredName?.message}>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
              placeholder="Optional — goes by"
              placeholderTextColor="#9ca3af"
            />
          </FieldWrapper>
        )}
      />
      <Controller
        control={control}
        name="dateOfBirth"
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrapper
            label="Date of Birth"
            required
            error={errors.dateOfBirth?.message}
            mismatch={isMismatch('dateOfBirth')}
          >
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="YYYY-MM-DD"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </FieldWrapper>
        )}
      />
      <Controller
        control={control}
        name="sexAtBirth"
        render={({ field: { value, onChange } }) => (
          <SelectField
            label="Sex at Birth"
            value={value ?? ''}
            onChange={onChange}
            options={SEX_OPTIONS}
            error={errors.sexAtBirth?.message}
            required
          />
        )}
      />
      <Controller
        control={control}
        name="genderIdentity"
        render={({ field: { value, onChange } }) => (
          <SelectField
            label="Gender Identity"
            value={value ?? ''}
            onChange={onChange}
            options={GENDER_OPTIONS}
            placeholder="Optional"
          />
        )}
      />

      {/* ── Contact & Address ── */}
      <SectionHeader title="Contact & Address" />

      <Controller
        control={control}
        name="phone"
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrapper label="Phone" required error={errors.phone?.message}>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="(416) 555-0100"
              keyboardType="phone-pad"
              placeholderTextColor="#9ca3af"
            />
          </FieldWrapper>
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrapper label="Email" error={errors.email?.message}>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Optional"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
            />
          </FieldWrapper>
        )}
      />
      <Controller
        control={control}
        name="addressLine1"
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrapper label="Street Address" required error={errors.addressLine1?.message}>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="123 Main St"
              placeholderTextColor="#9ca3af"
            />
          </FieldWrapper>
        )}
      />
      <Controller
        control={control}
        name="city"
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrapper label="City" required error={errors.city?.message}>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          </FieldWrapper>
        )}
      />
      <Controller
        control={control}
        name="province"
        render={({ field: { value, onChange } }) => (
          <SelectField
            label="Province"
            value={value}
            onChange={onChange}
            options={PROVINCE_OPTIONS}
            error={errors.province?.message}
            required
          />
        )}
      />
      <Controller
        control={control}
        name="postalCode"
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrapper label="Postal Code" required error={errors.postalCode?.message}>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={value}
              onChangeText={(t) => onChange(t.toUpperCase())}
              onBlur={onBlur}
              placeholder="M5V 2T6"
              autoCapitalize="characters"
              placeholderTextColor="#9ca3af"
            />
          </FieldWrapper>
        )}
      />

      {/* ── Emergency Contact ── */}
      <SectionHeader title="Emergency Contact" />

      <Controller
        control={control}
        name="emergencyName"
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrapper label="Full Name" error={errors.emergencyName?.message}>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Optional"
              autoCapitalize="words"
              placeholderTextColor="#9ca3af"
            />
          </FieldWrapper>
        )}
      />
      <Controller
        control={control}
        name="emergencyRelation"
        render={({ field: { value, onChange } }) => (
          <SelectField
            label="Relationship"
            value={value ?? ''}
            onChange={onChange}
            options={RELATION_OPTIONS}
            placeholder="Optional"
          />
        )}
      />
      <Controller
        control={control}
        name="emergencyPhone"
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrapper label="Phone" error={errors.emergencyPhone?.message}>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Optional"
              keyboardType="phone-pad"
              placeholderTextColor="#9ca3af"
            />
          </FieldWrapper>
        )}
      />

      {/* ── Language & Accessibility ── */}
      <SectionHeader title="Language & Accessibility" />

      <Controller
        control={control}
        name="preferredLanguage"
        render={({ field: { value, onChange } }) => (
          <SelectField
            label="Preferred Language"
            value={value}
            onChange={onChange}
            options={LANGUAGE_OPTIONS}
            error={errors.preferredLanguage?.message}
            required
          />
        )}
      />
      <Controller
        control={control}
        name="interpreterNeeded"
        render={({ field: { value, onChange } }) => (
          <SelectField
            label="Interpreter Needed"
            value={value ?? ''}
            onChange={onChange}
            options={INTERPRETER_OPTIONS}
            placeholder="Optional"
          />
        )}
      />

      <TouchableOpacity
        style={{
          marginTop: 24,
          paddingVertical: 16,
          borderRadius: 12,
          alignItems: 'center',
          backgroundColor: submitting ? '#93c5fd' : '#2563eb',
        }}
        onPress={handleSubmit(onSubmit)}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            Confirm & Continue →
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
