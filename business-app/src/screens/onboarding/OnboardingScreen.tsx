import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from '../../components/common/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  gradient: string[];
  bgIcon: keyof typeof Ionicons.glyphMap;
}

const SLIDES: Slide[] = [
  {
    icon: 'flash',
    title: 'משלוחים מהירים',
    subtitle: 'משלוחים מהירים לאשדוד והסביבה\nבזמן שיא ובאמינות מלאה',
    gradient: [colors.primary, colors.primaryLight],
    bgIcon: 'bicycle',
  },
  {
    icon: 'location',
    title: 'מעקב בזמן אמת',
    subtitle: 'עקוב אחר המשלוח בזמן אמת\nדע תמיד היכן החבילה שלך',
    gradient: ['#00CEC9', '#55EFC4'],
    bgIcon: 'map',
  },
  {
    icon: 'star',
    title: 'שליחים מקצועיים',
    subtitle: 'שליחים מקצועיים בלחיצת כפתור\nשירות אמין ומדורג',
    gradient: [colors.secondary, '#FDCB6E'],
    bgIcon: 'people',
  },
];

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const dotAnims = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  const goTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * index, animated: true });
    setCurrentIndex(index);
    dotAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === index ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== currentIndex) {
      setCurrentIndex(idx);
      dotAnims.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: i === idx ? 1 : 0,
          duration: 250,
          useNativeDriver: false,
        }).start();
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      goTo(currentIndex + 1);
    } else {
      navigation.replace('Login');
    }
  };

  const handleSkip = () => {
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, index) => (
          <LinearGradient
            key={index}
            colors={slide.gradient as any}
            style={styles.slide}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Background large icon */}
            <View style={styles.bgIconWrap}>
              <Ionicons name={slide.bgIcon} size={220} color="rgba(255,255,255,0.08)" />
            </View>

            {/* Main illustration */}
            <View style={styles.illustrationWrap}>
              <View style={styles.iconCircleOuter}>
                <View style={styles.iconCircleInner}>
                  <Ionicons name={slide.icon} size={60} color={colors.white} />
                </View>
              </View>
            </View>

            {/* Text */}
            <View style={styles.textWrap}>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
            </View>
          </LinearGradient>
        ))}
      </ScrollView>

      {/* Bottom area */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const dotWidth = dotAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: [8, 28],
            });
            const dotOpacity = dotAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: [0.35, 1],
            });
            return (
              <TouchableOpacity key={i} onPress={() => goTo(i)} activeOpacity={0.7}>
                <Animated.View style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]} />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.buttons}>
          {currentIndex < SLIDES.length - 1 ? (
            <>
              <Button
                title="המשך"
                onPress={handleNext}
                variant="primary"
                size="lg"
                gradient
                style={styles.nextBtn}
              />
              <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
                <Text style={styles.skipText}>דלג</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Button
              title="בואו נתחיל!"
              onPress={handleNext}
              variant="primary"
              size="lg"
              gradient
              fullWidth
              style={styles.startBtn}
              icon={<Ionicons name="rocket-outline" size={20} color={colors.white} />}
              iconPosition="right"
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgIconWrap: {
    position: 'absolute',
    bottom: -40,
    right: -40,
  },
  illustrationWrap: {
    marginBottom: 40,
  },
  iconCircleOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  slideTitle: {
    ...typography.styles.h2,
    color: colors.white,
    textAlign: 'center',
  },
  slideSubtitle: {
    ...typography.styles.body1,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 26,
  },
  bottom: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.lg,
    paddingBottom: 40,
    gap: spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  nextBtn: {
    flex: 1,
    minHeight: 54,
  },
  skipBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    ...typography.styles.button,
    color: colors.textSecondary,
  },
  startBtn: {
    minHeight: 54,
  },
});
