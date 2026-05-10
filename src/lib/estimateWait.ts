export type BaseWaits = Record<number, number>;

// Used only when the database has no historical samples for a CTAS level yet.
export const FALLBACK_BASE_WAIT: BaseWaits = {
  1: 0,
  2: 15,
  3: 30,
  4: 60,
  5: 120,
};

export function estimateWaitMinutes(
  patientCtasLevel: number,
  queuePosition: number,
  patientsAhead: { ctasLevel: number }[],
  baseWaits: BaseWaits,
): number {
  const waitFromQueue = patientsAhead.reduce((total, p) => {
    return total + (baseWaits[p.ctasLevel] ?? 60) * 0.3;
  }, 0);
  return Math.round((baseWaits[patientCtasLevel] ?? 60) + waitFromQueue);
}

export function formatWait(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}
