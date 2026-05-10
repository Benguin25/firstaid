import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FALLBACK_BASE_WAIT, type BaseWaits } from '../lib/estimateWait';
import type { CtasLevel, TriageStatus } from '../types/supabase';

interface HistoricalRow {
  ctas_level: CtasLevel;
  created_at: string;
  updated_at: string;
  status: TriageStatus;
}

function computeAverages(rows: HistoricalRow[]): BaseWaits {
  const sums: Record<number, { total: number; count: number }> = {};
  for (const row of rows) {
    const start = new Date(row.created_at).getTime();
    const end = new Date(row.updated_at).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const minutes = (end - start) / 60000;
    const lvl = row.ctas_level;
    if (!sums[lvl]) sums[lvl] = { total: 0, count: 0 };
    sums[lvl].total += minutes;
    sums[lvl].count += 1;
  }

  const next: BaseWaits = { ...FALLBACK_BASE_WAIT };
  for (const lvl of [1, 2, 3, 4, 5]) {
    const s = sums[lvl];
    if (s && s.count > 0) {
      next[lvl] = Math.max(0, Math.round(s.total / s.count));
    }
  }
  return next;
}

export function useBaseWaits(): BaseWaits {
  const [baseWaits, setBaseWaits] = useState<BaseWaits>(FALLBACK_BASE_WAIT);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from('triage')
        .select('ctas_level, created_at, updated_at, status')
        .neq('status', 'waiting');
      if (cancelled || error || !data) return;
      setBaseWaits(computeAverages(data as HistoricalRow[]));
    }

    void load();

    const channel = supabase
      .channel('base_waits_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'triage' },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  return baseWaits;
}
