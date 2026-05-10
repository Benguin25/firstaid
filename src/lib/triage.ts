// Local, deterministic triage engine.
// Pulls questions from the question bank, walks an adaptive path based on
// chief complaint, and produces a 0–1 score classified into three buckets.
// No external API calls; everything runs on-device.

import {
  CHIEF_COMPLAINT,
  GENERAL_FLAG_QUESTIONS,
  SECTIONS,
  SEVERITY_QUESTION,
  type CategoryCode,
  type Question,
  type QuestionOption,
} from '../data/questionBank';

export const SEVERITY_QUESTION_ID = SEVERITY_QUESTION.id;
export const CHIEF_COMPLAINT_ID = CHIEF_COMPLAINT.id;
// How much the patient's self-rated severity (1–10) influences the final
// 0–1 score. Kept low so it nudges, but doesn't dominate, the bank-derived
// signal weights.
export const SEVERITY_BLEND_WEIGHT = 0.15;

export type Priority = 'HIGH' | 'LOW' | 'DISMISSED';
export type Tier = 1 | 2 | 3 | 4 | 5;

export interface SelectedOption {
  id: string;
  label: string;
  weight: number;
}

export interface AnsweredQuestion {
  questionId: string;
  questionText: string;
  selected: SelectedOption[];
}

export interface TriageScore {
  score: number; // 0–1
  baseScore: number; // 0–1, before severity blend
  maxWeight: number;
  meanWeight: number;
  selfSeverity: number | null;
  tier: Tier;
  priority: Priority;
}

export const PRIORITY_META: Record<
  Priority,
  { label: string; recommendation: string; tone: 'critical' | 'caution' | 'calm' }
> = {
  HIGH: {
    label: 'High priority — urgent care',
    recommendation:
      'Be seen as soon as possible. Call 911 if symptoms worsen rapidly.',
    tone: 'critical',
  },
  LOW: {
    label: 'Low priority — can wait',
    recommendation:
      'A walk-in clinic or sitting in the waiting room is reasonable. Watch for any worsening.',
    tone: 'caution',
  },
  DISMISSED: {
    label: 'Likely doesn\'t need a hospital',
    recommendation:
      'Self-care or pharmacy advice usually covers this. See a doctor if symptoms change.',
    tone: 'calm',
  },
};

export const TIER_LABEL: Record<Tier, string> = {
  1: 'Critical',
  2: 'Emergent',
  3: 'Urgent',
  4: 'Semi-urgent',
  5: 'Non-urgent',
};

export const MAX_QUESTIONS = 10;

// Chief complaints where a pain-severity question adds discriminating value.
const PAIN_AUGMENT_FOR: CategoryCode[] = [
  'CARDIOVASCULAR',
  'GASTROINTESTINAL',
  'TRAUMA',
  'NEUROLOGICAL',
  'MUSCULOSKELETAL',
  'UROLOGICAL',
  'ENT',
  'DERMATOLOGICAL',
];

export function getChiefComplaintQuestion(): Question {
  return CHIEF_COMPLAINT;
}

export function findRoute(option: QuestionOption): CategoryCode | null {
  return option.route ?? null;
}

// Build the candidate question queue for a given route, in clinical order.
function buildQueue(category: CategoryCode): Question[] {
  const sectionQs = SECTIONS[category] ?? [];
  const queue: Question[] = [...sectionQs];

  if (PAIN_AUGMENT_FOR.includes(category)) {
    const painSeverity = SECTIONS.PAIN[0]; // Q701
    if (painSeverity && !queue.find((q) => q.id === painSeverity.id)) {
      // Inject right after the section's first/anchor question.
      queue.splice(Math.min(1, queue.length), 0, painSeverity);
    }
  }

  // Always end with the trajectory question if budget allows.
  const trajectory = GENERAL_FLAG_QUESTIONS.find((q) => q.id === 'Q2003');
  if (trajectory && !queue.find((q) => q.id === trajectory.id)) {
    queue.push(trajectory);
  }

  // For very thin categories (PHARMACY, GENERAL), pad with a general flag.
  const generalFlag = GENERAL_FLAG_QUESTIONS.find((q) => q.id === 'Q2001');
  if (queue.length < 4 && generalFlag && !queue.find((q) => q.id === generalFlag.id)) {
    queue.splice(queue.length - 1, 0, generalFlag);
  }

  return queue;
}

