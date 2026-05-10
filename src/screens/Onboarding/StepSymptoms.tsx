import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../types/onboarding';
import {
  type Question,
  type QuestionOption,
} from '../../data/questionBank';
import {
  CHIEF_COMPLAINT_ID,
  computeScore,
  findRoute,
  getChiefComplaintQuestion,
  MAX_QUESTIONS,
  selectNextQuestion,
  SEVERITY_QUESTION_ID,
  shouldStopEarly,
  type AnsweredQuestion,
  type SelectedOption,
} from '../../lib/triage';
import { useOnboarding } from './OnboardingContext';
import { StepLayout } from './components/StepLayout';

const SINGLE_DELAY_MS = 400;
const SCALE_DELAY_MS = 300;

// Map body part keys to chief complaint option IDs
const BODY_PART_TO_CHIEF_OPTIONS: Record<string, string[]> = {
  '2':  ['g'],           // Head → Neurological
  '1':  ['l'],           // Maxillofacial → ENT
  '3':  ['l', 'g'],      // Neck → ENT, Neurological
  '19': ['g'],           // Skull/Brain → Neurological
  '4':  ['a', 'b', 'c'], // Chest → Cardiovascular, Respiratory, Pain
  '20': ['m', 'd'],      // Right Shoulder → Musculoskeletal, Trauma
  '26': ['m', 'd'],      // Left Shoulder → Musculoskeletal, Trauma
  '32': ['m', 'd'],      // Right Humerus → Musculoskeletal, Trauma
  '40': ['m', 'd'],      // Left Humerus → Musculoskeletal, Trauma
  '22': ['m', 'd'],      // Right Elbow → Musculoskeletal, Trauma
  '29': ['m', 'd'],      // Left Elbow → Musculoskeletal, Trauma
  '23': ['m', 'd'],      // Right Forearm → Musculoskeletal, Trauma
  '28': ['m', 'd'],      // Left Forearm → Musculoskeletal, Trauma
  '24': ['m', 'd'],      // Right Wrist → Musculoskeletal, Trauma
  '31': ['m', 'd'],      // Left Wrist → Musculoskeletal, Trauma
  '25': ['m', 'd'],      // Right Hand → Musculoskeletal, Trauma
  '30': ['m', 'd'],      // Left Hand → Musculoskeletal, Trauma
  '10': ['f', 'c'],      // Abdominal → Gastrointestinal, Pain
  '9':  ['f', 'k'],      // Pelvis → Gastrointestinal, Reproductive
  '14': ['m', 'k'],      // Left Hip → Musculoskeletal, Reproductive
  '15': ['m'],           // Right Hip → Musculoskeletal
  '27': ['m', 'd'],      // Left Femur/Thigh → Musculoskeletal, Trauma
  '21': ['m', 'd'],      // Right Femur/Thigh → Musculoskeletal, Trauma
  '39': ['m', 'd'],      // Left Knee → Musculoskeletal, Trauma
  '33': ['m', 'd'],      // Right Knee → Musculoskeletal, Trauma
  '38': ['m', 'd'],      // Left Tib/Fib → Musculoskeletal, Trauma
  '34': ['m', 'd'],      // Right Tib/Fib → Musculoskeletal, Trauma
  '42': ['m', 'd'],      // Left Ankle → Musculoskeletal, Trauma
  '35': ['m', 'd'],      // Right Ankle → Musculoskeletal, Trauma
  '37': ['m', 'd'],      // Left Foot → Musculoskeletal, Trauma
  '36': ['m', 'd'],      // Right Foot → Musculoskeletal, Trauma
  '41': ['m', 'd', 'c'], // Spine → Musculoskeletal, Trauma, Pain
  '5':  ['m', 'd', 'c'], // Back → Musculoskeletal, Trauma, Pain
  '16': ['f', 'm'],      // Buttocks → Gastrointestinal, Musculoskeletal
  '17': ['m', 'd'],      // Right Shoulder (Back) → Musculoskeletal, Trauma
  '18': ['m', 'd'],      // Left Shoulder (Back) → Musculoskeletal, Trauma
  '11': ['m', 'd'],      // Right Arm (Back) → Musculoskeletal, Trauma
  '8':  ['m', 'd'],      // Left Arm (Back) → Musculoskeletal, Trauma
  '7':  ['m', 'd'],      // Right Leg (Back) → Musculoskeletal, Trauma
  '12': ['m', 'd'],      // Left Leg (Back) → Musculoskeletal, Trauma
};

