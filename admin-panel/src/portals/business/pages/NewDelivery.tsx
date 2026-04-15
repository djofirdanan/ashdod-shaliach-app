import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import type { RootState } from '../../../store';
import {
  getBusiness,
  addDelivery,
  addDeliveryNotification,
} from '../../../services/storage.service';
import { TruckIcon } from '@heroicons/react/24/outline';

const NewDelivery: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);

  const token = localStorage.getItem('admin_token') ?? '';
  const businessId = token.startsWith('business-') ? token.replace('business-', '') : '';

  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('35');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    const biz = getBusiness(businessId);
    if (biz) {
      const addr = [biz.address.street, biz.address.city].filter(Boolean).join(', ');
      setPickupAddress(addr);
    }
  }, [businessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dropAddress.trim()) {
      toast.error('נא להזין כתובת מסירה');
      return;
    }
    if (!pickupAddress.trim()) {
      toast.error('נא להזין כתובת איסוף');
      return;
    }
    setIsLoading(true);
    try {
      const biz = getBusiness(businessId);
      const businessName = biz?.businessName ?? user?.name ?? 'עסק';
      const priceNum = parseFloat(price) || 35;

      addDelivery({
        businessId,
        businessName,
        pickupAddress: pickupAddress.trim(),
        dropAddress: dropAddress.trim(),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        description: description.trim() || undefined,
        price: priceNum,
        status: 'pending',
      });

      addDeliveryNotification({
        businessId,
        businessName,
        pickupAddress: pickupAddress.trim(),
        dropAddress: dropAddress.trim(),
        description: description.trim() || undefined,
        price: priceNum,
      });

      toast.success('המשלוח נשלח! שליח יאסוף בקרוב');
      navigate('/business/deliveries');
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בשליחת הבקשה');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #e8ecf0',
    fontSize: '14px',
    color: '#061b31',
    background: '#f6f9fc',
    outline: 'none',
    direction: 'rtl',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 700,
    color: '#8898aa',
    marginBottom: '6px',
    display: 'block',
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
        >
          <TruckIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-[20px] font-black" style={{ color: '#061b31' }}>בקשת משלוח חדשה</h1>
          <p className="text-[12px]" style={{ color: '#8898aa' }}>מלא את פרטי המשלוח</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          {/* Pickup address */}
          <div>
            <label style={labelStyle}>כתובת איסוף *</label>
            <input
              style={inputStyle}
              placeholder="רחוב, עיר"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              required
            />
          </div>

          {/* Drop address */}
          <div>
            <label style={labelStyle}>כתובת מסירה *</label>
            <input
              style={inputStyle}
              placeholder="לאן לשלוח?"
              value={dropAddress}
              onChange={(e) => setDropAddress(e.target.value)}
              required
            />
          </div>

          <div
            className="h-px"
            style={{ background: '#f0f4f8' }}
          />

          {/* Customer name */}
          <div>
            <label style={labelStyle}>שם הלקוח (אופציונלי)</label>
            <input
              style={inputStyle}
              placeholder="ישראל ישראלי"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* Customer phone */}
          <div>
            <label style={labelStyle}>טלפון הלקוח (אופציונלי)</label>
            <input
              style={inputStyle}
              placeholder="050-0000000"
              type="tel"
              dir="ltr"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>הערות (אופציונלי)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: 'none' }}
              placeholder="פרטים נוספים על המשלוח..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div
            className="h-px"
            style={{ background: '#f0f4f8' }}
          />

          {/* Price */}
          <div>
            <label style={labelStyle}>תשלום לשליח (₪)</label>
            <input
              style={{ ...inputStyle, direction: 'ltr' }}
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-4 py-4 rounded-2xl text-white font-black text-[15px] transition-all active:scale-95 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)', boxShadow: '0 6px 20px rgba(83,58,253,0.30)' }}
        >
          {isLoading ? 'שולח...' : 'שלח בקשת משלוח'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/business/deliveries')}
          className="w-full mt-3 py-3 rounded-2xl font-bold text-[14px] transition-all"
          style={{ background: '#f6f9fc', color: '#8898aa' }}
        >
          ביטול
        </button>
      </form>
    </div>
  );
};

export default NewDelivery;
