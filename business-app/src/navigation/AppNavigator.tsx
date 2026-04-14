import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { TabNavigator } from './TabNavigator';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import NewDeliveryScreen from '../screens/main/NewDeliveryScreen';
import DeliveryDetailsScreen from '../screens/main/DeliveryDetailsScreen';
import ChatScreen from '../screens/main/ChatScreen';
import { colors } from '../theme/colors';

const Stack = createStackNavigator();

const ONBOARDING_KEY = 'onboarding_completed';

export const AppNavigator = () => {
  const { isAuthenticated, loadStored } = useAuth();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [, onboardingValue] = await Promise.all([
          loadStored(),
          AsyncStorage.getItem(ONBOARDING_KEY),
        ]);
        if (!onboardingValue) {
          setOnboardingDone(false);
          // Mark onboarding as done so it only shows once
          await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        }
      } catch {
        // Continue without stored auth
      } finally {
        setIsBootstrapping(false);
      }
    };
    bootstrap();
  }, [loadStored]);

  if (isBootstrapping) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Onboarding — shown only on first launch; uses navigation.replace('Login') internally */}
      {!onboardingDone && (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      )}

      {/* Auth screens */}
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (
        /* Authenticated screens */
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="NewDelivery"
            component={NewDeliveryScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="DeliveryDetails" component={DeliveryDetailsScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
