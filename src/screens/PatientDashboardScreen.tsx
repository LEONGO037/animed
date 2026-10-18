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
  const [dose, setDose] = useState('');
  const [history, setHistory] = useState<InjectionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('injections')
        .select('*')
        .eq('patient_id', user.id)
        .order('injection_date', { ascending: false })
        .limit(6);

      if (error) {
        console.warn('Error al consultar historial:', error.message);
      } else if (data) {
        // Invertimos para graficar cronológicamente
        setHistory(data.slice().reverse());
      }
    } catch (err: any) {
      console.warn('Excepción historial:', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRegisterInjection = useCallback(async () => {
    const numWeight = parseFloat(weight.replace(',', '.'));
    const numDose = parseFloat(dose.replace(',', '.'));

    if (isNaN(numWeight) || isNaN(numDose) || numWeight <= 0 || numDose <= 0) {
      Alert.alert('Datos requeridos', 'Por favor ingresa un peso (kg) y dosis (mg) válidos.');
      return;
    }

    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('injections').insert([
        {
          patient_id: user.id,
          weight_kg: numWeight,
          dose_mg: numDose,
          injection_date: new Date().toISOString(),
        },
      ]);

      if (error) {
        Alert.alert('Error', 'No se pudo guardar el registro: ' + error.message);
      } else {
        Alert.alert('¡Excelente!', 'Dosis y peso registrados correctamente.');
        setWeight('');
        setDose('');
        fetchHistory();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  }, [weight, dose, user?.id, fetchHistory]);

  // Cálculos memorizados de peso
  const firstWeight = history.length > 0 ? Number(history[0].weight_kg) : 0;
  const lastWeight = history.length > 0 ? Number(history[history.length - 1].weight_kg) : 0;
  const totalLost = history.length > 1 ? (firstWeight - lastWeight).toFixed(2) : '0.00';

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
          color: (opacity = 1) => `rgba(13, 148, 136, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  }, [history]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cabecera de Paciente */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeSubtitle}>Bienvenido,</Text>
            <Text style={styles.headerTitle}>
              {profile ? `${profile.first_name} ${profile.last_name_p}` : 'Paciente'}
            </Text>
          </View>
          <View style={styles.badgeMedical}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.PRIMARY_DARK} />
            <Text style={styles.badgeMedicalText}>Tratamiento Activo</Text>
          </View>
        </View>

        {/* Tarjeta de Resumen: Peso Total Perdido */}
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

        {/* Gráfica de Tendencia de Peso */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Tendencia de Peso (Últimas Dosis)</Text>
          {isLoadingHistory ? (
            <ActivityIndicator style={styles.loadingMargin} color={COLORS.PRIMARY} />
          ) : !chartData ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bar-chart-outline" size={32} color={COLORS.TEXT_MUTED} />
              <Text style={styles.emptyText}>Registra tu primera inyección para ver la gráfica.</Text>
            </View>
          ) : (
            <LineChart
              data={chartData}
              width={screenWidth - 64}
              height={200}
              chartConfig={{
                backgroundColor: COLORS.SURFACE,
                backgroundGradientFrom: COLORS.SURFACE,
                backgroundGradientTo: COLORS.SURFACE,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(13, 148, 136, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: COLORS.PRIMARY,
                },
              }}
              bezier
              style={styles.chart}
            />
          )}
        </View>

        {/* Registro Rápido de Inyección */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Registro de Hoy (Tirzepatida)</Text>
          <Text style={styles.dateAuto}>
            Fecha automática: {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.label}>Peso Actual (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 82.5"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
            </View>

            <View style={styles.formHalf}>
              <Text style={styles.label}>Dosis (mg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 2.5"
                placeholderTextColor={COLORS.TEXT_MUTED}
                keyboardType="decimal-pad"
                value={dose}
                onChangeText={setDose}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
            onPress={handleRegisterInjection}
            disabled={isSaving}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Registrar dosis de Tirzepatida"
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.SURFACE} />
            ) : (
              <Text style={styles.primaryButtonText}>+ Registrar Inyección</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Historial Reciente */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Historial Reciente</Text>
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
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
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
  },
  badgeMedicalText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.PRIMARY_DARK,
    marginLeft: 4,
  },
  highlightCard: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.PRIMARY_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  highlightLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
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
    fontSize: 36,
    fontWeight: '800',
  },
  highlightUnit: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 20,
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
    borderRadius: 16,
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
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_MAIN,
    marginBottom: 8,
  },
  dateAuto: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 14,
    textTransform: 'capitalize',
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
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  formHalf: {
    flex: 0.48,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_MAIN,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.TEXT_MAIN,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: COLORS.SURFACE,
    fontSize: 15,
    fontWeight: '700',
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
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
});
