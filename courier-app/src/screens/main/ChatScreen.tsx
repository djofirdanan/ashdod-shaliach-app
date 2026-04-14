// ============================================================
// CHAT SCREEN - אשדוד-שליח Courier App
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ListRenderItemInfo,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootState } from '../../store';
import { ChatBubble } from '../../components/chat/ChatBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { socketService } from '../../services/socket.service';
import { ChatMessage, MainStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius } from '../../theme';

type ChatScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Chat'>;
  route: RouteProp<MainStackParamList, 'Chat'>;
};

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const { deliveryId, recipientName } = route.params;
  const courier = useSelector((s: RootState) => s.auth.courier);

  const [messages, setMessages] = useState<ChatMessage[]>([
    // Seed with a welcome message from the business
    {
      id: 'seed-1',
      senderId: 'business-001',
      senderName: recipientName,
      senderType: 'business',
      content: 'שלום! ההזמנה מוכנה לאיסוף 🍔',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      isRead: true,
      deliveryId,
    },
  ]);

  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    // Join socket room for this delivery
    socketService.joinDeliveryRoom(deliveryId);

    // Listen for incoming messages
    const unsubscribe = socketService.on<ChatMessage>('chat:message', (message) => {
      if (message.deliveryId === deliveryId) {
        setMessages((prev) => [...prev, { ...message, isRead: true }]);
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    return () => {
      unsubscribe();
      socketService.leaveDeliveryRoom(deliveryId);
    };
  }, [deliveryId]);

  const handleSend = useCallback(
    (text: string) => {
      if (!courier) return;

      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: courier.id,
        senderName: courier.name,
        senderType: 'courier',
        content: text,
        timestamp: new Date().toISOString(),
        isRead: false,
        deliveryId,
      };

      setMessages((prev) => [...prev, newMessage]);

      // Send via socket
      socketService.sendMessage(deliveryId, text, 'business-recipient');

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [courier, deliveryId]
  );

  const renderMessage = ({ item }: ListRenderItemInfo<ChatMessage>) => (
    <ChatBubble message={item} currentUserId={courier?.id ?? ''} />
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={22} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>🏪</Text>
          </View>
          <View>
            <Text style={styles.headerName} numberOfLines={1}>
              {recipientName}
            </Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>מחובר</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="call-outline" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatIcon}>💬</Text>
            <Text style={styles.emptyChatText}>התחל שיחה עם {recipientName}</Text>
          </View>
        }
      />

      {/* Chat input */}
      <ChatInput onSend={handleSend} />
    </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.base,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: Spacing.md,
    backgroundColor: '#252636',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: Spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(108,99,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#6C63FF',
  },
  headerAvatarText: {
    fontSize: 20,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'right',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00E676',
  },
  onlineText: {
    fontSize: 11,
    color: '#00E676',
    fontWeight: '600',
  },
  headerAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: 4,
  },
  emptyChat: {
    alignItems: 'center',
    paddingTop: 60,
    gap: Spacing.md,
  },
  emptyChatIcon: {
    fontSize: 48,
  },
  emptyChatText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
});

export default ChatScreen;
