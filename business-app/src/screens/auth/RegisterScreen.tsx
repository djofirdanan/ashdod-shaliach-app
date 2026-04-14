import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

const BUSINESS_TYPES = ['חנות', 'מסעדה', 'מרפאה', 'משרד', 'אחר'];

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { register, isLoading, error, clearAuthError } = useAuth();
  const [form, setForm] = useState({
    businessName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    businessType: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    if (error) clearAuthError();
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.businessName.trim()) newErrors.businessName = 'נא להזין שם עסק';
    if (!form.name.trim()) newErrors.name = 'נא להזין שם מלא';
    if (!form.email.trim()) newErrors.email = 'נא להזין אימייל';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'כתובת אימייל לא תקינה';
    if (!form.phone.trim()) newErrors.phone = 'נא להזין מספר טלפון';
    if (!form.password) newErrors.password = 'נא להזין סיסמה';
    else if (form.password.length < 6) newErrors.password = 'סיסמה חייבת להכיל לפחות 6 תווים';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'הסיסמאות אינן תואמות';
    if (!termsAccepted) newErrors.terms = 'יש לאשר את תנאי השירות';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        businessName: form.businessName.trim(),
        phone: form.phone.trim(),
      });
    } catch {
      // error shown via Redux state
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.primaryDark, colors.primary]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-forward" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.logoCircle}>
              <Ionicons name="storefront-outline" size={36} color={colors.white} />
            </View>
            <Text style={styles.headerTitle}>הרשמה לעסקים</Text>
            <Text style={styles.headerSubtitle}>צור חשבון עסקי חדש</Text>
          </View>
        </LinearGradient>

        <View style={styles.formCard}>
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>פרטי העסק</Text>
          <Input
            label="שם העסק"
            value={form.businessName}
            onChangeText={(t) => update('businessName', t)}
            placeholder="לדוגמה: עסק בע״מ"
            leftIcon="storefront-outline"
            error={errors.businessName}
            required
          />

          <Text style={styles.fieldLabel}>סוג עסק</Text>
          <View style={styles.businessTypeRow}>
            {BUSINESS_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, form.businessType === type && styles.typeChipSelected]}
                onPress={() => update('businessType', type)}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeChipText, form.businessType === type && styles.typeChipTextSelected]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="כתובת העסק"
            value={form.address}
            onChangeText={(t) => update('address', t)}
            placeholder="רחוב, עיר"
            leftIcon="location-outline"
          />

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>פרטי איש קשר</Text>

          <Input
            label="שם מלא"
            value={form.name}
            onChangeText={(t) => update('name', t)}
            placeholder="ישראל ישראלי"
            leftIcon="person-outline"
            error={errors.name}
            required
          />
          <Input
            label="טלפון"
            value={form.phone}
            onChangeText={(t) => update('phone', t)}
            placeholder="050-0000000"
            keyboardType="phone-pad"
            leftIcon="call-outline"
            error={errors.phone}
            required
          />

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>פרטי חשבון</Text>

          <Input
            label="אימייל"
            value={form.email}
            onChangeText={(t) => update('email', t)}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            error={errors.email}
            required
          />
          <Input
            label="סיסמה"
            value={form.password}
            onChangeText={(t) => update('password', t)}
            placeholder="לפחות 6 תווים"
            isPassword
            leftIcon="lock-closed-outline"
            error={errors.password}
            required
          />
          <Input
            label="אימות סיסמה"
            value={form.confirmPassword}
            onChangeText={(t) => update('confirmPassword', t)}
            placeholder="הזן שוב את הסיסמה"
            isPassword
            leftIcon="lock-closed-outline"
            error={errors.confirmPassword}
            required
          />

          {/* Terms */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.8}
          >
            <Text style={styles.termsText}>
              אני מסכים/ה ל
              <Text style={styles.termsLink}> תנאי השירות </Text>
              ול
              <Text style={styles.termsLink}> מדיניות הפרטיות</Text>
            </Text>
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && <Ionicons name="checkmark" size={14} color={colors.white} />}
            </View>
          </TouchableOpacity>
          {errors.terms ? <Text style={styles.termsError}>{errors.terms}</Text> : null}

          <Button
            title="צור חשבון"
            onPress={handleRegister}
            variant="primary"
            size="lg"
            fullWidth
            gradient
            isLoading={isLoading}
            style={styles.registerBtn}
          />

          <View style={styles.loginRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={styles.loginLink}>התחברות</Text>
            </TouchableOpacity>
            <Text style={styles.loginText}>כבר יש לך חשבון?</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  header: {
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: spacing.screenPadding,
  },
  backBtn: {
    alignSelf: 'flex-end',
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  headerContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.styles.h3,
    color: colors.white,
  },
  headerSubtitle: {
    ...typography.styles.body1,
    color: 'rgba(255,255,255,0.85)',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    flex: 1,
    padding: spacing.screenPadding,
    paddingTop: spacing.xl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.errorLight,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.styles.body2,
    color: colors.error,
    flex: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    ...typography.styles.h5,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.styles.label,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  businessTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
    justifyContent: 'flex-end',
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  typeChipTextSelected: {
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    ...typography.styles.body2,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  termsError: {
    ...typography.styles.caption,
    color: colors.error,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  registerBtn: {
    marginTop: spacing.sm,
    minHeight: 54,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loginText: {
    ...typography.styles.body2,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.styles.body2,
    color: colors.primary,
    fontWeight: '700',
  },
});
