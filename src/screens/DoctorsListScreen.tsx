import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../theme/colors';
import { CustomHeader } from '../components/CustomHeader';
import { supabase } from '../lib/supabase';
import { Doctor, DoctorsStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<DoctorsStackParamList, 'DoctorsList'>;

interface DoctorsListScreenProps {
  onAddDoctorPress?: () => void;
}

export const DoctorsListScreen: React.FC<DoctorsListScreenProps> = ({ onAddDoctorPress }) => {
  const navigation = useNavigation<NavigationProp>();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Consulta optimizada a Supabase filtrando exclusivamente role = 'doctor'
  const fetchDoctors = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name_p, last_name_m, email, username, created_at')
        .eq('role', 'doctor')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Error al consultar médicos en Supabase:', error.message);
      } else if (data) {
        const formattedDoctors: Doctor[] = data.map((d) => {
          const fullName = [d.first_name, d.last_name_p, d.last_name_m]
            .filter(Boolean)
            .join(' ');

          return {
            id: d.id,
            name: fullName.length > 0 ? `Dr. ${fullName}` : 'Médico Especialista',
            email: d.email || `${d.username}@animed.app`,
            username: d.username,
            created_at: d.created_at,
          };
        });

        setDoctors(formattedDoctors);
      }
    } catch (err: any) {
      console.warn('Excepción al cargar médicos:', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Actualización automática al enfocar la pestaña
  useFocusEffect(
    useCallback(() => {
      fetchDoctors(false);
    }, [fetchDoctors])
  );

  const handlePressFab = useCallback(() => {
    if (onAddDoctorPress) {
      onAddDoctorPress();
    } else {
      navigation.navigate('RegisterDoctor');
    }
  }, [navigation, onAddDoctorPress]);

  const keyExtractor = useCallback((item: Doctor) => item.id, []);

  const renderDoctorCard = useCallback(({ item }: { item: Doctor }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {/* Avatar médico */}
          <View style={styles.avatarCircle}>
            <Ionicons name="medkit" size={22} color={COLORS.PRIMARY} />
          </View>

          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.emailRow}>
              <Ionicons
                name="mail-outline"
                size={14}
                color={COLORS.TEXT_MUTED}
                style={styles.emailIcon}
              />
              <Text style={styles.doctorEmail} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Pie de tarjeta con detalles y badge de rol */}
        <View style={styles.cardFooter}>
          <View style={styles.badgeRole}>
            <Ionicons
              name="shield-checkmark"
              size={12}
              color={COLORS.PRIMARY_DARK}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.badgeRoleText}>Especialista</Text>
          </View>
          <Text style={styles.usernameText}>@{item.username}</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* Header reutilizable independiente */}
      <CustomHeader title="Directorio Médico" showBackButton={false} />

      {/* Contenido principal */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Cargando directorio médico...</Text>
        </View>
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={keyExtractor}
          renderItem={renderDoctorCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchDoctors(true)}
              colors={[COLORS.PRIMARY]}
              tintColor={COLORS.PRIMARY}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeaderWrapper}>
              <View style={styles.headerBanner}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={COLORS.PRIMARY}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.headerBannerText}>
                  Médicos autorizados para el control y seguimiento de pacientes en AniMed ({doctors.length}).
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="people-outline" size={36} color={COLORS.TEXT_MUTED} />
              </View>
              <Text style={styles.emptyTitle}>No hay médicos registrados</Text>
              <Text style={styles.emptySubtitle}>
                Presiona el botón naranja inferior (+) para agregar al primer médico especialista.
              </Text>
            </View>
          }
        />
      )}

      {/* Botón de Acción Flotante (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handlePressFab}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Agregar Nuevo Médico"
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 96, // Espacio para el FAB y el bottom tab
  },
  listHeaderWrapper: {
    marginBottom: 12,
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  headerBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.PRIMARY_DARK,
    lineHeight: 18,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.BADGE_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_MAIN,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailIcon: {
    marginRight: 6,
  },
  doctorEmail: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    fontWeight: '400',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  badgeRole: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BADGE_BG,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeRoleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.PRIMARY_DARK,
  },
  usernameText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
  },
  emptyContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT_MAIN,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 99,
  },
});
