// ============================================================
// REGISTER SCREEN - אשדוד-שליח Courier App
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
import { registerCourier, clearError } from '../../store/authSlice';
import { AuthStackParamList, VehicleType } from '../../types';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

interface VehicleOption {
  type: VehicleType;
  label: string;
  icon: string;
}

const VEHICLE_OPTIONS: VehicleOption[] = [
  { type: 'bicycle', label: 'אופניים', icon: '🚲' },
  { type: 'electric_scooter', label: 'קורקינט', icon: '🛴' },
  { type: 'motorcycle', label: 'אופנוע', icon: '🏍️' },
  { type: 'car', label: 'מכונית', icon: '🚗' },
];

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((s: RootState) => s.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>('motorcycle');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('שגיאה', 'אנא מלא את כל השדות.');
      return;
    }
    if (!agreedToTerms) {
      Alert.alert('שגיאה', 'יש לאשר את תנאי השימוש.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('שגיאה', 'הסיסמה חייבת להכיל לפחות 6 תווים.');
      return;
    }

    dispatch(clearError());
    const result = await dispatch(
      registerCourier({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        vehicleType,
      })
    );

    if (registerCourier.fulfilled.match(result)) {
      navigation.navigate('VehicleSetup');
    } else {
      Alert.alert('הרשמה נכשלה', (result.payload as string) ?? 'שגיאה לא ידועה');
    }
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-forward" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>הרשמה כשליח</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          {/* Full name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>שם מלא</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="שם פרטי ושם משפחה"
                placeholderTextColor="rgba(255,255,255,0.3)"
                textAlign="right"
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>אימייל</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="email-address"
                textAlign="right"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>טלפון</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="050-0000000"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>סיסמה</Text>
            <View style={styles.inputWrapper}>
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.inputIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color="rgba(255,255,255,0.4)"
                />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="לפחות 6 תווים"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry={!showPassword}
                textAlign="right"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Vehicle type */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>סוג רכב</Text>
            <View style={styles.vehicleGrid}>
              {VEHICLE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.type}
                  style={[
                    styles.vehicleOption,
                    vehicleType === opt.type && styles.vehicleOptionSelected,
                  ]}
                  onPress={() => setVehicleType(opt.type)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.vehicleIcon}>{opt.icon}</Text>
                  <Text
                    style={[
                      styles.vehicleLabel,
                      vehicleType === opt.type && styles.vehicleLabelSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Terms checkbox */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreedToTerms((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && (
                <Ionicons name="checkmark" size={14} color={Colors.white} />
              )}
            </View>
            <Text style={styles.termsText}>
              אני מסכים/ה ל
              <Text style={styles.termsLink}>תנאי השימוש</Text>
              {' '}ו
              <Text style={styles.termsLink}>מדיניות הפרטיות</Text>
            </Text>
          </TouchableOpacity>

          {/* Register button */}
          <TouchableOpacity
            style={[styles.registerButton, (isLoading || !agreedToTerms) && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading || !agreedToTerms}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.registerButtonText}>הרשמה</Text>
            )}
          </TouchableOpacity>

          {/* Back to login */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              כבר יש לך חשבון?{' '}
              <Text style={styles.loginLinkBold}>כניסה</Text>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Spacing['4xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing['2xl'],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
  },
  form: {
    gap: Spacing.lg,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252636',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
    paddingHorizontal: Spacing.base,
    minHeight: 52,
  },
  inputIcon: {
    marginLeft: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.white,
    paddingVertical: Spacing.md,
    textAlign: 'right',
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  vehicleOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#252636',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 4,
  },
  vehicleOptionSelected: {
    borderColor: '#6C63FF',
    backgroundColor: 'rgba(108,99,255,0.15)',
  },
  vehicleIcon: {
    fontSize: 28,
  },
  vehicleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  vehicleLabelSelected: {
    color: '#6C63FF',
    fontWeight: '800',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(108,99,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
    lineHeight: 20,
  },
  termsLink: {
    color: '#6C63FF',
    fontWeight: '700',
  },
  registerButton: {
    backgroundColor: '#6C63FF',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadows.md,
  },
  registerButtonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  loginLinkText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
  },
  loginLinkBold: {
    color: '#6C63FF',
    fontWeight: '700',
  },
});

export default RegisterScreen;
