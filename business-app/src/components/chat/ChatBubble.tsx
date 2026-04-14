import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../../types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatTimeAgo } from '../../utils/formatters';

interface ChatBubbleProps {
  message: Message;
  isMine: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isMine }) => {
  return (
    <View style={[styles.container, isMine ? styles.containerMine : styles.containerTheirs]}>
      {!isMine && (
        <Text style={styles.senderName}>{message.senderName}</Text>
      )}
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>
          {message.content}
        </Text>
      </View>
      <View style={[styles.meta, isMine ? styles.metaMine : styles.metaTheirs]}>
        <Text style={styles.timestamp}>{formatTimeAgo(message.timestamp)}</Text>
        {isMine && (
          <Text style={styles.readStatus}>{message.read ? '✓✓' : '✓'}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '75%',
  },
  containerMine: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  containerTheirs: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  senderName: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
    marginHorizontal: spacing.sm,
  },
  bubble: {
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: '100%',
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderBottomRightRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    ...typography.styles.body1,
    lineHeight: 22,
    textAlign: 'right',
  },
  textMine: {
    color: colors.white,
  },
  textTheirs: {
    color: colors.textPrimary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginHorizontal: spacing.xs,
  },
  metaMine: {
    flexDirection: 'row-reverse',
  },
  metaTheirs: {},
  timestamp: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    fontSize: 10,
  },
  readStatus: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: '600',
  },
});
