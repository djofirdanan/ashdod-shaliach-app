import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { authService } from '../../services/auth.service';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) { setError('נא להזין כתובת אימייל'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('כתובת אימייל לא תקינה'); return; }
    setIsLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError('שגיאה בשליחת האימייל. נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        style={styles.gradientTop}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.iconWrap}>
          <Ionicons name="key-outline" size={44} color={colors.white} />
        </View>
        <Text style={styles.headerTitle}>שכחתי סיסמה</Text>
        <Text style={styles.headerSubtitle}>נשלח קישור לאיפוס סיסמה</Text>
      </LinearGradient>

      <View style={styles.formCard}>
        {sent ? (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>האימייל נשלח!</Text>
            <Text style={styles.successText}>
              שלחנו קישור לאיפוס סיסמה לכתובת {email}.
              {'\n'}אנא בדוק את תיבת הדואר הנכנס.
            </Text>
            <Button
              title="חזרה להתחברות"
              onPress={() => navigation.navigate('Login')}
              variant="primary"
              size="lg"
              fullWidth
              gradient
              style={styles.backToLoginBtn}
            />
          </View>
        ) : (
          <>
            <Text style={styles.description}>
              הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה.
            </Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="כתובת אימייל"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); }}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
              error={error && !email ? error : undefined}
              required
            />

            <Button
              title="שלח קישור לאיפוס"
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              fullWidth
              gradient
              isLoading={isLoading}
              style={styles.submitBtn}
            />

            <TouchableOpacity
              style={styles.loginRow}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              <Text style={styles.loginLink}>חזרה להתחברות</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  gradientTop: {
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: spacing.screenPadding,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-end',
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.styles.h3,
    color: colors.white,
    marginBottom: spacing.xs,
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
  description: {
    ...typography.styles.body1,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.lg,
    lineHeight: 24,
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
  submitBtn: {
    marginTop: spacing.sm,
    minHeight: 54,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  loginLink: {
    ...typography.styles.body1,
    color: colors.primary,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  successIcon: {
    marginBottom: spacing.sm,
  },
  successTitle: {
    ...typography.styles.h3,
    color: colors.textPrimary,
  },
  successText: {
    ...typography.styles.body1,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  backToLoginBtn: {
    marginTop: spacing.xl,
    width: '100%',
  },
});
