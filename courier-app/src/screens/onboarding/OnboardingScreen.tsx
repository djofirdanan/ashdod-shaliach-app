// ============================================================
// ONBOARDING SCREEN - אשדוד-שליח Courier App
// ============================================================

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

interface Slide {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  background: string;
  accentColor: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: '🚀',
    title: 'קבל משלוחים בלחיצת כפתור',
    subtitle: 'קבל הודעות בזמן אמת על משלוחים חדשים באשדוד ובאזור. בחר, קבל ויצא לדרך.',
    background: '#6C63FF',
    accentColor: '#FFFFFF',
  },
  {
    id: '2',
    icon: '💰',
    title: 'הרוויח יותר עם בונוסים חכמים',
    subtitle: 'בונוסי גשם, לילה ועומס מגדילים את ההכנסה שלך. ככל שתעבד יותר, תרוויח יותר.',
    background: '#1E1F30',
    accentColor: '#F6C90E',
  },
  {
    id: '3',
    icon: '🗺️',
    title: 'ניווט חכם ומסלול אופטימלי',
    subtitle: 'המערכת מחשבת את המסלול הכי יעיל עבורך. חסוך זמן ודלק, הגע מהר יותר.',
    background: '#1E1F30',
    accentColor: '#6C63FF',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('onboarding_seen', 'true');
    navigation.replace('Auth');
  };

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      finishOnboarding();
    }
  };

  const onMomentumScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const renderSlide = ({ item }: ListRenderItemInfo<Slide>) => (
    <View style={[styles.slide, { backgroundColor: item.background, width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        <View style={[styles.iconCircle, { borderColor: item.accentColor + '40' }]}>
          <Text style={styles.slideIcon}>{item.icon}</Text>
        </View>
        <Text style={[styles.slideTitle, { color: item.accentColor }]}>{item.title}</Text>
        <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  const currentSlide = SLIDES[currentIndex];
  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={finishOnboarding}>
        <Text style={styles.skipText}>דלג</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        style={styles.flatList}
      />

      {/* Bottom controls */}
      <View style={styles.bottomSection}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                flatListRef.current?.scrollToIndex({ index: i, animated: true });
                setCurrentIndex(i);
              }}
            >
              <View
                style={[
                  styles.dot,
                  i === currentIndex && styles.dotActive,
                  i === currentIndex && { backgroundColor: currentSlide.accentColor },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Next / Start button */}
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: currentSlide.accentColor },
          ]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.nextButtonText,
              { color: isLast ? '#1A1B2E' : currentSlide.background },
            ]}
          >
            {isLast ? 'התחל' : 'הבא'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B2E',
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    left: Spacing.xl,
    zIndex: 10,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.full,
  },
  skipText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  flatList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  slideContent: {
    alignItems: 'center',
    paddingTop: 60,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  slideIcon: {
    fontSize: 72,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 34,
  },
  slideSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 300,
  },
  bottomSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 48,
    paddingTop: Spacing.xl,
    backgroundColor: '#1A1B2E',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

export default OnboardingScreen;
