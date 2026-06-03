import React, { useEffect, useState } from 'react';
import axios from 'axios';

type Counts = {
  customers: number;
  fleet: number;
  routes: number;
};

const cardStyle: React.CSSProperties = {
  background: '#f8fafc',
  padding: '1.5rem',
  borderRadius: '1rem',
  minWidth: '220px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
};

const toArray = (value: any, key?: string) => {
  if (Array.isArray(value)) return value;
  if (key && Array.isArray(value?.[key])) return value[key];
  return [];
};

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts>({ customers: 0, fleet: 0, routes: 0 });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [customersRes, fleetRes, deliveriesRes, pickupsRes] = await Promise.all([
          axios.get('/api/customers'),
          axios.get('/api/fleet'),
          axios.get('/api/deliveries').catch(() => ({ data: { deliveries: [] } })),
          axios.get('/api/pickups').catch(() => ({ data: { pickups: [] } })),
        ]);

        if (cancelled) return;

        const customers = toArray(customersRes.data, 'customers');
        const fleet = toArray(fleetRes.data, 'fleet').length ? toArray(fleetRes.data, 'fleet') : toArray(fleetRes.data);
        const deliveries = toArray(deliveriesRes.data, 'deliveries');
        const pickups = toArray(pickupsRes.data, 'pickups');

        setCounts({
          customers: customers.length,
          fleet: fleet.length,
          routes: deliveries.length + pickups.length,
        });
        setError(null);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.response?.data?.error || 'Failed to load dashboard counts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', color: '#2563eb', marginBottom: '1rem' }}>Welcome to EasyTrak Dashboard</h1>
      <p style={{ fontSize: '1.1rem', color: '#555' }}>Live totals from your production data.</p>
      {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <h2 style={{ color: '#16a34a', fontSize: '1.5rem' }}>Active Routes</h2>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{loading ? '...' : counts.routes.toLocaleString()}</p>
        </div>
        <div style={cardStyle}>
          <h2 style={{ color: '#0ea5e9', fontSize: '1.5rem' }}>Customers</h2>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{loading ? '...' : counts.customers.toLocaleString()}</p>
        </div>
        <div style={cardStyle}>
          <h2 style={{ color: '#f59e42', fontSize: '1.5rem' }}>Fleet Vehicles</h2>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{loading ? '...' : counts.fleet.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
