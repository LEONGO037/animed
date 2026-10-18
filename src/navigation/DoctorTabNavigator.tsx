import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { RootTabParamList } from '../types';
import { DoctorPatientsScreen } from '../screens/DoctorPatientsScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { DoctorsScreen } from '../screens/DoctorsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

export const DoctorTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Pacientes"
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
            case 'Pacientes':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Dashboard':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
            case 'Doctores':
              iconName = focused ? 'medkit' : 'medkit-outline';
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
        name="Pacientes"
        component={DoctorPatientsScreen}
        options={{
          tabBarLabel: 'Pacientes',
          tabBarAccessibilityLabel: 'Pestaña de Pacientes',
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarAccessibilityLabel: 'Pestaña de Dashboard',
        }}
      />
      <Tab.Screen
        name="Doctores"
        component={DoctorsScreen}
        options={{
          tabBarLabel: 'Doctores',
          tabBarAccessibilityLabel: 'Pestaña de Doctores',
        }}
      />
      <Tab.Screen
        name="Mi Perfil"
        component={ProfileScreen}
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
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
