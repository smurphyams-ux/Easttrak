import React from 'react';
import { SimpleDumpsterMap } from '../components/maps/SimpleDumpsterMap';

const mockDumpsters = [
  {
    id: '1',
    containerNumber: '001',
    latitude: 40.7128,
    longitude: -74.0060,
    status: 'in-service',
    customerName: 'ABC Corp',
    address: '123 Main St, New York, NY',
  },
  {
    id: '2',
    containerNumber: '002',
    latitude: 40.7580,
    longitude: -73.9855,
    status: 'available',
    address: '456 Park Ave, New York, NY',
  },
];

export const TestMapPage: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Map Test</h1>
      <SimpleDumpsterMap dumpsters={mockDumpsters} />
    </div>
  );
};
