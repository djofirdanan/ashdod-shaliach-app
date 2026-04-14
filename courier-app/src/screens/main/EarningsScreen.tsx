// ============================================================
// EARNINGS SCREEN - אשדוד-שליח Courier App
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';

type EarningsScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList>;
};

type Period = 'today' | 'week' | 'month';

interface EarningsEntry {
  id: string;
  date: string;
  time: string;
  from: string;
  to: string;
  base: number;
  bonus: number;
  bonusType?: string;
}

// Dummy data
const DUMMY_ENTRIES: EarningsEntry[] = [
  { id: '1', date: '13/04', time: '14:30', from: 'פיצה עשרות', to: 'רחוב אלנבי 12', base: 18, bonus: 5, bonusType: 'עומס' },
  { id: '2', date: '13/04', time: '13:10', from: 'שווארמה הפלמח', to: 'שד\' הציונות 45', base: 22, bonus: 0 },
  { id: '3', date: '13/04', time: '11:45', from: 'סושי יאמי', to: 'רחוב בן גוריון 7', base: 25, bonus: 8, bonusType: 'גשם' },
  { id: '4', date: '12/04', time: '22:15', from: 'מקדונלדס', to: 'רחוב הרצל 33', base: 16, bonus: 12, bonusType: 'לילה' },
  { id: '5', date: '12/04', time: '20:00', from: 'בורגר ראנץ\'', to: 'דרך נחל הבשור 18', base: 20, bonus: 5, bonusType: 'עומס' },
  { id: '6', date: '11/04', time: '15:20', from: 'חומוס דודו', to: 'רחוב יהודה הלוי 9', base: 14, bonus: 0 },
  { id: '7', date: '11/04', time: '12:00', from: 'טעמים', to: 'רחוב הנשיא 2', base: 19, bonus: 3, bonusType: 'עומס' },
];

const PERIOD_DATA: Record<Period, { total: number; deliveries: number; base: number; bonusTotal: number; rain: number; night: number; surge: number; pending: number }> = {
  today: { total: 236, deliveries: 11, base: 198, bonusTotal: 38, rain: 16, night: 12, surge: 10, pending: 236 },
  week: { total: 1480, deliveries: 68, base: 1200, bonusTotal: 280, rain: 60, night: 140, surge: 80, pending: 480 },
  month: { total: 5920, deliveries: 270, base: 4800, bonusTotal: 1120, rain: 240, night: 560, surge: 320, pending: 920 },
};

const PERIOD_LABELS: Record<Period, string> = {
  today: 'היום',
  week: 'שבוע',
  month: 'חודש',
};

