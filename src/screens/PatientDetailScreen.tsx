import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { COLORS } from '../theme/colors';
import { CustomHeader } from '../components/CustomHeader';
import { Patient, InjectionRecord } from '../types';
import { supabase } from '../lib/supabase';

const { width: screenWidth } = Dimensions.get('window');

interface PatientDetailScreenProps {
  patient: Patient;
  onBack: () => void;
  onRecordAdded?: () => void;
}

type FormErrors = Partial<Record<'weight' | 'dose', string>>;

const COMMON_DOSES = ['2.5', '5.0', '7.5', '10.0', '12.5', '15.0'];

export const PatientDetailScreen: React.FC<PatientDetailScreenProps> = ({
  patient,
  onBack,
  onRecordAdded,
}) => {
  const scrollRef = useRef<ScrollView>(null);

  // Estados de datos
  const [latestInjection, setLatestInjection] = useState<InjectionRecord | null>(null);
  const [history, setHistory] = useState<InjectionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Estados del formulario
  const [weight, setWeight] = useState('');
  const [dose, setDose] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Formato de fecha actual en español automático
  const todayFormatted = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  // Limpieza dinámica de errores
  const clearError = useCallback((field: keyof FormErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // Historial cronológico ordenado de más antiguo a más reciente para las gráficas
  const chronologicalHistory = useMemo(() => {
    return [...history].reverse().slice(-6);
  }, [history]);

  // Etiquetas de fecha abreviadas para el eje X
  const chartLabels = useMemo(() => {
    if (chronologicalHistory.length === 0) return [];
    return chronologicalHistory.map((item) => {
      const d = new Date(item.injection_date);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
  }, [chronologicalHistory]);

  // Datos para Gráfico de Línea de Tendencia de Peso (igual a la vista del paciente)
  const weightChartData = useMemo(() => {
    if (chronologicalHistory.length === 0) return null;
    const weights = chronologicalHistory.map((item) => Number(item.weight_kg));
    const labels = chartLabels;

    return {
      labels: labels.length === 1 ? [labels[0], labels[0]] : labels,
      datasets: [
        {
          data: weights.length === 1 ? [weights[0], weights[0]] : weights,
          color: (opacity = 1) => `rgba(240, 138, 36, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  }, [chronologicalHistory, chartLabels]);

  // Datos para Gráfico de Línea (Progresión de Dosis)
  const doseChartData = useMemo(() => {
    if (chronologicalHistory.length === 0) return null;
    const doses = chronologicalHistory.map((item) => Number(item.dose_mg));
    const labels = chartLabels;

    return {
      labels: labels.length === 1 ? [labels[0], labels[0]] : labels,
      datasets: [
        {
          data: doses.length === 1 ? [doses[0], doses[0]] : doses,
          color: (opacity = 1) => `rgba(41, 115, 180, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  }, [chronologicalHistory, chartLabels]);

  // Consultar historial del paciente en Supabase
  const fetchPatientInjections = useCallback(async () => {
    if (!patient?.id) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('injections')
        .select('*')
        .eq('patient_id', patient.id)
        .order('injection_date', { ascending: false })
        .limit(10);

      if (error) {
        console.warn('Error al consultar inyecciones del paciente:', error.message);
      } else if (data) {
        setHistory(data);
        if (data.length > 0) {
          setLatestInjection(data[0]);
        } else {
          setLatestInjection(null);
        }
      }
    } catch (err: any) {
      console.warn('Excepción al cargar historial:', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [patient?.id]);

  useEffect(() => {
    fetchPatientInjections();
  }, [fetchPatientInjections]);

  // Manejador de guardado de dosis y peso
  const handleSaveInjection = useCallback(async () => {
    const cleanWeight = weight.trim().replace(',', '.');
    const cleanDose = dose.trim().replace(',', '.');

    const newErrors: FormErrors = {};

    const numWeight = parseFloat(cleanWeight);
    if (!cleanWeight) {
      newErrors.weight = 'Ingresa el nuevo peso del paciente.';
    } else if (isNaN(numWeight) || numWeight <= 20 || numWeight >= 350) {
      newErrors.weight = 'Ingresa un peso válido en kg (ej. 82.5).';
    }

    const numDose = parseFloat(cleanDose);
    if (!cleanDose) {
      newErrors.dose = 'Ingresa la dosis administrada en mg.';
    } else if (isNaN(numDose) || numDose <= 0 || numDose > 50) {
      newErrors.dose = 'Ingresa una dosis válida en mg (ej. 2.5).';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert(
        'Campos requeridos incompletos',
        'Por favor ingresa un peso y una dosis válidos para guardar el registro.'
      );
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      // Inserción en Supabase con fecha automática generada por el sistema
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('injections')
        .insert({
          patient_id: patient.id,
          dose_mg: numDose,
          weight_kg: numWeight,
          injection_date: nowIso,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Actualización inmediata en tiempo real del estado actual
      const newRecord = data as InjectionRecord;
      setLatestInjection(newRecord);
      setHistory((prev) => [newRecord, ...prev]);

      // Limpiar campos del formulario
      setWeight('');
      setDose('');

      if (onRecordAdded) {
        onRecordAdded();
      }

      Alert.alert(
        '¡Registro Guardado!',
        `Se registró correctamente la dosis de ${numDose} mg y el peso de ${numWeight} kg para ${patient.name}.`,
        [{ text: 'Aceptar' }]
      );
    } catch (err: any) {
      console.error('Error al guardar inyección:', err);
      let errorMsg = err.message || 'No se pudo guardar el registro en la base de datos.';
      if (err.message?.includes('row-level security')) {
        errorMsg = 'Permiso denegado por políticas de seguridad (RLS) en Supabase. Asegúrate de ejecutar el script fix_injections_rls.sql en el SQL Editor de tu proyecto.';
      }
      Alert.alert('Error al Guardar', errorMsg);
    } finally {
      setIsSaving(false);
    }
  }, [weight, dose, patient.id, patient.name, onRecordAdded]);

  return (
    <View style={styles.container}>
      {/* Cabecera independiente con botón de retorno */}
      <CustomHeader
        title="Expediente del Paciente"
        showBackButton={true}
        onBackPress={onBack}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tarjeta de Identificación del Paciente */}
          <View style={styles.patientCard}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={24} color={COLORS.PRIMARY} />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName} numberOfLines={1}>
                {patient.name}
              </Text>
              <Text style={styles.patientEmail} numberOfLines={1}>
                {patient.email}
              </Text>
            </View>
            <View style={styles.badgeTreatment}>
              <Ionicons name="checkmark-circle" size={13} color={COLORS.PRIMARY_DARK} style={{ marginRight: 4 }} />
              <Text style={styles.badgeTreatmentText}>En Tratamiento</Text>
            </View>
          </View>

          {/* PARTE 1: Estado Actual (Dosis Actual y Peso) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconCircle}>
                <Ionicons name="pulse" size={18} color={COLORS.PRIMARY} />
              </View>
              <Text style={styles.sectionTitle}>Estado Actual del Paciente</Text>
            </View>

            {isLoadingHistory ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.loadingBoxText}>Cargando estado actual...</Text>
              </View>
            ) : (
              <>
                <View style={styles.metricsRow}>
                  {/* Métrica 1: Dosis Actual */}
                  <View style={styles.metricBox}>
                    <View style={styles.metricIconHeader}>
                      <Ionicons name="medical" size={16} color={COLORS.PRIMARY} />
                      <Text style={styles.metricLabel}>Dosis Actual</Text>
                    </View>
                    <View style={styles.metricValueRow}>
                      <Text style={styles.metricValue}>
                        {latestInjection ? latestInjection.dose_mg : '--'}
                      </Text>
                      <Text style={styles.metricUnit}>mg</Text>
                    </View>
                    <Text style={styles.metricHint}>Tirzepatida</Text>
                  </View>

                  {/* Métrica 2: Peso Actual */}
                  <View style={styles.metricBox}>
                    <View style={styles.metricIconHeader}>
                      <Ionicons name="scale-outline" size={16} color={COLORS.ACCENT} />
                      <Text style={styles.metricLabel}>Peso Actual</Text>
                    </View>
                    <View style={styles.metricValueRow}>
                      <Text style={[styles.metricValue, { color: COLORS.ACCENT }]}>
                        {latestInjection ? latestInjection.weight_kg : '--'}
                      </Text>
                      <Text style={styles.metricUnit}>kg</Text>
                    </View>
                    <Text style={styles.metricHint}>Control Corporal</Text>
                  </View>
                </View>

                {/* Detalle de última inyección */}
                <View style={styles.lastUpdateRow}>
                  <Ionicons name="time-outline" size={15} color={COLORS.TEXT_MUTED} style={{ marginRight: 6 }} />
                  <Text style={styles.lastUpdateText}>
                    {latestInjection
                      ? `Última aplicación: ${new Date(latestInjection.injection_date).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}`
                      : 'Sin registros previos. Registra la primera dosis abajo.'}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* PARTE 2: Gráficos Clínicos (Tendencia de Peso y Progresión de Dosis) */}
          <View style={styles.chartCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="trending-down" size={18} color={COLORS.ACCENT} />
              </View>
              <Text style={styles.sectionTitle}>Tendencia de Peso (kg)</Text>
            </View>

            {isLoadingHistory ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.loadingBoxText}>Cargando gráfico de peso...</Text>
              </View>
            ) : !weightChartData ? (
              <View style={styles.emptyChartBox}>
                <Ionicons name="trending-down-outline" size={28} color={COLORS.TEXT_MUTED} />
                <Text style={styles.emptyChartTitle}>Sin datos de peso</Text>
                <Text style={styles.emptyChartSubtitle}>
                  Registra la primera aplicación abajo para ver la curva de peso.
                </Text>
              </View>
            ) : (
              <View style={styles.chartWrapper}>
                <LineChart
                  data={weightChartData}
                  width={screenWidth - 68}
                  height={190}
                  yAxisSuffix=" kg"
                  yAxisLabel=""
                  chartConfig={{
                    backgroundColor: COLORS.SURFACE,
                    backgroundGradientFrom: COLORS.SURFACE,
                    backgroundGradientTo: COLORS.SURFACE,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(240, 138, 36, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    propsForDots: {
                      r: '5',
                      strokeWidth: '2',
                      stroke: '#C2620A',
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: '#F3F4F6',
                    },
                  }}
                  bezier
                  style={styles.chartStyle}
                />
              </View>
            )}
          </View>

          <View style={styles.chartCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="trending-up" size={18} color={COLORS.PRIMARY} />
              </View>
              <Text style={styles.sectionTitle}>Progresión de Dosis (mg)</Text>
            </View>

            {isLoadingHistory ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.loadingBoxText}>Cargando gráfico de dosis...</Text>
              </View>
            ) : !doseChartData ? (
              <View style={styles.emptyChartBox}>
                <Ionicons name="trending-up-outline" size={28} color={COLORS.TEXT_MUTED} />
                <Text style={styles.emptyChartTitle}>Sin datos de dosis</Text>
                <Text style={styles.emptyChartSubtitle}>
                  Registra la primera aplicación abajo para ver el gráfico de línea.
                </Text>
              </View>
            ) : (
              <View style={styles.chartWrapper}>
                <LineChart
                  data={doseChartData}
                  width={screenWidth - 68}
                  height={190}
                  yAxisSuffix=" mg"
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
                  style={styles.chartStyle}
                />
              </View>
            )}
          </View>

          {/* PARTE 3: Registrar Nuevo Peso y Dosis */}
          <View style={styles.formCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="add-circle" size={18} color={COLORS.ACCENT} />
              </View>
              <Text style={styles.sectionTitle}>Registrar Nueva Aplicación</Text>
            </View>

            {/* Fecha Automática (Visualización nativa del sistema) */}
            <View style={styles.autoDateContainer}>
              <View style={styles.autoDateHeader}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.PRIMARY} style={{ marginRight: 8 }} />
                <Text style={styles.autoDateLabel}>Fecha de registro (automática):</Text>
              </View>
              <Text style={styles.autoDateValue}>Hoy, {todayFormatted}</Text>
              <Text style={styles.autoDateSub}>
                La fecha y hora actual se asignan automáticamente al guardar la aplicación.
              </Text>
            </View>

            {/* Campo: Nuevo Peso (kg) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, !!errors.weight && styles.labelError]}>
                Nuevo Peso (kg) <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  !!errors.weight && styles.inputContainerError,
                ]}
              >
                <Ionicons
                  name="scale-outline"
                  size={20}
                  color={errors.weight ? COLORS.ERROR : COLORS.PRIMARY}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 82.5"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  value={weight}
                  onChangeText={(val) => {
                    setWeight(val);
                    clearError('weight');
                  }}
                  keyboardType="decimal-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.inputSuffix}>kg</Text>
              </View>
              {!!errors.weight && (
                <View style={styles.fieldErrorRow}>
                  <Ionicons name="alert-circle" size={14} color={COLORS.ERROR} style={styles.fieldErrorIcon} />
                  <Text style={styles.fieldErrorText}>{errors.weight}</Text>
                </View>
              )}
            </View>

            {/* Campo: Dosis Actual que se está Inyectando (mg) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, !!errors.dose && styles.labelError]}>
                Dosis Inyectada Actualmente (mg) <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  !!errors.dose && styles.inputContainerError,
                ]}
              >
                <Ionicons
                  name="fitness-outline"
                  size={20}
                  color={errors.dose ? COLORS.ERROR : COLORS.PRIMARY}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 2.5"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  value={dose}
                  onChangeText={(val) => {
                    setDose(val);
                    clearError('dose');
                  }}
                  keyboardType="decimal-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.inputSuffix}>mg</Text>
              </View>
              {!!errors.dose && (
                <View style={styles.fieldErrorRow}>
                  <Ionicons name="alert-circle" size={14} color={COLORS.ERROR} style={styles.fieldErrorIcon} />
                  <Text style={styles.fieldErrorText}>{errors.dose}</Text>
                </View>
              )}

              {/* Botones de selección rápida de dosis de Tirzepatida */}
              <View style={styles.quickDosesContainer}>
                <Text style={styles.quickDosesLabel}>Sugerencias de dosis:</Text>
                <View style={styles.quickDosesRow}>
                  {COMMON_DOSES.map((d) => {
                    const isSelected = dose === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.quickDosePill, isSelected && styles.quickDosePillActive]}
                        onPress={() => {
                          setDose(d);
                          clearError('dose');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.quickDoseText, isSelected && styles.quickDoseTextActive]}>
                          {d} mg
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Botón Principal de Guardado */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                isSaving && styles.saveButtonDisabled,
              ]}
              onPress={handleSaveInjection}
              disabled={isSaving}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Guardar dosis y peso del paciente"
            >
              {isSaving ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                  <Text style={[styles.saveButtonText, { marginLeft: 10 }]}>
                    Guardando registro...
                  </Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="checkmark-done-circle" size={20} color={COLORS.WHITE} style={styles.buttonIcon} />
                  <Text style={styles.saveButtonText}>Guardar Dosis y Peso</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* PARTE 3: Historial Reciente de Inyecciones */}
          <View style={styles.historyCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="list" size={18} color={COLORS.TEXT_MAIN} />
              </View>
              <Text style={styles.sectionTitle}>Historial de Aplicaciones</Text>
            </View>

            {history.length === 0 ? (
              <View style={styles.emptyHistoryBox}>
                <Ionicons name="file-tray-outline" size={28} color={COLORS.TEXT_MUTED} />
                <Text style={styles.emptyHistoryText}>
                  Aún no hay aplicaciones registradas para este paciente.
                </Text>
              </View>
            ) : (
              history.map((item, index) => (
                <View key={item.id} style={[styles.historyRow, index === history.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyDate}>
                      {new Date(item.injection_date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                    <View style={styles.historyPill}>
                      <Text style={styles.historyPillText}>Dosis: {item.dose_mg} mg</Text>
                    </View>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyWeightValue}>{item.weight_kg} kg</Text>
                    <Text style={styles.historyWeightLabel}>Peso registrado</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.BADGE_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_MAIN,
    marginBottom: 2,
  },
  patientEmail: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
  },
  badgeTreatment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BADGE_BG,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeTreatmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.PRIMARY_DARK,
  },
  sectionCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.BADGE_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.TEXT_MAIN,
    letterSpacing: -0.2,
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBoxText: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricBox: {
    flex: 0.48,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  metricIconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginLeft: 6,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.PRIMARY,
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginLeft: 4,
  },
  metricHint: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
    fontWeight: '500',
  },
  lastUpdateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  lastUpdateText: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    flex: 1,
  },
  formCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  autoDateContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  autoDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  autoDateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.PRIMARY_DARK,
  },
  autoDateValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.PRIMARY,
    marginTop: 2,
  },
  autoDateSub: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
    lineHeight: 15,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_MAIN,
    marginBottom: 6,
    marginLeft: 2,
  },
  labelError: {
    color: COLORS.ERROR,
  },
  requiredAsterisk: {
    color: COLORS.ERROR,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputContainerError: {
    borderColor: COLORS.ERROR_BORDER,
    backgroundColor: COLORS.ERROR_LIGHT,
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_MAIN,
    paddingVertical: 12,
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    marginLeft: 6,
  },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 2,
  },
  fieldErrorIcon: {
    marginRight: 4,
  },
  fieldErrorText: {
    fontSize: 12,
    color: COLORS.ERROR,
    fontWeight: '500',
    flex: 1,
  },
  quickDosesContainer: {
    marginTop: 10,
  },
  quickDosesLabel: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 6,
    marginLeft: 2,
  },
  quickDosesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickDosePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  quickDosePillActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  quickDoseText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_MAIN,
  },
  quickDoseTextActive: {
    color: COLORS.WHITE,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 25,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  historyCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyHistoryBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryText: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    marginTop: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_MAIN,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  historyPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.PRIMARY_DARK,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyWeightValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ACCENT,
  },
  historyWeightLabel: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 14,
  },
  chartStyle: {
    borderRadius: 14,
    marginVertical: 4,
  },
  emptyChartBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_MAIN,
    marginTop: 8,
  },
  emptyChartSubtitle: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
});
