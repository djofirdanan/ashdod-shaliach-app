/**
 * Supabase ↔ localStorage sync service
 *
 * Strategy: Supabase is the source of truth.
 * • On app startup → pull everything from Supabase into localStorage (syncDown)
 * • On every write  → write to localStorage immediately (sync) + push to Supabase (async)
 *
 * This means all existing code that reads from localStorage continues to work unchanged.
 */

import { supabase } from '../lib/supabase';
import type { StoredBusiness, StoredCourier, StoredConversation, StoredMessage, DeliveryNotification, StoredDelivery } from './storage.service';

// ─── Mappers: DB row → StoredXxx ─────────────────────────────────

function dbToBusiness(row: Record<string, unknown>): StoredBusiness {
  return {
    id: row.id as string,
    email: row.email as string,
    password: row.password as string,
    businessName: row.business_name as string,
    contactPerson: (row.contact_person as string) || '',
    phone: (row.phone as string) || '',
    address: {
      street: (row.street as string) || '',
      city: (row.city as string) || 'אשדוד',
      zone: (row.zone as string | undefined) || undefined,
    },
    category: (row.category as string) || 'אחר',
    isActive: row.is_active as boolean,
    isBlocked: row.is_blocked as boolean,
    blockedReason: (row.blocked_reason as string | undefined) || undefined,
    createdAt: row.created_at as string,
    balance: Number(row.balance) || 0,
    totalDeliveries: Number(row.total_deliveries) || 0,
    rating: Number(row.rating) || 5,
    lastOrderAt: (row.last_order_at as string | undefined) || undefined,
  };
}

function businessToDb(b: StoredBusiness): Record<string, unknown> {
  return {
    id: b.id,
    email: b.email,
    password: b.password,
    business_name: b.businessName,
    contact_person: b.contactPerson,
    phone: b.phone,
    street: b.address.street,
    city: b.address.city,
    zone: b.address.zone ?? null,
    category: b.category,
    is_active: b.isActive,
    is_blocked: b.isBlocked,
    blocked_reason: b.blockedReason ?? null,
    created_at: b.createdAt,
    balance: b.balance,
    total_deliveries: b.totalDeliveries,
    rating: b.rating,
    last_order_at: b.lastOrderAt ?? null,
  };
}

function dbToCourier(row: Record<string, unknown>): StoredCourier {
  return {
    id: row.id as string,
    email: row.email as string,
    password: row.password as string,
    name: row.name as string,
    phone: (row.phone as string) || '',
    vehicle: row.vehicle as StoredCourier['vehicle'],
    vehiclePlate: (row.vehicle_plate as string | undefined) || undefined,
    isActive: row.is_active as boolean,
    isBlocked: row.is_blocked as boolean,
    blockedReason: (row.blocked_reason as string | undefined) || undefined,
    createdAt: row.created_at as string,
    rating: Number(row.rating) || 5,
    totalDeliveries: Number(row.total_deliveries) || 0,
    activeDeliveries: Number(row.active_deliveries) || 0,
    lastActiveAt: (row.last_active_at as string | undefined) || undefined,
    earnings: {
      today: Number(row.earnings_today) || 0,
      thisWeek: Number(row.earnings_this_week) || 0,
      thisMonth: Number(row.earnings_this_month) || 0,
      total: Number(row.earnings_total) || 0,
    },
  };
}

function courierToDb(c: StoredCourier): Record<string, unknown> {
  return {
    id: c.id,
    email: c.email,
    password: c.password,
    name: c.name,
    phone: c.phone,
    vehicle: c.vehicle,
    vehicle_plate: c.vehiclePlate ?? null,
    is_active: c.isActive,
    is_blocked: c.isBlocked,
    blocked_reason: c.blockedReason ?? null,
    created_at: c.createdAt,
    rating: c.rating,
    total_deliveries: c.totalDeliveries,
    active_deliveries: c.activeDeliveries,
    last_active_at: c.lastActiveAt ?? null,
    earnings_today: c.earnings.today,
    earnings_this_week: c.earnings.thisWeek,
    earnings_this_month: c.earnings.thisMonth,
    earnings_total: c.earnings.total,
  };
}

function dbToConversation(row: Record<string, unknown>): StoredConversation {
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    courierId: row.courier_id as string,
    lastMessage: (row.last_message as string | undefined) || undefined,
    lastMessageAt: (row.last_message_at as string | undefined) || undefined,
    unreadBusiness: Number(row.unread_business) || 0,
    unreadCourier: Number(row.unread_courier) || 0,
    createdAt: row.created_at as string,
    // businessName and courierName are not in DB — filled from relationships
    businessName: '',
    courierName: '',
  };
}

