import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { InjectionRecord } from '../types';

const screenWidth = Dimensions.get('window').width;

export const PatientDashboardScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const [weight, setWeight] = useState('');
  const [currentDose, setCurrentDose] = useState<number | null>(null);
  const [history, setHistory] = useState<InjectionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Consulta de inyecciones del paciente
  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('injections')
        .select('*')
        .eq('patient_id', user.id)
        .order('injection_date', { ascending: false })
        .limit(10);

      if (error) {
        console.warn('Error al consultar historial del paciente:', error.message);
      } else if (data) {
        // La dosis vigente más reciente asignada por el médico
        if (data.length > 0 && data[0].dose_mg !== undefined) {
          setCurrentDose(Number(data[0].dose_mg));
        } else {
          setCurrentDose(null);
        }
        // Invertimos cronológicamente para el gráfico (más antiguo -> más reciente)
        setHistory(data.slice().reverse());
      }
    } catch (err: any) {
      console.warn('Excepción al cargar historial:', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Registro exclusivo de peso por parte del paciente
  const handleRegisterWeight = useCallback(async () => {
    const cleanWeight = weight.trim().replace(',', '.');
    const numWeight = parseFloat(cleanWeight);

    if (isNaN(numWeight) || numWeight < 20 || numWeight > 350) {
      Alert.alert(
        'Peso inválido',
        'Por favor ingresa un peso válido en kilogramos (ej. 82.5).'
      );
      return;
    }

    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Se registra con la dosis vigente prescrita por el doctor (o 0 si aún no hay asignación)
      const doseToApply = currentDose ?? 0;

      const { error } = await supabase.from('injections').insert([
        {
          patient_id: user.id,
          weight_kg: numWeight,
          dose_mg: doseToApply,
          injection_date: new Date().toISOString(),
        },
      ]);

      if (error) {
        Alert.alert('Error', 'No se pudo guardar el registro: ' + error.message);
      } else {
        Alert.alert('¡Excelente!', 'Tu nuevo peso ha sido registrado correctamente.');
        setWeight('');
        fetchHistory();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error al guardar el peso.');
    } finally {
      setIsSaving(false);
    }
  }, [weight, currentDose, user?.id, fetchHistory]);

  // Métricas de progreso de peso
  const firstWeight = history.length > 0 ? Number(history[0].weight_kg) : 0;
  const lastWeight = history.length > 0 ? Number(history[history.length - 1].weight_kg) : 0;
  const totalLost = history.length > 1 ? (firstWeight - lastWeight).toFixed(1) : '0.0';

  // Datos para el gráfico de línea
  const chartData = useMemo(() => {
    if (history.length === 0) return null;

    const rawLabels = history.map((item) => {
      const d = new Date(item.injection_date);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
    const rawWeights = history.map((item) => Number(item.weight_kg));

    return {
      labels: rawLabels.length === 1 ? [rawLabels[0], rawLabels[0]] : rawLabels,
      datasets: [
        {
          data: rawWeights.length === 1 ? [rawWeights[0], rawWeights[0]] : rawWeights,
          color: (opacity = 1) => `rgba(41, 115, 180, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  }, [history]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera del Paciente */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeSubtitle}>Mi Progreso</Text>
            <Text style={styles.headerTitle}>
              {profile ? `${profile.first_name} ${profile.last_name_p}` : 'Paciente'}
            </Text>
          </View>
          <View style={styles.badgeMedical}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.PRIMARY_DARK} />
            <Text style={styles.badgeMedicalText}>Tratamiento Activo</Text>
          </View>
        </View>

        {/* 1. LO PRIMERO QUE SALE: DOSIS ACTUAL QUE SE ESTÁ INYECTANDO (SOLO EDITABLE POR EL DOCTOR) */}
        <View style={styles.doseCard}>
          <View style={styles.doseCardTop}>
            <View style={styles.doseIconCircle}>
              <Ionicons name="medkit" size={24} color={COLORS.PRIMARY} />
            </View>
            <View style={styles.doseTitles}>
              <Text style={styles.doseCardTitle}>Dosis Actual en Tratamiento</Text>
              <Text style={styles.doseCardSubtitle}>Tirzepatida (inyección semanal)</Text>
            </View>
          </View>

          <View style={styles.doseMainContainer}>
            {isLoadingHistory ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            ) : currentDose !== null ? (
              <View style={styles.doseNumberRow}>
                <Text style={styles.doseNumber}>{currentDose}</Text>
                <Text style={styles.doseUnit}>mg</Text>
              </View>
            ) : (
              <View style={styles.noDoseBox}>
                <Ionicons name="time-outline" size={20} color={COLORS.TEXT_MUTED} style={{ marginRight: 6 }} />
                <Text style={styles.noDoseText}>Pendiente de asignación médica</Text>
              </View>
            )}
          </View>

          {/* Advertencia / Nota de solo lectura para el paciente */}
          <View style={styles.doctorNoticeBox}>
            <Ionicons name="lock-closed" size={14} color={COLORS.PRIMARY_DARK} style={{ marginRight: 6 }} />
            <Text style={styles.doctorNoticeText}>
              Esta dosis es establecida y ajustada únicamente por tu médico.
            </Text>
          </View>
        </View>

        {/* 2. RESUMEN: PESO TOTAL PERDIDO */}
        <View style={styles.highlightCard}>
          <Text style={styles.highlightLabel}>Peso Total Perdido</Text>
          <View style={styles.metricRow}>
            <Text style={styles.highlightValue}>
              {parseFloat(totalLost) > 0 ? `-${totalLost}` : totalLost}
            </Text>
            <Text style={styles.highlightUnit}>kg</Text>
          </View>
          {history.length > 0 && (
            <Text style={styles.highlightSub}>
              Inicial: {firstWeight} kg  •  Actual: {lastWeight} kg
            </Text>
          )}
        </View>

        {/* 3. GRÁFICA DE TENDENCIA DE PESO */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="trending-down-outline" size={18} color={COLORS.PRIMARY} style={{ marginRight: 8 }} />
            <Text style={styles.cardSectionTitle}>Tendencia de Peso (kg)</Text>
          </View>

          {isLoadingHistory ? (
            <ActivityIndicator style={styles.loadingMargin} color={COLORS.PRIMARY} />
          ) : !chartData ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bar-chart-outline" size={32} color={COLORS.TEXT_MUTED} />
              <Text style={styles.emptyText}>Registra tu primer peso abajo para ver la gráfica.</Text>
            </View>
          ) : (
            <LineChart
              data={chartData}
              width={screenWidth - 64}
              height={190}
              yAxisSuffix=" kg"
              yAxisLabel=""
              chartConfig={{
                backgroundColor: COLORS.SURFACE,
                backgroundGradientFrom: COLORS.SURFACE,
                backgroundGradientTo: COLORS.SURFACE,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(41, 115, 180, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: COLORS.PRIMARY_DARK,
                },
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  stroke: '#F3F4F6',
                },
              }}
              bezier
              style={styles.chart}
            />
          )}
        </View>

        {/* 4. ACTUALIZAR PESO (EL PACIENTE SOLO ACTUALIZA SU PESO) */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="scale-outline" size={20} color={COLORS.ACCENT} style={{ marginRight: 8 }} />
            <Text style={styles.cardSectionTitle}>Actualizar Mi Peso</Text>
          </View>

          <Text style={styles.dateAuto}>
            Fecha de hoy: {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>

          {currentDose !== null && (
            <View style={styles.doseInfoPill}>
              <Ionicons name="information-circle" size={16} color={COLORS.PRIMARY} style={{ marginRight: 6 }} />
              <Text style={styles.doseInfoPillText}>
                Se guardará manteniendo tu dosis de <Text style={{ fontWeight: '700' }}>{currentDose} mg</Text>.
              </Text>
            </View>
          )}

          <View style={styles.inputContainerBox}>
            <Text style={styles.label}>Nuevo Peso (kg)</Text>
            <View style={styles.inputRowWrapper}>
              <Ionicons name="fitness-outline" size={20} color={COLORS.TEXT_MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.weightInput}
                placeholder="Ej. 82.5"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
              <Text style={styles.inputSuffix}>kg</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
            onPress={handleRegisterWeight}
            disabled={isSaving}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Actualizar peso"
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.WHITE} />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.WHITE} style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Guardar Nuevo Peso</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 5. HISTORIAL RECIENTE */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="time-outline" size={18} color={COLORS.TEXT_MAIN} style={{ marginRight: 8 }} />
            <Text style={styles.cardSectionTitle}>Historial de Registros</Text>
          </View>

          {history.length === 0 ? (
            <Text style={styles.emptyText}>Sin registros previos.</Text>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyDate}>
                    {new Date(item.injection_date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.historySub}>Dosis: {item.dose_mg} mg</Text>
                </View>
                <Text style={styles.historyWeight}>{item.weight_kg} kg</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.TEXT_MAIN,
    letterSpacing: -0.3,
  },
  badgeMedical: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  badgeMedicalText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.PRIMARY_DARK,
    marginLeft: 4,
  },
  doseCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  doseCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doseIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doseTitles: {
    flex: 1,
  },
  doseCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.PRIMARY_DARK,
  },
  doseCardSubtitle: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  doseMainContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    marginVertical: 12,
  },
  doseNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  doseNumber: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.PRIMARY,
    letterSpacing: -1,
  },
  doseUnit: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.PRIMARY_DARK,
    marginLeft: 6,
  },
  noDoseBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noDoseText: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
  doctorNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  doctorNoticeText: {
    fontSize: 12,
    color: COLORS.PRIMARY_DARK,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  highlightCard: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: COLORS.PRIMARY_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  highlightLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  highlightValue: {
    color: COLORS.WHITE,
    fontSize: 34,
    fontWeight: '800',
  },
  highlightUnit: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 6,
  },
  highlightSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_MAIN,
  },
  dateAuto: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  doseInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 14,
  },
  doseInfoPillText: {
    fontSize: 12,
    color: COLORS.PRIMARY_DARK,
    flex: 1,
  },
  inputContainerBox: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_MAIN,
    marginBottom: 6,
  },
  inputRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  weightInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT_MAIN,
    fontWeight: '600',
    height: '100%',
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    marginLeft: 6,
  },
  primaryButton: {
    backgroundColor: COLORS.ACCENT,
    borderRadius: 14,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.WHITE,
    fontSize: 15,
    fontWeight: '700',
  },
  chart: {
    marginVertical: 4,
    borderRadius: 12,
  },
  loadingMargin: {
    marginVertical: 32,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 8,
    textAlign: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_MAIN,
  },
  historySub: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  historyWeight: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ACCENT,
  },
});
