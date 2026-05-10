export type BaseWaits = Record<number, number>;

export const MIN_WAIT_MINUTES = 3;

// Used only when the database has no historical samples for a CTAS level yet.
export const FALLBACK_BASE_WAIT: BaseWaits = {
  1: 0,
  2: 15,
  3: 30,
  4: 60,
  5: 120,
};

// Wait is purely a function of who's ahead — anyone further down the priority-
// sorted queue must have a wait >= the patient above them. We deliberately do
// NOT add a per-CTAS term for the patient themselves; that broke monotonicity
// (a CTAS-1 patient at the back of the queue could otherwise come out with a
// smaller estimate than a CTAS-2 patient near the front).
export function estimateWaitMinutes(
  patientCtasLevel: number,
  queuePosition: number,
  patientsAhead: { ctasLevel: number }[],
  baseWaits: BaseWaits,
): number {
  const waitFromQueue = patientsAhead.reduce((total, p) => {
    return total + (baseWaits[p.ctasLevel] ?? 60) * 0.3;
  }, 0);
  // Floor at 3 minutes — even the front of the queue has some intake/handoff
  // time, and "~0 min" reads worse than "~3 min" to a patient who's just
  // checked in.
  return Math.max(MIN_WAIT_MINUTES, Math.round(waitFromQueue));
}

export function formatWait(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}