export function selectNextQuestion(
  asked: AnsweredQuestion[],
  category: CategoryCode | null,
): Question | null {
  if (asked.length >= MAX_QUESTIONS) return null;

  const askedIds = new Set(asked.map((a) => a.questionId));

  // Always ask self-rated severity right after the chief complaint.
  if (askedIds.has(CHIEF_COMPLAINT_ID) && !askedIds.has(SEVERITY_QUESTION_ID)) {
    return SEVERITY_QUESTION;
  }

  if (!category) return null;
  const queue = buildQueue(category);
  for (const q of queue) {
    if (!askedIds.has(q.id)) return q;
  }
  return null;
}

export function computeScore(
  asked: AnsweredQuestion[],
  selfSeverity: number | null = null,
): TriageScore {
  // Severity options carry weight 0 in the bank, so they naturally drop out
  // of max/mean. Filter defensively in case that ever changes.
  const signalWeights = asked
    .flatMap((a) => a.selected.map((s) => s.weight))
    .filter((w) => w > 0);

  if (signalWeights.length === 0 && selfSeverity === null) {
    return {
      score: 0,
      baseScore: 0,
      maxWeight: 0,
      meanWeight: 0,
      selfSeverity: null,
      tier: 5,
      priority: 'DISMISSED',
    };
  }

  const maxWeight = signalWeights.length > 0 ? Math.max(...signalWeights) : 0;
  const meanWeight =
    signalWeights.length > 0
      ? signalWeights.reduce((s, w) => s + w, 0) / signalWeights.length
      : 0;

  // Base score: dominated by the worst signal, blended with overall acuity.
  const baseScore = 0.7 * (maxWeight / 10) + 0.3 * (meanWeight / 10);

  // Light blend with self-rated severity (default 15% weight). Score stays
  // bank-driven; severity only nudges.
  const score =
    selfSeverity === null
      ? Math.min(1, baseScore)
      : Math.min(
          1,
          (1 - SEVERITY_BLEND_WEIGHT) * baseScore +
            SEVERITY_BLEND_WEIGHT * (selfSeverity / 10),
        );

  let tier: Tier;
  if (maxWeight >= 10) tier = 1;
  else if (maxWeight >= 8) tier = 2;
  else if (maxWeight >= 6) tier = 3;
  else if (maxWeight >= 3) tier = 4;
  else tier = 5;

  // Tier nudge: someone reporting 8+ severity shouldn't be sent home outright,
  // even if their bank-derived signals are all low. Bumps tier 5 → 4.
  if (selfSeverity !== null && selfSeverity >= 8 && tier === 5) {
    tier = 4;
  }

  let priority: Priority;
  if (tier <= 3) priority = 'HIGH';
  else if (tier === 4) priority = 'LOW';
  else priority = 'DISMISSED';

  return {
    score,
    baseScore,
    maxWeight,
    meanWeight,
    selfSeverity,
    tier,
    priority,
  };
}

// Dynamic stopping: if we've already gathered enough evidence to be
// confidently at the top tier, stop questioning early so the patient isn't
// dragged through irrelevant follow-ups.
export function shouldStopEarly(asked: AnsweredQuestion[]): boolean {
  if (asked.length < 3) return false;
  const s = computeScore(asked);
  if (s.maxWeight < 10) return false;
  const highSignalCount = asked
    .flatMap((a) => a.selected)
    .filter((sel) => sel.weight >= 8).length;
  return highSignalCount >= 2;
}
