import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Delivery, DeliveryZone, PackageType, Address, PriceEstimate } from '../../types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { PriceEstimator } from './PriceEstimator';
import { deliveryService } from '../../services/delivery.service';
import { formatCurrency, getZoneLabel, getPackageTypeLabel } from '../../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 4;

const ZONE_OPTIONS: { value: DeliveryZone; label: string; price: number }[] = [
  { value: 'ashdod_north', label: 'אשדוד צפון', price: 30 },
  { value: 'ashdod_center', label: 'אשדוד מרכז', price: 30 },
  { value: 'ashdod_south', label: 'אשדוד דרום', price: 30 },
  { value: 'nearby_cities', label: 'ערים סמוכות', price: 50 },
];

const PACKAGE_TYPES: { value: PackageType; label: string; description: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { value: 'regular', label: 'רגיל', description: 'חבילות רגילות', icon: 'cube-outline', color: colors.info },
  { value: 'express', label: 'אקספרס', description: 'משלוח מהיר', icon: 'flash-outline', color: colors.warning },
  { value: 'fragile', label: 'שביר', description: 'טיפול מיוחד', icon: 'alert-circle-outline', color: colors.secondary },
  { value: 'vip', label: 'VIP', description: 'שירות פרימיום', icon: 'diamond-outline', color: colors.primary },
];

const ADDRESS_SUGGESTIONS = [
  'רחוב הרצל 15, אשדוד',
  'שדרות בן גוריון 45, אשדוד',
  'רחוב הגבורה 7, אשדוד',
  'רחוב ויצמן 10, אשדוד',
  'שדרות ירושלים 50, אשדוד',
  'רחוב הנביאים 33, אשדוד',
];

interface FormData {
  pickupStreet: string;
  pickupCity: string;
  pickupFloor: string;
  pickupNotes: string;
  zone: DeliveryZone;
  deliveryStreet: string;
  deliveryCity: string;
  deliveryFloor: string;
  deliveryNotes: string;
  packageType: PackageType;
  weight: string;
  specialInstructions: string;
}

interface CreateDeliveryFormProps {
  onSubmit: (data: Partial<Delivery>) => Promise<void>;
  isLoading?: boolean;
}