export const EarningsScreen: React.FC<EarningsScreenProps> = ({ navigation }) => {
  const [period, setPeriod] = useState<Period>('today');
  const data = PERIOD_DATA[period];

  const renderEntry = ({ item }: ListRenderItemInfo<EarningsEntry>) => (
    <View style={styles.entryCard}>
      <View style={styles.entryLeft}>
        <Text style={styles.entryDate}>{item.date}</Text>
        <Text style={styles.entryTime}>{item.time}</Text>
      </View>
      <View style={styles.entryCenter}>
        <Text style={styles.entryRoute} numberOfLines={1}>
          {item.from}
        </Text>
        <View style={styles.entryArrowRow}>
          <Ionicons name="arrow-back" size={12} color="rgba(255,255,255,0.3)" />
        </View>
        <Text style={styles.entryRoute} numberOfLines={1}>
          {item.to}
        </Text>
      </View>
      <View style={styles.entryRight}>
        <Text style={styles.entryBase}>₪{item.base}</Text>
        {item.bonus > 0 && (
          <Text style={styles.entryBonus}>+₪{item.bonus} {item.bonusType}</Text>
        )}
        <Text style={styles.entryTotal}>₪{item.base + item.bonus}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>הכנסות</Text>
        <TouchableOpacity style={styles.historyButton} onPress={() => navigation.navigate('History')}>
          <Ionicons name="time-outline" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Period selector */}
        <View style={styles.periodSelector}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, period === p && styles.periodTabActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Big total card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>סה"כ הכנסות</Text>
          <View style={styles.totalAmountRow}>
            <Text style={styles.totalCurrency}>₪</Text>
            <Text style={styles.totalAmount}>{data.total.toLocaleString()}</Text>
          </View>
          <Text style={styles.totalDeliveries}>{data.deliveries} משלוחים</Text>
        </View>

        {/* Breakdown section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פירוט הכנסות</Text>

          <View style={styles.breakdownCard}>
            {/* Base */}
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.breakdownDot, { backgroundColor: '#6C63FF' }]} />
                <Text style={styles.breakdownLabel}>משלוחים בסיסיים</Text>
              </View>
              <View style={styles.breakdownRight}>
                <Text style={styles.breakdownValue}>₪{data.base}</Text>
                <Text style={styles.breakdownCount}>{data.deliveries} משלוחים</Text>
              </View>
            </View>

            <View style={styles.sectionDivider} />

            {/* Bonuses */}
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.breakdownDot, { backgroundColor: '#F6C90E' }]} />
                <Text style={styles.breakdownLabel}>בונוסים</Text>
              </View>
              <View style={styles.breakdownRight}>
                <Text style={[styles.breakdownValue, { color: '#F6C90E' }]}>₪{data.bonusTotal}</Text>
              </View>
            </View>

            {/* Rain bonus */}
            <View style={[styles.breakdownRow, styles.breakdownSub]}>
              <Text style={styles.breakdownSubLabel}>🌧️ גשם</Text>
              <Text style={styles.breakdownSubValue}>₪{data.rain}</Text>
            </View>

            {/* Night bonus */}
            <View style={[styles.breakdownRow, styles.breakdownSub]}>
              <Text style={styles.breakdownSubLabel}>🌙 לילה</Text>
              <Text style={styles.breakdownSubValue}>₪{data.night}</Text>
            </View>

            {/* Surge bonus */}
            <View style={[styles.breakdownRow, styles.breakdownSub]}>
              <Text style={styles.breakdownSubLabel}>⚡ עומס</Text>
              <Text style={styles.breakdownSubValue}>₪{data.surge}</Text>
            </View>
          </View>
        </View>

        {/* Payment status */}
        <View style={styles.paymentStatusBadge}>
          <Ionicons name="time-outline" size={18} color={Colors.warning} />
          <Text style={styles.paymentStatusText}>
            בהמתנה לתשלום: ₪{data.pending.toLocaleString()}
          </Text>
        </View>

        {/* Deliveries list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>משלוחים אחרונים</Text>
          {DUMMY_ENTRIES.map((item) => (
            <View key={item.id}>
              {renderEntry({ item, index: 0, separators: null as any })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: 56,
    paddingBottom: Spacing.base,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#252636',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
    gap: Spacing.base,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#252636',
    borderRadius: BorderRadius.xl,
    padding: 4,
    gap: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: '#6C63FF',
    ...Shadows.sm,
  },
  periodTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  periodTabTextActive: {
    color: Colors.white,
  },
  totalCard: {
    backgroundColor: '#1E1B00',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(246,201,14,0.3)',
    ...Shadows.lg,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(246,201,14,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  totalAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  totalCurrency: {
    fontSize: 30,
    fontWeight: '700',
    color: '#F6C90E',
    marginTop: 10,
    marginRight: 4,
  },
  totalAmount: {
    fontSize: 72,
    fontWeight: '900',
    color: '#F6C90E',
    lineHeight: 80,
  },
  totalDeliveries: {
    fontSize: 15,
    color: 'rgba(246,201,14,0.6)',
    marginTop: Spacing.sm,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'right',
  },
  breakdownCard: {
    backgroundColor: '#252636',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  breakdownRight: {
    alignItems: 'flex-end',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  breakdownCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  breakdownSub: {
    paddingRight: Spacing.md,
    paddingLeft: Spacing.xl,
  },
  breakdownSubLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
  breakdownSubValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F6C90E',
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,140,0,0.12)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(251,140,0,0.3)',
  },
  paymentStatusText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.warning,
  },
  entryCard: {
    flexDirection: 'row',
    backgroundColor: '#252636',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  entryLeft: {
    alignItems: 'center',
    width: 36,
  },
  entryDate: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  entryTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  entryCenter: {
    flex: 1,
    gap: 2,
  },
  entryArrowRow: {
    paddingLeft: 4,
  },
  entryRoute: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  entryRight: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  entryBase: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  entryBonus: {
    fontSize: 11,
    color: '#F6C90E',
    fontWeight: '700',
  },
  entryTotal: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.white,
    marginTop: 2,
  },
});

export default EarningsScreen;
