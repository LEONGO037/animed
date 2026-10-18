import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Image } from 'react-native';
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
        <Image
          source={require('./assets/animed_logo.jpg')}
          style={styles.loadingLogo}
          resizeMode="contain"
          accessibilityLabel="Logo AniMed"
        />
        <ActivityIndicator size="large" color={COLORS.ACCENT} />
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
    backgroundColor: COLORS.SURFACE,
    paddingHorizontal: 24,
  },
  loadingLogo: {
    width: 200,
    height: 120,
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
});
