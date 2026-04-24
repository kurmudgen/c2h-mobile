import React, { useCallback, useEffect, useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, font } from '../../lib/theme';
import { MatchWithJob, RecommendationBucket } from '../../lib/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CandidateStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<CandidateStackParamList, 'MatchList'>;
};

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

function hoursRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 3_600_000);
}

export default function MatchListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [candidateId, setCandidateId] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    if (!user) return;

    // Get candidate record
    const { data: cand } = await supabase
      .from('candidates')
      .select('candidate_id')
      .eq('user_id', user.id)
      .single();

    if (!cand) {
      setLoading(false);
      return;
    }
    setCandidateId(cand.candidate_id);

    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        job:jobs(job_id, title, location, work_model, required_clearance, employer_id)
      `)
      .eq('candidate_id', cand.candidate_id)
      .neq('outcome', 'rejected')
      .order('total_score', { ascending: false });

    setMatches((data as MatchWithJob[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadMatches();
    }, [loadMatches])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMatches();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No matches yet</Text>
        <Text style={styles.emptyBody}>Complete your profile to get matched</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={matches}
      keyExtractor={(m) => m.match_id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => {
        const hrs = hoursRemaining(item.expires_at);
        const bucket = item.recommendation_bucket;
        const bColor = bucket ? bucketColor[bucket] : colors.textMuted;
        const bLabel = bucket ? bucketLabel[bucket] : '';
        const needsAction = item.pipeline_status === 'pending_candidate_action';

        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('MatchDetail', { matchId: item.match_id })}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreNum}>{item.total_score}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.jobTitle} numberOfLines={1}>
                  {item.job?.title ?? 'Unknown Job'}
                </Text>
                <Text style={styles.jobLocation} numberOfLines={1}>
                  {item.job?.location ?? 'Location TBD'}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              {bucket && (
                <View style={[styles.badge, { backgroundColor: bColor + '22', borderColor: bColor }]}>
                  <Text style={[styles.badgeText, { color: bColor }]}>{bLabel}</Text>
                </View>
              )}

              {needsAction && hrs !== null && (
                <View style={[styles.badge, { backgroundColor: colors.accentWarn + '22', borderColor: colors.accentWarn }]}>
                  <Text style={[styles.badgeText, { color: colors.accentWarn }]}>
                    {hrs > 0 ? `${hrs}h to respond` : 'Expired'}
                  </Text>
                </View>
              )}

              {needsAction && (
                <View style={styles.actionDot} />
              )}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { color: colors.text, fontSize: font.lg, fontWeight: '600', marginBottom: spacing.xs },
  emptyBody: { color: colors.textSecondary, fontSize: font.md },
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary + '22',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNum: { color: colors.primaryLight, fontSize: font.lg, fontWeight: '700' },
  cardMeta: { flex: 1 },
  jobTitle: { color: colors.text, fontSize: font.md, fontWeight: '600' },
  jobLocation: { color: colors.textSecondary, fontSize: font.sm, marginTop: 2 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  badge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeText: { fontSize: font.xs, fontWeight: '600' },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentWarn,
    marginLeft: 'auto',
  },
});
