export interface Delivery {
  id: string;
  containerNumber: string;
  customerId: string;
  customerName: string;
  deliveryAddress: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'in-transit' | 'delivered' | 'failed';
  scheduledDate: Date;
  deliveredDate?: Date;
  driverId?: string;
  driverName?: string;
  notes?: string;
}

export interface DeliveryRoute {
  id: string;
  name: string;
  driverId: string;
  driverName: string;
  deliveries: Delivery[];
  totalStops: number;
  completedStops: number;
  estimatedDistance: number;
  status: 'planned' | 'active' | 'completed';
}
