import { useCallback } from 'react';
import { estimateWaitMinutes } from '../lib/estimateWait';
import type { PatientWithTriage } from '../types/supabase';
import { useBaseWaits } from './useBaseWaits';

// Returns a memoized estimator that yields the same wait estimate for the same
// patient on any screen — both clients pass the same queue (sorted by dynamic
// priority) and read the same historical base waits, so the inputs into
// estimateWaitMinutes are identical.
export function useEstimateWait(
  queue: PatientWithTriage[],
): (patientId: string) => number | null {
  const baseWaits = useBaseWaits();

  return useCallback(
    (patientId: string): number | null => {
      const idx = queue.findIndex((q) => q.patient.id === patientId);
      if (idx === -1) return null;

      // No wait estimate for patients who aren't actually waiting anymore.
      const myStatus = queue[idx].triage.status;
      if (myStatus !== 'waiting') return null;

      // Discharged patients have left the system, so they shouldn't keep
      // contributing to other patients' waits. In-progress and escalated
      // patients are still occupying clinician capacity, so they do count.
      const ahead = queue
        .slice(0, idx)
        .filter((q) => q.triage.status !== 'discharged')
        .map((q) => ({ ctasLevel: q.triage.ctas_level }));

      return estimateWaitMinutes(
        queue[idx].triage.ctas_level,
        idx,
        ahead,
        baseWaits,
      );
    },
    [queue, baseWaits],
  );
}
