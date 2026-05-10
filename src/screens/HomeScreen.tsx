import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 px-6 justify-between py-10">
        <View className="items-center mt-12">
          <View className="w-20 h-20 rounded-2xl bg-brand items-center justify-center mb-6 shadow-md">
            <Text className="text-white text-5xl font-bold leading-none">+</Text>
          </View>
          <Text className="text-4xl font-bold text-slate-900 tracking-tight">
            FirstAid
          </Text>
          <Text className="text-base text-slate-500 mt-2 text-center">
            Quick check-in for the emergency room
          </Text>
        </View>

        <View className="gap-3">
          <Text className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">
            How would you like to check in?
          </Text>

          <Pressable
            onPress={() => navigation.navigate('Intake')}
            className="bg-brand active:bg-brand-dark rounded-2xl px-5 py-5 shadow-sm"
          >
            <Text className="text-white text-lg font-semibold">
              Type in my information
            </Text>
            <Text className="text-red-100 text-sm mt-1">
              Fill out a short intake form
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {}}
            className="bg-white border border-slate-200 rounded-2xl px-5 py-5"
          >
            <Text className="text-slate-900 text-lg font-semibold">
              Scan my health card
            </Text>
            <Text className="text-slate-500 text-sm mt-1">
              Coming soon
            </Text>
          </Pressable>
        </View>

        <Text className="text-xs text-slate-400 text-center">
          If this is a life-threatening emergency, please notify staff immediately.
        </Text>
      </View>
    </SafeAreaView>
  );
}
