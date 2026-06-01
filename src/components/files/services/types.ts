import { Plane, Hotel, Bus, Anchor, Umbrella, Car, Train, Ship, Activity } from 'lucide-react';

export interface ServiceRecord {
  id: string;
  service_type: string;
  description: string;
  supplier_name: string;
  supplier_id: string | null;
  status: string;
  confirmation_number: string;
  cost: number;
  price: number;
  currency: string;
  service_date: string | null;
  payment_due_date: string | null;
  notes: string;
}

export const SERVICE_TYPES = [
  { value: 'flight', label: 'Vuelo', icon: Plane },
  { value: 'lodging', label: 'Alojamiento', icon: Hotel },
  { value: 'transfer', label: 'Traslado', icon: Bus },
  { value: 'activity', label: 'Actividad', icon: Activity },
  { value: 'insurance', label: 'Seguro', icon: Umbrella },
  { value: 'cruise', label: 'Crucero', icon: Ship },
  { value: 'train', label: 'Tren', icon: Train },
  { value: 'rental_car', label: 'Auto', icon: Car },
  { value: 'ferry', label: 'Ferry', icon: Anchor },
  { value: 'other', label: 'Otro', icon: Activity },
];

export const SERVICE_STATUS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export const CURRENCIES = ['USD', 'ARS', 'EUR', 'BRL'];

export const emptyService: Omit<ServiceRecord, 'id'> = {
  service_type: 'flight', description: '', supplier_name: '', supplier_id: null, status: 'pending',
  confirmation_number: '', cost: 0, price: 0, currency: 'USD', service_date: null, payment_due_date: null, notes: '',
};
