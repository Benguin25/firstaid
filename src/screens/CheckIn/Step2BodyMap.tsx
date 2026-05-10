import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StepLayout } from './components/StepLayout';
import { BodySilhouette } from './components/BodySilhouette';
import { useCheckIn, BodyRegion, REGION_LABEL } from './CheckInContext';

export default function Step2BodyMap() {
  const [view, setView] = useState<'front' | 'back'>('front');
  const { data, update, next } = useCheckIn();

  const toggle = (r: BodyRegion) => {
    const has = data.bodyRegions.includes(r);
    update(
      'bodyRegions',
      has ? data.bodyRegions.filter((x) => x !== r) : [...data.bodyRegions, r]
    );
  };

  return (
    <StepLayout onContinue={next}>
      <Text className="text-2xl font-bold text-slate-900 mt-2">
        Tap where you feel pain or discomfort
      </Text>
      <Text className="text-sm text-slate-500 mt-1">
        Select all areas that apply. You can skip this step if no specific area
        is affected.
      </Text>

      <View className="flex-row bg-slate-100 rounded-full p-1 my-5 self-center">
        <Pressable
          onPress={() => setView('front')}
          className={`px-8 py-2 rounded-full ${
            view === 'front' ? 'bg-white' : ''
          }`}
        >
          <Text
            className={
              view === 'front'
                ? 'font-semibold text-slate-900'
                : 'text-slate-500'
            }
          >
            Front
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setView('back')}
          className={`px-8 py-2 rounded-full ${
            view === 'back' ? 'bg-white' : ''
          }`}
        >
          <Text
            className={
              view === 'back'
                ? 'font-semibold text-slate-900'
                : 'text-slate-500'
            }
          >
            Back
          </Text>
        </Pressable>
      </View>

      <View
        style={{ width: '100%', aspectRatio: 200 / 440 }}
        className="items-center self-center"
      >
        <BodySilhouette
          view={view}
          selected={data.bodyRegions}
          onToggle={toggle}
        />
      </View>

      {data.bodyRegions.length > 0 && (
        <View className="mt-4">
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Selected
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {data.bodyRegions.map((r) => (
              <View
                key={r}
                className="bg-[#1D9E75]/10 border border-[#1D9E75] rounded-full px-3 py-1"
              >
                <Text className="text-[#1D9E75] text-sm font-medium">
                  {REGION_LABEL[r]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </StepLayout>
  );
}
