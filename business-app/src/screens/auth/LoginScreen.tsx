import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TextInput,
  Image,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, isLoading, error, clearAuthError } = useAuth();
  const [email, setEmail] = useState('demo@business.com');
  const [password, setPassword] = useState('demo1234');
  const [localError, setLocalError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    setLocalError('');
    clearAuthError();
    if (!email.trim()) { setLocalError('נא להזין כתובת אימייל'); shake(); return; }
    if (!password) { setLocalError('נא להזין סיסמה'); shake(); return; }
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      shake();
    }
  };

  const displayError = localError || error;

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
        {/* Header gradient */}
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View style={[styles.logoWrap, { opacity: fadeAnim }]}>
            <View style={styles.logoCircle}>
              <Ionicons name="bicycle" size={44} color={colors.white} />
            </View>
            <Text style={styles.appName}>אשדוד-שליח</Text>
            <Text style={styles.appSubtitle}>פורטל עסקים</Text>
          </Animated.View>
        </LinearGradient>

        {/* Form card */}
        <Animated.View style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}>
          <Text style={styles.formTitle}>ברוכים הבאים</Text>
          <Text style={styles.formSubtitle}>התחבר לחשבון העסק שלך</Text>

          {displayError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          ) : null}

          <Input
            label="אימייל"
            value={email}
            onChangeText={(t) => { setEmail(t); setLocalError(''); clearAuthError(); }}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            required
          />
          <Input
            label="סיסמה"
            value={password}
            onChangeText={(t) => { setPassword(t); setLocalError(''); clearAuthError(); }}
            placeholder="הזן סיסמה"
            isPassword
            leftIcon="lock-closed-outline"
            required
          />

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword')}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>שכחתי סיסמה</Text>
          </TouchableOpacity>

          <Button
            title="התחברות"
            onPress={handleLogin}
            variant="primary"
            size="lg"
            fullWidth
            gradient
            isLoading={isLoading}
            style={styles.loginBtn}
          />

          <View style={styles.demoHint}>
            <Text style={styles.demoText}>למשתמש דמו: demo@business.com / demo1234</Text>
          </View>

          <View style={styles.registerRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
              <Text style={styles.registerLink}>הרשמה</Text>
            </TouchableOpacity>
            <Text style={styles.registerText}>אין לך חשבון?</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 48,
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    ...typography.styles.body1,
    color: 'rgba(255,255,255,0.85)',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    flex: 1,
    padding: spacing.screenPadding,
    paddingTop: spacing.xl,
  },
  formTitle: {
    ...typography.styles.h3,
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    ...typography.styles.body1,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.lg,
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    padding: 4,
  },
  forgotText: {
    ...typography.styles.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  loginBtn: {
    minHeight: 54,
  },
  demoHint: {
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: spacing.radiusMd,
  },
  demoText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  registerText: {
    ...typography.styles.body2,
    color: colors.textSecondary,
  },
  registerLink: {
    ...typography.styles.body2,
    color: colors.primary,
    fontWeight: '700',
  },
});
