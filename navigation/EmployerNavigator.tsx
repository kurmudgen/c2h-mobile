import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '../lib/theme';
import JobListScreen from '../screens/employer/JobListScreen';
import PipelineScreen from '../screens/employer/PipelineScreen';
import CandidateDetailScreen from '../screens/employer/CandidateDetailScreen';
import EmployerProfileScreen from '../screens/employer/EmployerProfileScreen';
import type { EmployerTabParamList, EmployerStackParamList } from './types';

const Tab = createBottomTabNavigator<EmployerTabParamList>();
const Stack = createNativeStackNavigator<EmployerStackParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: font.lg },
  contentStyle: { backgroundColor: colors.bg },
};

function JobsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="JobList" component={JobListScreen} options={{ title: 'Active Jobs' }} />
      <Stack.Screen
        name="Pipeline"
        component={PipelineScreen}
        options={({ route }) => ({ title: route.params.jobTitle })}
      />
      <Stack.Screen
        name="CandidateDetail"
        component={CandidateDetailScreen}
        options={{ title: 'Candidate' }}
      />
    </Stack.Navigator>
  );
}

export default function EmployerNavigator() {
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
            Jobs: focused ? 'layers' : 'layers-outline',
            Profile: focused ? 'business' : 'business-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'circle'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Jobs" component={JobsStack} />
      <Tab.Screen
        name="Profile"
        component={EmployerProfileScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: font.lg },
          title: 'Company Profile',
        }}
      />
    </Tab.Navigator>
  );
}
