// ============================================================
// HISTORY SCREEN - אשדוד-שליח Courier App
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ListRenderItemInfo,
  ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootState, AppDispatch } from '../../store';
import { fetchDeliveryHistory } from '../../store/deliverySlice';
import { Delivery, DeliveryStatus, MainStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';

type HistoryScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'History'>;
};

type FilterPeriod = 'all' | 'week' | 'month';

const STATUS_COLORS: Partial<Record<DeliveryStatus, string>> = {
  delivered: '#00E676',
  cancelled: Colors.decline,
  failed: Colors.warning,
};

const STATUS_LABELS: Partial<Record<DeliveryStatus, string>> = {
  delivered: 'נמסר ✓',
  cancelled: 'בוטל',
  failed: 'נכשל',
};

const FILTER_LABELS: Record<FilterPeriod, string> = {
  all: 'הכל',
  week: 'השבוע',
  month: 'החודש',
};

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { history, isLoading } = useSelector((s: RootState) => s.delivery);
  const [filter, setFilter] = useState<FilterPeriod>('all');

  useEffect(() => {
    dispatch(fetchDeliveryHistory({}));
  }, [dispatch]);

  const filterDeliveries = (deliveries: Delivery[]): Delivery[] => {
    if (filter === 'all') return deliveries;
    const now = new Date();
    const cutoff = new Date();
    if (filter === 'week') cutoff.setDate(now.getDate() - 7);
    if (filter === 'month') cutoff.setMonth(now.getMonth() - 1);
    return deliveries.filter((d) => new Date(d.createdAt) >= cutoff);
  };

  const filtered = filterDeliveries(history);
  const totalEarned = filtered.reduce((sum, d) => sum + (d.status === 'delivered' ? d.payment.total : 0), 0);
  const totalDelivered = filtered.filter((d) => d.status === 'delivered').length;

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: ListRenderItemInfo<Delivery>) => {
    const statusColor = STATUS_COLORS[item.status] ?? 'rgba(255,255,255,0.4)';
    const statusLabel = STATUS_LABELS[item.status] ?? item.status;
    const isDelivered = item.status === 'delivered';

    return (
      <View style={styles.card}>
        {/* Top row */}
        <View style={styles.cardHeader}>
          <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Route */}
        <View style={styles.routeSection}>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.routeText} numberOfLines={1}>
              {item.business.name} · {item.pickupAddress.city}
            </Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.decline }]} />
            <Text style={styles.routeText} numberOfLines={1}>
              {item.customer.name} · {item.deliveryAddress.city}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.cardFooter}>
          <Text style={styles.footerMeta}>
            {item.distance.toFixed(1)} ק"מ
          </Text>
          {isDelivered && (
            <Text style={styles.footerEarning}>₪{item.payment.total.toFixed(0)}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>היסטוריה</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(Object.keys(FILTER_LABELS) as FilterPeriod[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {FILTER_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalDelivered}</Text>
          <Text style={styles.statLabel}>משלוחים</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F6C90E' }]}>₪{totalEarned.toFixed(0)}</Text>
          <Text style={styles.statLabel}>הכנסה</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{filtered.length}</Text>
          <Text style={styles.statLabel}>סה"כ</Text>
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>אין משלוחים</Text>
          <Text style={styles.emptySubtitle}>המשלוחים שתשלים יופיעו כאן</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
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
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    backgroundColor: '#252636',
  },
  filterTabActive: {
    backgroundColor: '#6C63FF',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#252636',
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
    gap: Spacing.sm,
  },
  card: {
    backgroundColor: '#252636',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  date: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  statusBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  routeSection: {
    gap: 2,
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
  routeLine: {
    width: 2,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginLeft: 3,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  footerMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  footerEarning: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F6C90E',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyIcon: {
    fontSize: 52,
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
  },
});

export default HistoryScreen;
