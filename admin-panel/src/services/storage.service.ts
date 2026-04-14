// ============================================================
// Storage Service — localStorage-based CRUD for אשדוד-שליח
// ============================================================

export interface StoredBusiness {
  id: string;
  email: string;
  password: string; // btoa encoded
  businessName: string;
  contactPerson: string;
  phone: string;
  address: { street: string; city: string; zone?: string };
  category: string;
  isActive: boolean;
  isBlocked: boolean;
  blockedReason?: string;
  createdAt: string;
  balance: number;
  totalDeliveries: number;
  rating: number;
  lastOrderAt?: string;
}

export interface StoredCourier {
  id: string;
  email: string;
  password: string; // btoa encoded
  name: string;
  phone: string;
  vehicle: 'motorcycle' | 'bicycle' | 'car' | 'scooter';
  vehiclePlate?: string;
  isActive: boolean;
  isBlocked: boolean;
  blockedReason?: string;
  createdAt: string;
  rating: number;
  totalDeliveries: number;
  activeDeliveries: number;
  lastActiveAt?: string;
  earnings: { today: number; thisWeek: number; thisMonth: number; total: number };
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderType: 'business' | 'courier' | 'admin';
  content: string;
  messageType: 'text' | 'image';
  imageUrl?: string;
  readAt?: string;
  createdAt: string;
}

export interface StoredConversation {
  id: string; // `${businessId}_${courierId}`
  businessId: string;
  businessName: string;
  courierId: string;
  courierName: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadBusiness: number;
  unreadCourier: number;
  createdAt: string;
}

// ─── Keys ────────────────────────────────────────────────────
const KEYS = {
  businesses: 'app_businesses',
  couriers: 'app_couriers',
  conversations: 'app_conversations',
  messages: 'app_messages',
} as const;

// ─── Helpers ─────────────────────────────────────────────────
function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Password ────────────────────────────────────────────────
export function hashPassword(pw: string): string {
  return btoa(pw + '_ash_salt');
}

export function verifyPassword(pw: string, hash: string): boolean {
  return hashPassword(pw) === hash;
}

// ─── Businesses ──────────────────────────────────────────────
export function getBusinesses(): StoredBusiness[] {
  return read<StoredBusiness>(KEYS.businesses);
}

export function getBusiness(id: string): StoredBusiness | undefined {
  return getBusinesses().find((b) => b.id === id);
}

export function getBusinessByEmail(email: string): StoredBusiness | undefined {
  return getBusinesses().find((b) => b.email.toLowerCase() === email.toLowerCase());
}

export function addBusiness(data: Omit<StoredBusiness, 'id' | 'createdAt'>): StoredBusiness {
  const list = getBusinesses();
  const record: StoredBusiness = {
    ...data,
    id: uid(),
    createdAt: new Date().toISOString(),
  };
  write(KEYS.businesses, [...list, record]);
  return record;
}

export function updateBusiness(id: string, data: Partial<StoredBusiness>): StoredBusiness {
  const list = getBusinesses();
  const idx = list.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error('Business not found');
  list[idx] = { ...list[idx], ...data };
  write(KEYS.businesses, list);
  return list[idx];
}

export function deleteBusiness(id: string): void {
  write(KEYS.businesses, getBusinesses().filter((b) => b.id !== id));
}

// ─── Couriers ────────────────────────────────────────────────
export function getCouriers(): StoredCourier[] {
  return read<StoredCourier>(KEYS.couriers);
}

export function getCourier(id: string): StoredCourier | undefined {
  return getCouriers().find((c) => c.id === id);
}

export function getCourierByEmail(email: string): StoredCourier | undefined {
  return getCouriers().find((c) => c.email.toLowerCase() === email.toLowerCase());
}

export function addCourier(data: Omit<StoredCourier, 'id' | 'createdAt'>): StoredCourier {
  const list = getCouriers();
  const record: StoredCourier = {
    ...data,
    id: uid(),
    createdAt: new Date().toISOString(),
  };
  write(KEYS.couriers, [...list, record]);
  return record;
}

