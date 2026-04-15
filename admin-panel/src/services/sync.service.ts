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
import type { StoredBusiness, StoredCourier, StoredConversation, StoredMessage, DeliveryNotification, StoredDelivery, StoredReview, SupportTicket, SupportMessage, CourierLocation } from './storage.service';

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
    logo: (row.logo as string | undefined) || undefined,
    favoriteCouriers: (row.favorite_couriers as string[]) || [],
    emailOnDeliveryAdded: row.email_on_delivery_added != null ? Boolean(row.email_on_delivery_added) : false,
    emailOnDeliveryAccepted: row.email_on_delivery_accepted != null ? Boolean(row.email_on_delivery_accepted) : false,
    emailOnDeliveryPickedUp: row.email_on_delivery_picked_up != null ? Boolean(row.email_on_delivery_picked_up) : false,
    emailOnDeliveryDelivered: row.email_on_delivery_delivered != null ? Boolean(row.email_on_delivery_delivered) : false,
    emailOnDeliveryCancelled: row.email_on_delivery_cancelled != null ? Boolean(row.email_on_delivery_cancelled) : false,
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
    logo: b.logo ?? null,
    favorite_couriers: b.favoriteCouriers ?? [],
    email_on_delivery_added: b.emailOnDeliveryAdded ?? false,
    email_on_delivery_accepted: b.emailOnDeliveryAccepted ?? false,
    email_on_delivery_picked_up: b.emailOnDeliveryPickedUp ?? false,
    email_on_delivery_delivered: b.emailOnDeliveryDelivered ?? false,
    email_on_delivery_cancelled: b.emailOnDeliveryCancelled ?? false,
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
    photo: (row.photo as string | undefined) || undefined,
    isAvailable: row.is_available != null ? Boolean(row.is_available) : true,
    favoriteBusinesses: (row.favorite_businesses as string[]) || [],
    emailOnNewDelivery: row.email_on_new_delivery != null ? Boolean(row.email_on_new_delivery) : false,
    navPreference: (row.nav_preference as 'waze' | 'google' | 'apple' | undefined) || undefined,
    bitPhone: (row.bit_phone as string | undefined) || undefined,
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
    photo: c.photo ?? null,
    is_available: c.isAvailable ?? true,
    favorite_businesses: c.favoriteBusinesses ?? [],
    email_on_new_delivery: c.emailOnNewDelivery ?? false,
    nav_preference: c.navPreference ?? null,
    bit_phone: c.bitPhone ?? null,
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
    messageType: ((row.message_type_v2 as StoredMessage['messageType']) || 'text'),
    deliveryId: (row.delivery_id as string | undefined) || undefined,
    createdAt: row.created_at as string,
    readAt: (row.read_at as string | undefined) || undefined,
  };
}

