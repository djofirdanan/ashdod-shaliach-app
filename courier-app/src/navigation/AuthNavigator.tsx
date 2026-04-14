import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import VehicleSetupScreen from '../screens/auth/VehicleSetupScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VehicleSetup: { vehicleType: string };
};

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="VehicleSetup" component={VehicleSetupScreen} />
  </Stack.Navigator>
);
