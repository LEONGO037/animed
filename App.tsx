import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { DoctorTabNavigator } from './src/navigation/DoctorTabNavigator';
import { PatientTabNavigator } from './src/navigation/PatientTabNavigator';
import { COLORS } from './src/theme/colors';

const RootNavigator: React.FC = () => {
  const { session, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>AM</Text>
        </View>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Cargando AniMed...</Text>
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  // Discriminación de navegación según el rol verificado
  if (role === 'doctor') {
    return <DoctorTabNavigator />;
  }

  return <PatientTabNavigator />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={styles.root}>
          <StatusBar style="dark" />
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.PRIMARY_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoBadgeText: {
    color: COLORS.SURFACE,
    fontSize: 24,
    fontWeight: '800',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
});
