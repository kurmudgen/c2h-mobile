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
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, font } from '../../lib/theme';
import { Job } from '../../lib/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { EmployerStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<EmployerStackParamList, 'JobList'>;
};

const clearanceLabel: Record<string, string> = {
  none: 'None',
  secret: 'Secret',
  top_secret: 'TS',
  ts_sci: 'TS/SCI',
  ts_sci_poly: 'TS/SCI+Poly',
  ts_sci_full_scope: 'TS/SCI FS',
};

export default function JobListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadJobs = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('employer_id', user.id)
      .order('created_at', { ascending: false });

    const jobList = (data as Job[]) ?? [];
    setJobs(jobList);

    // Get match counts per job
    if (jobList.length > 0) {
      const { data: counts } = await supabase
        .from('matches')
        .select('job_id')
        .in(
          'job_id',
          jobList.map((j) => j.job_id)
        )
        .neq('outcome', 'rejected');

      const countMap: Record<string, number> = {};
      (counts ?? []).forEach((row: { job_id: string }) => {
        countMap[row.job_id] = (countMap[row.job_id] ?? 0) + 1;
      });
      setMatchCounts(countMap);
    }

    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadJobs();
    }, [loadJobs])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (jobs.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No active jobs</Text>
        <Text style={styles.emptyBody}>Jobs are created via the web portal</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={jobs}
      keyExtractor={(j) => j.job_id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      contentContainerStyle={styles.content}
      renderItem={({ item }) => {
        const count = matchCounts[item.job_id] ?? 0;
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate('Pipeline', { jobId: item.job_id, jobTitle: item.title })
            }
            activeOpacity={0.7}
          >
            <View style={styles.cardTop}>
              <Text style={styles.jobTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={[styles.activeDot, !item.is_active && styles.inactiveDot]} />
            </View>

            <View style={styles.cardMeta}>
              {item.location && (
                <Text style={styles.metaText}>{item.location}</Text>
              )}
              {item.required_clearance && (
                <View style={styles.clearanceBadge}>
                  <Text style={styles.clearanceBadgeText}>
                    {clearanceLabel[item.required_clearance] ?? item.required_clearance}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.matchCount}>
                {count} match{count !== 1 ? 'es' : ''}
              </Text>
              <Text style={styles.viewPipeline}>View Pipeline →</Text>
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
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  jobTitle: { flex: 1, color: colors.text, fontSize: font.lg, fontWeight: '700' },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginLeft: spacing.sm,
  },
  inactiveDot: { backgroundColor: colors.textMuted },
  cardMeta: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  metaText: { color: colors.textSecondary, fontSize: font.sm },
  clearanceBadge: {
    backgroundColor: colors.primaryDark + '33',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  clearanceBadgeText: { color: colors.primaryLight, fontSize: font.xs, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchCount: { color: colors.textSecondary, fontSize: font.sm },
  viewPipeline: { color: colors.primaryLight, fontSize: font.sm, fontWeight: '600' },
});
