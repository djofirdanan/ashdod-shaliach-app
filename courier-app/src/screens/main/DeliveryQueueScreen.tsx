// ============================================================
// DELIVERY QUEUE SCREEN - אשדוד-שליח Courier App
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ListRenderItemInfo,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootState, AppDispatch } from '../../store';
import { MainStackParamList, Delivery } from '../../types';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';

type DeliveryQueueScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'DeliveryQueue'>;
};

const DELIVERY_TYPE_LABELS: Record<string, string> = {
  food: '🍔 אוכל',
  package: '📦 חבילה',
  document: '📄 מסמך',
  grocery: '🛒 מצרכים',
  pharmacy: '💊 תרופות',
  other: '📫 אחר',
};

export const DeliveryQueueScreen: React.FC<DeliveryQueueScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeDeliveries } = useSelector((s: RootState) => s.delivery);

  const handleStartDelivery = (delivery: Delivery) => {
    navigation.navigate('ActiveDelivery', { deliveryId: delivery.id });
  };

  const totalEarnings = activeDeliveries.reduce((sum, d) => sum + d.payment.total, 0);
  const totalDistance = activeDeliveries.reduce((sum, d) => sum + d.distance, 0);

  const renderItem = ({ item, index }: ListRenderItemInfo<Delivery>) => (
    <View style={[styles.deliveryItem, index === 0 && styles.deliveryItemFirst]}>
      {/* Priority badge */}
      <View style={styles.priorityBadge}>
        <Text style={styles.priorityNumber}>{index + 1}</Text>
      </View>

      <View style={styles.deliveryContent}>
        {/* Type + order */}
        <View style={styles.deliveryHeader}>
          <Text style={styles.deliveryType}>{DELIVERY_TYPE_LABELS[item.type] ?? '📫 אחר'}</Text>
          <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
        </View>

        {/* Route */}
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.business.name} · {item.pickupAddress.city}
          </Text>
        </View>
        <View style={styles.routeConnectorLine} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: Colors.decline }]} />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.customer.name} · {item.deliveryAddress.city}
          </Text>
        </View>

        {/* Stats + payment */}
        <View style={styles.deliveryFooter}>
          <Text style={styles.deliveryMeta}>
            {item.distance.toFixed(1)} ק"מ · ~{item.estimatedDuration} דק'
          </Text>
          <Text style={styles.deliveryPayment}>₪{item.payment.total.toFixed(0)}</Text>
        </View>

        {/* Start button (only for first item) */}
        {index === 0 && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => handleStartDelivery(item)}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate" size={18} color={Colors.white} />
            <Text style={styles.startButtonText}>התחל משלוח</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>אופטימיזציית מסלול</Text>
          <Text style={styles.headerSubtitle}>{activeDeliveries.length} משלוחים בתור</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary */}
      {activeDeliveries.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{activeDeliveries.length}</Text>
            <Text style={styles.summaryLabel}>משלוחים</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalDistance.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>ק"מ</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, styles.goldText]}>₪{totalEarnings.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>סה"כ</Text>
          </View>
        </View>
      )}

      {/* List */}
      {activeDeliveries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>אין משלוחים בתור</Text>
          <Text style={styles.emptySubtitle}>משלוחים שתקבל יופיעו כאן לפי סדר עדיפות</Text>
        </View>
      ) : (
        <FlatList
          data={activeDeliveries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 56,
    paddingBottom: Spacing.base,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#252636',
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  goldText: {
    color: '#F6C90E',
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  deliveryItem: {
    flexDirection: 'row',
    backgroundColor: '#252636',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...Shadows.sm,
  },
  deliveryItemFirst: {
    borderColor: '#6C63FF',
    backgroundColor: 'rgba(108,99,255,0.08)',
  },
  priorityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  priorityNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.white,
  },
  deliveryContent: {
    flex: 1,
    gap: Spacing.sm,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryType: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  orderNumber: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeConnectorLine: {
    width: 2,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginLeft: 3,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  deliveryMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  deliveryPayment: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F6C90E',
  },
  startButton: {
    backgroundColor: '#6C63FF',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: 4,
    ...Shadows.sm,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default DeliveryQueueScreen;
