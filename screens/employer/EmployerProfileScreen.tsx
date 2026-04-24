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
import { EmployerProfile } from '../../lib/types';

export default function EmployerProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [clearedFacility, setClearedFacility] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      supabase
        .from('employer_profiles')
        .select('*')
        .eq('employer_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            const p = data as EmployerProfile;
            setProfile(p);
            setCompanyName(p.company_name ?? '');
            setIndustry(p.industry ?? '');
            setWebsite(p.website ?? '');
            setClearedFacility(p.cleared_facility ?? false);
          }
          setLoading(false);
        });
    }, [user])
  );

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('employer_profiles')
      .upsert({
        employer_id: user.id,
        company_name: companyName.trim() || null,
        industry: industry.trim() || null,
        website: website.trim() || null,
        cleared_facility: clearedFacility,
        setup_complete: !!companyName.trim(),
      });
    setSaving(false);
    if (error) {
      Alert.alert('Save failed', error.message);
    } else {
      setEditing(false);
      const { data } = await supabase
        .from('employer_profiles')
        .select('*')
        .eq('employer_id', user.id)
        .single();
      if (data) setProfile(data as EmployerProfile);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{profile?.company_name ?? 'Company Profile'}</Text>
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

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Company Name</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Acme Defense Corp"
            placeholderTextColor={colors.textMuted}
          />
        ) : (
          <Text style={styles.fieldValue}>{profile?.company_name ?? '—'}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Industry</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={industry}
            onChangeText={setIndustry}
            placeholder="Defense / Intelligence / Federal IT"
            placeholderTextColor={colors.textMuted}
          />
        ) : (
          <Text style={styles.fieldValue}>{profile?.industry ?? '—'}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Website</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={website}
            onChangeText={setWebsite}
            placeholder="https://..."
            placeholderTextColor={colors.textMuted}
            keyboardType="url"
            autoCapitalize="none"
          />
        ) : (
          <Text style={styles.fieldValue}>{profile?.website ?? '—'}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Cleared Facility</Text>
        {editing ? (
          <TouchableOpacity
            style={[styles.toggleBtn, clearedFacility && styles.toggleBtnActive]}
            onPress={() => setClearedFacility(!clearedFacility)}
          >
            <Text style={[styles.toggleText, clearedFacility && styles.toggleTextActive]}>
              {clearedFacility ? 'Yes — Cleared Facility' : 'No'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.fieldValue}>
            {profile?.cleared_facility ? 'Yes — Cleared Facility' : 'No'}
          </Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Setup Status</Text>
        <View
          style={[
            styles.statusBadge,
            profile?.setup_complete ? styles.statusComplete : styles.statusIncomplete,
          ]}
        >
          <Text style={styles.statusText}>
            {profile?.setup_complete ? 'Complete' : 'Incomplete'}
          </Text>
        </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  title: { color: colors.text, fontSize: font.xl, fontWeight: '700' },
  email: { color: colors.textSecondary, fontSize: font.sm, marginTop: 2 },
  editBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  editBtnText: { color: colors.primaryLight, fontWeight: '600', fontSize: font.sm },
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
  toggleBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignSelf: 'flex-start',
  },
  toggleBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '22',
  },
  toggleText: { color: colors.textSecondary, fontSize: font.md },
  toggleTextActive: { color: colors.accent, fontWeight: '600' },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusComplete: { backgroundColor: colors.accent + '22', borderColor: colors.accent },
  statusIncomplete: { backgroundColor: colors.accentWarn + '22', borderColor: colors.accentWarn },
  statusText: { fontSize: font.xs, fontWeight: '600', color: colors.text },
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
