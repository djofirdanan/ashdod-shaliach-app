// ============================================================
// ROUTE OVERLAY - אשדוד-שליח Courier App
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';

interface RouteOverlayProps {
  distanceRemaining: number; // km
  etaMinutes: number;
  nextInstruction?: string;
  destinationName?: string;
}

export const RouteOverlay: React.FC<RouteOverlayProps> = ({
  distanceRemaining,
  etaMinutes,
  nextInstruction,
  destinationName,
}) => {
  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} מ'`;
    }
    return `${km.toFixed(1)} ק"מ`;
  };

  const formatEta = (minutes: number): string => {
    if (minutes < 1) return 'עוד רגע';
    if (minutes < 60) return `${Math.round(minutes)} דק'`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}ש' ${mins}ד'`;
  };

  const etaTime = new Date(Date.now() + etaMinutes * 60 * 1000).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      {/* Main info row */}
      <View style={styles.mainRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{formatDistance(distanceRemaining)}</Text>
          <Text style={styles.infoLabel}>נותרו</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{formatEta(etaMinutes)}</Text>
          <Text style={styles.infoLabel}>זמן נסיעה</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoValue}>{etaTime}</Text>
          <Text style={styles.infoLabel}>הגעה ב-</Text>
        </View>
      </View>

      {/* Next turn instruction */}
      {nextInstruction && (
        <View style={styles.instructionRow}>
          <Text style={styles.instructionIcon}>↑</Text>
          <Text style={styles.instructionText} numberOfLines={1}>
            {nextInstruction}
          </Text>
        </View>
      )}

      {/* Destination */}
      {destinationName && (
        <View style={styles.destinationRow}>
          <Text style={styles.destinationIcon}>📍</Text>
          <Text style={styles.destinationText} numberOfLines={1}>
            {destinationName}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Spacing.base,
    left: Spacing.base,
    right: Spacing.base,
    backgroundColor: 'rgba(26,27,46,0.92)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  infoLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  infoDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: Spacing.sm,
  },
  instructionIcon: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '800',
    width: 24,
    textAlign: 'center',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: Spacing.sm,
  },
  destinationIcon: {
    fontSize: 14,
  },
  destinationText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
});

export default RouteOverlay;
