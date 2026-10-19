import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

export const ProfileScreen: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir del panel médico?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarLarge}>
          <Ionicons name="medical" size={44} color={COLORS.PRIMARY_DARK} />
        </View>

        <Text style={styles.nameTitle}>
          Dr. {profile?.last_name_p ? `${profile.first_name} ${profile.last_name_p}` : profile?.first_name || 'Médico AniMed'}
        </Text>
        <Text style={styles.usernameSubtitle}>
          Usuario: {profile?.username || 'doctor'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Credenciales Médicas</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Rol en el Sistema</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Médico Especialista</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Especialidad</Text>
            <Text style={styles.rowValue}>Control Metabólico / Tirzepatida</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Estado</Text>
            <Text style={styles.rowValue}>Activo</Text>
          </View>
        </View>

        {/* Acciones de Seguridad y Configuración */}
        <View style={styles.actionsCard}>
          <Text style={styles.cardHeader}>Seguridad de la Cuenta</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setIsPasswordModalVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Cambiar contraseña"
          >
            <View style={styles.actionLeft}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="key-outline" size={18} color={COLORS.PRIMARY} />
              </View>
              <Text style={styles.actionButtonText}>Cambiar Contraseña</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.TEXT_MUTED} />
          </TouchableOpacity>
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
      </ScrollView>

      {/* Modal para Cambiar Contraseña */}
      <ChangePasswordModal
        visible={isPasswordModalVisible}
        onClose={() => setIsPasswordModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
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
  actionsCard: {
    width: '100%',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_MAIN,
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