// Filter chief complaint options based on body map selections
function getRelevantChiefOptions(bodyMap: string[]): Set<string> {
  const relevant = new Set<string>();
  for (const key of bodyMap) {
    const optIds = BODY_PART_TO_CHIEF_OPTIONS[key] ?? [];
    optIds.forEach(id => relevant.add(id));
  }
  // Always include 'o' (Other / not sure) as escape hatch
  relevant.add('o');
  return relevant;
}

function toSelected(options: QuestionOption[]): SelectedOption[] {
  return options.map((o) => ({ id: o.id, label: o.label, weight: o.weight }));
}

export function StepSymptoms() {
  const {
    state,
    setStep,
    setTriageCategory,
    addTriageAnswer,
    setSelfSeverity,
    finishTriage,
    resetTriage,
  } = useOnboarding();
  const { triage, bodyMap } = state;

  const chiefQuestion = useMemo(() => getChiefComplaintQuestion(), []);

  const initialQuestion: Question | null = useMemo(() => {
    if (triage.asked.length === 0) return chiefQuestion;
    return selectNextQuestion(triage.asked, triage.category);
  }, [chiefQuestion, triage.asked, triage.category]);

  const [current, setCurrent] = useState<Question | null>(initialQuestion);
  const [pendingMulti, setPendingMulti] = useState<QuestionOption[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!current && !triage.finished) {
      setCurrent(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  // Auto-advance to step 5 once triage finishes (was step 4, shifted by body map)
  useEffect(() => {
    if (triage.finished) setStep(5);
  }, [triage.finished, setStep]);

  const recordAnswer = (q: Question, picked: QuestionOption[]) => {
    const answer: AnsweredQuestion = {
      questionId: q.id,
      questionText: q.text,
      selected: toSelected(picked),
    };
    addTriageAnswer(answer);

    let nextCategory = triage.category;
    let nextSeverity = triage.selfSeverity;

    if (q.id === CHIEF_COMPLAINT_ID) {
      const route = findRoute(picked[0]);
      nextCategory = route ?? 'GENERAL';
      setTriageCategory(nextCategory);
    }

    if (q.id === SEVERITY_QUESTION_ID) {
      const value = Number(picked[0]?.label);
      if (Number.isFinite(value)) {
        nextSeverity = value;
        setSelfSeverity(value);
      }
    }

    const newAsked = [...triage.asked, answer];

    if (shouldStopEarly(newAsked)) {
      finalize(newAsked, nextSeverity);
      return;
    }

    const nextQ = selectNextQuestion(newAsked, nextCategory);
    if (!nextQ) {
      finalize(newAsked, nextSeverity);
      return;
    }
    setCurrent(nextQ);
    setPendingMulti([]);
  };

  const finalize = (asked: AnsweredQuestion[], selfSeverity: number | null) => {
    const score = computeScore(asked, selfSeverity);
    finishTriage(score);
    setCurrent(null);
  };

  const onSingleTap = (opt: QuestionOption) => {
    if (!current) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(
      () => recordAnswer(current, [opt]),
      SINGLE_DELAY_MS,
    );
    setPendingMulti([opt]);
  };

  const onScaleTap = (opt: QuestionOption) => {
    if (!current) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(
      () => recordAnswer(current, [opt]),
      SCALE_DELAY_MS,
    );
    setPendingMulti([opt]);
  };

  const toggleMulti = (opt: QuestionOption) => {
    setPendingMulti((cur) => {
      const has = cur.find((o) => o.id === opt.id);
      return has ? cur.filter((o) => o.id !== opt.id) : [...cur, opt];
    });
  };

  const onContinue = () => {
    if (!current) return;
    if (current.type === 'multi') {
      if (pendingMulti.length === 0) return;
      recordAnswer(current, pendingMulti);
      return;
    }
    if (pendingMulti.length === 0) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    recordAnswer(current, pendingMulti);
  };

  const onBack = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (triage.asked.length === 0) {
      // Go back to body map (step 3), not measurements (step 2)
      setStep(3);
      return;
    }
    resetTriage();
    setCurrent(chiefQuestion);
    setPendingMulti([]);
  };

  if (!current) {
    return (
      <StepLayout
        step={4}
        title="Wrapping up…"
        subtitle="Compiling your answers."
        onContinue={() => setStep(5)}
        continueLabel="Continue"
      >
        <View />
      </StepLayout>
    );
  }

  const askedCount = triage.asked.length;
  const questionNumber = askedCount + 1;
  const isMulti = current.type === 'multi';
  const isScale = current.type === 'scale';
  const continueDisabled = pendingMulti.length === 0;

  return (
    <StepLayout
      step={4}
      title={current.text}
      subtitle={`Question ${questionNumber} of up to ${MAX_QUESTIONS}${
        isMulti ? ' · pick all that apply' : ''
      }${isScale ? ' · 1 = barely noticeable, 10 = worst imaginable' : ''}`}
      onBack={onBack}
      onContinue={onContinue}
      continueLabel="Continue"
      continueDisabled={continueDisabled}
    >
      {/* Collapsible answer summary */}
      {askedCount > 0 ? (
        <>
          <Pressable
            onPress={() => setHistoryOpen((v) => !v)}
            style={styles.historyHeader}
          >
            <Text style={styles.historyHeaderText}>
              {historyOpen ? '▾' : '▸'} Your answers so far ({askedCount})
            </Text>
          </Pressable>
          {historyOpen ? (
            <View style={styles.historyBody}>
              {triage.asked.map((a, idx) => (
                <View key={`${a.questionId}-${idx}`} style={styles.historyTurn}>
                  <Text style={styles.historyQ}>
                    {idx + 1}. {a.questionText}
                  </Text>
                  <Text style={styles.historyA}>
                    {a.selected.map((s) => s.label).join(' · ')}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      {/* Options */}
      {isScale ? (
        <View style={styles.scaleGrid}>
          {current.options.map((opt) => {
            const selected = !!pendingMulti.find((o) => o.id === opt.id);
            return (
              <Pressable
                key={opt.id}
                onPress={() => onScaleTap(opt)}
                style={({ pressed }) => [
                  styles.scaleBtn,
                  selected && styles.scaleBtnSelected,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text
                  style={[styles.scaleText, selected && styles.scaleTextSelected]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.chipsRow}>
          {(() => {
            // Filter options for chief complaint based on body map
            let displayOptions = current.options;
            if (current.id === CHIEF_COMPLAINT_ID && bodyMap && bodyMap.length > 0) {
              const relevantIds = getRelevantChiefOptions(bodyMap);
              displayOptions = current.options.filter(opt => relevantIds.has(opt.id));
            }
            return displayOptions.map((opt) => {
              const selected = !!pendingMulti.find((o) => o.id === opt.id);
              return (
                <Pressable
                  key={opt.id}
                  onPress={() =>
                    isMulti ? toggleMulti(opt) : onSingleTap(opt)
                  }
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text
                    style={[styles.chipText, selected && styles.chipTextSelected]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            });
          })()}
        </View>
      )}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  historyHeader: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  historyBody: {
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyTurn: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyQ: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  historyA: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  scaleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  scaleBtn: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleBtnSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  scaleText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  scaleTextSelected: {
    color: '#ffffff',
  },
});