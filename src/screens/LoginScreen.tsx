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
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const { width: screenWidth } = Dimensions.get('window');
const WAVE_HEIGHT = 160;

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!username.trim() || !password) {
      Alert.alert('Datos requeridos', 'Por favor ingresa tu usuario y contraseña.');
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(username, password);
    setIsSubmitting(false);

    if (result.error) {
      Alert.alert('Error de Autenticación', result.error);
    }
  }, [username, password, signIn]);

  const totalWaveHeight = WAVE_HEIGHT + insets.top;

  return (
    <View style={styles.screenContainer}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Cabecera Tipo OLA en paleta azul oficial */}
          <View style={[styles.waveContainer, { height: totalWaveHeight }]}>
            <Svg
              width={screenWidth}
              height={totalWaveHeight}
              viewBox={`0 0 ${screenWidth} ${totalWaveHeight}`}
              style={styles.svgAbsolute}
            >
              <Defs>
                <LinearGradient id="waveGradientMain" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={COLORS.PRIMARY} />
                  <Stop offset="100%" stopColor={COLORS.PRIMARY_DARK} />
                </LinearGradient>
                <LinearGradient id="waveGradientSecondary" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#60A5FA" stopOpacity={0.35} />
                  <Stop offset="100%" stopColor={COLORS.PRIMARY} stopOpacity={0.2} />
                </LinearGradient>
              </Defs>

              {/* Ola secundaria suave de fondo */}
              <Path
                d={`M0 0 L${screenWidth} 0 L${screenWidth} ${totalWaveHeight - 20} C${screenWidth * 0.72} ${totalWaveHeight + 20}, ${screenWidth * 0.3} ${totalWaveHeight - 50}, 0 ${totalWaveHeight - 10} Z`}
                fill="url(#waveGradientSecondary)"
              />

              {/* Ola principal frontal */}
              <Path
                d={`M0 0 L${screenWidth} 0 L${screenWidth} ${totalWaveHeight - 40} C${screenWidth * 0.68} ${totalWaveHeight + 10}, ${screenWidth * 0.35} ${totalWaveHeight - 35}, 0 ${totalWaveHeight - 15} Z`}
                fill="url(#waveGradientMain)"
              />
            </Svg>
          </View>

          {/* Formulario Fluido */}
          <View style={styles.formContainer}>
            {/* Logo Oficial AniMed Centrado */}
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../assets/animed_logo.jpg')}
                style={styles.logoImage}
                resizeMode="contain"
                accessibilityLabel="Logo AniMed"
              />
            </View>

            {/* Input Usuario */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Usuario o Correo</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={COLORS.PRIMARY}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. marceloa o usuario@animed.app"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                />
              </View>
            </View>

            {/* Input Contraseña */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.PRIMARY}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Tu contraseña"
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Alternar visualización de contraseña"
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.TEXT_MUTED}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Botón Principal con color ACCENT (Naranja vibrante del logo) */}
            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Iniciar sesión en AniMed"
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.SURFACE} />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.primaryButtonText}>Iniciar Sesión</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.SURFACE} style={styles.buttonArrow} />
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
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  waveContainer: {
    width: screenWidth,
    position: 'relative',
    overflow: 'hidden',
  },
  svgAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  logoImage: {
    width: '100%',
    height: 120,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_MAIN,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.TEXT_MAIN,
    paddingVertical: 14,
  },
  eyeButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.ACCENT,
    borderRadius: 26,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
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
  primaryButtonText: {
    color: COLORS.SURFACE,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonArrow: {
    marginLeft: 8,
  },
});
