// ============================================================
// VEHICLE SETUP SCREEN - אשדוד-שליח Courier App
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
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { AuthStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';

type VehicleSetupScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'VehicleSetup'>;
};

const VEHICLE_DISPLAY: Record<string, { label: string; icon: string; needsPlate: boolean }> = {
  bicycle: { label: 'אופניים', icon: '🚲', needsPlate: false },
  electric_scooter: { label: 'קורקינט חשמלי', icon: '🛴', needsPlate: false },
  motorcycle: { label: 'אופנוע', icon: '🏍️', needsPlate: true },
  car: { label: 'מכונית', icon: '🚗', needsPlate: true },
  walking: { label: 'רגלי', icon: '🚶', needsPlate: false },
};

export const VehicleSetupScreen: React.FC<VehicleSetupScreenProps> = ({ navigation }) => {
  const courier = useSelector((s: RootState) => s.auth.courier);
  const vehicleType = courier?.vehicleType ?? 'motorcycle';
  const vehicleInfo = VEHICLE_DISPLAY[vehicleType] ?? VEHICLE_DISPLAY.motorcycle;

  const [licensePlate, setLicensePlate] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState('');

  const handleContinue = () => {
    if (vehicleInfo.needsPlate && !licensePlate.trim()) {
      Alert.alert('שגיאה', 'אנא הזן מספר רישוי לרכב.');
      return;
    }
    // Navigate to Main - AppNavigator handles it via auth state
    navigation.getParent()?.navigate('Main');
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
          <Text style={styles.headerTitle}>פרטי הרכב</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Vehicle display */}
        <View style={styles.vehicleDisplay}>
          <Text style={styles.vehicleEmoji}>{vehicleInfo.icon}</Text>
          <Text style={styles.vehicleTypeLabel}>{vehicleInfo.label}</Text>
          <Text style={styles.vehicleSubLabel}>הזן פרטים נוספים על הרכב שלך</Text>
        </View>

        <View style={styles.form}>
          {/* License plate (for car/motorcycle) */}
          {vehicleInfo.needsPlate && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>מספר רישוי</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="card-outline"
                  size={18}
                  color="rgba(255,255,255,0.4)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={licensePlate}
                  onChangeText={setLicensePlate}
                  placeholder="12-345-67"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  textAlign="right"
                  autoCapitalize="characters"
                  maxLength={10}
                />
              </View>
            </View>
          )}

          {/* Color */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>צבע</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="color-palette-outline"
                size={18}
                color="rgba(255,255,255,0.4)"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={color}
                onChangeText={setColor}
                placeholder="לבן / שחור / אדום..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                textAlign="right"
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Year */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>שנת ייצור</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color="rgba(255,255,255,0.4)"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={year}
                onChangeText={setYear}
                placeholder="2020"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="number-pad"
                textAlign="right"
                maxLength={4}
              />
            </View>
          </View>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#6C63FF" />
            <Text style={styles.infoText}>
              פרטי הרכב מסייעים ללקוחות לזהות אותך בקלות בעת האיסוף.
            </Text>
          </View>

          {/* Continue button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>המשך</Text>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
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
  vehicleDisplay: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    marginBottom: Spacing.xl,
  },
  vehicleEmoji: {
    fontSize: 72,
    marginBottom: Spacing.md,
  },
  vehicleTypeLabel: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  vehicleSubLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(108,99,255,0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    textAlign: 'right',
  },
  continueButton: {
    backgroundColor: '#6C63FF',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    ...Shadows.md,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.5,
  },
});

export default VehicleSetupScreen;
