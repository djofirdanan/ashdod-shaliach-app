import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { toggleDarkMode } from '../../store/uiSlice';
import { RootState, AppDispatch } from '../../store';
import { RootStackParamList } from '../../types';
import { authService } from '../../services/auth.service';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const { user, logout } = useAuth();
  const isDarkMode = useSelector((state: RootState) => state.ui.isDarkMode);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const businessInitial = (user?.businessName || user?.name || 'ע').charAt(0).toUpperCase();

  const handleEditProfile = () => {
    Alert.alert('בקרוב', 'עריכת פרופיל תהיה זמינה בגרסה הבאה');
  };

  const handleContact = () => {
    Alert.alert('צור קשר', 'לפניות: support@ashdod-shaliach.co.il\nטלפון: 08-123-4567');
  };

  const handleToggleNotifications = (value: boolean) => {
    setNotificationsEnabled(value);
  };

  const handleToggleDarkMode = () => {
    dispatch(toggleDarkMode());
  };

  const handleLogout = () => {
    Alert.alert(
      'התנתקות',
      'האם אתה בטוח שברצונך להתנתק?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'התנתק',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await authService.logout();
              await logout();
              navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
            } catch {
              Alert.alert('שגיאה', 'לא ניתן להתנתק כרגע');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>פרופיל</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Business info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{businessInitial}</Text>
          </View>
          <Text style={styles.businessName}>{user?.businessName || user?.name || 'עסק'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}

          <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile} activeOpacity={0.8}>
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
            <Text style={styles.editBtnText}>ערוך פרופיל</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {user && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.totalDeliveries ?? 0}</Text>
              <Text style={styles.statLabel}>משלוחים</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.rating?.toFixed(1) ?? '—'}</Text>
              <Text style={styles.statLabel}>דירוג</Text>
            </View>
          </View>
        )}

        {/* Settings section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>הגדרות</Text>

          <View style={styles.settingsCard}>
            {/* Notifications toggle */}
            <View style={styles.settingRow}>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={notificationsEnabled ? colors.primary : colors.textTertiary}
              />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>התראות</Text>
                <Text style={styles.settingDesc}>קבל עדכונים על משלוחים</Text>
              </View>
              <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            </View>

            <View style={styles.settingDivider} />

            {/* Dark mode toggle */}
            <View style={styles.settingRow}>
              <Switch
                value={isDarkMode}
                onValueChange={handleToggleDarkMode}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={isDarkMode ? colors.primary : colors.textTertiary}
              />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>מצב לילה</Text>
                <Text style={styles.settingDesc}>ממשק כהה</Text>
              </View>
              <Ionicons name="moon-outline" size={22} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Support section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>עזרה ותמיכה</Text>

          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.menuRow} onPress={handleContact} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={18} color={colors.textTertiary} />
              <Text style={styles.menuLabel}>צור קשר</Text>
              <Ionicons name="mail-outline" size={22} color={colors.primary} />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => Alert.alert('תנאי שימוש', 'קישור לתנאי השימוש יתווסף בקרוב')}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={18} color={colors.textTertiary} />
              <Text style={styles.menuLabel}>תנאי שימוש</Text>
              <Ionicons name="document-text-outline" size={22} color={colors.primary} />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => Alert.alert('אודות', 'אשדוד-שליח עסקים v1.0.0\nפותח עבור עסקים באשדוד')}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={18} color={colors.textTertiary} />
              <Text style={styles.menuLabel}>אודות</Text>
              <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.logoutBtn, isLoggingOut && styles.logoutBtnDisabled]}
            onPress={handleLogout}
            activeOpacity={0.8}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
            )}
            <Text style={styles.logoutBtnText}>התנתק</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
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
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'flex-end',
  },
  headerTitle: {
    ...typography.styles.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  content: {
    paddingBottom: spacing.xl,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.screenPadding,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarInitial: {
    fontSize: 36,
    color: colors.white,
    fontWeight: '700',
  },
  businessName: {
    ...typography.styles.h4,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  email: {
    ...typography.styles.body2,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  phone: {
    ...typography.styles.body2,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusFull,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#EDE9FF',
    marginTop: spacing.sm,
  },
  editBtnText: {
    ...typography.styles.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    ...typography.styles.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.styles.label,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  settingInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  settingLabel: {
    ...typography.styles.body1,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  settingDesc: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  menuLabel: {
    ...typography.styles.body1,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  logoutBtn: {
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
  logoutBtnDisabled: {
    opacity: 0.6,
  },
  logoutBtnText: {
    ...typography.styles.button,
    color: colors.error,
    fontWeight: '700',
  },
});

export default ProfileScreen;
