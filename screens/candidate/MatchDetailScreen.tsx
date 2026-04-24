import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, font } from '../../lib/theme';
import { MatchWithJob } from '../../lib/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { CandidateStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<CandidateStackParamList, 'MatchDetail'>;
  route: RouteProp<CandidateStackParamList, 'MatchDetail'>;
};

const scoreLabels: Record<string, string> = {
  score_role_fit: 'Role Fit',
  score_clearance: 'Clearance',
  score_skills: 'Skills',
  score_domain: 'Domain',
  score_recency: 'Recency',
  score_availability: 'Availability',
  score_certifications: 'Certifications',
};

const scoreWeights: Record<string, number> = {
  score_role_fit: 30,
  score_clearance: 25,
  score_skills: 20,
  score_domain: 10,
  score_recency: 5,
  score_availability: 5,
  score_certifications: 5,
};

function hoursRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 3_600_000);
}

export default function MatchDetailScreen({ navigation, route }: Props) {
  const { matchId } = route.params;
  const [match, setMatch] = useState<MatchWithJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('matches')
        .select(`*, job:jobs(*)`)
        .eq('match_id', matchId)
        .single()
        .then(({ data }) => {
          setMatch(data as MatchWithJob);
          setLoading(false);
        });
    }, [matchId])
  );

  const handleAction = async (action: 'accept' | 'decline') => {
    if (!match) return;
    setActioning(true);
    try {
      if (action === 'accept') {
        const { error } = await supabase.functions.invoke('pipeline-action', {
          body: { match_id: match.match_id, action: 'activate' },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('matches')
          .update({ outcome: 'rejected', pipeline_status: 'candidate_declined' } as any)
          .eq('match_id', match.match_id);
        if (error) throw error;
      }
      Alert.alert(
        action === 'accept' ? 'Match accepted!' : 'Match declined',
        action === 'accept'
          ? 'Your profile has been forwarded to the employer.'
          : "We've noted your preference.",
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong');
    } finally {
      setActioning(false);
    }
  };

  if (loading || !match) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const hrs = hoursRemaining(match.expires_at);
  const needsAction = match.pipeline_status === 'pending_candidate_action';
  const clearanceLabels: Record<string, string> = {
    none: 'None',
    secret: 'Secret',
    top_secret: 'Top Secret',
    ts_sci: 'TS/SCI',
    ts_sci_poly: 'TS/SCI + Poly',
    ts_sci_full_scope: 'TS/SCI Full Scope',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.scoreCircleLg}>
          <Text style={styles.scoreNumLg}>{match.total_score}</Text>
          <Text style={styles.scoreLabel}>/ 100</Text>
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.jobTitle}>{match.job?.title ?? 'Job'}</Text>
          <Text style={styles.jobLocation}>{match.job?.location ?? 'Location TBD'}</Text>
          {match.job?.work_model && (
            <Text style={styles.workModel}>{match.job.work_model.toUpperCase()}</Text>
          )}
        </View>
      </View>

      {/* Clearance req */}
      {match.job?.required_clearance && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Clearance</Text>
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              {clearanceLabels[match.job.required_clearance] ?? match.job.required_clearance}
            </Text>
          </View>
        </View>
      )}

      {/* Countdown banner */}
      {needsAction && (
        <View style={[styles.banner, hrs === 0 && styles.bannerExpired]}>
          <Text style={styles.bannerText}>
            {hrs === 0
              ? 'This match has expired'
              : `${hrs} hour${hrs === 1 ? '' : 's'} remaining to respond`}
          </Text>
        </View>
      )}

      {/* Score breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Score Breakdown</Text>
        {Object.entries(scoreLabels).map(([key, label]) => {
          const raw = (match as any)[key] as number;
          const maxPts = scoreWeights[key];
          const pct = maxPts > 0 ? Math.round((raw / maxPts) * 100) : 0;
          return (
            <View key={key} style={styles.scoreRow}>
              <Text style={styles.scoreRowLabel}>{label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%` as any }]} />
              </View>
              <Text style={styles.scoreRowVal}>{raw}/{maxPts}</Text>
            </View>
          );
        })}
      </View>

      {/* Why this match */}
      {match.explanation_reasons?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why You Match</Text>
          {match.explanation_reasons.map((r, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Risk flags */}
      {match.risk_flags?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Things to Know</Text>
          {match.risk_flags.map((r, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: colors.accentWarn }]}>!</Text>
              <Text style={styles.bulletText}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Cert gaps */}
      {match.cert_gaps?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certification Gaps</Text>
          <View style={styles.chipRow}>
            {match.cert_gaps.map((c, i) => (
              <View key={i} style={[styles.chip, { borderColor: colors.accentWarn }]}>
                <Text style={[styles.chipText, { color: colors.accentWarn }]}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Action buttons */}
      {needsAction && hrs !== 0 && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDecline]}
            onPress={() => handleAction('decline')}
            disabled={actioning}
          >
            <Text style={styles.actionBtnTextSecondary}>Not Interested</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnAccept]}
            onPress={() => handleAction('accept')}
            disabled={actioning}
          >
            {actioning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>Accept Match</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Status when not actionable */}
      {!needsAction && (
        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>
            Status: {(match.pipeline_status ?? 'unknown').replace(/_/g, ' ')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  scoreCircleLg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '22',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumLg: { color: colors.primaryLight, fontSize: font.xxl, fontWeight: '700', lineHeight: 28 },
  scoreLabel: { color: colors.textMuted, fontSize: font.xs },
  headerMeta: { flex: 1, justifyContent: 'center' },
  jobTitle: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  jobLocation: { color: colors.textSecondary, fontSize: font.sm, marginTop: 2 },
  workModel: {
    color: colors.primaryLight,
    fontSize: font.xs,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: font.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  banner: {
    backgroundColor: colors.accentWarn + '22',
    borderWidth: 1,
    borderColor: colors.accentWarn,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  bannerExpired: {
    backgroundColor: colors.notQualified + '22',
    borderColor: colors.notQualified,
  },
  bannerText: { color: colors.accentWarn, fontWeight: '600', fontSize: font.sm },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  scoreRowLabel: { color: colors.textSecondary, fontSize: font.sm, width: 90 },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  scoreRowVal: { color: colors.textMuted, fontSize: font.xs, width: 36, textAlign: 'right' },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  bulletDot: { color: colors.accent, fontSize: font.md, lineHeight: 20 },
  bulletText: { flex: 1, color: colors.text, fontSize: font.sm, lineHeight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  chipText: { color: colors.textSecondary, fontSize: font.xs },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  actionBtnAccept: { backgroundColor: colors.primary },
  actionBtnDecline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: font.md },
  actionBtnTextSecondary: { color: colors.textSecondary, fontWeight: '600', fontSize: font.md },
  statusBanner: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: { color: colors.textSecondary, fontSize: font.sm, textTransform: 'capitalize' },
});
