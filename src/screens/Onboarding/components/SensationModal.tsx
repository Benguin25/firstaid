import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  COLORS,
  SENSATIONS,
  type BodyRegion,
  type Sensation,
} from '../../../types/onboarding';

interface Props {
  visible: boolean;
  region: BodyRegion | null;
  initial: Sensation[];
  onClose: () => void;
  onDone: (region: BodyRegion, sensations: Sensation[]) => void;
}

function titleCase(s: string): string {
  return s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

export function SensationModal({ visible, region, initial, onClose, onDone }: Props) {
  const [selected, setSelected] = useState<Sensation[]>(initial);

  useEffect(() => {
    if (visible) setSelected(initial);
  }, [visible, initial]);

  const toggle = (s: Sensation) => {
    setSelected((curr) =>
      curr.includes(s) ? curr.filter((x) => x !== s) : [...curr, s],
    );
  };

  const handleDone = () => {
    if (region) onDone(region, selected);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{region ? titleCase(region) : ''}</Text>
          <Text style={styles.subtitle}>What does it feel like? Select all that apply.</Text>

          <View style={styles.grid}>
            {SENSATIONS.map((s) => {
              const isOn = selected.includes(s);
              return (
                <Pressable
                  key={s}
                  onPress={() => toggle(s)}
                  style={({ pressed }) => [
                    styles.chip,
                    isOn && styles.chipOn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.chipText, isOn && styles.chipTextOn]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleDone}
            style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  chipTextOn: {
    color: '#ffffff',
  },
  doneBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnPressed: {
    backgroundColor: '#188660',
  },
  doneText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
