import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import HomeScreen from '../screens/main/HomeScreen';
import ActiveDeliveriesScreen from '../screens/main/ActiveDeliveriesScreen';
import HistoryScreen from '../screens/main/HistoryScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import { RootState } from '../store';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcon = (
  routeName: string,
  focused: boolean
): IoniconsName => {
  switch (routeName) {
    case 'Home':
      return focused ? 'home' : 'home-outline';
    case 'ActiveDeliveries':
      return focused ? 'cube' : 'cube-outline';
    case 'History':
      return focused ? 'time' : 'time-outline';
    case 'Profile':
      return focused ? 'person' : 'person-outline';
    default:
      return 'ellipse-outline';
  }
};

const tabLabel = (routeName: string): string => {
  switch (routeName) {
    case 'Home':
      return 'בית';
    case 'ActiveDeliveries':
      return 'פעילים';
    case 'History':
      return 'היסטוריה';
    case 'Profile':
      return 'פרופיל';
    default:
      return '';
  }
};

export const TabNavigator = () => {
  const activeCount = useSelector(
    (state: RootState) => state.delivery.activeDeliveries.length
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = tabIcon(route.name, focused);
          const showBadge = route.name === 'ActiveDeliveries' && activeCount > 0;
          return (
            <View>
              <Ionicons name={iconName} size={size} color={color} />
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {activeCount > 9 ? '9+' : activeCount}
                  </Text>
                </View>
              )}
            </View>
          );
        },
        tabBarLabel: tabLabel(route.name),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="ActiveDeliveries" component={ActiveDeliveriesScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 62,
    paddingBottom: 8,
    paddingTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '700',
  },
});
