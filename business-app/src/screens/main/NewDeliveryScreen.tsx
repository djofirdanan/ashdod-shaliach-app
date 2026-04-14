import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch } from 'react-redux';
import { CreateDeliveryForm } from '../../components/delivery/CreateDeliveryForm';
import { deliveryService } from '../../services/delivery.service';
import { createDelivery } from '../../store/deliverySlice';
import { AppDispatch } from '../../store';
import { Delivery, RootStackParamList } from '../../types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const NewDeliveryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Partial<Delivery>) => {
    setIsSubmitting(true);
    try {
      await dispatch(createDelivery(data)).unwrap();
      navigation.navigate('ActiveDeliveries');
    } catch (error) {
      // error is handled inside the slice, re-throw so the form knows
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>משלוח חדש</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Loading overlay */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>יוצר משלוח...</Text>
          </View>
        </View>
      )}

      <CreateDeliveryForm onSubmit={handleSubmit} isLoading={isSubmitting} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loadingBox: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingText: {
    ...typography.styles.body1,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

export default NewDeliveryScreen;
