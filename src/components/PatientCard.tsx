import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { Patient } from '../types';

interface PatientCardProps {
  patient: Patient;
  onPress: (patient: Patient) => void;
}

export const CARD_HEIGHT = 80;

export const PatientCard: React.FC<PatientCardProps> = React.memo(({ patient, onPress }) => {
  const handlePress = () => {
    onPress(patient);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Ver expediente de ${patient.name}`}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={styles.infoContainer}>
        <Text style={styles.nameText} numberOfLines={1}>
          {patient.name}
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="ribbon" size={13} color={COLORS.BADGE_TEXT} style={styles.badgeIcon} />
            <Text style={styles.badgeText}>{patient.statusText || 'Progress'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_MUTED} />
      </View>
    </TouchableOpacity>
  );
});

PatientCard.displayName = 'PatientCard';

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_MAIN,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BADGE_BG,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.BADGE_TEXT,
  },
  actionContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
