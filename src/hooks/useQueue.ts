import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type {
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
        .map((t) => ({ patient: patientMap.get(t.patient_id) as PatientRow, triage: t }))
        .sort((a, b) => b.triage.priority_score - a.triage.priority_score);

      setData(joined);
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

  return { data, loading, error, refetch: fetchData };
}
