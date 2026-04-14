import React from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import type { Courier, Business, VehicleType } from '../../types';
import { VEHICLE_TYPE_LABELS } from '../../utils/constants';

// ─── Courier Form ────────────────────────────────────────────────────────────

interface CourierFormData {
  name: string;
  phone: string;
  email: string;
  vehicle: VehicleType;
  vehiclePlate: string;
}

interface CourierFormProps {
  courier?: Courier;
  onSubmit: (data: CourierFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const CourierForm: React.FC<CourierFormProps> = ({
  courier,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CourierFormData>({
    defaultValues: {
      name: courier?.name || '',
      phone: courier?.phone || '',
      email: courier?.email || '',
      vehicle: courier?.vehicle || 'motorcycle',
      vehiclePlate: courier?.vehiclePlate || '',
    },
  });

  const vehicleOptions = Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="שם מלא"
          placeholder="ישראל ישראלי"
          error={errors.name?.message}
          {...register('name', { required: 'שדה חובה' })}
        />
        <Input
          label="טלפון"
          placeholder="050-000-0000"
          error={errors.phone?.message}
          {...register('phone', { required: 'שדה חובה' })}
        />
      </div>
      <Input
        label="אימייל"
        type="email"
        placeholder="courier@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="סוג רכב"
          options={vehicleOptions}
          error={errors.vehicle?.message}
          {...register('vehicle', { required: 'שדה חובה' })}
        />
        <Input
          label="לוחית רישוי"
          placeholder="12-345-67"
          {...register('vehiclePlate')}
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {courier ? 'שמור שינויים' : 'הוסף שליח'}
        </Button>
      </div>
    </form>
  );
};

// ─── Business Form ────────────────────────────────────────────────────────────

interface BusinessFormData {
  name: string;
  phone: string;
  email: string;
  category: string;
  contactPerson: string;
  street: string;
  city: string;
}

interface BusinessFormProps {
  business?: Business;
  onSubmit: (data: BusinessFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const BusinessForm: React.FC<BusinessFormProps> = ({
  business,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessFormData>({
    defaultValues: {
      name: business?.name || '',
      phone: business?.phone || '',
      email: business?.email || '',
      category: business?.category || '',
      contactPerson: business?.contactPerson || '',
      street: business?.address?.street || '',
      city: business?.address?.city || 'אשדוד',
    },
  });

  const categoryOptions = [
    { value: 'מסעדה', label: 'מסעדה' },
    { value: 'פיצרייה', label: 'פיצרייה' },
    { value: 'קפה', label: 'קפה' },
    { value: 'מכולת', label: 'מכולת' },
    { value: 'פרמקיה', label: 'פרמקיה' },
    { value: 'פלאפל', label: 'פלאפל' },
    { value: 'שוורמה', label: 'שוורמה' },
    { value: 'אחר', label: 'אחר' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="שם העסק"
          placeholder="פיצה קינג"
          error={errors.name?.message}
          {...register('name', { required: 'שדה חובה' })}
        />
        <Input
          label="טלפון"
          placeholder="08-000-0000"
          error={errors.phone?.message}
          {...register('phone', { required: 'שדה חובה' })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="אימייל"
          type="email"
          placeholder="business@example.com"
          {...register('email')}
        />
        <Input
          label="איש קשר"
          placeholder="שם מנהל"
          {...register('contactPerson')}
        />
      </div>
      <Select
        label="קטגוריה"
        options={categoryOptions}
        placeholder="בחר קטגוריה..."
        error={errors.category?.message}
        {...register('category', { required: 'שדה חובה' })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="רחוב"
          placeholder="רחוב הרצל 1"
          error={errors.street?.message}
          {...register('street', { required: 'שדה חובה' })}
        />
        <Input
          label="עיר"
          placeholder="אשדוד"
          error={errors.city?.message}
          {...register('city', { required: 'שדה חובה' })}
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {business ? 'שמור שינויים' : 'הוסף עסק'}
        </Button>
      </div>
    </form>
  );
};
