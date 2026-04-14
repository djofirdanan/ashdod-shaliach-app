// ============================================================
// LOGIN SCREEN - אשדוד-שליח Courier App
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootState, AppDispatch } from '../../store';
import { loginCourier, clearError } from '../../store/authSlice';
import { AuthStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('שגיאה', 'אנא מלא את כל השדות.');
      return;
    }
    dispatch(clearError());
    const result = await dispatch(loginCourier({ phone: phone.trim(), password }));
    if (loginCourier.rejected.match(result)) {
      Alert.alert('כניסה נכשלה', (result.payload as string) ?? 'שגיאה לא ידועה');
    }
    // On success, AppNavigator will automatically switch to Main
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo area */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🏍️</Text>
          </View>
          <Text style={styles.appName}>שליח</Text>
          <Text style={styles.appSubName}>אשדוד שליח</Text>
          <Text style={styles.subtitle}>כנס לחשבון שלך</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Phone */}
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="מספר טלפון"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="phone-pad"
              textAlign="right"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.inputIcon}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="rgba(255,255,255,0.4)"
              />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="סיסמה"
              placeholderTextColor="rgba(255,255,255,0.35)"
              secureTextEntry={!showPassword}
              textAlign="right"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.loginButtonText}>כניסה</Text>
            )}
          </TouchableOpacity>

          {/* Register link */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerLinkText}>
              עדיין אין לך חשבון?{' '}
              <Text style={styles.registerLinkBold}>הרשמה</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#1A1B2E',
  },
  container: {
    flex: 1,
    backgroundColor: '#1A1B2E',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 80,
    paddingBottom: Spacing['4xl'],
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Shadows.lg,
  },
  logoEmoji: {
    fontSize: 44,
  },
  appName: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 1,
  },
  appSubName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  form: {
    gap: Spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252636',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
    paddingHorizontal: Spacing.base,
    minHeight: 54,
  },
  inputIcon: {
    marginLeft: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.white,
    paddingVertical: Spacing.md,
    textAlign: 'right',
  },
  loginButton: {
    backgroundColor: '#6C63FF',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadows.md,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  registerLink: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  registerLinkText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
  },
  registerLinkBold: {
    color: '#6C63FF',
    fontWeight: '700',
  },
});

export default LoginScreen;
