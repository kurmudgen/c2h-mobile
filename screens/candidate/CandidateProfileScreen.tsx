import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, font } from '../../lib/theme';
import { Candidate, ClearanceLevel, AvailabilityStatus } from '../../lib/types';

const clearanceOptions: { value: ClearanceLevel; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'secret', label: 'Secret' },
  { value: 'top_secret', label: 'Top Secret' },
  { value: 'ts_sci', label: 'TS/SCI' },
  { value: 'ts_sci_poly', label: 'TS/SCI + Poly' },
  { value: 'ts_sci_full_scope', label: 'TS/SCI Full Scope' },
];

const availabilityOptions: { value: AvailabilityStatus; label: string }[] = [
  { value: 'immediate', label: 'Immediately' },
  { value: 'two_weeks', label: '2 Weeks' },
  { value: 'thirty_days', label: '30 Days' },
  { value: 'thirty_plus', label: '30+ Days' },
];

export default function CandidateProfileScreen() {
  const { user, signOut } = useAuth();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit state
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [clearance, setClearance] = useState<ClearanceLevel>('none');
  const [availability, setAvailability] = useState<AvailabilityStatus>('immediate');
  const [skills, setSkills] = useState('');
  const [targetRoles, setTargetRoles] = useState('');
  const [yearsExp, setYearsExp] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      supabase
        .from('candidates')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            const c = data as Candidate;
            setCandidate(c);
            setFullName(c.full_name ?? '');
            setLocation(c.location ?? '');
            setClearance(c.clearance_level);
            setAvailability(c.availability_status ?? 'immediate');
            setSkills((c.normalized_skills ?? []).join(', '));
            setTargetRoles((c.target_roles ?? []).join(', '));
            setYearsExp(String(c.years_total_experience ?? 0));
          }
          setLoading(false);
        });
    }, [user])
  );

  const handleSave = async () => {
    if (!user || !candidate) return;
    setSaving(true);
    const { error } = await supabase
      .from('candidates')
      .update({
        full_name: fullName.trim() || null,
        location: location.trim() || null,
        clearance_level: clearance,
        availability_status: availability,
        normalized_skills: skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        target_roles: targetRoles
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        years_total_experience: parseInt(yearsExp) || 0,
        profile_completion_status:
          fullName.trim() && clearance !== 'none' ? 'complete' : 'incomplete',
      })
      .eq('user_id', user.id);

    setSaving(false);
    if (error) {
      Alert.alert('Save failed', error.message);
    } else {
      setEditing(false);
      // Refresh
      const { data } = await supabase
        .from('candidates')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) setCandidate(data as Candidate);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!candidate) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Profile not found</Text>
        <Text style={styles.emptyBody}>Contact support</Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.name}>{candidate.full_name ?? 'No Name Set'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => (editing ? handleSave() : setEditing(true))}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.editBtnText}>{editing ? 'Save' : 'Edit'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Status */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            candidate.profile_completion_status === 'complete'
              ? styles.statusComplete
              : styles.statusIncomplete,
          ]}
        >
          <Text style={styles.statusText}>
            {candidate.profile_completion_status === 'complete'
              ? 'Profile Complete'
              : 'Profile Incomplete'}
          </Text>
        </View>
      </View>

      {/* Name */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Full Name</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
          />
        ) : (
          <Text style={styles.fieldValue}>{candidate.full_name ?? '—'}</Text>
        )}
      </View>

      {/* Location */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Location</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="City, State"
            placeholderTextColor={colors.textMuted}
          />
        ) : (
          <Text style={styles.fieldValue}>{candidate.location ?? '—'}</Text>
        )}
      </View>

      {/* Years of experience */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Years of Experience</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={yearsExp}
            onChangeText={setYearsExp}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
          />
        ) : (
          <Text style={styles.fieldValue}>{candidate.years_total_experience ?? 0}</Text>
        )}
      </View>

      {/* Clearance */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Clearance Level</Text>
        {editing ? (
          <View style={styles.optionGrid}>
            {clearanceOptions.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[styles.optionBtn, clearance === o.value && styles.optionBtnActive]}
                onPress={() => setClearance(o.value)}
              >
                <Text
                  style={[
                    styles.optionBtnText,
                    clearance === o.value && styles.optionBtnTextActive,
                  ]}
                >
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.fieldValue}>
            {clearanceOptions.find((o) => o.value === candidate.clearance_level)?.label ?? '—'}
          </Text>
        )}
      </View>

      {/* Availability */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Availability</Text>
        {editing ? (
          <View style={styles.optionRow}>
            {availabilityOptions.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[styles.optionBtn, availability === o.value && styles.optionBtnActive]}
                onPress={() => setAvailability(o.value)}
              >
                <Text
                  style={[
                    styles.optionBtnText,
                    availability === o.value && styles.optionBtnTextActive,
                  ]}
                >
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.fieldValue}>
            {availabilityOptions.find((o) => o.value === candidate.availability_status)?.label ??
              '—'}
          </Text>
        )}
      </View>

      {/* Skills */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Skills (comma-separated)</Text>
        {editing ? (
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={skills}
            onChangeText={setSkills}
            placeholder="Python, AWS, SIGINT..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
        ) : (
          <View style={styles.chipRow}>
            {(candidate.normalized_skills ?? []).length > 0 ? (
              candidate.normalized_skills.map((s, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{s}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.fieldValue}>—</Text>
            )}
          </View>
        )}
      </View>

      {/* Target roles */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Target Roles (comma-separated)</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={targetRoles}
            onChangeText={setTargetRoles}
            placeholder="Intelligence Analyst, SIGINT..."
            placeholderTextColor={colors.textMuted}
          />
        ) : (
          <View style={styles.chipRow}>
            {(candidate.target_roles ?? []).length > 0 ? (
              candidate.target_roles.map((r, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{r}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.fieldValue}>—</Text>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { color: colors.text, fontSize: font.lg, fontWeight: '600' },
  emptyBody: { color: colors.textSecondary, fontSize: font.md, marginBottom: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  name: { color: colors.text, fontSize: font.xl, fontWeight: '700' },
  email: { color: colors.textSecondary, fontSize: font.sm, marginTop: 2 },
  editBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  editBtnText: { color: colors.primaryLight, fontWeight: '600', fontSize: font.sm },
  statusRow: { marginBottom: spacing.xl },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusComplete: {
    backgroundColor: colors.accent + '22',
    borderColor: colors.accent,
  },
  statusIncomplete: {
    backgroundColor: colors.accentWarn + '22',
    borderColor: colors.accentWarn,
  },
  statusText: { fontSize: font.xs, fontWeight: '600', color: colors.text },
  field: { marginBottom: spacing.lg },
  fieldLabel: {
    fontSize: font.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  fieldValue: { color: colors.text, fontSize: font.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: font.md,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  optionBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  optionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDark + '33',
  },
  optionBtnText: { color: colors.textSecondary, fontSize: font.sm },
  optionBtnTextActive: { color: colors.primaryLight, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  chipText: { color: colors.textSecondary, fontSize: font.xs },
  signOutBtn: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  signOutText: { color: colors.accentDanger, fontWeight: '600', fontSize: font.md },
});
