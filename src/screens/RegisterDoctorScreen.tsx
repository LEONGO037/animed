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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../theme/colors';
import { CustomHeader } from '../components/CustomHeader';
import { supabase, createIsolatedAuthClient } from '../lib/supabase';

interface RegisterDoctorScreenProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type FormErrors = Partial<Record<'firstName' | 'lastNameP' | 'lastNameM' | 'email', string>>;

export const RegisterDoctorScreen: React.FC<RegisterDoctorScreenProps> = ({
  onSuccess,
  onCancel,
}) => {
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);

  const [firstName, setFirstName] = useState('');
  const [lastNameP, setLastNameP] = useState('');
  const [lastNameM, setLastNameM] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Limpieza dinámica de errores cuando el usuario escribe
  const clearError = useCallback((field: keyof FormErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleGoBack = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else if (navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, onCancel]);

  const handleRegister = useCallback(async () => {
    const cleanFirst = firstName.trim();
    const cleanLastP = lastNameP.trim();
    const cleanLastM = lastNameM.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Validaciones de campos obligatorios con remarcado en rojo
    const newErrors: FormErrors = {};

    if (!cleanFirst) {
      newErrors.firstName = 'Ingresa el nombre del médico.';
    }
    if (!cleanLastP) {
      newErrors.lastNameP = 'Ingresa el apellido paterno.';
    }
    if (!cleanLastM) {
      newErrors.lastNameM = 'Ingresa el apellido materno.';
    }
    if (!cleanEmail) {
      newErrors.email = 'Ingresa el correo electrónico.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        newErrors.email = 'Ingresa un correo electrónico válido (ej. doctor@animed.com).';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      Alert.alert(
        'Campos requeridos incompletos',
        'Por favor completa todos los campos marcados en rojo para registrar al médico.'
      );
      return;
    }

    setErrors({});

    // 2. Generación automática de usuario: Nombre + Inicial Apellido Paterno (ej. marceloa)
    const normalizedFirst = cleanFirst
      .split(' ')[0]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const normalizedLastPInitial = cleanLastP
      .charAt(0)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const generatedUsername = `${normalizedFirst}${normalizedLastPInitial}`;
    const defaultPassword = 'AniMed2022!';

    setIsSubmitting(true);

    try {
      // 3. Cliente de autenticación aislado para no cerrar la sesión del usuario actual
      const isolatedClient = createIsolatedAuthClient();

      // Registro en auth.users
      const { data: authData, error: authError } = await isolatedClient.auth.signUp({
        email: cleanEmail,
        password: defaultPassword,
        options: {
          data: {
            role: 'doctor',
            username: generatedUsername,
            first_name: cleanFirst,
            last_name_p: cleanLastP,
            last_name_m: cleanLastM || null,
            email: cleanEmail,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const newUserId = authData?.user?.id;
      if (!newUserId) {
        throw new Error('No se pudo obtener el identificador único del nuevo médico.');
      }

      // 4. Inserción directa en la tabla pública profiles forzando role = 'doctor'
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: newUserId,
        role: 'doctor',
        username: generatedUsername,
        first_name: cleanFirst,
        last_name_p: cleanLastP,
        last_name_m: cleanLastM || null,
        email: cleanEmail,
      });

      if (profileError) {
        console.warn('Advertencia de perfil:', profileError.message);
      }

      // 5. Feedback visual de éxito y navegación hacia atrás
      Alert.alert(
        'Médico Registrado',
        `El Dr. ${cleanFirst} ${cleanLastP} ha sido registrado exitosamente con rol de Especialista.\n\nUsuario: ${generatedUsername}\nContraseña inicial: ${defaultPassword}`,
        [
          {
            text: 'Aceptar',
            onPress: () => {
              if (onSuccess) {
                onSuccess();
              } else if (navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Error al registrar médico:', err);
      let errorMsg = 'Ocurrió un error al registrar al médico en Supabase.';
      if (err.message?.includes('already registered')) {
        errorMsg = 'El correo electrónico ingresado ya se encuentra registrado.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      Alert.alert('Error al Registrar', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }, [firstName, lastNameP, lastNameM, email, navigation, onSuccess]);

  return (
    <View style={styles.container}>
      {/* Componente Reutilizable CustomHeader con botón de volver */}
      <CustomHeader
        title="Registrar Médico"
        showBackButton={true}
        onBackPress={handleGoBack}
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
          {/* Banner Informativo */}
          <View style={styles.infoBanner}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={COLORS.PRIMARY}
              style={styles.bannerIcon}
            />
            <Text style={styles.bannerText}>
              El nuevo médico tendrá permisos de especialista para gestionar pacientes y supervisar dosis de Tirzepatida.
            </Text>
          </View>

          {/* Tarjeta del Formulario (SURFACE) */}
          <View style={styles.formCard}>
            {/* Campo: Nombre(s) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, !!errors.firstName && styles.labelError]}>
                Nombre(s) <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  !!errors.firstName && styles.inputContainerError,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={errors.firstName ? COLORS.ERROR : COLORS.PRIMARY}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Roberto"
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
                  <Ionicons
                    name="alert-circle"
                    size={14}
                    color={COLORS.ERROR}
                    style={styles.fieldErrorIcon}
                  />
                  <Text style={styles.fieldErrorText}>{errors.firstName}</Text>
                </View>
              )}
            </View>

            {/* Fila: Apellidos Paterno & Materno */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={[styles.label, !!errors.lastNameP && styles.labelError]}>
                  Apellido Paterno <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    !!errors.lastNameP && styles.inputContainerError,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={errors.lastNameP ? COLORS.ERROR : COLORS.PRIMARY}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. Morales"
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
                    <Ionicons
                      name="alert-circle"
                      size={14}
                      color={COLORS.ERROR}
                      style={styles.fieldErrorIcon}
                    />
                    <Text style={styles.fieldErrorText}>{errors.lastNameP}</Text>
                  </View>
                )}
              </View>

              <View style={styles.col}>
                <Text style={[styles.label, !!errors.lastNameM && styles.labelError]}>
                  Apellido Materno <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    !!errors.lastNameM && styles.inputContainerError,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={errors.lastNameM ? COLORS.ERROR : COLORS.PRIMARY}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. Sánchez"
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
                    <Ionicons
                      name="alert-circle"
                      size={14}
                      color={COLORS.ERROR}
                      style={styles.fieldErrorIcon}
                    />
                    <Text style={styles.fieldErrorText}>{errors.lastNameM}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Campo: Correo Electrónico */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, !!errors.email && styles.labelError]}>
                Correo Electrónico <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  !!errors.email && styles.inputContainerError,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={errors.email ? COLORS.ERROR : COLORS.PRIMARY}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="doctor@animed.com"
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
                  <Ionicons
                    name="alert-circle"
                    size={14}
                    color={COLORS.ERROR}
                    style={styles.fieldErrorIcon}
                  />
                  <Text style={styles.fieldErrorText}>{errors.email}</Text>
                </View>
              )}
            </View>

            {/* Aviso sobre credenciales por defecto */}
            <View style={styles.credentialsNotice}>
              <Ionicons
                name="key-outline"
                size={16}
                color={COLORS.TEXT_MUTED}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.credentialsText}>
                Contraseña temporal por defecto:{' '}
                <Text style={styles.credentialsCode}>AniMed2022!</Text>
              </Text>
            </View>

            {/* Botón Principal (Color PRIMARY) */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isSubmitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Guardar y Registrar Médico"
            >
              {isSubmitting ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                  <Text style={[styles.submitButtonText, { marginLeft: 10 }]}>
                    Registrando médico...
                  </Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={COLORS.WHITE}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.submitButtonText}>
                    Guardar y Registrar Médico
                  </Text>
                </View>
              )}
            </TouchableOpacity>
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
    borderColor: COLORS.BORDER,
  },
  inputGroup: {
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
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
    paddingHorizontal: 16,
    minHeight: 52,
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
    fontSize: 15,
    color: COLORS.TEXT_MAIN,
    paddingVertical: 14,
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
  credentialsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 24,
    marginTop: 4,
  },
  credentialsText: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    flex: 1,
  },
  credentialsCode: {
    fontWeight: '700',
    color: COLORS.PRIMARY_DARK,
  },
  submitButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 26,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonDisabled: {
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
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
