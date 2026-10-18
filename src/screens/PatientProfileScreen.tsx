import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export const PatientProfileScreen: React.FC = () => {
  const { profile, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.avatarLarge}>
          <Ionicons name="person" size={44} color={COLORS.PRIMARY_DARK} />
        </View>

        <Text style={styles.nameTitle}>
          {profile ? `${profile.first_name} ${profile.last_name_p}` : 'Paciente AniMed'}
        </Text>
        <Text style={styles.usernameSubtitle}>
          Usuario: {profile?.username || 'paciente'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Detalles de la Cuenta</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Rol en el Sistema</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Paciente</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Programa</Text>
            <Text style={styles.rowValue}>Control Tirzepatida</Text>
          </View>

          {profile?.dob && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Nacimiento</Text>
              <Text style={styles.rowValue}>{profile.dob}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.PRIMARY,
    marginBottom: 16,
  },
  nameTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.TEXT_MAIN,
  },
  usernameSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
    marginBottom: 24,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_MAIN,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLabel: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_MAIN,
  },
  roleBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.BADGE_TEXT,
  },
  logoutButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    minHeight: 48,
    borderRadius: 12,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
});
