import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface RatingModalProps {
  visible: boolean;
  courierName: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onClose: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  courierName,
  onSubmit,
  onClose,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const starAnims = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

  const handleStarPress = (star: number) => {
    setRating(star);
    Animated.sequence([
      Animated.timing(starAnims[star - 1], { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.timing(starAnims[star - 1], { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const getRatingLabel = (): string => {
    const active = hoveredRating || rating;
    if (active === 1) return 'גרוע';
    if (active === 2) return 'לא טוב';
    if (active === 3) return 'בסדר';
    if (active === 4) return 'טוב';
    if (active === 5) return 'מצוין!';
    return 'דרג את השירות';
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsLoading(true);
    try {
      await onSubmit(rating, comment.trim());
      setRating(0);
      setComment('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="דרג שליח">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          {/* Courier info */}
          <View style={styles.courierBadge}>
            <View style={styles.courierAvatar}>
              <Ionicons name="person" size={28} color={colors.white} />
            </View>
            <Text style={styles.courierName}>{courierName}</Text>
          </View>

          {/* Stars */}
          <Text style={styles.ratingLabel}>{getRatingLabel()}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = hoveredRating ? hoveredRating >= star : rating >= star;
              return (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleStarPress(star)}
                  activeOpacity={0.7}
                >
                  <Animated.View style={{ transform: [{ scale: starAnims[star - 1] }] }}>
                    <Ionicons
                      name={active ? 'star' : 'star-outline'}
                      size={44}
                      color={active ? '#F9CA24' : colors.border}
                    />
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Comment */}
          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>הוסף תגובה (אופציונלי)</Text>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="ספר על חווית השירות..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              maxLength={300}
              textAlign="right"
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}/300</Text>
          </View>

          {/* Quick tags */}
          <View style={styles.tagsRow}>
            {['מהיר', 'מקצועי', 'ידידותי', 'זהיר'].map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, comment.includes(tag) && styles.tagSelected]}
                onPress={() => setComment((prev) => prev ? `${prev}, ${tag}` : tag)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tagText, comment.includes(tag) && styles.tagTextSelected]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title="שלח דירוג"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            fullWidth
            gradient
            isLoading={isLoading}
            disabled={rating === 0}
            style={styles.submitBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  courierBadge: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  courierAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierName: {
    ...typography.styles.h4,
    color: colors.textPrimary,
  },
  ratingLabel: {
    ...typography.styles.body1,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  commentContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  commentLabel: {
    ...typography.styles.label,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  commentInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    ...typography.styles.body1,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    minHeight: 80,
    width: '100%',
  },
  charCount: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    textAlign: 'left',
    marginTop: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tagSelected: {
    backgroundColor: '#EDE9FF',
    borderColor: colors.primary,
  },
  tagText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tagTextSelected: {
    color: colors.primary,
  },
  submitBtn: {
    width: '100%',
  },
});
