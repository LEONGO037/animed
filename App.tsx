import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LineChart } from 'react-native-chart-kit';
import { supabase, isSupabaseConfigured, createIsolatedAuthClient } from './src/lib/supabase';

const screenWidth = Dimensions.get('window').width;

interface Profile {
  id: string;
  role: 'doctor' | 'patient';
  username: string;
  first_name: string;
  last_name_p: string;
  last_name_m?: string;
  dob?: string;
  assigned_doctor_id?: string;
}

interface Injection {
  id: string;
  patient_id: string;
  injection_date: string;
  dose_mg: number;
  weight_kg: number;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error al obtener perfil:', error.message);
      }
      if (data) {
        setUserProfile(data);
      }
    } catch (err: any) {
      console.warn('Excepción al consultar perfil:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text style={styles.loadingText}>Cargando AniMed...</Text>
      </View>
    );
  }

  if (!session) {
    return <LoginScreen onLoginSuccess={() => fetchUserProfile(session?.user?.id)} />;
  }

  if (userProfile?.role === 'doctor') {
    return <DoctorDashboard session={session} profile={userProfile} onLogout={() => supabase.auth.signOut()} />;
  }

  return <PatientDashboard session={session} profile={userProfile} onLogout={() => supabase.auth.signOut()} />;
}

// ==============================================================
// 1. PANTALLA DE INICIO DE SESIÓN
// ==============================================================
function LoginScreen({ onLoginSuccess }: { onLoginSuccess?: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Datos requeridos', 'Por favor ingresa tu usuario y contraseña.');
      return;
    }

    if (!isSupabaseConfigured()) {
      Alert.alert(
        'Configuración de Supabase Requerida',
        'Configura tus credenciales de Supabase en .env o en src/lib/supabase.ts para conectar la base de datos.'
      );
      return;
    }

    setSubmitting(true);
    // Convertimos el usuario (ej. juanp) a email para Supabase Auth nativo
    const cleanUser = username.toLowerCase().trim();
    const pseudoEmail = cleanUser.includes('@') ? cleanUser : `${cleanUser}@animed.app`;

    const { error } = await supabase.auth.signInWithPassword({
      email: pseudoEmail,
      password,
    });

    setSubmitting(false);

    if (error) {
      Alert.alert('Error de acceso', 'Usuario o contraseña incorrectos. Revisa tus credenciales.');
    } else if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <SafeAreaView style={styles.screenContainer}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.loginScroll}>
          <View style={styles.brandBox}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>AM</Text>
            </View>
            <Text style={styles.brandTitle}>AniMed</Text>
            <Text style={styles.brandSubtitle}>Control Tirzepatida & Seguimiento</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.formTitle}>Iniciar Sesión</Text>
            
            <Text style={styles.label}>Usuario</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. juanp o correo"
              placeholderTextColor="#8E8E93"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#8E8E93"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.primaryButton, submitting && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Entrar</Text>
              )}
            </TouchableOpacity>

            <View style={styles.hintBox}>
              <Text style={styles.hintTitle}>Formato de acceso:</Text>
              <Text style={styles.hintText}>• Usuario: Nombre + Inicial apellido (ej. juanp)</Text>
              <Text style={styles.hintText}>• Contraseña inicial por defecto: AniMed2022!</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==============================================================
