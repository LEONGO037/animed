import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { PatientTabParamList } from '../types';
import { PatientDashboardScreen } from '../screens/PatientDashboardScreen';
import { PatientProfileScreen } from '../screens/PatientProfileScreen';

const Tab = createBottomTabNavigator<PatientTabParamList>();

export const PatientTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Mi Progreso"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.ACCENT,
        tabBarInactiveTintColor: COLORS.TEXT_MUTED,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Mi Progreso':
              iconName = focused ? 'fitness' : 'fitness-outline';
              break;
            case 'Mi Perfil':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size ?? 24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Mi Progreso"
        component={PatientDashboardScreen}
        options={{
          tabBarLabel: 'Mi Progreso',
          tabBarAccessibilityLabel: 'Pestaña de Mi Progreso y Dosis',
        }}
      />
      <Tab.Screen
        name="Mi Perfil"
        component={PatientProfileScreen}
        options={{
          tabBarLabel: 'Mi Perfil',
          tabBarAccessibilityLabel: 'Pestaña de Mi Perfil',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.SURFACE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tabBarItem: {
    minHeight: 44,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
