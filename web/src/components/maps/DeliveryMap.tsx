import React, { useEffect, useRef, useState } from 'react';
import { Delivery } from '../../types/delivery';

interface DeliveryMapProps {
  deliveries: Delivery[];
  onDeliveryClick?: (delivery: Delivery) => void;
  showRoute?: boolean;
}

const getMarkerIcon = (status: string): string => {
  const icons: Record<string, string> = {
    'pending': '🔵',
    'in-transit': '🟡',
    'delivered': '🟢',
    'failed': '🔴',
  };
  return icons[status] || '⚪';
};

const getMarkerColor = (status: string): string => {
  const colors: Record<string, string> = {
    'pending': '#3b82f6',
    'in-transit': '#f59e0b',
    'delivered': '#10b981',
    'failed': '#ef4444',
  };
  return colors[status] || '#6b7280';
};

export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  deliveries,
  onDeliveryClick,
  showRoute = true,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const routeLineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    } else {
      initMap();
    }
  }, []);

  useEffect(() => {
    if (map && deliveries.length > 0) {
      updateDeliveries();
    }
  }, [map, deliveries, showRoute]);

  const initMap = () => {
    if (!mapRef.current) return;

    const defaultCenter = { lat: 39.8283, lng: -98.5795 };
    const newMap = new google.maps.Map(mapRef.current, {
      zoom: 12,
      center: defaultCenter,
      mapTypeControl: true,
      fullscreenControl: true,
      streetViewControl: true,
      zoomControl: true,
    });

    setMap(newMap);
    infoWindowRef.current = new google.maps.InfoWindow();
  };

  const updateDeliveries = () => {
    if (!map) return;

    // Clear existing markers and route
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
    }

    // Create bounds
    const bounds = new google.maps.LatLngBounds();

    // Sort deliveries by status (pending first, then in-transit, delivered, failed)
    const sortedDeliveries = [...deliveries].sort((a, b) => {
      const order = { pending: 0, 'in-transit': 1, delivered: 2, failed: 3 };
      return order[a.status] - order[b.status];
    });

    // Add markers for each delivery
    sortedDeliveries.forEach((delivery, index) => {
      const position = { lat: delivery.latitude, lng: delivery.longitude };

      const marker = new google.maps.Marker({
        position,
        map,
        title: `${delivery.customerName} - ${delivery.containerNumber}`,
        label: {
          text: `${index + 1}`,
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 'bold',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: getMarkerColor(delivery.status),
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        zIndex: deliveries.length - index,
      });

      marker.addListener('click', () => {
        setSelectedDelivery(delivery);
        showDeliveryInfo(marker, delivery, index + 1);
        if (onDeliveryClick) {
          onDeliveryClick(delivery);
        }
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    // Draw route line if enabled
    if (showRoute && sortedDeliveries.length > 1) {
      const routePath = sortedDeliveries
        .filter(d => d.status !== 'failed')
        .map(d => ({ lat: d.latitude, lng: d.longitude }));

      routeLineRef.current = new google.maps.Polyline({
        path: routePath,
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.6,
        strokeWeight: 3,
        map,
      });
    }

    // Fit bounds to show all markers
    if (deliveries.length > 0) {
      map.fitBounds(bounds);
      
      // Adjust zoom if only one delivery
      if (deliveries.length === 1) {
        map.setZoom(15);
      }
    }
  };

  const showDeliveryInfo = (marker: google.maps.Marker, delivery: Delivery, stopNumber: number) => {
    if (!infoWindowRef.current) return;

    const statusBadge = `
      <span style="
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        ${delivery.status === 'delivered' ? 'background-color: #d1fae5; color: #065f46;' :
          delivery.status === 'in-transit' ? 'background-color: #fef3c7; color: #92400e;' :
          delivery.status === 'pending' ? 'background-color: #dbeafe; color: #1e40af;' :
          'background-color: #fee2e2; color: #991b1b;'}
      ">
        ${getMarkerIcon(delivery.status)} ${delivery.status.toUpperCase()}
      </span>
    `;

    const content = `
      <div style="padding: 12px; max-width: 300px; font-family: system-ui;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <div style="
            background: #3b82f6;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
          ">${stopNumber}</div>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">
            Container #${delivery.containerNumber}
          </h3>
        </div>
        
        <div style="margin-bottom: 12px;">
          ${statusBadge}
        </div>
        
        <div style="font-size: 14px; line-height: 1.6; color: #374151;">
          <p style="margin: 6px 0;">
            <strong style="color: #111827;">Customer:</strong> ${delivery.customerName}
          </p>
          <p style="margin: 6px 0;">
            <strong style="color: #111827;">Address:</strong><br/>
            ${delivery.deliveryAddress}
          </p>
          <p style="margin: 6px 0;">
            <strong style="color: #111827;">Scheduled:</strong> 
            ${new Date(delivery.scheduledDate).toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          ${delivery.deliveredDate ? `
            <p style="margin: 6px 0;">
              <strong style="color: #111827;">Delivered:</strong> 
              ${new Date(delivery.deliveredDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          ` : ''}
          ${delivery.driverName ? `
            <p style="margin: 6px 0;">
              <strong style="color: #111827;">Driver:</strong> ${delivery.driverName}
            </p>
          ` : ''}
          ${delivery.notes ? `
            <p style="margin: 6px 0; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <strong style="color: #111827;">Notes:</strong> ${delivery.notes}
            </p>
          ` : ''}
        </div>
      </div>
    `;

    infoWindowRef.current.setContent(content);
    infoWindowRef.current.open(map, marker);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
