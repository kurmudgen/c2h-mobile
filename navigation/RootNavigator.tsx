import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../lib/theme';
import AuthNavigator from './AuthNavigator';
import CandidateNavigator from './CandidateNavigator';
import EmployerNavigator from './EmployerNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { session, userType, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!session ? (
        <AuthNavigator />
      ) : userType === 'employer' ? (
        <EmployerNavigator />
      ) : (
        <CandidateNavigator />
      )}
    </NavigationContainer>
  );
}
