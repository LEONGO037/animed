import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { supabase } from '../lib/supabase';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onClose,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setErrorMessage(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    if (isLoading) return;
    resetForm();
    onClose();
  };

  const handleUpdatePassword = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);

    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanPass || !cleanConfirm) {
      setErrorMessage('Por favor completa ambos campos.');
      return;
    }

    if (cleanPass.length < 6) {
      setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setErrorMessage('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: cleanPass,
      });

      if (error) {
        setErrorMessage(error.message || 'No se pudo actualizar la contraseña.');
        return;
      }

      resetForm();
      onClose();
      Alert.alert(
        '¡Contraseña Actualizada!',
        'Tu contraseña ha sido modificada con éxito. Úsala en tu próximo inicio de sesión.',
        [{ text: 'Aceptar', style: 'default' }]
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error inesperado al actualizar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.dialogCard}>
              {/* Encabezado con Icono */}
              <View style={styles.header}>
                <View style={styles.iconCircle}>
                  <Ionicons name="key" size={26} color={COLORS.PRIMARY} />
                </View>
                <Text style={styles.title}>Cambiar Contraseña</Text>
                <Text style={styles.subtitle}>
                  Ingresa tu nueva clave de acceso para mantener tu cuenta protegida.
                </Text>
              </View>

              {/* Mensaje de Error */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={COLORS.ERROR}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Campo: Nueva Contraseña */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Nueva Contraseña</Text>
                <View
                  style={[
                    styles.inputContainer,
                    errorMessage ? styles.inputErrorBorder : null,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={COLORS.TEXT_MUTED}
                    style={styles.inputLeftIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={(val) => {
                      setNewPassword(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword((prev) => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={COLORS.TEXT_MUTED}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Campo: Confirmar Contraseña */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Confirmar Contraseña</Text>
                <View
                  style={[
                    styles.inputContainer,
                    errorMessage ? styles.inputErrorBorder : null,
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={COLORS.TEXT_MUTED}
                    style={styles.inputLeftIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Repite tu contraseña"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={COLORS.TEXT_MUTED}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Botones de Acción */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    isLoading && styles.saveButtonDisabled,
                  ]}
                  onPress={handleUpdatePassword}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={COLORS.WHITE} />
                  ) : (
                    <Text style={styles.saveButtonText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  keyboardAvoid: {
    width: '100%',
    alignItems: 'center',
  },
  dialogCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.TEXT_MAIN,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.ERROR_LIGHT,
    borderColor: COLORS.ERROR_BORDER,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.ERROR,
    fontWeight: '600',
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_MAIN,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 12,
    height: 48,
  },
  inputErrorBorder: {
    borderColor: COLORS.ERROR,
    backgroundColor: '#FEF2F2',
  },
  inputLeftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.TEXT_MAIN,
    height: '100%',
  },
  eyeButton: {
    padding: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
  },
  saveButton: {
    flex: 1.4,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.WHITE,
  },
});