function dbToNotification(row: Record<string, unknown>): DeliveryNotification {
  return {
    id: row.id as string,
    deliveryId: (row.delivery_id as string | undefined) || undefined,
    businessId: row.business_id as string,
    businessName: row.business_name as string,
    pickupAddress: row.pickup_address as string,
    dropAddress: row.drop_address as string,
    description: (row.description as string | undefined) || undefined,
    price: row.price != null ? Number(row.price) : undefined,
    createdAt: row.created_at as string,
    takenBy: (row.taken_by as string | undefined) || undefined,
    dismissedBy: (row.dismissed_by as string[]) || [],
    requiredVehicle: (row.required_vehicle as string | undefined) || undefined,
    scheduledAt: (row.scheduled_at as string | undefined) || undefined,
    paymentMethod: (row.payment_method as 'cash' | 'bit' | undefined) || undefined,
    customerPaid: row.customer_paid != null ? Boolean(row.customer_paid) : undefined,
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
    scheduledAt: (row.scheduled_at as string | undefined) || undefined,
    requiredVehicle: (row.required_vehicle as string | undefined) || undefined,
    paymentMethod: (row.payment_method as 'cash' | 'bit' | undefined) || 'cash',
    customerPaid: row.customer_paid != null ? Boolean(row.customer_paid) : false,
    archived: row.archived != null ? Boolean(row.archived) : false,
    proofPhotoUrl: (row.proof_photo_url as string | undefined) || undefined,
    proofNote: (row.proof_note as string | undefined) || undefined,
    proofSubmittedAt: (row.proof_submitted_at as string | undefined) || undefined,
    cancelledBy: (row.cancelled_by as string | undefined) || undefined,
    cancelAction: (row.cancel_action as 'find_new' | 'delete' | undefined) || undefined,
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

/** Delete a conversation + its messages from Supabase. */
export async function deleteConversation(id: string): Promise<void> {
  await supabase.from('messages').delete().eq('conversation_id', id);
  const { error } = await supabase.from('conversations').delete().eq('id', id);
  if (error) console.error('[sync] deleteConversation error:', error.message);
}

/** Push ALL businesses from localStorage → Supabase (admin use: fix cross-device login). */
export async function syncAllBusinessesUp(): Promise<number> {
  const raw = localStorage.getItem('app_businesses');
  if (!raw) return 0;
  const businesses: unknown[] = JSON.parse(raw);
  let count = 0;
  for (const b of businesses) {
    const biz = b as Parameters<typeof businessToDb>[0];
    const { error } = await supabase.from('businesses').upsert(businessToDb(biz), { onConflict: 'id' });
    if (!error) count++;
    else console.error('[sync] syncAllBusinessesUp error:', error.message);
  }
  return count;
}

/** Push ALL couriers from localStorage → Supabase (admin use: fix cross-device login). */
export async function syncAllCouriersUp(): Promise<number> {
  const raw = localStorage.getItem('app_couriers');
  if (!raw) return 0;
  const couriers: unknown[] = JSON.parse(raw);
  let count = 0;
  for (const c of couriers) {
    const courier = c as Parameters<typeof courierToDb>[0];
    const { error } = await supabase.from('couriers').upsert(courierToDb(courier), { onConflict: 'id' });
    if (!error) count++;
    else console.error('[sync] syncAllCouriersUp error:', error.message);
  }
  return count;
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
    sender_name: m.senderName,
    sender_type: m.senderType,
    content: m.content,
    created_at: m.createdAt,
    read_at: m.readAt ?? null,
    delivery_id: m.deliveryId ?? null,
    message_type_v2: m.messageType ?? 'text',
  }, { onConflict: 'id' });
  if (error) console.error('[sync] insertMessage error:', error.message);
}

/** Pull messages for a specific conversation from Supabase → localStorage.
 *  Called every few seconds while a chat window is open (cross-device real-time). */
export async function syncMessagesDown(conversationId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) {
      const raw = localStorage.getItem(LS_KEYS.messages);
      const allMessages: StoredMessage[] = raw ? JSON.parse(raw) : [];
      // Replace messages for this conversation with fresh data from DB
      const others = allMessages.filter((m) => m.conversationId !== conversationId);
      const fresh = data.map(dbToMessage);
      localStorage.setItem(LS_KEYS.messages, JSON.stringify([...others, ...fresh]));
    }
  } catch (err) {
    console.warn('[sync] syncMessagesDown failed:', err);
  }
}

