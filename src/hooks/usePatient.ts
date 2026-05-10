import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type {
  PatientRow,
  PatientWithTriage,
  TriageRow,
  TriageStatus,
} from '../types/supabase';

interface UsePatientResult {
  data: PatientWithTriage | null;
  loading: boolean;
  error: string | null;
  updateStatus: (status: TriageStatus) => Promise<void>;
  refetch: () => Promise<void>;
}

export function usePatient(id: string | undefined): UsePatientResult {
  const [data, setData] = useState<PatientWithTriage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const [patientRes, triageRes] = await Promise.all([
        supabase.from('patients').select('*').eq('id', id).single(),
        supabase.from('triage').select('*').eq('patient_id', id).single(),
      ]);

      if (patientRes.error) throw patientRes.error;
      if (triageRes.error) throw triageRes.error;

      setData({
        patient: patientRes.data as PatientRow,
        triage: triageRes.data as TriageRow,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load patient');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void fetchData();

    const channel = supabase
      .channel(`dashboard_patient_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
          filter: `id=eq.${id}`,
        },
        () => {
          void fetchData();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'triage',
          filter: `patient_id=eq.${id}`,
        },
        () => {
          void fetchData();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, fetchData]);

  const updateStatus = useCallback(
    async (status: TriageStatus) => {
      if (!id) return;
      const { error: updErr } = await supabase
        .from('triage')
        .update({ status })
        .eq('patient_id', id);
      if (updErr) throw updErr;
      // Optimistic local update so the header pill updates instantly even
      // before realtime echoes the change back.
      setData((prev) =>
        prev ? { ...prev, triage: { ...prev.triage, status } } : prev,
      );
    },
    [id],
  );

  return { data, loading, error, updateStatus, refetch: fetchData };
}
