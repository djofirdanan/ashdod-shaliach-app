import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DeliveryCard } from '../../components/delivery/DeliveryCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useDeliveries } from '../../hooks/useDeliveries';
import { Delivery, RootStackParamList } from '../../types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const ActiveDeliveriesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { activeDeliveries, isLoading, loadActive, cancel, selectDelivery } = useDeliveries();

  const load = useCallback(async () => {
    await loadActive();
  }, [loadActive]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeliveryPress = (delivery: Delivery) => {
    selectDelivery(delivery);
    navigation.navigate('DeliveryDetails', { deliveryId: delivery.id });
  };

  const handleCancel = (delivery: Delivery) => {
    Alert.alert(
      'ביטול משלוח',
      `האם אתה בטוח שברצונך לבטל את המשלוח #${delivery.id.slice(-5)}?`,
      [
        { text: 'לא', style: 'cancel' },
        {
          text: 'כן, בטל',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancel(delivery.id, 'בוטל על ידי העסק');
            } catch {
              Alert.alert('שגיאה', 'לא ניתן לבטל את המשלוח כרגע');
            }
          },
        },
      ]
    );
  };

  const canBeCancelled = (delivery: Delivery) =>
    ['pending', 'searching_courier'].includes(delivery.status);

  const renderItem = ({ item }: { item: Delivery }) => (
    <DeliveryCard
      delivery={item}
      onPress={() => handleDeliveryPress(item)}
      onCancel={canBeCancelled(item) ? () => handleCancel(item) : undefined}
    />
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <EmptyState
        icon="cube-outline"
        title="אין משלוחים פעילים"
        description="כל המשלוחים הפעילים שלך יופיעו כאן"
        actionLabel="צור משלוח חדש"
        onAction={() => navigation.navigate('NewDelivery')}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>משלוחים פעילים</Text>
          {activeDeliveries.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{activeDeliveries.length}</Text>
            </View>
          )}
        </View>
      </View>

      {isLoading && activeDeliveries.length === 0 ? (
        <LoadingSpinner fullScreen label="טוען משלוחים..." />
      ) : (
        <FlatList
          data={activeDeliveries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.list,
            activeDeliveries.length === 0 && styles.listEmpty,
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
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.styles.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 13,
    color: colors.white,
    fontWeight: '700',
  },
  list: {
    padding: spacing.screenPadding,
    paddingTop: spacing.md,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default ActiveDeliveriesScreen;
