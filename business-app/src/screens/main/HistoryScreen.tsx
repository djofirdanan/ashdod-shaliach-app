import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useDeliveries } from '../../hooks/useDeliveries';
import { Delivery, RootStackParamList, DeliveryStatus } from '../../types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
} from '../../utils/formatters';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type FilterType = 'all' | 'delivered' | 'cancelled';

const STATUS_COLOR: Partial<Record<DeliveryStatus, string>> = {
  delivered: colors.success,
  cancelled: colors.error,
  failed: colors.error,
};

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { historyDeliveries, isLoading, loadHistory, selectDelivery } = useDeliveries();
  const [filter, setFilter] = useState<FilterType>('all');

  const load = useCallback(async () => {
    await loadHistory({});
  }, [loadHistory]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = historyDeliveries.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'delivered') return d.status === 'delivered';
    if (filter === 'cancelled') return d.status === 'cancelled' || d.status === 'failed';
    return true;
  });

  const totalSpent = historyDeliveries
    .filter((d) => d.status === 'delivered')
    .reduce((sum, d) => sum + d.price, 0);

  const handlePress = (delivery: Delivery) => {
    selectDelivery(delivery);
    navigation.navigate('DeliveryDetails', { deliveryId: delivery.id });
  };

  const renderItem = ({ item }: { item: Delivery }) => {
    const statusColor = STATUS_COLOR[item.status] || colors.textSecondary;

    return (
      <TouchableOpacity
        style={styles.historyItem}
        onPress={() => handlePress(item)}
        activeOpacity={0.75}
      >
        {/* Status dot + date */}
        <View style={styles.itemLeft}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Route */}
        <View style={styles.itemCenter}>
          <Text style={styles.itemRoute} numberOfLines={1}>
            {item.pickupAddress.street} → {item.deliveryAddress.street}
          </Text>
          {item.courier && (
            <Text style={styles.itemCourier} numberOfLines={1}>
              שליח: {item.courier.name}
            </Text>
          )}
        </View>

        {/* Price + status */}
        <View style={styles.itemRight}>
          <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <EmptyState
        icon="time-outline"
        title="אין היסטוריית משלוחים"
        description="המשלוחים שהושלמו יופיעו כאן"
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>היסטוריה</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{historyDeliveries.length}</Text>
          <Text style={styles.statLabel}>סה"כ משלוחים</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatCurrency(totalSpent)}</Text>
          <Text style={styles.statLabel}>סה"כ הוצאות</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {historyDeliveries.filter((d) => d.status === 'delivered').length}
          </Text>
          <Text style={styles.statLabel}>הושלמו</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['all', 'delivered', 'cancelled'] as FilterType[]).map((f) => {
          const label = f === 'all' ? 'הכל' : f === 'delivered' ? 'הושלם' : 'בוטל';
          const isActive = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading && historyDeliveries.length === 0 ? (
        <LoadingSpinner fullScreen label="טוען היסטוריה..." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.list,
            filtered.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={load}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'flex-end',
  },
  headerTitle: {
    ...typography.styles.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    ...typography.styles.h5,
    color: colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: colors.white,
  },
  list: {
    padding: spacing.screenPadding,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    gap: spacing.sm,
  },
  itemLeft: {
    alignItems: 'center',
    gap: 6,
    width: 56,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  itemDate: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 14,
  },
  itemCenter: {
    flex: 1,
    gap: 2,
  },
  itemRoute: {
    ...typography.styles.body2,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
  },
  itemCourier: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  itemPrice: {
    ...typography.styles.body1,
    color: colors.primary,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  separator: {
    height: spacing.sm,
  },
});

export default HistoryScreen;