function dbToMessage(row: Record<string, unknown>): StoredMessage {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    senderId: row.sender_id as string,
    senderName: (row.sender_name as string) || '',
    senderType: row.sender_type as StoredMessage['senderType'],
    content: row.content as string,
    messageType: 'text' as const,
    createdAt: row.created_at as string,
    readAt: (row.read_at as string | undefined) || undefined,
  };
}

function dbToNotification(row: Record<string, unknown>): DeliveryNotification {
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    businessName: row.business_name as string,
    pickupAddress: row.pickup_address as string,
    dropAddress: row.drop_address as string,
    description: (row.description as string | undefined) || undefined,
    price: row.price != null ? Number(row.price) : undefined,
    createdAt: row.created_at as string,
    takenBy: (row.taken_by as string | undefined) || undefined,
    dismissedBy: (row.dismissed_by as string[]) || [],
  };
}

// ─── Local storage keys ───────────────────────────────────────────

const LS_KEYS = {
  businesses: 'app_businesses',
  couriers: 'app_couriers',
  conversations: 'app_conversations',
  messages: 'app_messages',
  notifications: 'app_delivery_notifications',
  deliveries: 'app_deliveries',
};

function dbToDelivery(row: Record<string, unknown>): StoredDelivery {
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    businessName: row.business_name as string,
    pickupAddress: row.pickup_address as string,
    dropAddress: row.drop_address as string,
    customerName: (row.customer_name as string | undefined) || undefined,
    customerPhone: (row.customer_phone as string | undefined) || undefined,
    description: (row.description as string | undefined) || undefined,
    price: Number(row.price) || 0,
    status: row.status as StoredDelivery['status'],
    courierId: (row.courier_id as string | undefined) || undefined,
    courierName: (row.courier_name as string | undefined) || undefined,
    createdAt: row.created_at as string,
    acceptedAt: (row.accepted_at as string | undefined) || undefined,
    pickedUpAt: (row.picked_up_at as string | undefined) || undefined,
    deliveredAt: (row.delivered_at as string | undefined) || undefined,
    cancelledAt: (row.cancelled_at as string | undefined) || undefined,
  };
}

// ─── Lightweight polls (called on every refresh cycle) ───────────

/** Fetch only recent delivery_notifications from Supabase → localStorage.
 *  Called every few seconds from the courier overlay and available-deliveries page. */
export async function syncNotificationsDown(): Promise<void> {
  try {
    const { data } = await supabase
      .from('delivery_notifications')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      localStorage.setItem(LS_KEYS.notifications, JSON.stringify(data.map(dbToNotification)));
      // Trigger any cross-tab listeners
      localStorage.setItem('app_notif_ping', Date.now().toString());
    }
  } catch (err) {
    console.warn('[sync] syncNotificationsDown failed:', err);
  }
}

/** Fetch only recent deliveries from Supabase → localStorage.
 *  Called from courier available-deliveries polling. */
export async function syncDeliveriesDown(): Promise<void> {
  try {
    const { data } = await supabase
      .from('deliveries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      localStorage.setItem(LS_KEYS.deliveries, JSON.stringify(
        data.map(d => dbToDelivery(d as Record<string, unknown>))
      ));
    }
  } catch (err) {
    console.warn('[sync] syncDeliveriesDown failed:', err);
  }
}

// ─── Pull from Supabase → localStorage ───────────────────────────

export async function syncDown(): Promise<void> {
  try {
    const [bizRes, courRes, convRes, msgRes, notifRes, delivRes] = await Promise.all([
      supabase.from('businesses').select('*'),
      supabase.from('couriers').select('*'),
      supabase.from('conversations').select('*'),
      supabase.from('messages').select('*').order('created_at', { ascending: true }),
      supabase.from('delivery_notifications').select('*').gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()),
      supabase.from('deliveries').select('*').order('created_at', { ascending: false }),
    ]);

    if (bizRes.data)    localStorage.setItem(LS_KEYS.businesses,     JSON.stringify(bizRes.data.map(dbToBusiness)));
    if (courRes.data)   localStorage.setItem(LS_KEYS.couriers,        JSON.stringify(courRes.data.map(dbToCourier)));
    if (convRes.data)   localStorage.setItem(LS_KEYS.conversations,   JSON.stringify(convRes.data.map(dbToConversation)));
    if (msgRes.data)    localStorage.setItem(LS_KEYS.messages,        JSON.stringify(msgRes.data.map(dbToMessage)));
    if (notifRes.data)  localStorage.setItem(LS_KEYS.notifications,   JSON.stringify(notifRes.data.map(dbToNotification)));
    if (delivRes.data)  localStorage.setItem(LS_KEYS.deliveries,      JSON.stringify(delivRes.data.map(d => dbToDelivery(d as Record<string, unknown>))));

    // Populate businessName/courierName in conversations from local data
    if (convRes.data && bizRes.data && courRes.data) {
      const bizMap = Object.fromEntries(bizRes.data.map(b => [b.id, b.business_name]));
      const courMap = Object.fromEntries(courRes.data.map(c => [c.id, c.name]));
      const convs: StoredConversation[] = convRes.data.map(row => ({
        ...dbToConversation(row),
        businessName: bizMap[row.business_id as string] || '',
        courierName: courMap[row.courier_id as string] || '',
      }));
      localStorage.setItem(LS_KEYS.conversations, JSON.stringify(convs));
    }

    console.log('[sync] ✅ synced from Supabase');
  } catch (err) {
    console.warn('[sync] Failed to sync from Supabase, using localStorage cache:', err);
  }
}

