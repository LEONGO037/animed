import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../theme/colors';
import { Patient } from '../types';
import { PatientCard, CARD_HEIGHT } from '../components/PatientCard';
import { RegisterPatientScreen } from './RegisterPatientScreen';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export const DoctorPatientsScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Consulta de pacientes reales vinculados en Supabase
  const fetchPatients = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .eq('assigned_doctor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error al cargar pacientes de Supabase:', error.message);
      } else if (data) {
        const mappedPatients: Patient[] = data.map((p) => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name_p} ${p.last_name_m || ''}`.trim(),
          email: p.email || `${p.username}@animed.app`,
          statusText: 'En Tratamiento',
        }));
        setPatients(mappedPatients);
      }
    } catch (err: any) {
      console.warn('Error al cargar pacientes:', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  // Actualización automática al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      fetchPatients(false);
    }, [fetchPatients])
  );

  const handlePatientPress = useCallback((patient: Patient) => {
    Alert.alert(
      patient.name,
      `Correo: ${patient.email}\nEstado: ${patient.statusText || 'En Tratamiento'}`,
      [{ text: 'Cerrar', style: 'cancel' }]
    );
  }, []);

  const handleNewPatientPress = useCallback(() => {
    setIsRegistering(true);
  }, []);

  const renderPatientItem = useCallback(
    ({ item }: { item: Patient }) => (
      <PatientCard patient={item} onPress={handlePatientPress} />
    ),
    [handlePatientPress]
  );

  const keyExtractor = useCallback((item: Patient) => item.id, []);

  // Optimización para renderizado de FlatList con altura fija de tarjeta + margen (80 + 16 = 96)
  const getItemLayout = useCallback(
    (_data: ArrayLike<Patient> | null | undefined, index: number) => ({
      length: CARD_HEIGHT + 16,
      offset: (CARD_HEIGHT + 16) * index,
      index,
    }),
    []
  );

  // Memorización de la cabecera
  const listHeaderComponent = useMemo(
    () => (
      <View style={styles.headerWrapper}>
        {/* Barra superior de marca y perfil del médico */}
        <View style={styles.topBar}>
          <View style={styles.brandContainer}>
            <Image
              source={require('../../assets/animed_logo.jpg')}
              style={styles.brandLogo}
              resizeMode="contain"
              accessibilityLabel="Logo AniMed"
            />
            <Text style={styles.brandTitle}>AniMed</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBadge}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Perfil del médico"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.profileText}>
              Dr. {profile?.last_name_p ? `${profile.first_name} ${profile.last_name_p}` : 'Médico'}
            </Text>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={16} color={COLORS.PRIMARY_DARK} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Título de la sección en Español */}
        <Text style={styles.sectionTitle}>Lista de Pacientes</Text>

        {/* Tarjeta de Resumen (Banner Medical Tech) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTextGroup}>
            <Text style={styles.summaryLabel}>Mis Pacientes</Text>
            <Text style={styles.summaryCount}>({patients.length})</Text>
          </View>

          <TouchableOpacity
            style={styles.newPatientButton}
            onPress={handleNewPatientPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Registrar nuevo paciente"
          >
            <Ionicons name="add" size={18} color={COLORS.PRIMARY_DARK} style={styles.buttonIcon} />
            <Text style={styles.newPatientButtonText}>Nuevo{'\n'}Paciente</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [patients.length, profile, handleNewPatientPress]
  );

  // Si está en modo de registro, renderizamos la pantalla modular de registro
  if (isRegistering) {
    return (
      <RegisterPatientScreen
        onSuccess={() => {
          setIsRegistering(false);
          fetchPatients(false);
        }}
        onCancel={() => setIsRegistering(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={patients}
        keyExtractor={keyExtractor}
        renderItem={renderPatientItem}
        ListHeaderComponent={listHeaderComponent}
        getItemLayout={getItemLayout}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchPatients(true)}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Cargando lista de pacientes...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="people-outline" size={36} color={COLORS.TEXT_MUTED} />
              </View>
              <Text style={styles.emptyTitle}>No tienes pacientes registrados</Text>
              <Text style={styles.emptySubtitle}>
                Presiona el botón "+ Nuevo Paciente" para dar de alta a tu primer paciente y comenzar el seguimiento de Tirzepatida.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  headerWrapper: {
    marginBottom: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.PRIMARY,
    letterSpacing: -0.5,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingLeft: 8,
  },
  profileText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_MAIN,
    marginRight: 8,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.TEXT_MAIN,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  summaryCard: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: COLORS.PRIMARY_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  summaryTextGroup: {
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.WHITE,
    lineHeight: 38,
  },
  newPatientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    minHeight: 44,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonIcon: {
    marginRight: 6,
  },
  newPatientButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.PRIMARY_DARK,
    lineHeight: 15,
  },
  emptyContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT_MAIN,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    fontWeight: '500',
  },
});
