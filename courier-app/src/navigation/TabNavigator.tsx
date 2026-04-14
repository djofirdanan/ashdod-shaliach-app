import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { View, Text, StyleSheet } from 'react-native';
import { RootState } from '../store';
import HomeScreen from '../screens/main/HomeScreen';
import ActiveDeliveryScreen from '../screens/main/ActiveDeliveryScreen';
import EarningsScreen from '../screens/main/EarningsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

export type TabParamList = {
  בית: undefined;
  'משלוח פעיל': undefined;
  הכנסות: undefined;
  פרופיל: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator: React.FC = () => {
  const activeDelivery = useSelector((state: RootState) => state.delivery.activeDelivery);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#252636',
          borderTopColor: '#3A3B4E',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'home';

          if (route.name === 'בית') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'משלוח פעיל') {
            iconName = focused ? 'car' : 'car-outline';
          } else if (route.name === 'הכנסות') {
            iconName = focused ? 'cash' : 'cash-outline';
          } else if (route.name === 'פרופיל') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="בית" component={HomeScreen} />
      <Tab.Screen
        name="משלוח פעיל"
        component={ActiveDeliveryScreen}
        options={{
          tabBarBadge: activeDelivery ? '●' : undefined,
          tabBarBadgeStyle: { backgroundColor: '#00E676', color: '#00E676', fontSize: 6, minWidth: 10, height: 10 },
          tabBarIconStyle: activeDelivery ? { tintColor: '#00E676' } : undefined,
        }}
      />
      <Tab.Screen
        name="הכנסות"
        component={EarningsScreen}
        options={{ tabBarActiveTintColor: '#F6C90E' }}
      />
      <Tab.Screen name="פרופיל" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
