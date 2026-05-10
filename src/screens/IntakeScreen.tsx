import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

type FieldProps = {
  label: string;
  children: React.ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-slate-700 mb-1.5">
        {label}
      </Text>
      {children}
    </View>
  );
}

const inputClass =
  'bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900';

export default function IntakeScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [symptoms, setSymptoms] = useState('');

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) setDob(selected);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-2xl font-bold text-slate-900 mb-1">
          Tell us about yourself
        </Text>
        <Text className="text-sm text-slate-500 mb-6">
          This helps the triage nurse assess you faster.
        </Text>

        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="First name">
                <TextInput
                  className={inputClass}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Jane"
                  placeholderTextColor="#94a3b8"
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Last name">
                <TextInput
                  className={inputClass}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Doe"
                  placeholderTextColor="#94a3b8"
                />
              </Field>
            </View>
          </View>

          <Field label="Email">
            <TextInput
              className={inputClass}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="jane@example.com"
              placeholderTextColor="#94a3b8"
            />
          </Field>

          <Field label="Phone number">
            <TextInput
              className={inputClass}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="(555) 555-5555"
              placeholderTextColor="#94a3b8"
            />
          </Field>

          <Field label="Date of birth">
            <Pressable
              className={inputClass}
              onPress={() => setShowPicker(true)}
            >
              <Text
                className={dob ? 'text-slate-900 text-base' : 'text-slate-400 text-base'}
              >
                {dob ? dob.toLocaleDateString() : 'Select date'}
              </Text>
            </Pressable>
            {showPicker && (
              <View>
                <DateTimePicker
                  value={dob ?? new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
                {Platform.OS === 'ios' && (
                  <Pressable
                    onPress={() => setShowPicker(false)}
                    className="self-end px-3 py-2"
                  >
                    <Text className="text-brand font-semibold">Done</Text>
                  </Pressable>
                )}
              </View>
            )}
          </Field>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="Weight">
                <TextInput
                  className={inputClass}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  placeholder="lbs or kg"
                  placeholderTextColor="#94a3b8"
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Height">
                <TextInput
                  className={inputClass}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                  placeholder="cm or ft/in"
                  placeholderTextColor="#94a3b8"
                />
              </Field>
            </View>
          </View>

          <Field label="Symptoms">
            <TextInput
              className={`${inputClass} min-h-32`}
              value={symptoms}
              onChangeText={setSymptoms}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              placeholder="Describe what you're feeling..."
              placeholderTextColor="#94a3b8"
            />
          </Field>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
