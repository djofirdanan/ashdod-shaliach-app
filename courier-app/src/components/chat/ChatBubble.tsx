// ============================================================
// CHAT BUBBLE - אשדוד-שליח Courier App
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme';
import { ChatMessage } from '../../types';

interface ChatBubbleProps {
  message: ChatMessage;
  currentUserId: string;
}

const SENDER_TYPE_LABELS: Record<ChatMessage['senderType'], string> = {
  courier: 'שליח',
  customer: 'לקוח',
  business: 'עסק',
  support: 'תמיכה',
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, currentUserId }) => {
  const isSelf = message.senderId === currentUserId;

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.wrapper, isSelf ? styles.wrapperSelf : styles.wrapperOther]}>
      {/* Sender name (only for others) */}
      {!isSelf && (
        <Text style={styles.senderName}>
          {message.senderName} · {SENDER_TYPE_LABELS[message.senderType]}
        </Text>
      )}

      <View style={[styles.bubble, isSelf ? styles.bubbleSelf : styles.bubbleOther]}>
        <Text style={[styles.messageText, isSelf ? styles.textSelf : styles.textOther]}>
          {message.content}
        </Text>

        <View style={styles.footer}>
          <Text style={[styles.timestamp, isSelf ? styles.timestampSelf : styles.timestampOther]}>
            {formatTime(message.timestamp)}
          </Text>
          {isSelf && (
            <Text style={styles.readIndicator}>
              {message.isRead ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 3,
    maxWidth: '80%',
  },
  wrapperSelf: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  wrapperOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 3,
    paddingHorizontal: 4,
  },
  bubble: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: '100%',
  },
  bubbleSelf: {
    backgroundColor: Colors.chatBubbleSelf,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.chatBubbleOther,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  textSelf: {
    color: Colors.chatTextSelf,
  },
  textOther: {
    color: Colors.chatTextOther,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    gap: 4,
  },
  timestamp: {
    fontSize: 10,
  },
  timestampSelf: {
    color: 'rgba(255,255,255,0.65)',
  },
  timestampOther: {
    color: Colors.textTertiary,
  },
  readIndicator: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
  },
});

export default ChatBubble;
