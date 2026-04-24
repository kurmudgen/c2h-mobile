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
import { MatchWithCandidate } from '../../lib/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { EmployerStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<EmployerStackParamList, 'CandidateDetail'>;
  route: RouteProp<EmployerStackParamList, 'CandidateDetail'>;
};

const clearanceLabel: Record<string, string> = {
  none: 'None',
  secret: 'Secret',
  top_secret: 'Top Secret',
  ts_sci: 'TS/SCI',
  ts_sci_poly: 'TS/SCI + Poly',
  ts_sci_full_scope: 'TS/SCI Full Scope',
};

const availabilityLabel: Record<string, string> = {
  immediate: 'Available Immediately',
  two_weeks: '2 Weeks Notice',
  thirty_days: '30 Days Notice',
  thirty_plus: '30+ Days',
};

export default function CandidateDetailScreen({ navigation, route }: Props) {
  const { matchId, jobTitle } = route.params;
  const [match, setMatch] = useState<MatchWithCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('matches')
        .select(`
          *,
          candidate:candidates(*)
        `)
        .eq('match_id', matchId)
        .single()
        .then(({ data }) => {
          setMatch(data as MatchWithCandidate);
          setLoading(false);
        });
    }, [matchId])
  );

  const handleAction = async (action: 'interested' | 'pass' | 'request_interview') => {
    if (!match) return;
    setActioning(true);

    const actionMap: Record<string, string> = {
      interested: 'employer_interested',
      pass: 'employer_passed',
      request_interview: 'interview_requested',
    };

    try {
      const { error } = await supabase.functions.invoke('pipeline-action', {
        body: {
          match_id: match.match_id,
          action,
          actor: 'employer',
        },
      });
      if (error) throw error;

      const messages: Record<string, string> = {
        interested: 'Candidate marked as interested.',
        pass: 'Candidate passed.',
        request_interview: 'Interview request sent to candidate.',
      };

      Alert.alert('Done', messages[action], [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
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

  const c = match.candidate;
  const isActionable = ['employer_reviewing', 'candidate_accepted'].includes(
    match.pipeline_status ?? ''
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(c?.full_name ?? '?')
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.candidateName}>{c?.full_name ?? 'Candidate'}</Text>
          {c?.location && <Text style={styles.location}>{c.location}</Text>}
          {c?.seniority_level && (
            <Text style={styles.seniority}>{c.seniority_level.toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.scorePill}>
          <Text style={styles.scorePillNum}>{match.total_score}</Text>
        </View>
      </View>

      {/* Core stats */}
      <View style={styles.statsRow}>
        {c?.clearance_level && (
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Clearance</Text>
            <Text style={styles.statValue}>
              {clearanceLabel[c.clearance_level] ?? c.clearance_level}
            </Text>
          </View>
        )}
        {c?.availability_status && (
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Availability</Text>
            <Text style={styles.statValue}>
              {availabilityLabel[c.availability_status] ?? c.availability_status}
            </Text>
          </View>
        )}
        {c?.years_total_experience !== undefined && (
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Experience</Text>
            <Text style={styles.statValue}>{c.years_total_experience}y</Text>
          </View>
        )}
      </View>

      {/* Skills */}
      {c?.normalized_skills && c.normalized_skills.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.chipRow}>
            {c.normalized_skills.map((s, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Match reasons */}
      {match.explanation_reasons?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why This Candidate</Text>
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
          <Text style={styles.sectionTitle}>Risk Flags</Text>
          {match.risk_flags.map((r, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: colors.accentWarn }]}>!</Text>
              <Text style={styles.bulletText}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 8140 alignment */}
      {match.matched_work_role && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DoD 8140 Alignment</Text>
          <Text style={styles.workRole}>{match.matched_work_role}</Text>
          <Text style={styles.confidence}>
            {match.alignment_8140_confidence}% confidence
          </Text>
        </View>
      )}

      {/* Pipeline status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pipeline Status</Text>
        <Text style={styles.pipelineStatus}>
          {(match.pipeline_status ?? 'unknown').replace(/_/g, ' ')}
        </Text>
      </View>

      {/* Actions */}
      {isActionable && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPass]}
            onPress={() => handleAction('pass')}
            disabled={actioning}
          >
            <Text style={styles.actionBtnTextSecondary}>Pass</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnInterested]}
            onPress={() => handleAction('interested')}
            disabled={actioning}
          >
            <Text style={styles.actionBtnTextSecondary}>Interested</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnInterview]}
            onPress={() => handleAction('request_interview')}
            disabled={actioning}
          >
            {actioning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>Request Interview</Text>
            )}
          </TouchableOpacity>
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
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryDark + '44',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.primaryLight, fontSize: font.lg, fontWeight: '700' },
  headerMeta: { flex: 1 },
  candidateName: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  location: { color: colors.textSecondary, fontSize: font.sm, marginTop: 2 },
  seniority: {
    color: colors.primaryLight,
    fontSize: font.xs,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  scorePill: {
    backgroundColor: colors.primary + '22',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.full,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scorePillNum: { color: colors.primaryLight, fontSize: font.md, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statLabel: {
    fontSize: font.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  statValue: { color: colors.text, fontSize: font.sm, fontWeight: '600' },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: font.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  chipText: { color: colors.textSecondary, fontSize: font.xs },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  bulletDot: { color: colors.accent, fontSize: font.md, lineHeight: 20 },
  bulletText: { flex: 1, color: colors.text, fontSize: font.sm, lineHeight: 20 },
  workRole: { color: colors.text, fontSize: font.md, fontWeight: '600' },
  confidence: { color: colors.textSecondary, fontSize: font.sm, marginTop: 2 },
  pipelineStatus: {
    color: colors.text,
    fontSize: font.md,
    textTransform: 'capitalize',
  },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  actionBtnPass: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnInterested: {
    backgroundColor: colors.strongAlt + '22',
    borderWidth: 1,
    borderColor: colors.strongAlt,
  },
  actionBtnInterview: { backgroundColor: colors.primary },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: font.md },
  actionBtnTextSecondary: { color: colors.textSecondary, fontWeight: '600', fontSize: font.md },
});
