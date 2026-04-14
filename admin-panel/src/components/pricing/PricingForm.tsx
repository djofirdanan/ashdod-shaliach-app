import React from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { PricingZone } from '../../types';

interface PricingFormData {
  name: string;
  basePrice: number;
  courierShare: number;
  description: string;
}

interface PricingFormProps {
  zone?: PricingZone;
  onSubmit: (data: PricingFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const PricingForm: React.FC<PricingFormProps> = ({
  zone,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PricingFormData>({
    defaultValues: {
      name: zone?.name || '',
      basePrice: zone?.basePrice || 25,
      courierShare: zone?.courierShare || 70,
      description: zone?.description || '',
    },
  });

  const basePrice = watch('basePrice');
  const courierShare = watch('courierShare');
  const courierAmount = (Number(basePrice) * Number(courierShare)) / 100;
  const platformAmount = Number(basePrice) - courierAmount;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="שם האזור"
        placeholder="לדוגמה: יבנה"
        error={errors.name?.message}
        {...register('name', { required: 'שדה חובה' })}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="מחיר בסיס (₪)"
          type="number"
          placeholder="45"
          error={errors.basePrice?.message}
          {...register('basePrice', {
            required: 'שדה חובה',
            min: { value: 1, message: 'מינימום ₪1' },
            valueAsNumber: true,
          })}
        />
        <Input
          label="חלק שליח (%)"
          type="number"
          placeholder="70"
          error={errors.courierShare?.message}
          {...register('courierShare', {
            required: 'שדה חובה',
            min: { value: 0, message: 'מינימום 0%' },
            max: { value: 100, message: 'מקסימום 100%' },
            valueAsNumber: true,
          })}
        />
      </div>

      {/* Live preview */}
      {basePrice > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">תצוגה מקדימה</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-[#6C63FF]">₪{Number(basePrice).toFixed(0)}</p>
              <p className="text-xs text-gray-500">מחיר ללקוח</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">₪{courierAmount.toFixed(0)}</p>
              <p className="text-xs text-gray-500">לשליח</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#FF6584]">₪{platformAmount.toFixed(0)}</p>
              <p className="text-xs text-gray-500">לפלטפורמה</p>
            </div>
          </div>
        </div>
      )}

      <Input
        label="תיאור (אופציונלי)"
        placeholder="תיאור קצר של האזור"
        {...register('description')}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {zone ? 'שמור שינויים' : 'הוסף אזור'}
        </Button>
      </div>
    </form>
  );
};
