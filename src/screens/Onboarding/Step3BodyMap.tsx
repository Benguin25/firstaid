import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  COLORS,
  type BodyRegion,
  type BodyView,
  type Sensation,
} from '../../types/onboarding';
import { useOnboarding } from './OnboardingContext';
import { StepLayout } from './components/StepLayout';
import { BodyMap } from './components/BodyMap';
import { SensationModal } from './components/SensationModal';

export function Step3BodyMap() {
  const { state, setRegionSensations, setSymptomDescription, setStep } = useOnboarding();
  const [view, setView] = useState<BodyView>('front');
  const [activeRegion, setActiveRegion] = useState<BodyRegion | null>(null);

  const onRegionPress = (region: BodyRegion) => {
    setActiveRegion(region);
  };

  const onSensationsDone = (region: BodyRegion, sensations: Sensation[]) => {
    setRegionSensations(region, sensations);
    setActiveRegion(null);
  };

  const initialForActive: Sensation[] =
    activeRegion ? state.symptoms.regions[activeRegion] ?? [] : [];

  const selectedCount = Object.keys(state.symptoms.regions).length;

  return (
    <StepLayout
      step={3}
      title="Where does it hurt?"
      subtitle="Tap a body region, then choose what you're feeling."
      onBack={() => setStep(2)}
      onContinue={() => setStep(4)}
      continueLabel={selectedCount === 0 ? 'Skip' : 'Continue'}
    >
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setView('front')}
          style={({ pressed }) => [
            styles.toggleBtn,
            view === 'front' && styles.toggleBtnActive,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[styles.toggleText, view === 'front' && styles.toggleTextActive]}
          >
            Front
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setView('back')}
          style={({ pressed }) => [
            styles.toggleBtn,
            view === 'back' && styles.toggleBtnActive,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[styles.toggleText, view === 'back' && styles.toggleTextActive]}
          >
            Back
          </Text>
        </Pressable>
      </View>

      <View style={styles.bodyWrap}>
        <BodyMap
          view={view}
          selections={state.symptoms.regions}
          onRegionPress={onRegionPress}
        />
      </View>

      <Text style={styles.label}>Describe what you're feeling in your own words</Text>
      <TextInput
        style={styles.textarea}
        value={state.symptoms.description}
        onChangeText={setSymptomDescription}
        placeholder="Optional — anything else the nurse should know"
        placeholderTextColor="#94a3b8"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <SensationModal
        visible={activeRegion !== null}
        region={activeRegion}
        initial={initialForActive}
        onClose={() => setActiveRegion(null)}
        onDone={onSensationsDone}
      />
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.background,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  bodyWrap: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  textarea: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    minHeight: 110,
  },
});
