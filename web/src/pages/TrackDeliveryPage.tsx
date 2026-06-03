import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface TrackDeliveryResponse {
  success: boolean;
  delivery?: {
    id: string;
    customerName: string;
    containerNumber: string;
    status: string;
    deliveryAddress: string;
    scheduledDate: string;
    destination: {
      latitude: number;
      longitude: number;
    };
    driverLocation: {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
      updatedAt?: string;
    };
    tracking: {
      enabled: boolean;
      expiresAt: string;
    };
  };
  error?: string;
}

const isFiniteNumber = (value: unknown) => Number.isFinite(Number(value));

const TrackDeliveryPage: React.FC = () => {
  const { token = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrackDeliveryResponse['delivery'] | null>(null);

  const fetchTracking = async () => {
    if (!token) {
      setError('Tracking token is missing.');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get<TrackDeliveryResponse>(`/api/track/${token}`);
      if (!res.data?.success || !res.data.delivery) {
        setError('Tracking is unavailable.');
        setLoading(false);
        return;
      }

      setData(res.data.delivery);
      setError(null);
      setLoading(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Tracking is unavailable.');
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTracking();
    const timer = window.setInterval(() => {
      void fetchTracking();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [token]);

  const mapSrc = useMemo(() => {
    if (!data) return '';

    const hasDriverLocation = isFiniteNumber(data.driverLocation?.latitude) && isFiniteNumber(data.driverLocation?.longitude);
    const lat = hasDriverLocation ? Number(data.driverLocation.latitude) : Number(data.destination?.latitude);
    const lng = hasDriverLocation ? Number(data.driverLocation.longitude) : Number(data.destination?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
    return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=14&output=embed`;
  }, [data]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 20 }}>
      <div style={{ maxWidth: 980, margin: '0 auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 14px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#eff6ff' }}>
          <h1 style={{ margin: 0, fontSize: 24, color: '#1e3a8a' }}>Live Delivery Tracking</h1>
          <p style={{ margin: '6px 0 0', color: '#334155', fontSize: 14 }}>This page updates automatically every 10 seconds.</p>
        </div>

        {loading ? (
          <div style={{ padding: 24, color: '#475569' }}>Loading tracking data...</div>
        ) : error ? (
          <div style={{ padding: 24, color: '#b91c1c' }}>{error}</div>
        ) : data ? (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Customer</div>
                <div style={{ fontSize: 15, color: '#0f172a' }}>{data.customerName || '-'}</div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Container</div>
                <div style={{ fontSize: 15, color: '#0f172a' }}>{data.containerNumber || '-'}</div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Status</div>
                <div style={{ fontSize: 15, color: '#0f172a', textTransform: 'capitalize' }}>{data.status || '-'}</div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Last Driver Update</div>
                <div style={{ fontSize: 15, color: '#0f172a' }}>{data.driverLocation?.updatedAt ? new Date(data.driverLocation.updatedAt).toLocaleString() : 'Waiting for driver updates'}</div>
              </div>
            </div>

            <div style={{ marginBottom: 14, fontSize: 14, color: '#334155' }}>
              <strong>Delivery Address:</strong> {data.deliveryAddress || '-'}
            </div>

            {mapSrc ? (
              <iframe
                title="Driver tracking map"
                src={mapSrc}
                style={{ width: '100%', height: 460, border: 0, borderRadius: 10 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div style={{ padding: 18, border: '1px dashed #cbd5e1', borderRadius: 10, color: '#475569' }}>
                Map unavailable: waiting for destination or driver location coordinates.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TrackDeliveryPage;
