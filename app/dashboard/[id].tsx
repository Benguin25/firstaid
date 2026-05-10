import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePatient } from '../../src/hooks/usePatient';
import {
  CTAS_COLORS,
  CTAS_LABELS,
  DASHBOARD_COLORS as C,
  STATUS_COLORS,
  type ConditionProbability,
  type PatientRow,
  type ProbableCondition,
  type TriageStatus,
} from '../../src/types/supabase';

interface SymptomAnswer {
  questionId: string;
  questionText: string;
  selected: { id: string; label: string; weight: number }[];
}

interface ParsedSymptoms {
  category: string | null;
  asked: SymptomAnswer[];
  selfSeverity: number | null;
}

function parseSymptoms(symptoms_text: string | null): ParsedSymptoms {
  const empty: ParsedSymptoms = {
    category: null,
    asked: [],
    selfSeverity: null,
  };
  if (!symptoms_text) return empty;
  try {
    const parsed = JSON.parse(symptoms_text);
    const asked: SymptomAnswer[] = Array.isArray(parsed?.asked)
      ? parsed.asked
      : [];
    const score = parsed?.score && typeof parsed.score === 'object' ? parsed.score : null;
    return {
      category: typeof parsed?.category === 'string' ? parsed.category : null,
      asked,
      selfSeverity:
        typeof score?.selfSeverity === 'number' ? score.selfSeverity : null,
    };
  } catch {
    return empty;
  }
}

function ageFromDob(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function findFirstAnswer(
  asked: SymptomAnswer[],
  predicate: (q: SymptomAnswer) => boolean,
): SymptomAnswer | null {
  return asked.find(predicate) ?? null;
}

function answerLabel(a: SymptomAnswer): string {
  return a.selected.map((s) => s.label).join(' · ');
}

function probabilityColor(p: ConditionProbability): {
  bg: string;
  fg: string;
} {
  switch (p) {
    case 'High':
      return { bg: '#fee2e2', fg: '#991b1b' };
    case 'Moderate':
      return { bg: '#fef3c7', fg: '#92400e' };
    case 'Low':
    default:
      return { bg: '#dcfce7', fg: '#166534' };
  }
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );
}

