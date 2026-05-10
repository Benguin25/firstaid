import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type {
  CtasLevel,
  PatientRow,
  PatientWithTriage,
  TriageRow,
} from '../types/supabase';

interface UseQueueResult {
  data: PatientWithTriage[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const WAIT_WEIGHTS: Record<number, number> = {
  1: 0,
  2: 0.3,
  3: 0.6,
  4: 1.0,
  5: 1.2,
};

export function dynamicPriority(
  priorityScore: number,
  ctasLevel: number,
  createdAt: string,
): number {
  const minutesWaiting = (Date.now() - new Date(createdAt).getTime()) / 60000;
  const weight = WAIT_WEIGHTS[ctasLevel] ?? 0.5;
  return Math.round(priorityScore + minutesWaiting * weight);
}

function sortByDynamic(rows: PatientWithTriage[]): PatientWithTriage[] {
  return [...rows].sort((a, b) => {
    const da = dynamicPriority(
      a.triage.priority_score,
      a.triage.ctas_level as CtasLevel,
      a.patient.created_at,
    );
    const db = dynamicPriority(
      b.triage.priority_score,
      b.triage.ctas_level as CtasLevel,
      b.patient.created_at,
    );
    return db - da;
  });
}

export function useQueue(): UseQueueResult {
  const [data, setData] = useState<PatientWithTriage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: triages, error: tErr } = await supabase
        .from('triage')
        .select('*');
      if (tErr) throw tErr;

      const triageRows = (triages ?? []) as TriageRow[];
      if (triageRows.length === 0) {
        setData([]);
        setError(null);
        return;
      }

      const patientIds = triageRows.map((t) => t.patient_id);
      const { data: patients, error: pErr } = await supabase
        .from('patients')
        .select('*')
        .in('id', patientIds);
      if (pErr) throw pErr;

      const patientMap = new Map<string, PatientRow>(
        ((patients ?? []) as PatientRow[]).map((p) => [p.id, p]),
      );

      const joined: PatientWithTriage[] = triageRows
        .filter((t) => patientMap.has(t.patient_id))
        .map((t) => ({
          patient: patientMap.get(t.patient_id) as PatientRow,
          triage: t,
        }));

      setData(sortByDynamic(joined));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();

    const channel = supabase
      .channel('dashboard_queue_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        () => {
          void fetchData();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'triage' },
        () => {
          void fetchData();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Re-sort by dynamic priority every 60s so wait time keeps shifting rank
  // even when no realtime event arrives.
  useEffect(() => {
    const tick = setInterval(() => {
      setData((prev) => sortByDynamic(prev));
    }, 60000);
    return () => clearInterval(tick);
  }, []);

  return { data, loading, error, refetch: fetchData };
}
