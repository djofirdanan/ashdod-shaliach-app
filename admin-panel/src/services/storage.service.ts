// ============================================================
// Storage Service — localStorage-based CRUD for אשדוד-שליח
// Supabase sync: every write goes to localStorage (instant) +
// Supabase (async, fire-and-forget) for cross-device persistence.
// ============================================================
import * as sync from './sync.service';

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
  logo?: string;           // base64 image
  favoriteCouriers?: string[]; // courier IDs
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
  photo?: string;            // base64 image
  isAvailable?: boolean;     // availability toggle
  favoriteBusinesses?: string[]; // business IDs
}

export interface StoredReview {
  id: string;
  reviewerId: string;
  reviewerType: 'business' | 'courier';
  targetId: string;
  targetType: 'business' | 'courier';
  rating: number;
  comment?: string;
  deliveryId?: string;
  createdAt: string;
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

export interface StoredDelivery {
  id: string;
  businessId: string;
  businessName: string;
  pickupAddress: string;
  dropAddress: string;
  customerName?: string;
  customerPhone?: string;
  description?: string;
  price: number;
  status: 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
  courierId?: string;
  courierName?: string;
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

// ─── Keys ────────────────────────────────────────────────────
const KEYS = {
  businesses: 'app_businesses',
  couriers: 'app_couriers',
  conversations: 'app_conversations',
  messages: 'app_messages',
  deliveries: 'app_deliveries',
  reviews: 'app_reviews',
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
  return btoa(unescape(encodeURIComponent(pw + '_ash_salt')));
}

export function decodePassword(hash: string): string {
  try {
    return decodeURIComponent(escape(atob(hash))).replace('_ash_salt', '');
  } catch {
    return '••••••';
  }
}

export function verifyPassword(pw: string, hash: string): boolean {
  return hashPassword(pw) === hash;
}

// ─── Delivery Notifications ───────────────────────────────────
export interface DeliveryNotification {
  id: string;
  businessId: string;
  businessName: string;
  pickupAddress: string;
  dropAddress: string;
  description?: string;
  price?: number;
  createdAt: string;
  dismissedBy: string[]; // courier IDs
  takenBy?: string;      // courier ID who accepted
}

const NOTIF_KEY = 'app_delivery_notifications';

export function addDeliveryNotification(
  data: Omit<DeliveryNotification, 'id' | 'createdAt' | 'dismissedBy'>
): DeliveryNotification {
  const list = read<DeliveryNotification>(NOTIF_KEY);
  const record: DeliveryNotification = {
    ...data,
    id: uid(),
    createdAt: new Date().toISOString(),
    dismissedBy: [],
  };
  write(NOTIF_KEY, [...list, record]);
  sync.upsertDeliveryNotification(record).catch(console.error);
  // Trigger cross-tab storage event
  localStorage.setItem('app_notif_ping', record.createdAt);
  return record;
}

export function getPendingNotifications(courierId: string): DeliveryNotification[] {
  const list = read<DeliveryNotification>(NOTIF_KEY);
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min
  return list.filter(
    (n) => !n.dismissedBy.includes(courierId) && !n.takenBy && n.createdAt > cutoff
  );
}

export function dismissNotification(notifId: string, courierId: string): void {
  const list = read<DeliveryNotification>(NOTIF_KEY);
  const idx = list.findIndex((n) => n.id === notifId);
  if (idx !== -1) {
    list[idx] = { ...list[idx], dismissedBy: [...list[idx].dismissedBy, courierId] };
    write(NOTIF_KEY, list);
    sync.upsertDeliveryNotification(list[idx]).catch(console.error);
  }
}

export function acceptNotification(notifId: string, courierId: string): void {
  const list = read<DeliveryNotification>(NOTIF_KEY);
  const idx = list.findIndex((n) => n.id === notifId);
  if (idx !== -1) {
    list[idx] = { ...list[idx], takenBy: courierId };
    write(NOTIF_KEY, list);
    sync.upsertDeliveryNotification(list[idx]).catch(console.error);
  }
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
  sync.upsertBusiness(record).catch(console.error);
  return record;
}

export function updateBusiness(id: string, data: Partial<StoredBusiness>): StoredBusiness {
  const list = getBusinesses();
  const idx = list.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error('Business not found');
  list[idx] = { ...list[idx], ...data };
  write(KEYS.businesses, list);
  sync.upsertBusiness(list[idx]).catch(console.error);
  return list[idx];
}

export function deleteBusiness(id: string): void {
  write(KEYS.businesses, getBusinesses().filter((b) => b.id !== id));
  sync.deleteBusiness(id).catch(console.error);
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
  sync.upsertCourier(record).catch(console.error);
  return record;
}

export function updateCourier(id: string, data: Partial<StoredCourier>): StoredCourier {
  const list = getCouriers();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Courier not found');
  list[idx] = { ...list[idx], ...data };
  write(KEYS.couriers, list);
  sync.upsertCourier(list[idx]).catch(console.error);
  return list[idx];
}

export function deleteCourier(id: string): void {
  write(KEYS.couriers, getCouriers().filter((c) => c.id !== id));
  sync.deleteCourier(id).catch(console.error);
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
  sync.upsertConversation(conv).catch(console.error);
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
  sync.insertMessage(record).catch(console.error);

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
    sync.upsertConversation(convList[convIdx]).catch(console.error);
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

// ─── Deliveries ───────────────────────────────────────────────
export function getDeliveries(): StoredDelivery[] {
  return read<StoredDelivery>(KEYS.deliveries);
}

export function getDeliveriesByBusiness(businessId: string): StoredDelivery[] {
  return getDeliveries().filter((d) => d.businessId === businessId);
}

export function getDeliveriesByCourier(courierId: string): StoredDelivery[] {
  return getDeliveries().filter((d) => d.courierId === courierId);
}

export function addDelivery(
  data: Omit<StoredDelivery, 'id' | 'createdAt'>
): StoredDelivery {
  const list = getDeliveries();
  const record: StoredDelivery = {
    ...data,
    id: uid(),
    createdAt: new Date().toISOString(),
  };
  write(KEYS.deliveries, [...list, record]);
  sync.upsertDelivery(record).catch(console.error);
  return record;
}

export function updateDelivery(id: string, data: Partial<StoredDelivery>): StoredDelivery {
  const list = getDeliveries();
  const idx = list.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error('Delivery not found');
  list[idx] = { ...list[idx], ...data };
  write(KEYS.deliveries, list);
  sync.upsertDelivery(list[idx]).catch(console.error);
  return list[idx];
}

// ─── Reviews ─────────────────────────────────────────────────
export function getReviews(): StoredReview[] {
  return read<StoredReview>(KEYS.reviews);
}

export function getReviewsByTarget(targetId: string): StoredReview[] {
  return getReviews().filter((r) => r.targetId === targetId);
}

export function getReviewsByReviewer(reviewerId: string): StoredReview[] {
  return getReviews().filter((r) => r.reviewerId === reviewerId);
}

export function addReview(
  data: Omit<StoredReview, 'id' | 'createdAt'>
): StoredReview {
  const list = getReviews();
  // Remove existing review by same reviewer for same target (one review per delivery/target)
  const filtered = list.filter(
    (r) => !(r.reviewerId === data.reviewerId && r.targetId === data.targetId && r.deliveryId === data.deliveryId)
  );
  const record: StoredReview = {
    ...data,
    id: uid(),
    createdAt: new Date().toISOString(),
  };
  write(KEYS.reviews, [...filtered, record]);
  sync.upsertReview(record).catch(console.error);
  return record;
}

// ─── Password Reset Tokens ────────────────────────────────────
interface ResetToken {
  token: string;
  email: string;
  userType: 'business' | 'courier';
  expiresAt: number; // epoch ms
}

const RESET_KEY = 'app_reset_tokens';

function readResetTokens(): ResetToken[] {
  try {
    const raw = localStorage.getItem(RESET_KEY);
    return raw ? (JSON.parse(raw) as ResetToken[]) : [];
  } catch {
    return [];
  }
}

function writeResetTokens(tokens: ResetToken[]): void {
  localStorage.setItem(RESET_KEY, JSON.stringify(tokens));
}

/** Generate a random hex token, store it, return the token string. Returns null if email not found. */
export function createResetToken(email: string): { token: string; userType: 'business' | 'courier' } | null {
  const normalizedEmail = email.trim().toLowerCase();

  // Look up in businesses first, then couriers
  const biz = getBusinessByEmail(normalizedEmail) || getBusinesses().find(b => b.email.toLowerCase() === normalizedEmail);
  const cour = !biz && (getCourierByEmail(normalizedEmail) || getCouriers().find(c => c.email.toLowerCase() === normalizedEmail));

  if (!biz && !cour) return null;

  const userType: 'business' | 'courier' = biz ? 'business' : 'courier';

  // Generate cryptographic random token
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  const token = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

  // Remove old tokens for this email, add new one
  const expiresAt = Date.now() + 60 * 60 * 1000;
  const tokens = readResetTokens().filter(t => t.email.toLowerCase() !== normalizedEmail);
  tokens.push({ token, email: normalizedEmail, userType, expiresAt });
  writeResetTokens(tokens);
  sync.upsertResetToken(token, normalizedEmail, userType, expiresAt).catch(console.error);

  return { token, userType };
}

/** Verify a reset token. Returns token record if valid, null otherwise. */
export function verifyResetToken(token: string): ResetToken | null {
  const tokens = readResetTokens();
  const record = tokens.find(t => t.token === token);
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    // Expired — clean up
    writeResetTokens(tokens.filter(t => t.token !== token));
    return null;
  }
  return record;
}

/** Apply a password reset: update the user's password and invalidate the token. */
export function applyResetToken(token: string, newPassword: string): boolean {
  const record = verifyResetToken(token);
  if (!record) return false;

  const hashed = hashPassword(newPassword);

  if (record.userType === 'business') {
    const biz = getBusinesses().find(b => b.email.toLowerCase() === record.email);
    if (!biz) return false;
    updateBusiness(biz.id, { password: hashed });
  } else {
    const cour = getCouriers().find(c => c.email.toLowerCase() === record.email);
    if (!cour) return false;
    updateCourier(cour.id, { password: hashed });
  }

  // Invalidate token
  writeResetTokens(readResetTokens().filter(t => t.token !== token));
  sync.deleteResetToken(token).catch(console.error);
  return true;
}
