import { Pressable, Text, TextInput, View } from 'react-native';
import { StepLayout } from './components/StepLayout';
import { useCheckIn } from './CheckInContext';

const labelFor = (n: number | null) => {
  if (n == null) return '';
  if (n <= 3) return 'Mild discomfort';
  if (n <= 6) return 'Moderate pain';
  return 'Severe pain';
};

export default function Step5PainScale() {
  const { data, update, next } = useCheckIn();
  const canContinue = data.painLevel != null;

  return (
    <StepLayout onContinue={next} continueDisabled={!canContinue}>
      <Text className="text-2xl font-bold text-slate-900 mt-2">
        Rate your pain
      </Text>
      <Text className="text-sm text-slate-500 mt-1">
        1 = barely noticeable · 10 = worst pain imaginable
      </Text>

      <View
        className="mt-6 flex-row flex-wrap justify-center"
        style={{ gap: 12 }}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const sel = data.painLevel === n;
          return (
            <Pressable
              key={n}
              onPress={() => update('painLevel', n)}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: sel ? '#1D9E75' : '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: sel ? 0 : 1,
                borderColor: '#e2e8f0',
              }}
            >
              <Text
                style={{
                  color: sel ? '#ffffff' : '#334155',
                  fontSize: 18,
                  fontWeight: '700',
                }}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="items-center mt-5 min-h-7">
        {data.painLevel != null && (
          <Text className="text-base font-semibold text-slate-700">
            {labelFor(data.painLevel)}
          </Text>
        )}
      </View>

      <Text className="text-base font-semibold text-slate-800 mt-8 mb-2">
        Do you have any allergies?
      </Text>
      <Text className="text-xs text-slate-500 mb-2">
        Medications, foods, latex — anything we should know.
      </Text>
      <TextInput
        value={data.allergies}
        onChangeText={(t) => update('allergies', t)}
        placeholder="e.g. penicillin, peanuts (or 'none')"
        placeholderTextColor="#94a3b8"
        className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900"
      />
    </StepLayout>
  );
}