export function updateCourier(id: string, data: Partial<StoredCourier>): StoredCourier {
  const list = getCouriers();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Courier not found');
  list[idx] = { ...list[idx], ...data };
  write(KEYS.couriers, list);
  return list[idx];
}

export function deleteCourier(id: string): void {
  write(KEYS.couriers, getCouriers().filter((c) => c.id !== id));
}

// ─── Conversations ───────────────────────────────────────────
export function getConversations(): StoredConversation[] {
  return read<StoredConversation>(KEYS.conversations);
}

export function getOrCreateConversation(
  businessId: string,
  courierId: string
): StoredConversation {
  const list = getConversations();
  const id = `${businessId}_${courierId}`;
  const existing = list.find((c) => c.id === id);
  if (existing) return existing;

  const business = getBusiness(businessId);
  const courier = getCourier(courierId);

  const conv: StoredConversation = {
    id,
    businessId,
    businessName: business?.businessName ?? businessId,
    courierId,
    courierName: courier?.name ?? courierId,
    unreadBusiness: 0,
    unreadCourier: 0,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.conversations, [...list, conv]);
  return conv;
}

// ─── Messages ────────────────────────────────────────────────
export function getMessages(conversationId: string): StoredMessage[] {
  return read<StoredMessage>(KEYS.messages).filter(
    (m) => m.conversationId === conversationId
  );
}

export function addMessage(
  conversationId: string,
  msg: Omit<StoredMessage, 'id' | 'conversationId' | 'createdAt'>
): StoredMessage {
  const allMessages = read<StoredMessage>(KEYS.messages);
  const record: StoredMessage = {
    ...msg,
    id: uid(),
    conversationId,
    createdAt: new Date().toISOString(),
  };
  write(KEYS.messages, [...allMessages, record]);

  // Update conversation last message
  const convList = getConversations();
  const convIdx = convList.findIndex((c) => c.id === conversationId);
  if (convIdx !== -1) {
    convList[convIdx] = {
      ...convList[convIdx],
      lastMessage: msg.content.slice(0, 80),
      lastMessageAt: record.createdAt,
      unreadBusiness:
        msg.senderType !== 'business'
          ? convList[convIdx].unreadBusiness + 1
          : convList[convIdx].unreadBusiness,
      unreadCourier:
        msg.senderType !== 'courier'
          ? convList[convIdx].unreadCourier + 1
          : convList[convIdx].unreadCourier,
    };
    write(KEYS.conversations, convList);
  }

  return record;
}

export function markMessagesRead(
  conversationId: string,
  readerType: 'business' | 'courier' | 'admin'
): void {
  // Mark messages as read
  const allMessages = read<StoredMessage>(KEYS.messages).map((m) => {
    if (m.conversationId === conversationId && !m.readAt && m.senderType !== readerType) {
      return { ...m, readAt: new Date().toISOString() };
    }
    return m;
  });
  write(KEYS.messages, allMessages);

  // Reset unread counters for that reader
  const convList = getConversations();
  const convIdx = convList.findIndex((c) => c.id === conversationId);
  if (convIdx !== -1) {
    if (readerType === 'business') {
      convList[convIdx] = { ...convList[convIdx], unreadBusiness: 0 };
    } else if (readerType === 'courier') {
      convList[convIdx] = { ...convList[convIdx], unreadCourier: 0 };
    } else {
      convList[convIdx] = {
        ...convList[convIdx],
        unreadBusiness: 0,
        unreadCourier: 0,
      };
    }
    write(KEYS.conversations, convList);
  }
}

export function getUnreadCount(userId: string, userType: 'business' | 'courier'): number {
  const convList = getConversations();
  return convList.reduce((sum, c) => {
    if (userType === 'business' && c.businessId === userId) {
      return sum + c.unreadBusiness;
    }
    if (userType === 'courier' && c.courierId === userId) {
      return sum + c.unreadCourier;
    }
    return sum;
  }, 0);
}