/** Pull all conversations for a given user (business, courier, or admin) from Supabase → localStorage. */
export async function syncConversationsDown(userId: string, role: 'business' | 'courier' | 'admin'): Promise<void> {
  try {
    let query = supabase.from('conversations').select('*').order('last_message_at', { ascending: false });
    // Admin pulls all conversations; business/courier filter by their ID
    if (role === 'business') {
      query = query.eq('business_id', userId) as typeof query;
    } else if (role === 'courier') {
      query = query.eq('courier_id', userId) as typeof query;
    }
    // For 'admin', no filter — pull everything
    const { data } = await query;

    if (data) {
      const raw = localStorage.getItem(LS_KEYS.conversations);
      const all: StoredConversation[] = raw ? JSON.parse(raw) : [];
      const freshIds = new Set(data.map((r) => r.id as string));
      const others = all.filter((c) => !freshIds.has(c.id));
      // Enrich with businessName/courierName from local cache
      const bizRaw = localStorage.getItem(LS_KEYS.businesses);
      const courRaw = localStorage.getItem(LS_KEYS.couriers);
      const bizMap: Record<string, string> = {};
      const courMap: Record<string, string> = {};
      if (bizRaw) {
        (JSON.parse(bizRaw) as Array<{ id: string; businessName: string }>).forEach(b => { bizMap[b.id] = b.businessName; });
      }
      if (courRaw) {
        (JSON.parse(courRaw) as Array<{ id: string; name: string }>).forEach(c => { courMap[c.id] = c.name; });
      }
      const fresh = data.map(row => {
        const conv = {
          ...dbToConversation(row as Record<string, unknown>),
          businessName: row.business_id === 'admin' ? 'מנהל האתר' : (bizMap[row.business_id as string] ?? ''),
          courierName: row.courier_id === 'admin' ? 'מנהל האתר' : (courMap[row.courier_id as string] ?? ''),
        };
        // Preserve locally cleared unread count if no new message arrived since we last read
        const lastReadStr = localStorage.getItem(`conv_last_read_${conv.id}`);
        if (lastReadStr) {
          const lastMsgAt = conv.lastMessageAt;
          // If conv's last message is older than our last read → keep it at 0
          if (!lastMsgAt || lastMsgAt <= lastReadStr) {
            if (role === 'business' || role === 'admin') conv.unreadBusiness = 0;
            if (role === 'courier' || role === 'admin') conv.unreadCourier = 0;
          }
          // If a new message arrived after our read, the Supabase count is correct — keep it
        }
        return conv;
      });
      localStorage.setItem(LS_KEYS.conversations, JSON.stringify([...others, ...fresh]));
    }
  } catch (err) {
    console.warn('[sync] syncConversationsDown failed:', err);
  }
}

export async function upsertDeliveryNotification(n: DeliveryNotification): Promise<void> {
  const { error } = await supabase.from('delivery_notifications').upsert({
    id: n.id,
    delivery_id: n.deliveryId ?? null,
    business_id: n.businessId,
    business_name: n.businessName,
    pickup_address: n.pickupAddress,
    drop_address: n.dropAddress,
    description: n.description ?? null,
    price: n.price ?? null,
    created_at: n.createdAt,
    taken_by: n.takenBy ?? null,
    dismissed_by: n.dismissedBy,
    required_vehicle: n.requiredVehicle ?? null,
    scheduled_at: n.scheduledAt ?? null,
    payment_method: n.paymentMethod ?? null,
    customer_paid: n.customerPaid ?? false,
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
    scheduled_at: d.scheduledAt ?? null,
    required_vehicle: d.requiredVehicle ?? null,
    payment_method: d.paymentMethod ?? 'cash',
    customer_paid: d.customerPaid ?? false,
    archived: d.archived ?? false,
    proof_photo_url: d.proofPhotoUrl ?? null,
    proof_note: d.proofNote ?? null,
    proof_submitted_at: d.proofSubmittedAt ?? null,
    cancelled_by: d.cancelledBy ?? null,
    cancel_action: d.cancelAction ?? null,
  }, { onConflict: 'id' });
  if (error) console.error('[sync] upsertDelivery error:', error.message);
}

export async function deleteDelivery(id: string): Promise<void> {
  const { error } = await supabase.from('deliveries').delete().eq('id', id);
  if (error) console.error('[sync] deleteDelivery error:', error.message);
}