function StatusButton({
  label,
  activeBg,
  activeFg,
  active,
  loading,
  onPress,
  disabled,
}: {
  label: string;
  activeBg: string;
  activeFg: string;
  active: boolean;
  loading: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.actionBtn,
        active && { backgroundColor: activeBg, borderColor: activeBg },
        pressed && !disabled && styles.actionBtnPressed,
        (disabled || loading) && !active && styles.actionBtnDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={active ? activeFg : C.primary} size="small" />
      ) : (
        <Text
          style={[
            styles.actionBtnText,
            active && { color: activeFg },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export default function PatientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idStr = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : undefined;
  const { data, loading, error, updateStatus } = usePatient(idStr);

  const [busyAction, setBusyAction] = useState<TriageStatus | null>(null);

  const parsed = useMemo(
    () => parseSymptoms(data?.patient.symptoms_text ?? null),
    [data?.patient.symptoms_text],
  );

  const handleUpdate = async (status: TriageStatus) => {
    if (busyAction) return;
    setBusyAction(status);
    try {
      await updateStatus(status);
    } catch (e) {
      console.error('updateStatus failed', e);
    } finally {
      setBusyAction(null);
    }
  };

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <View style={styles.headerBar}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.backBtn}
            >
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
          </View>
          <View style={styles.center}>
            <Text style={styles.errorTitle}>Couldn't load patient</Text>
            <Text style={styles.errorBody}>{error ?? 'Not found'}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const { patient, triage } = data;
  const fullName = `${patient.first_name} ${patient.last_name}`.trim();
  const ctasColor = CTAS_COLORS[triage.ctas_level];
  const ctasLabel = CTAS_LABELS[triage.ctas_level];
  const statusMeta = STATUS_COLORS[triage.status];
  const age = ageFromDob(patient.date_of_birth);

  const severityAnswer = findFirstAnswer(parsed.asked, (q) =>
    q.questionId === 'QSEV' || /severity|severe/i.test(q.questionText),
  );
  const durationAnswer = findFirstAnswer(parsed.asked, (q) =>
    /how long|when did|duration|started/i.test(q.questionText),
  );
  const otherAnswers = parsed.asked.filter(
    (a) =>
      a !== severityAnswer &&
      a !== durationAnswer &&
      // Skip the chief complaint question itself — already in the header.
      a.questionId !== 'QCC',
  );

  const conditions: ProbableCondition[] = Array.isArray(triage.probable_conditions)
    ? triage.probable_conditions
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.headerBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.headerName} numberOfLines={1}>
            {fullName}
          </Text>
          <View style={[styles.ctasBadge, { backgroundColor: ctasColor }]}>
            <Text style={styles.ctasBadgeText}>CTAS {triage.ctas_level}</Text>
          </View>
        </View>

        <View style={styles.subHeader}>
          <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusText, { color: statusMeta.fg }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.twoCol}>
            <View style={styles.colLeft}>
              <Card title="Clinical notes">
                <View style={styles.tierRow}>
                  <View
                    style={[styles.tierDot, { backgroundColor: ctasColor }]}
                  />
                  <Text style={styles.tierText}>
                    Level {triage.ctas_level} — {ctasLabel}
                  </Text>
                </View>
                {triage.nurse_summary ? (
                  <Text style={styles.summary}>{triage.nurse_summary}</Text>
                ) : (
                  <Text style={styles.muted}>No nurse summary recorded.</Text>
                )}
              </Card>

              <Card title="Symptom answers">
                <Row
                  label="Duration"
                  value={
                    durationAnswer ? answerLabel(durationAnswer) : '—'
                  }
                />
                <Row
                  label="Severity"
                  value={
                    severityAnswer
                      ? answerLabel(severityAnswer)
                      : parsed.selfSeverity !== null
                        ? `${parsed.selfSeverity} / 10`
                        : '—'
                  }
                />

                {otherAnswers.length > 0 ? (
                  <View style={styles.qaList}>
                    {otherAnswers.map((a, idx) => (
                      <View
                        key={`${a.questionId}-${idx}`}
                        style={styles.qaRow}
                      >
                        <Text style={styles.qaQ}>{a.questionText}</Text>
                        <Text style={styles.qaA}>{answerLabel(a)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {patient.body_map &&
                Object.keys(patient.body_map).length > 0 ? (
                  <View style={styles.qaList}>
                    {Object.entries(patient.body_map).map(
                      ([part, symptoms]) => (
                        <View key={part} style={styles.qaRow}>
                          <Text style={styles.qaQ}>{part}</Text>
                          <Text style={styles.qaA}>
                            {Array.isArray(symptoms)
                              ? symptoms.join(', ')
                              : '—'}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                ) : null}
              </Card>
            </View>

            <View style={styles.colRight}>
              <Card title="Patient info">
                <Row
                  label="Date of birth"
                  value={formatDob(patient.date_of_birth)}
                />
                <Row label="Age" value={age !== null ? `${age} yrs` : '—'} />
                <Row label="Phone" value={patient.phone} />
                <Row label="Email" value={patient.email} />
                <Row
                  label="Weight"
                  value={
                    patient.weight_lbs ? `${patient.weight_lbs} lbs` : '—'
                  }
                />
                <Row
                  label="Height"
                  value={
                    patient.height_feet || patient.height_inches
                      ? `${patient.height_feet || 0}' ${patient.height_inches || 0}"`
                      : '—'
                  }
                />
                <Row label="Allergies" value={extractAllergies(patient)} />
                <View style={styles.scoreBlock}>
                  <Text style={styles.scoreLine}>
                    Priority score:{' '}
                    <Text style={styles.scoreNumber}>
                      {triage.priority_score}
                    </Text>
                    <Text style={styles.scoreOutOf}> / 100</Text>
                  </Text>
                </View>
              </Card>

              <Card title="Status update">
                <View style={styles.actionsCol}>
                  <StatusButton
                    label="Call in patient"
                    activeBg="#1d4ed8"
                    activeFg="#ffffff"
                    active={triage.status === 'in-progress'}
                    loading={busyAction === 'in-progress'}
                    disabled={triage.status === 'in-progress'}
                    onPress={() => {
                      void handleUpdate('in-progress');
                    }}
                  />
                  <StatusButton
                    label="Escalate"
                    activeBg="#dc2626"
                    activeFg="#ffffff"
                    active={triage.status === 'escalated'}
                    loading={busyAction === 'escalated'}
                    disabled={false}
                    onPress={() => {
                      void handleUpdate('escalated');
                    }}
                  />
                  <StatusButton
                    label="Discharge"
                    activeBg="#16a34a"
                    activeFg="#ffffff"
                    active={triage.status === 'discharged'}
                    loading={busyAction === 'discharged'}
                    disabled={triage.status === 'discharged'}
                    onPress={() => {
                      void handleUpdate('discharged');
                    }}
                  />
                </View>
              </Card>

              <Card title="Probable conditions">
                {conditions.length === 0 ? (
                  <Text style={styles.muted}>No conditions identified.</Text>
                ) : (
                  <View style={styles.conditionsList}>
                    {conditions.map((c, i) => {
                      const colors = probabilityColor(c.probability);
                      return (
                        <View
                          key={`${c.condition}-${i}`}
                          style={styles.conditionRow}
                        >
                          <Text style={styles.conditionName}>
                            {c.condition}
                          </Text>
                          <View
                            style={[
                              styles.probBadge,
                              { backgroundColor: colors.bg },
                            ]}
                          >
                            <Text
                              style={[styles.probText, { color: colors.fg }]}
                            >
                              {c.probability}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Card>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function formatDob(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function extractAllergies(p: PatientRow): string {
  // Allergies aren't a top-level column on the current patients table — the
  // onboarding flow doesn't capture them. Fall back to '—' so the row still
  // renders cleanly.
  const anyP = p as unknown as Record<string, unknown>;
  const direct = anyP['allergies'];
  if (typeof direct === 'string' && direct.trim().length > 0) return direct;
  return '—';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
    gap: 12,
  },
  backBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  backArrow: {
    fontSize: 26,
    color: C.textPrimary,
  },
  headerName: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
  },
  ctasBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ctasBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  subHeader: {
    paddingBottom: 10,
    flexDirection: 'row',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontSize: 14, fontWeight: '700' },
  scrollContent: {
    paddingBottom: 32,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  colLeft: {
    flexBasis: 0,
    flexGrow: 6,
    gap: 14,
  },
  colRight: {
    flexBasis: 0,
    flexGrow: 4,
    gap: 14,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 10,
  },
  cardBody: { gap: 6 },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tierText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
  },
  scoreBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  scoreLine: {
    fontSize: 14,
    color: C.textSecondary,
  },
  scoreNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
  },
  scoreOutOf: {
    fontSize: 14,
    color: C.textSecondary,
  },
  summary: {
    fontSize: 14,
    color: C.textPrimary,
    lineHeight: 21,
    marginTop: 4,
  },
  muted: {
    fontSize: 14,
    color: C.textSecondary,
    fontStyle: 'italic',
  },
  conditionsList: {
    gap: 6,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  conditionName: {
    flex: 1,
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '500',
  },
  probBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  probText: {
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 5,
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
    color: C.textSecondary,
    width: 110,
  },
  rowValue: {
    flex: 1,
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '500',
  },
  qaList: {
    marginTop: 8,
    gap: 4,
  },
  qaRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  qaQ: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 2,
  },
  qaA: {
    fontSize: 14,
    color: C.textSecondary,
  },
  actionsCol: { gap: 10 },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionBtnPressed: { opacity: 0.7 },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991b1b',
  },
  errorBody: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
  },
});
