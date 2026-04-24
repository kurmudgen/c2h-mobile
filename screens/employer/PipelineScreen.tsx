import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, font } from '../../lib/theme';
import { MatchWithCandidate, RecommendationBucket } from '../../lib/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { EmployerStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<EmployerStackParamList, 'Pipeline'>;
  route: RouteProp<EmployerStackParamList, 'Pipeline'>;
};

const bucketOrder: RecommendationBucket[] = [
  'recommended',
  'strong_alternative',
  'hold',
  'not_qualified',
];

const bucketColor: Record<RecommendationBucket, string> = {
  recommended: colors.recommended,
  strong_alternative: colors.strongAlt,
  hold: colors.hold,
  not_qualified: colors.notQualified,
};

const bucketLabel: Record<RecommendationBucket, string> = {
  recommended: 'Recommended',
  strong_alternative: 'Strong Alt',
  hold: 'Hold',
  not_qualified: 'Not Qualified',
};

const clearanceLabel: Record<string, string> = {
  none: 'None',
  secret: 'Secret',
  top_secret: 'TS',
  ts_sci: 'TS/SCI',
  ts_sci_poly: 'TS/SCI+Poly',
  ts_sci_full_scope: 'TS/SCI FS',
};

function daysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86_400_000);
}

export default function PipelineScreen({ navigation, route }: Props) {
  const { jobId, jobTitle } = route.params;
  const [matches, setMatches] = useState<MatchWithCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<RecommendationBucket | 'all'>('all');

  const loadPipeline = useCallback(async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('job_id', jobId)
      .in('pipeline_status', [
        'active',
        'employer_reviewing',
        'employer_interested',
        'interview_requested',
        'interview_scheduled',
        'offer_extended',
        'candidate_accepted',
      ])
      .order('total_score', { ascending: false });

    const rawMatches = (data ?? []) as MatchWithCandidate[];

    // Fetch candidate profiles via edge function (service role bypasses RLS)
    const withCandidates = await Promise.all(
      rawMatches.map(async (m) => {
        try {
          const { data: cd } = await supabase.functions.invoke('pipeline-action', {
            body: { action: 'get-candidate', match_id: m.match_id },
          });
          return { ...m, candidate: cd?.candidate ?? null };
        } catch {
          return { ...m, candidate: null };
        }
      })
    );

    setMatches(withCandidates);
    setLoading(false);
    setRefreshing(false);
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadPipeline();
    }, [loadPipeline])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPipeline();
  };

  const filtered =
    filter === 'all'
      ? matches
      : matches.filter((m) => m.recommendation_bucket === filter);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All ({matches.length})
          </Text>
        </TouchableOpacity>
        {bucketOrder.map((b) => {
          const cnt = matches.filter((m) => m.recommendation_bucket === b).length;
          if (cnt === 0) return null;
          return (
            <TouchableOpacity
              key={b}
              style={[styles.filterTab, filter === b && styles.filterTabActive]}
              onPress={() => setFilter(b)}
            >
              <Text style={[styles.filterTabText, filter === b && styles.filterTabTextActive]}>
                {bucketLabel[b]} ({cnt})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(m) => m.match_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No candidates in pipeline</Text>
            <Text style={styles.emptyBody}>
              Candidates appear here after accepting their match
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const days = daysRemaining(item.employer_action_deadline);
          const bucket = item.recommendation_bucket;
          const bColor = bucket ? bucketColor[bucket] : colors.textMuted;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate('CandidateDetail', {
                  matchId: item.match_id,
                  jobTitle,
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreNum}>{item.total_score}</Text>
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.candidateName} numberOfLines={1}>
                    {item.candidate?.full_name ?? 'Candidate'}
                  </Text>
                  <Text style={styles.candidateInfo} numberOfLines={1}>
                    {item.candidate?.location ?? ''}{' '}
                    {item.candidate?.years_total_experience
                      ? `• ${item.candidate.years_total_experience}y exp`
                      : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                {item.candidate?.clearance_level && (
                  <View style={styles.clearanceBadge}>
                    <Text style={styles.clearanceBadgeText}>
                      {clearanceLabel[item.candidate.clearance_level] ??
                        item.candidate.clearance_level}
                    </Text>
                  </View>
                )}

                {bucket && (
                  <View
                    style={[
                      styles.bucketBadge,
                      { backgroundColor: bColor + '22', borderColor: bColor },
                    ]}
                  >
                    <Text style={[styles.bucketBadgeText, { color: bColor }]}>
                      {bucketLabel[bucket]}
                    </Text>
                  </View>
                )}

                {days !== null && days <= 3 && (
                  <View
                    style={[
                      styles.bucketBadge,
                      {
                        backgroundColor: colors.accentWarn + '22',
                        borderColor: colors.accentWarn,
                      },
                    ]}
                  >
                    <Text style={[styles.bucketBadgeText, { color: colors.accentWarn }]}>
                      {days === 0 ? 'Deadline passed' : `${days}d deadline`}
                    </Text>
                  </View>
                )}

                <Text style={styles.statusText}>
                  {(item.pipeline_status ?? '').replace(/_/g, ' ')}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDark + '33',
  },
  filterTabText: { color: colors.textSecondary, fontSize: font.xs, fontWeight: '600' },
  filterTabTextActive: { color: colors.primaryLight },
  content: { padding: spacing.lg, gap: spacing.sm },
  emptyContainer: { paddingTop: spacing.xxl, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontSize: font.lg, fontWeight: '600', marginBottom: spacing.xs },
  emptyBody: { color: colors.textSecondary, fontSize: font.md, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '22',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNum: { color: colors.primaryLight, fontSize: font.md, fontWeight: '700' },
  cardMeta: { flex: 1 },
  candidateName: { color: colors.text, fontSize: font.md, fontWeight: '600' },
  candidateInfo: { color: colors.textSecondary, fontSize: font.sm, marginTop: 2 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  clearanceBadge: {
    backgroundColor: colors.primaryDark + '33',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  clearanceBadgeText: { color: colors.primaryLight, fontSize: font.xs, fontWeight: '600' },
  bucketBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  bucketBadgeText: { fontSize: font.xs, fontWeight: '600' },
  statusText: {
    color: colors.textMuted,
    fontSize: font.xs,
    textTransform: 'capitalize',
    marginLeft: 'auto',
  },
});