export const CreateDeliveryForm: React.FC<CreateDeliveryFormProps> = ({ onSubmit, isLoading }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    pickupStreet: '',
    pickupCity: 'אשדוד',
    pickupFloor: '',
    pickupNotes: '',
    zone: 'ashdod_center',
    deliveryStreet: '',
    deliveryCity: 'אשדוד',
    deliveryFloor: '',
    deliveryNotes: '',
    packageType: 'regular',
    weight: '',
    specialInstructions: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<string[]>([]);
  const [deliverySuggestions, setDeliverySuggestions] = useState<string[]>([]);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  const animateToStep = useCallback((nextStep: number) => {
    const direction = nextStep > step ? -1 : 1;
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: direction * SCREEN_WIDTH * 0.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    Animated.timing(progressAnim, {
      toValue: nextStep / TOTAL_STEPS,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setStep(nextStep);
  }, [step, slideAnim, progressAnim]);

  const update = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePickupInput = (text: string) => {
    update('pickupStreet', text);
    if (text.length > 1) {
      const filtered = ADDRESS_SUGGESTIONS.filter((s) => s.includes(text));
      setPickupSuggestions(filtered);
    } else {
      setPickupSuggestions([]);
    }
  };

  const handleDeliveryInput = (text: string) => {
    update('deliveryStreet', text);
    if (text.length > 1) {
      const filtered = ADDRESS_SUGGESTIONS.filter((s) => s.includes(text));
      setDeliverySuggestions(filtered);
    } else {
      setDeliverySuggestions([]);
    }
  };

  const validateStep = (s: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (s === 1) {
      if (!formData.pickupStreet.trim()) newErrors.pickupStreet = 'נא להזין כתובת איסוף';
    }
    if (s === 2) {
      if (!formData.deliveryStreet.trim()) newErrors.deliveryStreet = 'נא להזין כתובת יעד';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;
    if (step === 3) {
      // Load price estimate before showing step 4
      setIsLoadingPrice(true);
      try {
        const est = await deliveryService.estimatePrice({
          zone: formData.zone,
          packageType: formData.packageType,
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
        });
        setPriceEstimate(est);
      } catch {
        // use fallback
      } finally {
        setIsLoadingPrice(false);
      }
    }
    if (step < TOTAL_STEPS) animateToStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) animateToStep(step - 1);
  };

  const handleSubmit = async () => {
    const pickupAddress: Address = {
      street: formData.pickupStreet,
      city: formData.pickupCity,
      floor: formData.pickupFloor || undefined,
      notes: formData.pickupNotes || undefined,
    };
    const deliveryAddress: Address = {
      street: formData.deliveryStreet,
      city: formData.deliveryCity,
      floor: formData.deliveryFloor || undefined,
      notes: formData.deliveryNotes || undefined,
    };
    await onSubmit({
      pickupAddress,
      deliveryAddress,
      zone: formData.zone,
      packageType: formData.packageType,
      package: {
        type: formData.packageType,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        notes: formData.specialInstructions || undefined,
      },
      price: priceEstimate?.total || 35,
      notes: formData.specialInstructions || undefined,
    });
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.stepLabel}>שלב {step} מתוך {TOTAL_STEPS}</Text>
      </View>

      {/* Step indicators */}
      <View style={styles.stepsRow}>
        {[1, 2, 3, 4].map((s) => (
          <View key={s} style={styles.stepIndicatorWrap}>
            <View style={[
              styles.stepCircle,
              s < step && styles.stepCircleDone,
              s === step && styles.stepCircleActive,
            ]}>
              {s < step
                ? <Ionicons name="checkmark" size={14} color={colors.white} />
                : <Text style={[styles.stepNum, s === step && styles.stepNumActive]}>{s}</Text>
              }
            </View>
            <Text style={[styles.stepName, s === step && styles.stepNameActive]}>
              {s === 1 ? 'איסוף' : s === 2 ? 'יעד' : s === 3 ? 'חבילה' : 'אישור'}
            </Text>
          </View>
        ))}
      </View>

      <Animated.View style={[styles.formArea, { transform: [{ translateX: slideAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* ====== STEP 1: Pickup ====== */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>כתובת איסוף</Text>
              <Text style={styles.stepSubtitle}>מאיפה לאסוף את החבילה?</Text>

              <Input
                label="רחוב ומספר בית"
                value={formData.pickupStreet}
                onChangeText={handlePickupInput}
                placeholder="לדוגמה: רחוב הרצל 15"
                leftIcon="location-outline"
                error={errors.pickupStreet}
                required
              />
              {pickupSuggestions.length > 0 && (
                <Card style={styles.suggestions} shadow="sm">
                  {pickupSuggestions.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.suggestionItem}
                      onPress={() => {
                        const parts = s.split(', ');
                        update('pickupStreet', parts[0]);
                        if (parts[1]) update('pickupCity', parts[1]);
                        setPickupSuggestions([]);
                      }}
                    >
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </Card>
              )}

              <Input
                label="עיר"
                value={formData.pickupCity}
                onChangeText={(t) => update('pickupCity', t)}
                placeholder="אשדוד"
                leftIcon="business-outline"
              />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Input
                    label="קומה"
                    value={formData.pickupFloor}
                    onChangeText={(t) => update('pickupFloor', t)}
                    placeholder="קומה"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Input
                label="הערות לשליח"
                value={formData.pickupNotes}
                onChangeText={(t) => update('pickupNotes', t)}
                placeholder="לדוגמה: צלצל בדלת, חנה ברחוב..."
                leftIcon="chatbubble-outline"
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {/* ====== STEP 2: Destination ====== */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>כתובת יעד</Text>
              <Text style={styles.stepSubtitle}>לאן לשלוח את החבילה?</Text>

              <Text style={styles.sectionLabel}>בחר אזור</Text>
              <View style={styles.zoneGrid}>
                {ZONE_OPTIONS.map((zone) => (
                  <TouchableOpacity
                    key={zone.value}
                    style={[
                      styles.zoneCard,
                      formData.zone === zone.value && styles.zoneCardSelected,
                    ]}
                    onPress={() => update('zone', zone.value)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="location"
                      size={20}
                      color={formData.zone === zone.value ? colors.white : colors.primary}
                    />
                    <Text style={[
                      styles.zoneLabel,
                      formData.zone === zone.value && styles.zoneLabelSelected,
                    ]}>
                      {zone.label}
                    </Text>
                    <Text style={[
                      styles.zonePrice,
                      formData.zone === zone.value && styles.zonePriceSelected,
                    ]}>
                      מ-{formatCurrency(zone.price)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="רחוב ומספר בית"
                value={formData.deliveryStreet}
                onChangeText={handleDeliveryInput}
                placeholder="לדוגמה: שדרות בן גוריון 45"
                leftIcon="flag-outline"
                error={errors.deliveryStreet}
                required
              />
              {deliverySuggestions.length > 0 && (
                <Card style={styles.suggestions} shadow="sm">
                  {deliverySuggestions.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.suggestionItem}
                      onPress={() => {
                        const parts = s.split(', ');
                        update('deliveryStreet', parts[0]);
                        if (parts[1]) update('deliveryCity', parts[1]);
                        setDeliverySuggestions([]);
                      }}
                    >
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </Card>
              )}

              <Input
                label="עיר"
                value={formData.deliveryCity}
                onChangeText={(t) => update('deliveryCity', t)}
                placeholder="אשדוד"
                leftIcon="business-outline"
              />
              <Input
                label="קומה"
                value={formData.deliveryFloor}
                onChangeText={(t) => update('deliveryFloor', t)}
                placeholder="קומה"
                keyboardType="numeric"
              />
              <Input
                label="הערות למקבל"
                value={formData.deliveryNotes}
                onChangeText={(t) => update('deliveryNotes', t)}
                placeholder="הוראות מיוחדות למסירה..."
                leftIcon="chatbubble-outline"
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {/* ====== STEP 3: Package details ====== */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>פרטי החבילה</Text>
              <Text style={styles.stepSubtitle}>מה שולחים?</Text>

              <Text style={styles.sectionLabel}>סוג משלוח</Text>
              <View style={styles.typeGrid}>
                {PACKAGE_TYPES.map((pt) => (
                  <TouchableOpacity
                    key={pt.value}
                    style={[
                      styles.typeCard,
                      formData.packageType === pt.value && styles.typeCardSelected,
                      formData.packageType === pt.value && { borderColor: pt.color },
                    ]}
                    onPress={() => update('packageType', pt.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.typeIconWrap, { backgroundColor: pt.color + '20' }]}>
                      <Ionicons name={pt.icon} size={22} color={pt.color} />
                    </View>
                    <Text style={[
                      styles.typeLabel,
                      formData.packageType === pt.value && { color: pt.color, fontWeight: '700' },
                    ]}>
                      {pt.label}
                    </Text>
                    <Text style={styles.typeDesc}>{pt.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label='משקל (ק"ג)'
                value={formData.weight}
                onChangeText={(t) => update('weight', t)}
                placeholder='לדוגמה: 1.5'
                keyboardType="decimal-pad"
                leftIcon="barbell-outline"
              />

              <Input
                label="הנחיות מיוחדות"
                value={formData.specialInstructions}
                onChangeText={(t) => update('specialInstructions', t)}
                placeholder="הוראות מיוחדות לשליח..."
                leftIcon="document-text-outline"
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {/* ====== STEP 4: Confirm ====== */}
          {step === 4 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>אישור הזמנה</Text>
              <Text style={styles.stepSubtitle}>בדוק את פרטי המשלוח לפני שליחה</Text>

              <Card style={styles.summaryCard} shadow="sm" border>
                <View style={styles.summarySection}>
                  <View style={styles.summaryRow}>
                    <Ionicons name="location" size={18} color={colors.primary} />
                    <Text style={styles.summaryTitle}>איסוף</Text>
                  </View>
                  <Text style={styles.summaryValue}>{formData.pickupStreet}, {formData.pickupCity}</Text>
                  {formData.pickupFloor ? <Text style={styles.summaryDetail}>קומה {formData.pickupFloor}</Text> : null}
                </View>

                <View style={styles.summarySeparator} />

                <View style={styles.summarySection}>
                  <View style={styles.summaryRow}>
                    <Ionicons name="flag" size={18} color={colors.secondary} />
                    <Text style={styles.summaryTitle}>יעד</Text>
                  </View>
                  <Text style={styles.summaryValue}>{formData.deliveryStreet}, {formData.deliveryCity}</Text>
                  {formData.deliveryFloor ? <Text style={styles.summaryDetail}>קומה {formData.deliveryFloor}</Text> : null}
                  <View style={styles.zoneBadge}>
                    <Text style={styles.zoneBadgeText}>{getZoneLabel(formData.zone)}</Text>
                  </View>
                </View>

                <View style={styles.summarySeparator} />

                <View style={styles.summarySection}>
                  <View style={styles.summaryRow}>
                    <Ionicons name="cube" size={18} color={colors.primary} />
                    <Text style={styles.summaryTitle}>חבילה</Text>
                  </View>
                  <Text style={styles.summaryValue}>{getPackageTypeLabel(formData.packageType)}</Text>
                  {formData.weight ? <Text style={styles.summaryDetail}>{formData.weight} ק"ג</Text> : null}
                </View>
              </Card>

              {priceEstimate && (
                <PriceEstimator estimate={priceEstimate} />
              )}

              {isLoadingPrice && (
                <View style={styles.loadingPrice}>
                  <Text style={styles.loadingPriceText}>מחשב מחיר...</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </Animated.View>

      {/* Navigation buttons */}
      <View style={styles.navButtons}>
        {step > 1 && (
          <Button
            title="חזרה"
            onPress={handleBack}
            variant="outline"
            size="lg"
            style={styles.backBtn}
            icon={<Ionicons name="arrow-forward" size={18} color={colors.primary} />}
            iconPosition="right"
          />
        )}
        {step < TOTAL_STEPS ? (
          <Button
            title="המשך"
            onPress={handleNext}
            variant="primary"
            size="lg"
            style={styles.nextBtn}
            gradient
            icon={<Ionicons name="arrow-back" size={18} color={colors.white} />}
            iconPosition="left"
          />
        ) : (
          <Button
            title="צור משלוח"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            style={styles.nextBtn}
            gradient
            isLoading={isLoading || isLoadingPrice}
            icon={<Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />}
            iconPosition="right"
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  progressBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  stepLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  stepIndicatorWrap: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  stepCircleDone: {
    backgroundColor: colors.success,
  },
  stepNum: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  stepNumActive: {
    color: colors.white,
  },
  stepName: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  stepNameActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  formArea: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
  },
  stepTitle: {
    ...typography.styles.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'right',
  },
  stepSubtitle: {
    ...typography.styles.body1,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'right',
  },
  sectionLabel: {
    ...typography.styles.label,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  suggestions: {
    marginTop: -spacing.md,
    marginBottom: spacing.md,
    borderRadius: spacing.radiusMd,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    ...typography.styles.body2,
    color: colors.textPrimary,
    textAlign: 'right',
    flex: 1,
  },
  zoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  zoneCard: {
    width: '47%',
    padding: spacing.md,
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 4,
  },
  zoneCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  zoneLabel: {
    ...typography.styles.label,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  zoneLabelSelected: {
    color: colors.white,
  },
  zonePrice: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  zonePriceSelected: {
    color: colors.primaryLight,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeCard: {
    width: '47%',
    padding: spacing.md,
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 6,
  },
  typeCardSelected: {
    backgroundColor: '#F8F7FF',
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    ...typography.styles.label,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  typeDesc: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  summaryCard: {
    marginBottom: spacing.md,
  },
  summarySection: {
    paddingVertical: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  summaryTitle: {
    ...typography.styles.label,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  summaryValue: {
    ...typography.styles.body1,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
  },
  summaryDetail: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  summarySeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  zoneBadge: {
    alignSelf: 'flex-end',
    backgroundColor: '#EDE9FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  zoneBadgeText: {
    ...typography.styles.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  loadingPrice: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  loadingPriceText: {
    ...typography.styles.body2,
    color: colors.textSecondary,
  },
  navButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backBtn: {
    flex: 1,
  },
  nextBtn: {
    flex: 2,
  },
});
