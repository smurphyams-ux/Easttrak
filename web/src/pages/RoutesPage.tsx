import React, { useEffect, useState } from 'react';
import { DeliveryMapWorking } from '../components/maps/DeliveryMapWorking';

interface Delivery {
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

export const RoutesPage: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveries();
  }, [selectedRoute]);

  const fetchDeliveries = async () => {
    // Mock data with real NYC coordinates
    setDeliveries([
      {
        id: '1',
        containerNumber: 'D-001',
        customerId: 'c1',
        customerName: 'ABC Construction',
        deliveryAddress: '123 Main St, New York, NY 10001',
        latitude: 40.7589,
        longitude: -73.9851,
        status: 'delivered',
        scheduledDate: new Date('2024-01-20T09:00:00'),
        deliveredDate: new Date('2024-01-20T09:15:00'),
        driverId: 'd1',
        driverName: 'John Smith',
      },
      {
        id: '2',
        containerNumber: 'D-002',
        customerId: 'c2',
        customerName: 'XYZ Landscaping',
        deliveryAddress: '456 Park Ave, New York, NY 10022',
        latitude: 40.7614,
        longitude: -73.9776,
        status: 'in-transit',
        scheduledDate: new Date('2024-01-20T10:00:00'),
        driverId: 'd1',
        driverName: 'John Smith',
      },
      {
        id: '3',
        containerNumber: 'D-003',
        customerId: 'c3',
        customerName: 'Home Renovation Inc',
        deliveryAddress: '789 Broadway, New York, NY 10003',
        latitude: 40.7308,
        longitude: -73.9973,
        status: 'pending',
        scheduledDate: new Date('2024-01-20T11:00:00'),
        driverId: 'd1',
        driverName: 'John Smith',
      },
    ]);
    setLoading(false);
  };

  const getStatusStats = () => {
    return {
      pending: deliveries.filter(d => d.status === 'pending').length,
      inTransit: deliveries.filter(d => d.status === 'in-transit').length,
      delivered: deliveries.filter(d => d.status === 'delivered').length,
      failed: deliveries.filter(d => d.status === 'failed').length,
    };
  };

  const stats = getStatusStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading deliveries...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Delivery Routes</h1>
            <p className="text-sm text-gray-600 mt-1">
              Track and manage all container deliveries
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'map'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🗺️ Map View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 List View
              </button>
            </div>

            {/* Route Filter */}
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Routes</option>
              <option value="route-1">Route 1 - North</option>
              <option value="route-2">Route 2 - South</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Total Deliveries</div>
            <div className="text-2xl font-bold text-gray-900">{deliveries.length}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 mb-1">⏳ Pending</div>
            <div className="text-2xl font-bold text-blue-900">{stats.pending}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-xs text-yellow-600 mb-1">🚚 In Transit</div>
            <div className="text-2xl font-bold text-yellow-900">{stats.inTransit}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-600 mb-1">✅ Delivered</div>
            <div className="text-2xl font-bold text-green-900">{stats.delivered}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-xs text-red-600 mb-1">❌ Failed</div>
            <div className="text-2xl font-bold text-red-900">{stats.failed}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'map' ? (
          <div className="h-full p-6">
            <div className="bg-white rounded-lg shadow-lg h-full overflow-hidden">
              <DeliveryMapWorking deliveries={deliveries} />
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Container</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deliveries.map((delivery, index) => (
                    <tr key={delivery.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {delivery.containerNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {delivery.customerName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{delivery.deliveryAddress}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          delivery.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          delivery.status === 'in-transit' ? 'bg-yellow-100 text-yellow-800' :
                          delivery.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {delivery.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
