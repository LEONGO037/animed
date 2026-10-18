import React, { useState, useCallback, useRef } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { supabase, createIsolatedAuthClient } from '../lib/supabase';

interface RegisterPatientScreenProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type FormErrors = Partial<Record<'firstName' | 'lastNameP' | 'lastNameM' | 'birthDate' | 'email', string>>;

export const RegisterPatientScreen: React.FC<RegisterPatientScreenProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { user, profile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [firstName, setFirstName] = useState('');
  const [lastNameP, setLastNameP] = useState('');
  const [lastNameM, setLastNameM] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const clearError = useCallback((field: keyof FormErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // Manejador del cambio de fecha en el selector nativo (onValueChange y onDismiss)
  const handleDateValueChange = useCallback((_event: DateTimePickerChangeEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setBirthDate(selectedDate);
      clearError('birthDate');
    }
  }, [clearError]);

  const handleDateDismiss = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  // Formateador para visualización en español amigable
  const formatDateDisplay = (date: Date | null): string => {
    if (!date) return 'Seleccionar fecha de nacimiento';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // Formateador seguro YYYY-MM-DD para la base de datos sin desfase horario
  const formatDateForDb = (date: Date | null): string | null => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleRegister = useCallback(async () => {
    const cleanFirst = firstName.trim();
    const cleanLastP = lastNameP.trim();
    const cleanLastM = lastNameM.trim();
    const cleanDob = formatDateForDb(birthDate);
    const cleanEmail = email.trim().toLowerCase();

    // 1. Validaciones de campos obligatorios con remarcado en rojo
    const newErrors: FormErrors = {};

    if (!cleanFirst) {
      newErrors.firstName = 'Ingresa el nombre del paciente.';
    }
    if (!cleanLastP) {
      newErrors.lastNameP = 'Ingresa el apellido paterno.';
    }
    if (!cleanLastM) {
      newErrors.lastNameM = 'Ingresa el apellido materno.';
    }
    if (!birthDate) {
      newErrors.birthDate = 'Selecciona la fecha de nacimiento.';
    }
    if (!cleanEmail) {
      newErrors.email = 'Ingresa el correo electrónico.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        newErrors.email = 'Ingresa un correo electrónico válido (ej. paciente@correo.com).';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      Alert.alert(
        'Campos requeridos vacíos',
        'Por favor completa todos los campos marcados en rojo para registrar al paciente.'
      );
      return;
    }

    setErrors({});

    if (!user?.id) {
      Alert.alert('Error de sesión', 'No se detectó un médico autenticado.');
      return;
    }

    // 2. Generación automática de usuario: Nombre + Inicial Apellido Paterno (ej. juanp)
    const normalizedFirst = cleanFirst.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedLastPInitial = cleanLastP.charAt(0).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const generatedUsername = `${normalizedFirst}${normalizedLastPInitial}`;
    const defaultPassword = 'AniMed2022!';

    setIsSubmitting(true);

    try {
      // 3. Cliente de autenticación aislado para no cerrar la sesión del médico
      const isolatedClient = createIsolatedAuthClient();

      // Registro en auth.users
      const { data: authData, error: authError } = await isolatedClient.auth.signUp({
        email: cleanEmail,
        password: defaultPassword,
        options: {
          data: {
            role: 'patient',
            username: generatedUsername,
            first_name: cleanFirst,
            last_name_p: cleanLastP,
            last_name_m: cleanLastM || null,
            dob: cleanDob || null,
            assigned_doctor_id: user.id,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const newUserId = authData?.user?.id;
      if (!newUserId) {
        throw new Error('No se pudo generar el identificador del paciente.');
      }

      // 4. Guardar los datos en la tabla pública profiles vinculando al médico actual
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: newUserId,
        role: 'patient',
        email: cleanEmail,
        username: generatedUsername,
        first_name: cleanFirst,
        last_name_p: cleanLastP,
        last_name_m: cleanLastM || null,
        dob: cleanDob || null,
        assigned_doctor_id: user.id,
      });

      if (profileError) {
        throw new Error(profileError.message);
      }

      // 5. Feedback de éxito
      Alert.alert(
        '¡Paciente Registrado con Éxito!',
        `El paciente ha sido vinculado a tu cuenta.\n\n• Usuario asignado: ${generatedUsername}\n• Correo: ${cleanEmail}\n• Contraseña temporal: ${defaultPassword}`,
        [
          {
            text: 'Aceptar',
            onPress: () => {
              // Limpiar formulario y volver
              setFirstName('');
              setLastNameP('');
              setLastNameM('');
              setBirthDate(null);
              setEmail('');
              if (onSuccess) {
                onSuccess();
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error al registrar paciente', err.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  }, [firstName, lastNameP, lastNameM, birthDate, email, user?.id, onSuccess]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Barra Superior con botón para volver */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onCancel}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Volver a la lista de pacientes"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY_DARK} />
        </TouchableOpacity>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Registrar Paciente</Text>
          <Text style={styles.headerSubtitle}>
            Dr. {profile?.last_name_p ? `${profile.first_name} ${profile.last_name_p}` : 'Médico Asignado'}
          </Text>
        </View>
      </View>

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
          {/* Tarjeta Informativa de Registro */}
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.PRIMARY} style={styles.bannerIcon} />
            <Text style={styles.bannerText}>
              El paciente quedará vinculado automáticamente a tu panel para seguimiento de Tirzepatida.
            </Text>
          </View>

          {/* Formulario en Tarjeta Blanca (SURFACE) */}
          <View style={styles.formCard}>
            {/* Campo: Nombre(s) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, !!errors.firstName && styles.labelError]}>
                Nombre(s) <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={[styles.inputContainer, !!errors.firstName && styles.inputContainerError]}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={errors.firstName ? COLORS.ERROR : COLORS.PRIMARY}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Juan Carlos"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  value={firstName}
                  onChangeText={(val) => {
                    setFirstName(val);
                    clearError('firstName');
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              {!!errors.firstName && (
                <View style={styles.fieldErrorRow}>
                  <Ionicons name="alert-circle" size={14} color={COLORS.ERROR} style={styles.fieldErrorIcon} />
                  <Text style={styles.fieldErrorText}>{errors.firstName}</Text>
                </View>
              )}
            </View>

            {/* Fila: Apellido Paterno & Materno */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={[styles.label, !!errors.lastNameP && styles.labelError]}>
                  Apellido Paterno <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={[styles.inputContainer, !!errors.lastNameP && styles.inputContainerError]}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={errors.lastNameP ? COLORS.ERROR : COLORS.PRIMARY}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. Pérez"
                    placeholderTextColor={COLORS.TEXT_MUTED}
                    value={lastNameP}
                    onChangeText={(val) => {
                      setLastNameP(val);
                      clearError('lastNameP');
                    }}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
                {!!errors.lastNameP && (
                  <View style={styles.fieldErrorRow}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.ERROR} style={styles.fieldErrorIcon} />
                    <Text style={styles.fieldErrorText}>{errors.lastNameP}</Text>
                  </View>
                )}
              </View>

              <View style={styles.col}>
                <Text style={[styles.label, !!errors.lastNameM && styles.labelError]}>
                  Apellido Materno <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={[styles.inputContainer, !!errors.lastNameM && styles.inputContainerError]}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={errors.lastNameM ? COLORS.ERROR : COLORS.PRIMARY}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. Gómez"
                    placeholderTextColor={COLORS.TEXT_MUTED}
                    value={lastNameM}
                    onChangeText={(val) => {
                      setLastNameM(val);
                      clearError('lastNameM');
                    }}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
                {!!errors.lastNameM && (
                  <View style={styles.fieldErrorRow}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.ERROR} style={styles.fieldErrorIcon} />
                    <Text style={styles.fieldErrorText}>{errors.lastNameM}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Campo: Fecha de Nacimiento con DateTimePicker Nativo */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, !!errors.birthDate && styles.labelError]}>
                Fecha de Nacimiento <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.datePickerButton, !!errors.birthDate && styles.datePickerButtonError]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Seleccionar fecha de nacimiento"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={errors.birthDate ? COLORS.ERROR : COLORS.PRIMARY}
                  style={styles.inputIcon}
                />
                <Text style={[styles.dateText, !birthDate && styles.placeholderText]}>
                  {formatDateDisplay(birthDate)}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={errors.birthDate ? COLORS.ERROR : COLORS.TEXT_MUTED}
                />
              </TouchableOpacity>
              {!!errors.birthDate && (
                <View style={styles.fieldErrorRow}>
                  <Ionicons name="alert-circle" size={14} color={COLORS.ERROR} style={styles.fieldErrorIcon} />
                  <Text style={styles.fieldErrorText}>{errors.birthDate}</Text>
                </View>
              )}
            </View>

            {/* DateTimePicker para Android */}
            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={birthDate || new Date(1995, 0, 1)}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onValueChange={handleDateValueChange}
                onDismiss={handleDateDismiss}
              />
            )}

            {/* Modal DateTimePicker para iOS */}
            {Platform.OS === 'ios' && (
              <Modal
                visible={showDatePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.modalBackdrop}>
                  <View style={styles.iosPickerContainer}>
                    <View style={styles.iosPickerHeader}>
                      <Text style={styles.iosPickerTitle}>Fecha de Nacimiento</Text>
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                        style={styles.iosDoneButton}
                        accessibilityRole="button"
                        accessibilityLabel="Confirmar fecha"
                      >
                        <Text style={styles.iosDoneButtonText}>Listo</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={birthDate || new Date(1995, 0, 1)}
                      mode="date"
                      display="spinner"
                      maximumDate={new Date()}
                      textColor={COLORS.TEXT_MAIN}
                      onValueChange={handleDateValueChange}
                      onDismiss={handleDateDismiss}
                      locale="es-ES"
                    />
                  </View>
                </View>
              </Modal>
            )}

            {/* Campo: Correo Electrónico */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, !!errors.email && styles.labelError]}>
                Correo Electrónico <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={[styles.inputContainer, !!errors.email && styles.inputContainerError]}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={errors.email ? COLORS.ERROR : COLORS.PRIMARY}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="paciente@correo.com"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    clearError('email');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                />
              </View>
              {!!errors.email && (
                <View style={styles.fieldErrorRow}>
                  <Ionicons name="alert-circle" size={14} color={COLORS.ERROR} style={styles.fieldErrorIcon} />
                  <Text style={styles.fieldErrorText}>{errors.email}</Text>
                </View>
              )}
            </View>

            {/* Aviso sobre credenciales automáticas */}
            <View style={styles.credentialsNotice}>
              <Ionicons name="key-outline" size={16} color={COLORS.TEXT_MUTED} style={{ marginRight: 6 }} />
              <Text style={styles.credentialsText}>
                Contraseña inicial: <Text style={styles.credentialsCode}>AniMed2022!</Text>
              </Text>
            </View>

            {/* Botón de Acción con color ACCENT (#F08A24) */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isSubmitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Registrar nuevo paciente"
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.SURFACE} />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="person-add-outline" size={20} color={COLORS.SURFACE} style={styles.buttonIcon} />
                  <Text style={styles.submitButtonText}>Registrar Paciente</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.TEXT_MAIN,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  bannerIcon: {
    marginRight: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.PRIMARY_DARK,
    lineHeight: 18,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  col: {
    flex: 0.48,
  },
  label: {
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
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputContainerError: {
    borderColor: COLORS.ERROR_BORDER,
    backgroundColor: COLORS.ERROR_LIGHT,
    borderWidth: 1.5,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  datePickerButtonError: {
    borderColor: COLORS.ERROR_BORDER,
    backgroundColor: COLORS.ERROR_LIGHT,
    borderWidth: 1.5,
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
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.TEXT_MAIN,
    paddingVertical: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.TEXT_MAIN,
    textTransform: 'capitalize',
  },
  placeholderText: {
    color: COLORS.TEXT_MUTED,
    textTransform: 'none',
  },
  credentialsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
    marginTop: 4,
  },
  credentialsText: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  credentialsCode: {
    fontWeight: '700',
    color: COLORS.PRIMARY_DARK,
  },
  submitButton: {
    backgroundColor: COLORS.ACCENT,
    borderRadius: 26,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
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
  submitButtonText: {
    color: COLORS.SURFACE,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  iosPickerContainer: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iosPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_MAIN,
  },
  iosDoneButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  iosDoneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
});