export async function upsertReview(r: StoredReview): Promise<void> {
  const { error } = await supabase.from('reviews').upsert({
    id: r.id,
    reviewer_id: r.reviewerId,
    reviewer_type: r.reviewerType,
    target_id: r.targetId,
    target_type: r.targetType,
    rating: r.rating,
    comment: r.comment ?? null,
    delivery_id: r.deliveryId ?? null,
    created_at: r.createdAt,
  }, { onConflict: 'id' });
  if (error) console.error('[sync] upsertReview error:', error.message);
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

// ─── Support Tickets & Messages ────────────────────────────────
export async function upsertSupportTicket(t: SupportTicket): Promise<void> {
  const { error } = await supabase.from('support_tickets').upsert({
    id: t.id,
    user_id: t.userId,
    user_type: t.userType,
    user_name: t.userName,
    user_email: t.userEmail,
    status: t.status,
    subject: t.subject,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  }, { onConflict: 'id' });
  if (error) console.error('[sync] upsertSupportTicket error:', error.message);
}

export async function insertSupportMessage(m: SupportMessage): Promise<void> {
  const { error } = await supabase.from('support_messages').upsert({
    id: m.id,
    ticket_id: m.ticketId,
    sender_type: m.senderType,
    sender_name: m.senderName,
    content: m.content,
    created_at: m.createdAt,
  }, { onConflict: 'id' });
  if (error) console.error('[sync] insertSupportMessage error:', error.message);
}

/** Pull ALL support tickets + their messages from Supabase → localStorage (admin use). */
export async function syncSupportDown(): Promise<void> {
  try {
    const [ticketRes, msgRes] = await Promise.all([
      supabase.from('support_tickets').select('*').order('updated_at', { ascending: false }),
      supabase.from('support_messages').select('*').order('created_at', { ascending: true }),
    ]);
    if (ticketRes.data) {
      const tickets: SupportTicket[] = ticketRes.data.map((r) => ({
        id: r.id as string,
        userId: r.user_id as string,
        userType: r.user_type as 'business' | 'courier',
        userName: r.user_name as string,
        userEmail: r.user_email as string,
        status: r.status as SupportTicket['status'],
        subject: r.subject as string,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      }));
      localStorage.setItem('app_support_tickets', JSON.stringify(tickets));
    }
    if (msgRes.data) {
      const msgs: SupportMessage[] = msgRes.data.map((r) => ({
        id: r.id as string,
        ticketId: r.ticket_id as string,
        senderType: r.sender_type as 'user' | 'admin',
        senderName: r.sender_name as string,
        content: r.content as string,
        createdAt: r.created_at as string,
      }));
      localStorage.setItem('app_support_messages', JSON.stringify(msgs));
    }
  } catch (err) {
    console.warn('[sync] syncSupportDown failed:', err);
  }
}

/** Pull messages for one support ticket. */
export async function syncSupportMessagesDown(ticketId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (data) {
      const raw = localStorage.getItem('app_support_messages');
      const all: SupportMessage[] = raw ? JSON.parse(raw) : [];
      const others = all.filter((m) => m.ticketId !== ticketId);
      const fresh: SupportMessage[] = data.map((r) => ({
        id: r.id as string,
        ticketId: r.ticket_id as string,
        senderType: r.sender_type as 'user' | 'admin',
        senderName: r.sender_name as string,
        content: r.content as string,
        createdAt: r.created_at as string,
      }));
      localStorage.setItem('app_support_messages', JSON.stringify([...others, ...fresh]));
    }
  } catch (err) {
    console.warn('[sync] syncSupportMessagesDown failed:', err);
  }
}

