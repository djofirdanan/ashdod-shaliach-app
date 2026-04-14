import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { ActivityIndicator, View } from 'react-native';
import { RootState } from '../store';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import ChatScreen from '../screens/main/ChatScreen';
import DeliveryQueueScreen from '../screens/main/DeliveryQueueScreen';
import HistoryScreen from '../screens/main/HistoryScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  Chat: { deliveryId: string; businessName: string };
  DeliveryQueue: undefined;
  History: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const done = await AsyncStorage.getItem('courier_onboarding_done');
        setOnboardingDone(done === 'true');
      } catch {
        setOnboardingDone(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkOnboarding();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1B2E' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (!onboardingDone && !user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
      </Stack.Navigator>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthNavigator} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ presentation: 'modal', headerShown: true, title: 'צ\'אט', headerStyle: { backgroundColor: '#252636' }, headerTintColor: '#fff' }}
      />
      <Stack.Screen
        name="DeliveryQueue"
        component={DeliveryQueueScreen}
        options={{ presentation: 'card', headerShown: true, title: 'תור משלוחים', headerStyle: { backgroundColor: '#252636' }, headerTintColor: '#fff' }}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{ headerShown: true, title: 'היסטוריה', headerStyle: { backgroundColor: '#252636' }, headerTintColor: '#fff' }}
      />
    </Stack.Navigator>
  );
};
