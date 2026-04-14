import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { ChatBubble } from '../../components/chat/ChatBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { socketService } from '../../services/socket.service';
import { RootState } from '../../store';
import { Message, RootStackParamList } from '../../types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

type RouteProps = RouteProp<RootStackParamList, 'Chat'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

// Mock initial messages for demo
const makeMockMessages = (deliveryId: string, currentUserId: string): Message[] => [
  {
    id: 'msg_1',
    deliveryId,
    senderId: 'courier_1',
    senderName: 'השליח',
    senderRole: 'courier',
    content: 'שלום! אני בדרך לאסוף את החבילה',
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    read: true,
  },
  {
    id: 'msg_2',
    deliveryId,
    senderId: currentUserId,
    senderName: 'אני',
    senderRole: 'business',
    content: 'תודה! אנא צלצל בעת הגעה',
    timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
    read: true,
  },
  {
    id: 'msg_3',
    deliveryId,
    senderId: 'courier_1',
    senderName: 'השליח',
    senderRole: 'courier',
    content: 'בסדר, אני אצלצל',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    read: true,
  },
];

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { deliveryId, courierName } = route.params;

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const flatListRef = useRef<FlatList<Message>>(null);

  const [messages, setMessages] = useState<Message[]>(() =>
    makeMockMessages(deliveryId, currentUser?.id ?? 'user_1')
  );

  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    // Join the delivery room for real-time updates
    socketService.joinDeliveryRoom(deliveryId);

    // Listen for incoming messages
    socketService.onMessage((message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socketService.leaveDeliveryRoom(deliveryId);
      socketService.offMessage();
    };
  }, [deliveryId]);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const handleSend = (text: string) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      deliveryId,
      senderId: currentUser?.id ?? 'user_1',
      senderName: currentUser?.businessName || currentUser?.name || 'עסק',
      senderRole: 'business',
      content: text,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Optimistically add message to UI
    setMessages((prev) => [...prev, newMessage]);

    // Emit via socket
    socketService.sendMessage(deliveryId, text);
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMine = item.senderId === (currentUser?.id ?? 'user_1');
    return <ChatBubble message={item} isMine={isMine} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.courierAvatar}>
            <Ionicons name="person" size={18} color={colors.white} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>{courierName}</Text>
            <Text style={styles.headerSubtitle}>שליח - משלוח #{deliveryId.slice(-5)}</Text>
          </View>
        </View>

        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          inverted={false}
        />

        {/* Chat input */}
        <ChatInput onSend={handleSend} placeholder="הקלד הודעה לשליח..." />
      </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  courierAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    ...typography.styles.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  headerRight: {
    width: 40,
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
});

export default ChatScreen;