// ─── Auth helpers: look up business / courier by email in Supabase ────────────
/** Used by the login thunk when localStorage is empty (e.g. first login on a new device). */
export async function getBusinessByEmailFromDB(email: string): Promise<StoredBusiness | null> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .ilike('email', email.trim())
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return dbToBusiness(data[0] as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Used by the login thunk when localStorage is empty (e.g. first login on a new device). */
export async function getCourierByEmailFromDB(email: string): Promise<StoredCourier | null> {
  try {
    const { data, error } = await supabase
      .from('couriers')
      .select('*')
      .ilike('email', email.trim())
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return dbToCourier(data[0] as Record<string, unknown>);
  } catch {
    return null;
  }
}

// ─── Courier live location ─────────────────────────────────────
export async function upsertCourierLocation(loc: CourierLocation): Promise<void> {
  const { error } = await supabase.from('courier_locations').upsert({
    courier_id: loc.courierId,
    latitude: loc.latitude,
    longitude: loc.longitude,
    updated_at: loc.updatedAt,
  }, { onConflict: 'courier_id' });
  if (error) console.error('[sync] upsertCourierLocation error:', error.message);
}

export async function getCourierLocationFromDB(courierId: string): Promise<{ latitude: number; longitude: number; updatedAt: string } | null> {
  try {
    const { data } = await supabase
      .from('courier_locations')
      .select('*')
      .eq('courier_id', courierId)
      .single();
    if (!data) return null;
    return { latitude: data.latitude as number, longitude: data.longitude as number, updatedAt: data.updated_at as string };
  } catch {
    return null;
  }
}

// ─── Delivery Candidates Queue ─────────────────────────────────

export interface DeliveryCandidate {
  id: string;
  deliveryId: string;
  courierId: string;
  courierName: string;
  courierRating: number;
  courierVehicle: string;
  joinedAt: string;
  lastHeartbeat: string;
  status: 'waiting' | 'rejected' | 'accepted';
}

function dbToCandidate(row: Record<string, unknown>): DeliveryCandidate {
  return {
    id: row.id as string,
    deliveryId: row.delivery_id as string,
    courierId: row.courier_id as string,
    courierName: row.courier_name as string,
    courierRating: Number(row.courier_rating ?? 5),
    courierVehicle: (row.courier_vehicle as string) || 'motorcycle',
    joinedAt: row.joined_at as string,
    lastHeartbeat: row.last_heartbeat as string,
    status: (row.status as 'waiting' | 'rejected' | 'accepted') || 'waiting',
  };
}

/** Fetch waiting candidates for a delivery, ordered by joined_at */
export async function getCandidates(deliveryId: string): Promise<DeliveryCandidate[]> {
  const { data } = await supabase
    .from('delivery_candidates')
    .select('*')
    .eq('delivery_id', deliveryId)
    .eq('status', 'waiting')
    .order('joined_at', { ascending: true });
  return data ? data.map(dbToCandidate) : [];
}

/** Courier joins the candidates queue for a delivery */
export async function joinCandidatesQueue(
  deliveryId: string,
  courierId: string,
  courierName: string,
  courierRating: number,
  courierVehicle: string,
): Promise<void> {
  const { error } = await supabase.from('delivery_candidates').upsert({
    delivery_id: deliveryId,
    courier_id: courierId,
    courier_name: courierName,
    courier_rating: courierRating,
    courier_vehicle: courierVehicle,
    joined_at: new Date().toISOString(),
    last_heartbeat: new Date().toISOString(),
    status: 'waiting',
  }, { onConflict: 'delivery_id,courier_id' });
  if (error) console.error('[sync] joinCandidatesQueue error:', error.message);
}

/** Courier pings to say "I'm still here" */
export async function pingCandidateHeartbeat(deliveryId: string, courierId: string): Promise<void> {
  await supabase
    .from('delivery_candidates')
    .update({ last_heartbeat: new Date().toISOString() })
    .eq('delivery_id', deliveryId)
    .eq('courier_id', courierId)
    .eq('status', 'waiting');
}

/** Business rejects the current top candidate */
export async function rejectCandidate(deliveryId: string, courierId: string): Promise<void> {
  await supabase
    .from('delivery_candidates')
    .update({ status: 'rejected' })
    .eq('delivery_id', deliveryId)
    .eq('courier_id', courierId);
}

/** Business accepts a candidate — also rejects everyone else */
export async function acceptCandidate(deliveryId: string, courierId: string): Promise<void> {
  await supabase
    .from('delivery_candidates')
    .update({ status: 'accepted' })
    .eq('delivery_id', deliveryId)
    .eq('courier_id', courierId);
  // Reject all other waiting candidates
  await supabase
    .from('delivery_candidates')
    .update({ status: 'rejected' })
    .eq('delivery_id', deliveryId)
    .eq('status', 'waiting')
    .neq('courier_id', courierId);
}

/** Courier withdraws from the candidates queue (changed mind / not available) */
export async function withdrawFromQueue(deliveryId: string, courierId: string): Promise<void> {
  await supabase
    .from('delivery_candidates')
    .update({ status: 'rejected' })
    .eq('delivery_id', deliveryId)
    .eq('courier_id', courierId);
}

/**
 * Clear all app-level localStorage keys and re-pull everything fresh from Supabase.
 * Preserves: admin_token, dark mode, pricing zones, chat cleanup prefs, nav prefs.
 * Safe to call from any portal — pass the auth token back in after clearing.
 */
export async function clearCacheAndResync(): Promise<void> {
  // Keys to preserve
  const keep: Record<string, string | null> = {};
  const PRESERVE = ['admin_token', 'dark_mode', 'app_pricing_zones', 'pending_candidacy'];
  // Also preserve all chat_cleanup_* and other user-pref keys
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (PRESERVE.includes(k) || k.startsWith('chat_cleanup_') || k.startsWith('courier_nav_')) {
      keep[k] = localStorage.getItem(k);
    }
  }

  // Remove everything that starts with 'app_'
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('app_')) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));

  // Also clear transient state
  localStorage.removeItem('pending_candidacy');

  // Restore preserved values
  for (const [k, v] of Object.entries(keep)) {
    if (v !== null) localStorage.setItem(k, v);
  }

  // Re-pull everything from Supabase
  await syncDown();
}

