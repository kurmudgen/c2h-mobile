import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '../lib/theme';
import MatchListScreen from '../screens/candidate/MatchListScreen';
import MatchDetailScreen from '../screens/candidate/MatchDetailScreen';
import CandidateProfileScreen from '../screens/candidate/CandidateProfileScreen';
import type { CandidateTabParamList, CandidateStackParamList } from './types';

const Tab = createBottomTabNavigator<CandidateTabParamList>();
const Stack = createNativeStackNavigator<CandidateStackParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: font.lg },
  contentStyle: { backgroundColor: colors.bg },
};

function MatchesStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="MatchList"
        component={MatchListScreen}
        options={{ title: 'My Matches' }}
      />
      <Stack.Screen
        name="MatchDetail"
        component={MatchDetailScreen}
        options={{ title: 'Match Detail' }}
      />
    </Stack.Navigator>
  );
}

export default function CandidateNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: font.xs, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Matches: focused ? 'briefcase' : 'briefcase-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'circle'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Matches" component={MatchesStack} />
      <Tab.Screen
        name="Profile"
        component={CandidateProfileScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: font.lg },
          title: 'My Profile',
        }}
      />
    </Tab.Navigator>
  );
}
