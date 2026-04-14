import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, RootState } from '../../types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useDeliveries } from '../../hooks/useDeliveries';
import { useAuth } from '../../hooks/useAuth';
import { DeliveryCard } from '../../components/delivery/DeliveryCard';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatCurrency } from '../../utils/formatters';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { activeDeliveries, stats, isLoading, loadActive, loadStats, selectDelivery } = useDeliveries();
  const unreadCount = useSelector((state: RootState) => state.ui.unreadCount);

  const load = useCallback(async () => {
    await Promise.all([loadActive(), loadStats()]);
  }, [loadActive, loadStats]);

  useEffect(() => {
    load();
  }, [load]);

  const recentDeliveries = activeDeliveries.slice(0, 3);
  const pendingCount = activeDeliveries.filter((d) =>
    ['pending', 'searching_courier'].includes(d.status)
  ).length;

  const handleDeliveryPress = (deliveryId: string) => {
    navigation.navigate('DeliveryDetails', { deliveryId });
  };

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={load}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.notifBtn} activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={24} color={colors.white} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.greetingWrap}>
              <Text style={styles.greeting}>
                שלום, {user?.businessName || user?.name || 'עסק'}
              </Text>
              <Text style={styles.subGreeting}>מה נשלח היום?</Text>
            </View>
          </View>

          {/* Stats row */}
          {stats && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.todayTotal}</Text>
                <Text style={styles.statLabel}>משלוחים היום</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.todayActive}</Text>
                <Text style={styles.statLabel}>פעילים</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCurrency(stats.monthSpent)}</Text>
                <Text style={styles.statLabel}>החודש</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Quick action button */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => navigation.navigate('NewDelivery')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.ctaContent}>
                <View style={styles.ctaIcon}>
                  <Ionicons name="add-circle" size={32} color={colors.white} />
                </View>
                <View style={styles.ctaText}>
                  <Text style={styles.ctaTitle}>צור משלוח חדש</Text>
                  <Text style={styles.ctaSubtitle}>לחץ כדי להזמין שליח</Text>
                </View>
                <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Pending alert */}
        {pendingCount > 0 && (
          <View style={styles.section}>
            <Card style={styles.pendingAlert} shadow="sm">
              <View style={styles.pendingAlertRow}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ActiveDeliveries')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pendingAlertLink}>צפה בכולם</Text>
                </TouchableOpacity>
                <View style={styles.pendingAlertLeft}>
                  <View style={styles.pendingDot} />
                  <Text style={styles.pendingAlertText}>
                    {pendingCount} משלוח{pendingCount > 1 ? 'ים' : ''} ממתין{pendingCount > 1 ? 'ים' : ''} לשליח
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Active deliveries */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ActiveDeliveries')}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAll}>הכל</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>משלוחים פעילים</Text>
          </View>

          {isLoading && activeDeliveries.length === 0 ? (
            <LoadingSpinner size="small" />
          ) : activeDeliveries.length === 0 ? (
            <Card style={styles.emptyCard} shadow="sm">
              <View style={styles.emptyContent}>
                <Ionicons name="cube-outline" size={40} color={colors.textTertiary} />
                <Text style={styles.emptyText}>אין משלוחים פעילים</Text>
              </View>
            </Card>
          ) : (
            recentDeliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                onPress={() => handleDeliveryPress(delivery.id)}
              />
            ))
          )}
        </View>

        {/* Quick stats */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>סטטיסטיקות</Text>
            <View style={styles.quickStatsGrid}>
              <Card style={styles.quickStatCard} shadow="sm">
                <Ionicons name="star" size={24} color="#F9CA24" />
                <Text style={styles.quickStatValue}>{stats.averageRating.toFixed(1)}</Text>
                <Text style={styles.quickStatLabel}>דירוג ממוצע</Text>
              </Card>
              <Card style={styles.quickStatCard} shadow="sm">
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={styles.quickStatValue}>{stats.todayDelivered}</Text>
                <Text style={styles.quickStatLabel}>נמסרו היום</Text>
              </Card>
              <Card style={styles.quickStatCard} shadow="sm">
                <Ionicons name="hourglass-outline" size={24} color={colors.warning} />
                <Text style={styles.quickStatValue}>{stats.todayPending}</Text>
                <Text style={styles.quickStatLabel}>בהמתנה</Text>
              </Card>
              <Card style={styles.quickStatCard} shadow="sm">
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                <Text style={styles.quickStatValue}>{stats.monthTotal}</Text>
                <Text style={styles.quickStatLabel}>החודש</Text>
              </Card>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  header: {
    paddingTop: 50,
    paddingBottom: 28,
    paddingHorizontal: spacing.screenPadding,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '700',
  },
  greetingWrap: {
    flex: 1,
    marginRight: spacing.sm,
    alignItems: 'flex-end',
  },
  greeting: {
    ...typography.styles.h4,
    color: colors.white,
  },
  subGreeting: {
    ...typography.styles.body2,
    color: 'rgba(255,255,255,0.8)',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    ...typography.styles.h4,
    color: colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 4,
  },
  ctaSection: {
    paddingHorizontal: spacing.screenPadding,
    marginTop: -20,
    marginBottom: spacing.md,
  },
  ctaBtn: {
    borderRadius: spacing.radiusLg,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaGradient: {
    padding: spacing.lg,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ctaIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    flex: 1,
  },
  ctaTitle: {
    ...typography.styles.h4,
    color: colors.white,
  },
  ctaSubtitle: {
    ...typography.styles.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.styles.h5,
    color: colors.textPrimary,
  },
  seeAll: {
    ...typography.styles.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  pendingAlert: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  pendingAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  pendingAlertText: {
    ...typography.styles.body2,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  pendingAlertLink: {
    ...typography.styles.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyCard: {
    padding: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.styles.body1,
    color: colors.textTertiary,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickStatCard: {
    width: '47%',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
  },
  quickStatValue: {
    ...typography.styles.h4,
    color: colors.textPrimary,
  },
  quickStatLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