// ─── New delivery flow functions ──────────────────────────────

/** Mark courier as viewing (called when courier opens detail modal) */
export async function markCourierViewing(deliveryId: string, courierId: string, courierName: string, courierRating: number, courierVehicle: string): Promise<void> {
  const { error } = await supabase.from('delivery_candidates').upsert({
    delivery_id: deliveryId,
    courier_id: courierId,
    courier_name: courierName,
    courier_rating: courierRating,
    courier_vehicle: courierVehicle,
    joined_at: new Date().toISOString(),
    last_heartbeat: new Date().toISOString(),
    status: 'waiting',
    courier_status: 'viewing',
    viewed_at: new Date().toISOString(),
  }, { onConflict: 'delivery_id,courier_id' });
  if (error) console.error('[sync] markCourierViewing:', error.message);
}

/** Courier approves delivery (joins queue with approved status) */
export async function courierApproveDelivery(deliveryId: string, courierId: string): Promise<void> {
  const { error } = await supabase.from('delivery_candidates')
    .update({ courier_status: 'approved', last_heartbeat: new Date().toISOString() })
    .eq('delivery_id', deliveryId)
    .eq('courier_id', courierId);
  if (error) console.error('[sync] courierApproveDelivery:', error.message);
}

/** Courier rejects delivery */
export async function courierRejectDelivery(deliveryId: string, courierId: string): Promise<void> {
  await supabase.from('delivery_candidates')
    .update({ courier_status: 'rejected_by_courier' })
    .eq('delivery_id', deliveryId)
    .eq('courier_id', courierId);
}

/** Get stats for business waiting screen */
export async function getCandidateStats(deliveryId: string): Promise<{ viewing: number; approved: number; rejectedByCourier: number }> {
  const { data } = await supabase
    .from('delivery_candidates')
    .select('courier_status')
    .eq('delivery_id', deliveryId);
  if (!data) return { viewing: 0, approved: 0, rejectedByCourier: 0 };
  return {
    viewing:           data.filter(r => r.courier_status === 'viewing').length,
    approved:          data.filter(r => r.courier_status === 'approved').length,
    rejectedByCourier: data.filter(r => r.courier_status === 'rejected_by_courier').length,
  };
}

/** Save delivery proof (photo + note) */
export async function saveDeliveryProof(deliveryId: string, photoUrl: string | null, note: string | null): Promise<void> {
  const { error } = await supabase.from('deliveries').update({
    proof_photo_url: photoUrl ?? null,
    proof_note: note ?? null,
    proof_submitted_at: new Date().toISOString(),
  }).eq('id', deliveryId);
  if (error) console.error('[sync] saveDeliveryProof:', error.message);
}

/** Get a single courier's candidacy status for a delivery */
export async function getCandidacyStatus(
  deliveryId: string,
  courierId: string,
): Promise<'waiting' | 'rejected' | 'accepted' | null> {
  const { data } = await supabase
    .from('delivery_candidates')
    .select('status')
    .eq('delivery_id', deliveryId)
    .eq('courier_id', courierId)
    .single();
  return data ? (data.status as 'waiting' | 'rejected' | 'accepted') : null;
}