// ─── Push individual records to Supabase ──────────────────────────

export async function upsertBusiness(b: StoredBusiness): Promise<void> {
  const { error } = await supabase.from('businesses').upsert(businessToDb(b), { onConflict: 'id' });
  if (error) console.error('[sync] upsertBusiness error:', error.message);
}

export async function upsertCourier(c: StoredCourier): Promise<void> {
  const { error } = await supabase.from('couriers').upsert(courierToDb(c), { onConflict: 'id' });
  if (error) console.error('[sync] upsertCourier error:', error.message);
}

export async function deleteBusiness(id: string): Promise<void> {
  const { error } = await supabase.from('businesses').delete().eq('id', id);
  if (error) console.error('[sync] deleteBusiness error:', error.message);
}

export async function deleteCourier(id: string): Promise<void> {
  const { error } = await supabase.from('couriers').delete().eq('id', id);
  if (error) console.error('[sync] deleteCourier error:', error.message);
}

export async function upsertConversation(c: StoredConversation): Promise<void> {
  const { error } = await supabase.from('conversations').upsert({
    id: c.id,
    business_id: c.businessId,
    courier_id: c.courierId,
    last_message: c.lastMessage ?? null,
    last_message_at: c.lastMessageAt ?? null,
    unread_business: c.unreadBusiness,
    unread_courier: c.unreadCourier,
    created_at: c.createdAt,
  }, { onConflict: 'id' });
  if (error) console.error('[sync] upsertConversation error:', error.message);
}

export async function insertMessage(m: StoredMessage): Promise<void> {
  const { error } = await supabase.from('messages').upsert({
    id: m.id,
    conversation_id: m.conversationId,
    sender_id: m.senderId,
    sender_type: m.senderType,
    content: m.content,
    created_at: m.createdAt,
    read_at: m.readAt ?? null,
  }, { onConflict: 'id' });
  if (error) console.error('[sync] insertMessage error:', error.message);
}

export async function upsertDeliveryNotification(n: DeliveryNotification): Promise<void> {
  const { error } = await supabase.from('delivery_notifications').upsert({
    id: n.id,
    business_id: n.businessId,
    business_name: n.businessName,
    pickup_address: n.pickupAddress,
    drop_address: n.dropAddress,
    description: n.description ?? null,
    price: n.price ?? null,
    created_at: n.createdAt,
    taken_by: n.takenBy ?? null,
    dismissed_by: n.dismissedBy,
  }, { onConflict: 'id' });
  if (error) console.error('[sync] upsertDeliveryNotification error:', error.message);
}

export async function upsertDelivery(d: StoredDelivery): Promise<void> {
  const { error } = await supabase.from('deliveries').upsert({
    id: d.id,
    business_id: d.businessId,
    business_name: d.businessName,
    pickup_address: d.pickupAddress,
    drop_address: d.dropAddress,
    customer_name: d.customerName ?? null,
    customer_phone: d.customerPhone ?? null,
    description: d.description ?? null,
    price: d.price,
    status: d.status,
    courier_id: d.courierId ?? null,
    courier_name: d.courierName ?? null,
    created_at: d.createdAt,
    accepted_at: d.acceptedAt ?? null,
    picked_up_at: d.pickedUpAt ?? null,
    delivered_at: d.deliveredAt ?? null,
    cancelled_at: d.cancelledAt ?? null,
  }, { onConflict: 'id' });
  if (error) console.error('[sync] upsertDelivery error:', error.message);
}

export async function upsertResetToken(token: string, email: string, userType: string, expiresAt: number): Promise<void> {
  const { error } = await supabase.from('reset_tokens').upsert({
    token,
    email,
    user_type: userType,
    expires_at: new Date(expiresAt).toISOString(),
  }, { onConflict: 'token' });
  if (error) console.error('[sync] upsertResetToken error:', error.message);
}

export async function deleteResetToken(token: string): Promise<void> {
  const { error } = await supabase.from('reset_tokens').delete().eq('token', token);
  if (error) console.error('[sync] deleteResetToken error:', error.message);
}
