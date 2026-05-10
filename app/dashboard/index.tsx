import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueue } from '../../src/hooks/useQueue';
import {
  CTAS_COLORS,
  DASHBOARD_COLORS as C,
  STATUS_COLORS,
  type PatientWithTriage,
  type TriageStatus,
} from '../../src/types/supabase';

type FilterTab = 'all' | 'waiting' | 'in-progress';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'in-progress', label: 'In Progress' },
];

function formatClock(d: Date): string {
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function timeSince(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr ago`;
}

function chiefComplaintFor(p: PatientWithTriage['patient']): string {
  if (p.symptoms_text && p.symptoms_text.trim().length > 0) {
    try {
      const parsed = JSON.parse(p.symptoms_text);
      if (parsed && typeof parsed === 'object' && parsed.category) {
        return String(parsed.category).replace(/_/g, ' ').toLowerCase();
      }
    } catch {
      return p.symptoms_text.slice(0, 80);
    }
    return p.symptoms_text.slice(0, 80);
  }
  if (p.body_map && typeof p.body_map === 'object') {
    const keys = Object.keys(p.body_map);
    if (keys.length > 0) return keys[0];
  }
  return 'No complaint recorded';
}

function PatientCard({
  item,
  onPress,
}: {
  item: PatientWithTriage;
  onPress: () => void;
}) {
  const { patient, triage } = item;
  const ctasColor = CTAS_COLORS[triage.ctas_level];
  const statusMeta = STATUS_COLORS[triage.status];
  const fullName = `${patient.first_name} ${patient.last_name}`.trim();
  const complaint = chiefComplaintFor(patient);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.cardBar, { backgroundColor: ctasColor }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.patientName} numberOfLines={1}>
            {fullName || 'Unknown patient'}
          </Text>
          <View style={[styles.ctasBadge, { backgroundColor: ctasColor }]}>
            <Text style={styles.ctasBadgeText}>CTAS {triage.ctas_level}</Text>
          </View>
        </View>

        <Text style={styles.complaint} numberOfLines={2}>
          {complaint}
        </Text>

        <View style={styles.cardBottomRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaText}>{timeSince(patient.created_at)}</Text>
            <Text style={styles.scoreText}>Score: {triage.priority_score}</Text>
          </View>
          <View
            style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}
          >
            <Text style={[styles.statusText, { color: statusMeta.fg }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { data, loading, error, refetch } = useQueue();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return data;
    const target: TriageStatus = filter;
    return data.filter((d) => d.triage.status === target);
  }, [data, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>FirstAid Dashboard</Text>
        <Text style={styles.clock}>{formatClock(now)}</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTER_TABS.map((t) => {
          const active = filter === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setFilter(t.key)}
              style={({ pressed }) => [
                styles.filterTab,
                active && styles.filterTabActive,
                pressed && !active && styles.filterTabPressed,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  active && styles.filterTextActive,
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading && data.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Couldn't load queue</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable
            onPress={() => {
              void refetch();
            }}
            style={styles.refreshBtn}
          >
            <Text style={styles.refreshText}>Retry</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No patients in queue</Text>
          <Pressable
            onPress={() => {
              void refetch();
            }}
            style={styles.refreshBtn}
          >
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((item) => (
            <PatientCard
              key={item.triage.id}
              item={item}
              onPress={() =>
                router.push({
                  pathname: '/dashboard/[id]',
                  params: { id: item.patient.id },
                })
              }
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: C.textPrimary,
  },
  clock: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterTabActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterTabPressed: { opacity: 0.7 },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
  },
  filterTextActive: { color: '#ffffff' },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.85 },
  cardBar: { width: 6 },
  cardBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  patientName: {
    flex: 1,
    fontSize: 17,
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
    fontSize: 12,
  },
  complaint: {
    fontSize: 14,
    color: C.textSecondary,
    textTransform: 'capitalize',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  metaCol: { flexDirection: 'column', gap: 2 },
  metaText: { fontSize: 12, color: C.textSecondary },
  scoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textPrimary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  emptyText: {
    fontSize: 15,
    color: C.textSecondary,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991b1b',
  },
  errorBody: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: 'center',
  },
  refreshBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
  },
});
