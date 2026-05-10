import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../types/onboarding';
import { parseHealthCard } from '../../lib/parseHealthCard';
import { useOnboarding } from './OnboardingContext';

type ViewMode = 'choice' | 'camera' | 'denied';
type CaptureState = 'idle' | 'scanning' | 'success' | 'error';

const SCREEN_WIDTH = Dimensions.get('window').width;
const FRAME_WIDTH = Math.round(SCREEN_WIDTH * 0.85);
const FRAME_HEIGHT = Math.round(FRAME_WIDTH * (10 / 16));

export function StepHealthCard() {
  const router = useRouter();
  const { setStep, updatePersonal } = useOnboarding();
  const [permission, requestPermission] = useCameraPermissions();
  const [view, setView] = useState<ViewMode>('choice');
  const [captureState, setCaptureState] = useState<CaptureState>('idle');
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const goManual = () => {
    setStep(1);
  };

  const exitToHome = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleScanPress = async () => {
    if (permission?.granted) {
      setView('camera');
      return;
    }
    const result = await requestPermission();
    if (result.granted) {
      setView('camera');
    } else {
      setView('denied');
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || captureState === 'scanning') return;
    setCaptureState('scanning');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });
      if (!photo?.base64) {
        setCaptureState('error');
        return;
      }
      const data = await parseHealthCard(photo.base64);
      if (!data) {
        setCaptureState('error');
        return;
      }
      updatePersonal({
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth.toISOString(),
        healthCardNumber: data.healthCardNumber,
      });
      setCaptureState('success');
      setTimeout(() => {
        setStep(1);
      }, 700);
    } catch (err) {
      console.error('capture failed', err);
      setCaptureState('error');
    }
  };

  const retryCapture = () => {
    setCaptureState('idle');
  };

  if (view === 'denied') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.deniedContainer}>
          <Ionicons name="camera-outline" size={56} color={COLORS.textSecondary} />
          <Text style={styles.deniedTitle}>
            Camera access is needed to scan your card
          </Text>
          <Pressable
            onPress={async () => {
              const result = await requestPermission();
              if (result.granted) setView('camera');
            }}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>Grant access</Text>
          </Pressable>
          <Pressable
            onPress={goManual}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
          >
            <Text style={styles.linkBtnText}>Enter manually instead</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (view === 'camera') {
    return (
      <View style={styles.cameraRoot}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
        />

        <View style={styles.cameraOverlay} pointerEvents="box-none">
          <View style={styles.overlayTopBottom} />
          <View style={styles.overlayMiddleRow}>
            <View style={styles.overlaySide} />
            <View style={styles.frame} />
            <View style={styles.overlaySide} />
          </View>
          <View style={[styles.overlayTopBottom, styles.overlayBottom]}>
            <Text style={styles.frameInstruction}>
              Hold your OHIP card steady inside the frame
            </Text>
          </View>
        </View>

        <SafeAreaView style={styles.cameraChrome} edges={['top', 'bottom']}>
          <View style={styles.cameraTop}>
            <Pressable
              onPress={() => {
                setCaptureState('idle');
                setView('choice');
              }}
              hitSlop={12}
              style={({ pressed }) => [
                styles.cameraBackBtn,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </Pressable>
          </View>

          <View style={styles.cameraBottom}>
            {captureState === 'scanning' ? (
              <View style={styles.statusPill}>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.statusText}>Reading your card…</Text>
              </View>
            ) : captureState === 'success' ? (
              <View style={[styles.statusPill, styles.statusSuccess]}>
                <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
                <Text style={styles.statusText}>Got it</Text>
              </View>
            ) : captureState === 'error' ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>
                  Couldn't read the card — please try again or enter manually
                </Text>
                <View style={styles.errorActions}>
                  <Pressable
                    onPress={retryCapture}
                    style={({ pressed }) => [
                      styles.errorBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.errorBtnText}>Retry</Text>
                  </Pressable>
                  <Pressable
                    onPress={goManual}
                    style={({ pressed }) => [
                      styles.errorBtn,
                      styles.errorBtnSecondary,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.errorBtnTextSecondary}>
                      Enter manually
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={handleCapture}
                style={({ pressed }) => [
                  styles.captureBtn,
                  pressed && styles.captureBtnPressed,
                ]}
              >
                <View style={styles.captureBtnInner} />
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.choiceTop}>
        <Pressable
          onPress={exitToHome}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.choiceContent}>
        <Text style={styles.brand}>FirstAid</Text>
        <Text style={styles.welcome}>Welcome to FirstAid</Text>
        <Text style={styles.subtext}>
          Let's get you checked in. You can scan your OHIP card or enter your
          details manually.
        </Text>

        <View style={styles.cardStack}>
          <Pressable
            onPress={handleScanPress}
            style={({ pressed }) => [
              styles.optionCard,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="camera-outline" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Scan health card</Text>
              <Text style={styles.optionSubtext}>
                Hold your OHIP card up to the camera
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={goManual}
            style={({ pressed }) => [
              styles.optionCard,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="create-outline" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Enter manually</Text>
              <Text style={styles.optionSubtext}>
                Type in your information yourself
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textSecondary}
            />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  pressed: {
    opacity: 0.6,
  },
  btnPressed: {
    opacity: 0.85,
  },
  choiceTop: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  choiceContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  brand: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  welcome: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  subtext: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 32,
  },
  cardStack: {
    gap: 14,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 14,
  },
  cardPressed: {
    opacity: 0.85,
    backgroundColor: '#f8fafc',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eaf7f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  optionSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Permission-denied view
  deniedContainer: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  deniedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkBtn: {
    paddingVertical: 8,
  },
  linkBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },

  // Camera view
  cameraRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTopBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  overlayBottom: {
    alignItems: 'center',
    paddingTop: 20,
  },
  overlayMiddleRow: {
    flexDirection: 'row',
    height: FRAME_HEIGHT,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  frameInstruction: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  cameraChrome: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraTop: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  cameraBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cameraBottom: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'flex-end',
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  captureBtnPressed: {
    opacity: 0.8,
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  statusSuccess: {
    backgroundColor: COLORS.primary,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    gap: 12,
  },
  errorText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  errorBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  errorBtnSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBtnTextSecondary: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