// 2. DASHBOARD DEL PACIENTE
// ==============================================================
function PatientDashboard({
  session,
  profile,
  patientIdOverride = null,
  patientName = '',
  onBack,
  onLogout,
}: {
  session: any;
  profile?: Profile | null;
  patientIdOverride?: string | null;
  patientName?: string;
  onBack?: () => void;
  onLogout?: () => void;
}) {
  const [weight, setWeight] = useState('');
  const [dose, setDose] = useState('');
  const [history, setHistory] = useState<Injection[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saving, setSaving] = useState(false);

  const targetPatientId = patientIdOverride || session?.user?.id;
  const isReadOnly = Boolean(patientIdOverride);

  useEffect(() => {
    if (targetPatientId) {
      fetchHistory();
    }
  }, [targetPatientId]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('injections')
        .select('*')
        .eq('patient_id', targetPatientId)
        .order('injection_date', { ascending: false })
        .limit(6);

      if (error) {
        console.warn('Error al cargar historial:', error.message);
      } else if (data) {
        // Invertimos para graficar de izquierda (más antiguo) a derecha (más reciente)
        setHistory(data.slice().reverse());
      }
    } catch (err: any) {
      console.warn('Excepción al cargar inyecciones:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRegisterInjection = async () => {
    const numWeight = parseFloat(weight.replace(',', '.'));
    const numDose = parseFloat(dose.replace(',', '.'));

    if (isNaN(numWeight) || isNaN(numDose) || numWeight <= 0 || numDose <= 0) {
      Alert.alert('Datos inválidos', 'Por favor ingresa un peso y dosis válidos.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('injections').insert([
        {
          patient_id: targetPatientId,
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
      setSaving(false);
    }
  };

  // Cálculo del peso total perdido
  const firstWeight = history.length > 0 ? Number(history[0].weight_kg) : 0;
  const lastWeight = history.length > 0 ? Number(history[history.length - 1].weight_kg) : 0;
  const totalLost = history.length > 1 ? (firstWeight - lastWeight).toFixed(2) : '0.00';

  // Configuración de datos para la gráfica
  const chartLabels = history.length > 0
    ? history.map((item) => {
        const d = new Date(item.injection_date);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      })
    : ['-'];

  const chartWeights = history.length > 0 ? history.map((item) => Number(item.weight_kg)) : [0];

  // Si solo hay un punto, duplicamos para que la gráfica de línea trace correctamente
  const displayLabels = chartLabels.length === 1 ? [chartLabels[0], chartLabels[0]] : chartLabels;
  const displayData = chartWeights.length === 1 ? [chartWeights[0], chartWeights[0]] : chartWeights;

  return (
    <SafeAreaView style={styles.screenContainer}>
      <StatusBar style="dark" />
      {isReadOnly && (
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Volver a la lista</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{patientName || 'Detalle del Paciente'}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!isReadOnly && (
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.welcomeSubtitle}>Bienvenido,</Text>
              <Text style={styles.headerTitle}>
                {profile ? `${profile.first_name} ${profile.last_name_p}` : 'Paciente'}
              </Text>
            </View>
            <TouchableOpacity style={styles.logoutSmallButton} onPress={onLogout}>
              <Text style={styles.logoutSmallText}>Salir</Text>
            </TouchableOpacity>
          </View>
        )}

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
          <Text style={styles.cardSectionTitle}>Tendencia de Peso (Últimos Registros)</Text>
          {loadingHistory ? (
            <ActivityIndicator style={{ marginVertical: 30 }} color="#0A84FF" />
          ) : history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aún no hay registros de peso.</Text>
            </View>
          ) : (
            <LineChart
              data={{
                labels: displayLabels,
                datasets: [
                  {
                    data: displayData,
                    color: (opacity = 1) => `rgba(10, 132, 255, ${opacity})`,
                    strokeWidth: 3,
                  },
                ],
              }}
              width={screenWidth - 48}
              height={210}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(10, 132, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(99, 99, 102, ${opacity})`,
                style: { borderRadius: 12 },
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: '#0A84FF',
                },
              }}
              bezier
              style={styles.chartStyle}
            />
          )}
        </View>

        {/* Registro Rápido de Dosis (Solo para Paciente) */}
        {!isReadOnly && (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Registro de Hoy (Tirzepatida)</Text>
            <Text style={styles.inputHelp}>Fecha automática: {new Date().toLocaleDateString('es-ES')}</Text>

            <View style={styles.formRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Peso Actual (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 84.5"
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Dosis (mg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 2.5"
                  keyboardType="decimal-pad"
                  value={dose}
                  onChangeText={setDose}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
              onPress={handleRegisterInjection}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>+ Registrar Inyección</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Historial Detallado */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Historial de Dosis Recientes</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>Sin registros registrados.</Text>
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
}

// ==============================================================
// 3. DASHBOARD DEL MÉDICO
// ==============================================================
function DoctorDashboard({
  session,
  profile,
  onLogout,
}: {
  session: any;
  profile?: Profile | null;
  onLogout: () => void;
}) {
  const [patients, setPatients] = useState<Profile[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // Formulario nuevo paciente
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastNameP, setNewLastNameP] = useState('');
  const [newLastNameM, setNewLastNameM] = useState('');
  const [newDob, setNewDob] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchDoctorPatients();
  }, [session?.user?.id]);

  const fetchDoctorPatients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .eq('assigned_doctor_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error al cargar pacientes:', error.message);
      } else if (data) {
        setPatients(data);
      }
    } catch (err: any) {
      console.warn('Excepción al consultar pacientes:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async () => {
    if (!newFirstName.trim() || !newLastNameP.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa al menos Nombre y Apellido Paterno.');
      return;
    }

    setCreating(true);
    try {
      // Generar nombre de usuario: Nombre + Inicial apellido paterno (ej. juanp)
      const cleanFirst = newFirstName.trim().toLowerCase().replace(/\s+/g, '');
      const cleanLast = newLastNameP.trim().toLowerCase().charAt(0);
      const generatedUsername = `${cleanFirst}${cleanLast}`;
      const defaultPassword = 'AniMed2022!';
      const pseudoEmail = `${generatedUsername}@animed.app`;

      // Usamos un cliente aislado para no cerrar la sesión del médico
      const isolatedClient = createIsolatedAuthClient();

      const { data: authData, error: authError } = await isolatedClient.auth.signUp({
        email: pseudoEmail,
        password: defaultPassword,
        options: {
          data: {
            role: 'patient',
            username: generatedUsername,
            first_name: newFirstName.trim(),
            last_name_p: newLastNameP.trim(),
            last_name_m: newLastNameM.trim() || null,
            dob: newDob.trim() || null,
            assigned_doctor_id: session.user.id,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      // Si el trigger de la base de datos no está activado, insertamos manualmente en profiles como respaldo
      if (authData.user) {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          role: 'patient',
          username: generatedUsername,
          first_name: newFirstName.trim(),
          last_name_p: newLastNameP.trim(),
          last_name_m: newLastNameM.trim() || null,
          dob: newDob.trim() || null,
          assigned_doctor_id: session.user.id,
        });
      }

      Alert.alert(
        'Paciente Registrado con Éxito',
        `Credenciales generadas:\n• Usuario: ${generatedUsername}\n• Contraseña: ${defaultPassword}`
      );

      // Limpiar formulario y recargar
      setNewFirstName('');
      setNewLastNameP('');
      setNewLastNameM('');
      setNewDob('');
      setModalVisible(false);
      fetchDoctorPatients();
    } catch (err: any) {
      Alert.alert('Error al registrar paciente', err.message);
    } finally {
      setCreating(false);
    }
  };

  if (selectedPatient) {
    return (
      <PatientDashboard
        session={session}
        patientIdOverride={selectedPatient.id}
        patientName={`${selectedPatient.first_name} ${selectedPatient.last_name_p}`}
        onBack={() => setSelectedPatient(null)}
      />
    );
  }

  const filteredPatients = patients.filter((p) => {
    const full = `${p.first_name} ${p.last_name_p} ${p.username}`.toLowerCase();
    return full.includes(search.toLowerCase());
  });

  return (
    <SafeAreaView style={styles.screenContainer}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cabecera */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeSubtitle}>Panel Médico</Text>
            <Text style={styles.headerTitle}>
              Dr. {profile?.last_name_p ? `${profile.first_name} ${profile.last_name_p}` : 'Médico'}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutSmallButton} onPress={onLogout}>
            <Text style={styles.logoutSmallText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Tarjeta de Métricas */}
        <View style={styles.highlightCard}>
          <Text style={styles.highlightLabel}>Pacientes Activos a su Cargo</Text>
          <View style={styles.metricRow}>
            <Text style={styles.highlightValue}>{patients.length}</Text>
            <Text style={styles.highlightUnit}>pacientes</Text>
          </View>
          <Text style={styles.highlightSub}>Programa de Tirzepatida AniMed</Text>
        </View>

        {/* Botón de Acción Principal: Nuevo Paciente */}
        <TouchableOpacity style={styles.primaryButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.primaryButtonText}>+ Registrar Nuevo Paciente</Text>
        </TouchableOpacity>

        {/* Búsqueda y Lista de Pacientes */}
        <View style={[styles.card, { marginTop: 14 }]}>
          <Text style={styles.cardSectionTitle}>Lista de Pacientes</Text>
          
          <TextInput
            style={styles.searchBar}
            placeholder="Buscar por nombre o usuario..."
            placeholderTextColor="#8E8E93"
            value={search}
            onChangeText={setSearch}
          />

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color="#0A84FF" />
          ) : filteredPatients.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {search ? 'No se encontraron coincidencias.' : 'Aún no tienes pacientes asignados.'}
              </Text>
            </View>
          ) : (
            filteredPatients.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.patientRow}
                onPress={() => setSelectedPatient(p)}
              >
                <View style={styles.avatarMini}>
                  <Text style={styles.avatarMiniText}>
                    {p.first_name.charAt(0)}
                    {p.last_name_p.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientRowName}>
                    {p.first_name} {p.last_name_p} {p.last_name_m || ''}
                  </Text>
                  <Text style={styles.patientRowSub}>Usuario: {p.username}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal para Registro de Paciente */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registrar Nuevo Paciente</Text>
            <Text style={styles.modalSub}>
              El sistema generará el usuario automáticamente y asignará la contraseña AniMed2022!.
            </Text>

            <Text style={styles.label}>Nombre(s) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Juan Carlos"
              value={newFirstName}
              onChangeText={setNewFirstName}
            />

            <Text style={styles.label}>Apellido Paterno *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Pérez"
              value={newLastNameP}
              onChangeText={setNewLastNameP}
            />

            <Text style={styles.label}>Apellido Materno</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Gómez"
              value={newLastNameM}
              onChangeText={setNewLastNameM}
            />

            <Text style={styles.label}>Fecha de Nacimiento (AAAA-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 1985-06-20"
              value={newDob}
              onChangeText={setNewDob}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={creating}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }, creating && styles.buttonDisabled]}
                onPress={handleCreatePatient}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==============================================================
// ESTILOS DE LA APLICACIÓN (DISEÑO MÉDICO MODERNO)
// ==============================================================
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  keyboardContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#636366',
    fontWeight: '500',
  },
  loginScroll: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#0A84FF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 15,
    color: '#636366',
    marginTop: 4,
    fontWeight: '400',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  highlightCard: {
    backgroundColor: '#0A84FF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#0A84FF',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 4,
  },
  highlightLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
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
    color: '#FFFFFF',
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
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#636366',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  cardSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A3A3C',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  searchBar: {
    backgroundColor: '#F2F4F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputHelp: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logoutSmallButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutSmallText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    marginLeft: 12,
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: '#0A84FF',
    fontSize: 15,
    fontWeight: '600',
  },
  chartStyle: {
    marginVertical: 6,
    borderRadius: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  historySub: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  historyWeight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A84FF',
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarMiniText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 14,
  },
  patientRowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  patientRowSub: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: '#C7C7CC',
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  hintBox: {
    marginTop: 18,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
  },
  hintTitle: {
    fontWeight: '700',
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    color: '#636366',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#636366',
    fontWeight: '600',
    fontSize: 15,
  },
});
