import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { supabase, createIsolatedAuthClient } from '../lib/supabase';

interface RegisterPatientScreenProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const RegisterPatientScreen: React.FC<RegisterPatientScreenProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { user, profile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastNameP, setLastNameP] = useState('');
  const [lastNameM, setLastNameM] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formateador simple de fecha AAAA-MM-DD conforme escribe el usuario
  const handleDobChange = (text: string) => {
    // Permite dígitos y guiones
    const cleaned = text.replace(/[^0-9-]/g, '');
    if (cleaned.length <= 10) {
      setDob(cleaned);
    }
  };

  const handleRegister = useCallback(async () => {
    const cleanFirst = firstName.trim();
    const cleanLastP = lastNameP.trim();
    const cleanLastM = lastNameM.trim();
    const cleanDob = dob.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Validaciones de campos obligatorios
    if (!cleanFirst) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre del paciente.');
      return;
    }
    if (!cleanLastP) {
      Alert.alert('Campo requerido', 'Por favor ingresa el apellido paterno del paciente.');
      return;
    }
    if (!cleanEmail) {
      Alert.alert('Campo requerido', 'Por favor ingresa el correo electrónico del paciente.');
      return;
    }

    // Validación básica de formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      Alert.alert('Correo inválido', 'Por favor ingresa un correo electrónico válido (ej. paciente@gmail.com).');
      return;
    }

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
              setDob('');
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
  }, [firstName, lastNameP, lastNameM, dob, email, user?.id, onSuccess]);

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
              <Text style={styles.label}>
                Nombre(s) <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={COLORS.PRIMARY} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Juan Carlos"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Fila: Apellido Paterno & Materno */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>
                  Apellido Paterno <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={COLORS.PRIMARY} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. Pérez"
                    placeholderTextColor={COLORS.TEXT_MUTED}
                    value={lastNameP}
                    onChangeText={setLastNameP}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.col}>
                <Text style={styles.label}>Apellido Materno</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={COLORS.PRIMARY} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. Gómez"
                    placeholderTextColor={COLORS.TEXT_MUTED}
                    value={lastNameM}
                    onChangeText={setLastNameM}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </View>

            {/* Campo: Fecha de Nacimiento */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fecha de Nacimiento</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.PRIMARY} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="AAAA-MM-DD (Ej. 1990-06-15)"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  value={dob}
                  onChangeText={handleDobChange}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={10}
                />
              </View>
            </View>

            {/* Campo: Correo Electrónico */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Correo Electrónico <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.PRIMARY} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="paciente@correo.com"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                />
              </View>
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
  requiredAsterisk: {
    color: '#DC2626',
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
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.TEXT_MAIN,
    paddingVertical: 12,
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
});
