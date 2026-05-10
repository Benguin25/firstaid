import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { dynamicPriority, useQueue } from '../../src/hooks/useQueue';
import {
  CTAS_COLORS,
  DASHBOARD_COLORS as C,
  STATUS_COLORS,
  type CtasLevel,
  type PatientWithTriage,
  type TriageStatus,
} from '../../src/types/supabase';
import React from 'react';

type FilterTab = 'all' | 'waiting' | 'in-progress';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'in-progress', label: 'In Progress' },
];

const RANK_ACCENT: Record<number, string> = {
  0: '#DC2626',
  1: '#EA580C',
};

function formatClock(d: Date): string {
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function minutesSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 60000));
}

function formatWait(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
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

// ── Search helper ─────────────────────────────────────────────────────────────
// Normalises a string for comparison: lowercase, strip extra whitespace.
function normalise(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Returns true if the patient matches the search query.
// Matches against: full name, first name, last name, health card id, email.
function matchesSearch(item: PatientWithTriage, query: string): boolean {
  if (!query) return true;
  const q = normalise(query);
  const { patient } = item;
  const fullName = normalise(`${patient.first_name} ${patient.last_name}`);
  const firstName = normalise(patient.first_name ?? '');
  const lastName = normalise(patient.last_name ?? '');
  const email = normalise(patient.email ?? '');

  // Health card: stored as patient.id (UUID/string) or a dedicated field if
  // your schema has one. Check both patient.id and a hypothetical
  // health_card_number field so this works however your DB is structured.
  const anyP = patient as unknown as Record<string, unknown>;
  const healthCard = normalise(
    String(anyP['health_card_number'] ?? anyP['health_card_id'] ?? patient.id ?? ''),
  );

  return (
    fullName.includes(q) ||
    firstName.includes(q) ||
    lastName.includes(q) ||
    email.includes(q) ||
    healthCard.includes(q)
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SearchBar({
  value,
  onChange,
  resultCount,
  totalCount,
}: {
  value: string;
  onChange: (v: string) => void;
  resultCount: number;
  totalCount: number;
}) {
  const showCount = value.trim().length > 0;
  return (
    <View style={searchStyles.wrap}>
      {/* Search icon */}
      <Text style={searchStyles.icon}>⌕</Text>

      <TextInput
        style={searchStyles.input}
        placeholder="Search by name or health card number…"
        placeholderTextColor={C.textSecondary}
        value={value}
        onChangeText={onChange}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"   // iOS only — shows ✕ while typing
        returnKeyType="search"
      />

      {/* Result count badge — appears while typing */}
      {showCount && (
        <View style={searchStyles.countBadge}>
          <Text style={searchStyles.countText}>
            {resultCount} / {totalCount}
          </Text>
        </View>
      )}

      {/* Clear button for Android (clearButtonMode doesn't work there) */}
      {value.length > 0 && (
        <Pressable
          onPress={() => onChange('')}
          hitSlop={8}
          style={searchStyles.clearBtn}
        >
          <Text style={searchStyles.clearText}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

function QueueRow({
  item,
  rank,
  onPress,
  searchQuery,
}: {
  item: PatientWithTriage;
  rank: number;
  onPress: () => void;
  searchQuery: string;
}) {
  const { patient, triage } = item;
  const ctasColor = CTAS_COLORS[triage.ctas_level];
  const statusMeta = STATUS_COLORS[triage.status];
  const fullName = `${patient.first_name} ${patient.last_name}`.trim();
  const complaint = chiefComplaintFor(patient);
  const dynScore = dynamicPriority(
    triage.priority_score,
    triage.ctas_level as CtasLevel,
    patient.created_at,
  );
  const waitMins = minutesSince(patient.created_at);
  const waitOver60 = waitMins > 60;
  const waitOver90 = waitMins > 90;
  const accent = RANK_ACCENT[rank];

  // Highlight matched text in name when searching
  function HighlightedName() {
    if (!searchQuery.trim()) {
      return <Text style={styles.patientName}>{fullName || 'Unknown patient'}</Text>;
    }
    const q = normalise(searchQuery);
    const lower = normalise(fullName);
    const idx = lower.indexOf(q);
    if (idx === -1) {
      return <Text style={styles.patientName}>{fullName || 'Unknown patient'}</Text>;
    }
    return (
      <Text style={styles.patientName} numberOfLines={1}>
        {fullName.slice(0, idx)}
        <Text style={styles.highlight}>{fullName.slice(idx, idx + q.length)}</Text>
        {fullName.slice(idx + q.length)}
      </Text>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        accent ? { borderLeftWidth: 3, borderLeftColor: accent } : null,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.colRank}>
        <Text style={styles.rankText}>#{rank + 1}</Text>
      </View>

      <View style={styles.colPatient}>
        <HighlightedName />
      </View>

      <View style={styles.colComplaint}>
        <Text style={styles.complaint} numberOfLines={2}>
          {complaint}
        </Text>
      </View>

      <View style={styles.colCtas}>
        <View style={[styles.ctasBadge, { backgroundColor: ctasColor }]}>
          <Text style={styles.ctasBadgeText}>{triage.ctas_level}</Text>
        </View>
      </View>

      <View style={styles.colPriority}>
        <Text style={styles.priorityDyn}>{dynScore}</Text>
        <Text style={styles.priorityBase}>base: {triage.priority_score}</Text>
      </View>

      <View style={styles.colWaiting}>
        <Text
          style={[
            styles.waitText,
            waitOver90 && { color: '#DC2626', fontWeight: '700' },
          ]}
        >
          {waitOver60 ? '🕐 ' : ''}
          {formatWait(waitMins)}
        </Text>
      </View>

      <View style={styles.colStatus}>
        <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
          <Text style={[styles.statusText, { color: statusMeta.fg }]}>
            {statusMeta.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function HeaderRow() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.colRank]}>Rank</Text>
      <Text style={[styles.headerCell, styles.colPatient]}>Patient</Text>
      <Text style={[styles.headerCell, styles.colComplaint]}>
        Chief Complaint
      </Text>
      <Text style={[styles.headerCell, styles.colCtas]}>CTAS</Text>
      <Text style={[styles.headerCell, styles.colPriority]}>Priority</Text>
      <Text style={[styles.headerCell, styles.colWaiting]}>Waiting</Text>
      <Text style={[styles.headerCell, styles.colStatus]}>Status</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const { data, loading, error, refetch } = useQueue();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Step 1 — apply status filter
  const afterFilter = useMemo(() => {
    if (filter === 'all') return data;
    const target: TriageStatus = filter;
    return data.filter((d) => d.triage.status === target);
  }, [data, filter]);

  // Step 2 — apply search on top of the status filter
  const filtered = useMemo(() => {
    return afterFilter.filter((item) => matchesSearch(item, searchQuery));
  }, [afterFilter, searchQuery]);

  const counts = useMemo(() => {
    let waiting = 0;
    let inProgress = 0;
    for (const item of data) {
      if (item.triage.status === 'waiting') waiting++;
      else if (item.triage.status === 'in-progress') inProgress++;
    }
    return { waiting, inProgress };
  }, [data]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Cura Dashboard</Text>
          <Text style={styles.clock}>{formatClock(now)}</Text>
        </View>

        {/* ── Summary bar ── */}
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            <Text style={styles.summaryNum}>{counts.waiting}</Text> patients waiting
          </Text>
          <Text style={styles.summarySep}>·</Text>
          <Text style={styles.summaryText}>
            <Text style={styles.summaryNum}>{counts.inProgress}</Text> in progress
          </Text>
          <Text style={styles.summarySep}>·</Text>
          <View style={styles.liveDot} />
          <Text style={styles.summaryLive}>Updated live</Text>
        </View>

        {/* ── Search bar ── */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          resultCount={filtered.length}
          totalCount={afterFilter.length}
        />

        {/* ── Filter tabs ── */}
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

        {/* ── Table ── */}
        {loading && data.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>Couldn't load queue</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable
              onPress={() => { void refetch(); }}
              style={styles.refreshBtn}
            >
              <Text style={styles.refreshText}>Retry</Text>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            {isSearching ? (
              <>
                <Text style={styles.emptyText}>
                  No patients matching "{searchQuery}"
                </Text>
                <Pressable
                  onPress={() => setSearchQuery('')}
                  style={styles.refreshBtn}
                >
                  <Text style={styles.refreshText}>Clear search</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>No patients in queue</Text>
                <Pressable
                  onPress={() => { void refetch(); }}
                  style={styles.refreshBtn}
                >
                  <Text style={styles.refreshText}>Refresh</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : (
          <View style={styles.tableWrap}>
            <HeaderRow />
            <ScrollView
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            >
              {filtered.map((item, idx) => (
                <View key={item.triage.id}>
                  <QueueRow
                    item={item}
                    rank={idx}
                    searchQuery={searchQuery}
                    onPress={() =>
                      router.push({
                        pathname: '/dashboard/[id]',
                        params: { id: item.patient.id },
                      })
                    }
                  />
                  {idx < filtered.length - 1 ? (
                    <View style={styles.divider} />
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Search bar styles ─────────────────────────────────────────────────────────
const searchStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    marginBottom: 10,
    height: 44,
    gap: 8,
  },
  icon: {
    fontSize: 20,
    color: C.textSecondary,
    // Rotate the ⌕ character so it looks like a proper magnifier
    transform: [{ rotate: '-45deg' }],
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.textPrimary,
    paddingVertical: 0,   // neutralise default Android padding
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  clearBtn: {
    padding: 4,
  },
  clearText: {
    fontSize: 14,
    color: C.textSecondary,
  },
});

// ── Main styles (unchanged from original + highlight) ─────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: C.textPrimary,
  },
  clock: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
  },
  summaryText: { fontSize: 14, color: C.textPrimary },
  summaryNum: { fontWeight: '700', color: C.textPrimary },
  summarySep: { color: C.textSecondary, fontSize: 14 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  summaryLive: {
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
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
    fontSize: 14,
    fontWeight: '600',
    color: C.textSecondary,
  },
  filterTextActive: { color: '#ffffff' },
  tableWrap: { flex: 1 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    backgroundColor: C.background,
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: { paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: C.background,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  rowPressed: { backgroundColor: C.surface, opacity: 0.85 },
  divider: { height: 1, backgroundColor: C.border },
  colRank: { width: 60 },
  colPatient: { flex: 2, paddingRight: 8 },
  colComplaint: { flex: 3, paddingRight: 8 },
  colCtas: { width: 70, alignItems: 'flex-start' },
  colPriority: { width: 100 },
  colWaiting: { width: 100 },
  colStatus: { width: 120, alignItems: 'flex-start' },
  rankText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#94a3b8',
    fontVariant: ['tabular-nums'],
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
  },
  // Yellow highlight on matched text in name
  highlight: {
    backgroundColor: '#FEF08A',
    color: '#713F12',
    fontWeight: '700',
  },
  complaint: {
    fontSize: 14,
    color: C.textSecondary,
    textTransform: 'capitalize',
  },
  ctasBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  ctasBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  priorityDyn: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  priorityBase: {
    fontSize: 14,
    color: C.textSecondary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  waitText: {
    fontSize: 14,
    color: C.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontSize: 14, fontWeight: '700' },
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
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
  },
});