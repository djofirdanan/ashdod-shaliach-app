import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DeliveryStatusTracker } from '../../components/delivery/DeliveryStatusTracker';
import { CourierInfo } from '../../components/delivery/CourierInfo';
import { RatingModal } from '../../components/rating/RatingModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useDeliveries } from '../../hooks/useDeliveries';
import { RootStackParamList } from '../../types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatCurrency, formatDate } from '../../utils/formatters';

type RouteProps = RouteProp<RootStackParamList, 'DeliveryDetails'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export const DeliveryDetailsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { deliveryId } = route.params;

  const { currentDelivery, isLoading, loadDeliveryById, cancel, rate } = useDeliveries();
  const [ratingVisible, setRatingVisible] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const load = useCallback(async () => {
    await loadDeliveryById(deliveryId);
  }, [deliveryId, loadDeliveryById]);

  useEffect(() => {
    load();
  }, [load]);

  const delivery = currentDelivery?.id === deliveryId ? currentDelivery : null;

  const isPending = delivery && ['pending', 'searching_courier'].includes(delivery.status);
  const isDelivered = delivery?.status === 'delivered';
  const hasCourier = !!delivery?.courier;
  const alreadyRated = !!delivery?.rating;

  const handleCancel = () => {
    Alert.alert(
      'ביטול משלוח',
      'האם אתה בטוח שברצונך לבטל את המשלוח?',
      [
        { text: 'לא', style: 'cancel' },
        {
          text: 'כן, בטל',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await cancel(deliveryId, 'בוטל על ידי העסק');
              navigation.goBack();
            } catch {
              Alert.alert('שגיאה', 'לא ניתן לבטל את המשלוח כרגע');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleRateSubmit = async (rating: number, comment: string) => {
    await rate(deliveryId, rating, comment);
    setRatingVisible(false);
    Alert.alert('תודה!', 'הדירוג נשמר בהצלחה');
  };

  const handleChat = () => {
    if (!delivery?.courier) return;
    navigation.navigate('Chat', {
      deliveryId: delivery.id,
      courierName: delivery.courier.name,
    });
  };

  if (isLoading && !delivery) {
    return <LoadingSpinner fullScreen label="טוען פרטי משלוח..." />;
  }

  if (!delivery) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>פרטי משלוח</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.notFoundText}>המשלוח לא נמצא</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>משלוח #{delivery.id.slice(-5)}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status tracker */}
        <View style={styles.section}>
          <DeliveryStatusTracker
            currentStatus={delivery.status}
            statusHistory={delivery.statusHistory}
          />
        </View>

        {/* Courier info */}
        {hasCourier && delivery.courier && (
          <View style={styles.section}>
            <CourierInfo
              courier={delivery.courier}
              estimatedDuration={delivery.estimatedDuration}
              estimatedArrival={delivery.estimatedArrival}
              onChat={handleChat}
            />
          </View>
        )}

        {/* Map placeholder */}
        <View style={styles.section}>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.mapTitle}>מפה</Text>
            {delivery.pickupAddress && (
              <Text style={styles.mapAddress} numberOfLines={1}>
                {delivery.pickupAddress.street}, {delivery.pickupAddress.city}
              </Text>
            )}
            <Ionicons name="arrow-down" size={18} color={colors.textTertiary} />
            {delivery.deliveryAddress && (
              <Text style={styles.mapAddress} numberOfLines={1}>
                {delivery.deliveryAddress.street}, {delivery.deliveryAddress.city}
              </Text>
            )}
          </View>
        </View>

        {/* Details card */}
        <View style={styles.section}>
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>פרטי משלוח</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailValue}>{formatCurrency(delivery.price)}</Text>
              <Text style={styles.detailLabel}>מחיר</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailValue}>{formatDate(delivery.createdAt)}</Text>
              <Text style={styles.detailLabel}>נוצר</Text>
            </View>
            {delivery.estimatedDuration && (
              <>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>{delivery.estimatedDuration} דקות</Text>
                  <Text style={styles.detailLabel}>זמן משוער</Text>
                </View>
              </>
            )}
            {delivery.notes && (
              <>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>{delivery.notes}</Text>
                  <Text style={styles.detailLabel}>הערות</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {hasCourier && (
            <TouchableOpacity style={styles.chatBtn} onPress={handleChat} activeOpacity={0.8}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.white} />
              <Text style={styles.chatBtnText}>שיחה עם השליח</Text>
            </TouchableOpacity>
          )}

          {isPending && (
            <TouchableOpacity
              style={[styles.cancelBtn, isCancelling && styles.btnDisabled]}
              onPress={handleCancel}
              activeOpacity={0.8}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Ionicons name="close-circle-outline" size={20} color={colors.error} />
              )}
              <Text style={styles.cancelBtnText}>בטל משלוח</Text>
            </TouchableOpacity>
          )}

          {isDelivered && !alreadyRated && (
            <TouchableOpacity
              style={styles.rateBtn}
              onPress={() => setRatingVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="star-outline" size={20} color={colors.white} />
              <Text style={styles.rateBtnText}>דרג שליח</Text>
            </TouchableOpacity>
          )}

          {isDelivered && alreadyRated && (
            <View style={styles.ratedRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= (delivery.rating ?? 0) ? 'star' : 'star-outline'}
                  size={22}
                  color="#F9CA24"
                />
              ))}
              <Text style={styles.ratedLabel}>דורגת</Text>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Rating Modal */}
      {delivery.courier && (
        <RatingModal
          visible={ratingVisible}
          courierName={delivery.courier.name}
          onSubmit={handleRateSubmit}
          onClose={() => setRatingVisible(false)}
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
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  headerTitle: {
    ...typography.styles.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  headerRight: {
    width: 40,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  section: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
  },
  mapPlaceholder: {
    backgroundColor: colors.border,
    borderRadius: spacing.radiusLg,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  mapTitle: {
    ...typography.styles.h5,
    color: colors.textSecondary,
  },
  mapAddress: {
    ...typography.styles.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsTitle: {
    ...typography.styles.h5,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'right',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    ...typography.styles.body2,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.styles.body1,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginRight: spacing.sm,
  },
  detailDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  actions: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusMd,
    paddingVertical: 14,
    minHeight: 50,
  },
  chatBtnText: {
    ...typography.styles.button,
    color: colors.white,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: spacing.radiusMd,
    paddingVertical: 14,
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelBtnText: {
    ...typography.styles.button,
    color: colors.error,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#F9CA24',
    borderRadius: spacing.radiusMd,
    paddingVertical: 14,
    minHeight: 50,
  },
  rateBtnText: {
    ...typography.styles.button,
    color: colors.textPrimary,
  },
  ratedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
  },
  ratedLabel: {
    ...typography.styles.body2,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  notFoundText: {
    ...typography.styles.h5,
    color: colors.textTertiary,
  },
});

export default DeliveryDetailsScreen;
