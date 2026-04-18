// ChatGroupsSidebar.tsx
// Shows grouped conversation partners: שליחים / עסקים
// Used by BusinessChat and CourierChat alongside the main chat panel.
import React, { useEffect, useState } from 'react';
import {
  getConversations,
  type StoredConversation,
} from '../services/storage.service';
import { ChatCircle, Motorcycle, Storefront } from '@phosphor-icons/react';

export interface ChatContact {
  id:          string;
  name:        string;
  type:        'business' | 'courier';
  convId:      string;
  unread:      number;
  lastMessage: string;
  lastAt:      string;
}

interface Props {
  myId:         string;
  myType:       'business' | 'courier';
  activeConvId?: string;
  onSelect:     (convId: string) => void;
}

function getContactsFromConversations(
  convs:  StoredConversation[],
  myId:   string,
  myType: 'business' | 'courier',
): ChatContact[] {
  return convs
    .filter((c) =>
      myType === 'business' ? c.businessId === myId : c.courierId === myId,
    )
    .map((c) => {
      const otherType: 'business' | 'courier' = myType === 'business' ? 'courier' : 'business';
      const name      = myType === 'business' ? c.courierName : c.businessName;
      const otherId   = myType === 'business' ? c.courierId   : c.businessId;
      const unread    = myType === 'business' ? c.unreadBusiness : c.unreadCourier;
      return {
        id:          otherId,
        name:        name ?? 'משתמש',
        type:        otherType,
        convId:      c.id,
        unread:      unread ?? 0,
        lastMessage: c.lastMessage ?? '',
        lastAt:      c.lastMessageAt ?? '',
      };
    })
    .sort((a, b) => (b.lastAt > a.lastAt ? 1 : -1));
}

const ChatGroupsSidebar: React.FC<Props> = ({ myId, myType, activeConvId, onSelect }) => {
  const [contacts, setContacts] = useState<ChatContact[]>([]);

  useEffect(() => {
    const load = () => {
      const convs = getConversations();
      setContacts(getContactsFromConversations(convs, myId, myType));
    };
    load();
    // Refresh every 5 s for new conversations / unread counts
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [myId, myType]);

  if (contacts.length === 0) {
    return (
      <div
        dir="rtl"
        style={{
          width: 220,
          flexShrink: 0,
          borderLeft: '1px solid var(--zooz-border)',
          background: 'var(--zooz-bg-card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          gap: 8,
        }}
      >
        <ChatCircle size={32} style={{ color: 'var(--zooz-text3)' }} />
        <p style={{ fontSize: 12, color: 'var(--zooz-text3)', textAlign: 'center', margin: 0 }}>
          אין שיחות עדיין
        </p>
      </div>
    );
  }

  // Group by type — couriers first for business users, businesses first for courier users
  const couriers   = contacts.filter((c) => c.type === 'courier');
  const businesses = contacts.filter((c) => c.type === 'business');
  const groups: { label: string; icon: React.ReactNode; items: ChatContact[] }[] =
    myType === 'business'
      ? [{ label: 'שליחים', icon: <Motorcycle size={14} />, items: couriers }]
      : [
          { label: 'עסקים',  icon: <Storefront size={14} />, items: businesses },
          { label: 'שליחים', icon: <Motorcycle size={14} />, items: couriers },
        ];

  return (
    <div
      dir="rtl"
      style={{
        width: 220,
        flexShrink: 0,
        borderLeft: '1px solid var(--zooz-border)',
        background: 'var(--zooz-bg-card)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <div key={group.label}>
            {/* Section header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 12px 6px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--zooz-text3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                borderBottom: '1px solid var(--zooz-border)',
              }}
            >
              {group.icon}
              {group.label}
            </div>

            {/* Contact rows */}
            {group.items.map((contact) => {
              const isActive = contact.convId === activeConvId;
              return (
                <button
                  key={contact.convId}
                  onClick={() => onSelect(contact.convId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '10px 12px',
                    background: isActive ? 'var(--zooz-bg-input)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--zooz-border)',
                    cursor: 'pointer',
                    textAlign: 'right',
                    direction: 'rtl',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: isActive ? 'var(--zooz-accent)' : 'var(--zooz-bg-input)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 800,
                      color: isActive ? '#fff' : 'var(--zooz-text2)',
                      flexShrink: 0,
                    }}
                  >
                    {contact.name.charAt(0)}
                  </div>

                  {/* Name + preview */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--zooz-text1)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {contact.name}
                    </div>
                    {contact.lastMessage && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--zooz-text3)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: 1,
                        }}
                      >
                        {contact.lastMessage}
                      </div>
                    )}
                  </div>

                  {/* Unread badge */}
                  {contact.unread > 0 && (
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        background: 'var(--zooz-green)',
                        color: '#0A0A0F',
                        fontSize: 10,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {contact.unread > 9 ? '9+' : contact.unread}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ),
      )}
    </div>
  );
};

export default ChatGroupsSidebar;
