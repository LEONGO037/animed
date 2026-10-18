import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { Patient } from '../types';
import { PatientCard, CARD_HEIGHT } from '../components/PatientCard';

const MOCK_PATIENTS: Patient[] = [
  {
    id: 'p-1',
    name: 'Juan Pérez',
    email: 'juanp@animed.app',
    statusText: 'Progress',
    lastDoseMg: 2.5,
    weightKg: 88.5,
  },
  {
    id: 'p-2',
    name: 'María Gómez',
    email: 'mariag@animed.app',
    statusText: 'Progress',
    lastDoseMg: 5.0,
    weightKg: 74.2,
  },
  {
    id: 'p-3',
    name: 'María Monarez',
    email: 'mariam@animed.app',
    statusText: 'Progress',
    lastDoseMg: 2.5,
    weightKg: 69.8,
  },
  {
    id: 'p-4',
    name: 'María Pérez',
    email: 'mariap@animed.app',
    statusText: 'Progress',
    lastDoseMg: 7.5,
    weightKg: 82.0,
  },
];

export const DoctorPatientsScreen: React.FC = () => {
  const [patients] = useState<Patient[]>(MOCK_PATIENTS);

  const handlePatientPress = useCallback((patient: Patient) => {
    Alert.alert(
      patient.name,
      `Correo: ${patient.email}\nDosis actual: ${patient.lastDoseMg ?? 2.5} mg\nPeso: ${patient.weightKg ?? 80} kg`,
      [{ text: 'Cerrar', style: 'cancel' }]
    );
  }, []);

  const handleNewPatientPress = useCallback(() => {
    Alert.alert(
      'Nuevo Paciente',
      'Aquí se abrirá el formulario para registrar un nuevo paciente con su usuario y contraseña generados.',
      [{ text: 'Entendido' }]
    );
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

  // Memorización de la cabecera para evitar re-computaciones durante el scroll
  const listHeaderComponent = useMemo(
    () => (
      <View style={styles.headerWrapper}>
        {/* Barra superior de marca y perfil del médico */}
        <View style={styles.topBar}>
          <Text style={styles.brandTitle}>AniMed</Text>
          <TouchableOpacity
            style={styles.profileBadge}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Perfil del doctor"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.profileText}>Dr. Profile</Text>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={16} color={COLORS.PRIMARY_DARK} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Título de la sección */}
        <Text style={styles.sectionTitle}>Patient List</Text>

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
    [patients.length, handleNewPatientPress]
  );

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
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.PRIMARY_DARK,
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
    backgroundColor: '#CCFBF1',
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
    shadowOpacity: 0.2,
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
    backgroundColor: '#E6FFFA',
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
});
