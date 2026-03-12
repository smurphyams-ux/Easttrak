import React, { useEffect, useRef, useState } from 'react';

interface Delivery {
  id: string;
  containerNumber: string;
  customerName: string;
  deliveryAddress: string;
  latitude: number;
  longitude: number;
  status: string;
}

interface DeliveryMapWorkingProps {
  deliveries: Delivery[];
}

export const DeliveryMapWorking: React.FC<DeliveryMapWorkingProps> = ({ deliveries }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError('Google Maps API key is missing. Please add REACT_APP_GOOGLE_MAPS_API_KEY to your .env file');
      return;
    }

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setMapLoaded(true);
        initMap();
      };
      script.onerror = () => {
        setError('Failed to load Google Maps. Check your API key and internet connection.');
      };
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapRef.current) return;

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 12,
      });

      if (deliveries.length > 0) {
        const bounds = new google.maps.LatLngBounds();

        deliveries.forEach((delivery, index) => {
          const position = { lat: delivery.latitude, lng: delivery.longitude };
          
          const marker = new google.maps.Marker({
            position,
            map,
            title: delivery.customerName,
            label: {
              text: `${index + 1}`,
              color: 'white',
              fontWeight: 'bold',
            },
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 10px;">
                <h3 style="margin: 0 0 8px 0; font-weight: bold;">${delivery.containerNumber}</h3>
                <p style="margin: 4px 0;"><strong>Customer:</strong> ${delivery.customerName}</p>
                <p style="margin: 4px 0;"><strong>Address:</strong> ${delivery.deliveryAddress}</p>
                <p style="margin: 4px 0;"><strong>Status:</strong> ${delivery.status}</p>
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          bounds.extend(position);
        });

        map.fitBounds(bounds);
      }
    };

    loadGoogleMaps();
  }, [deliveries]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 rounded-lg">
        <div className="text-center p-6">
          <div className="text-red-600 text-lg font-semibold mb-2">Map Error</div>
          <p className="text-red-700 text-sm">{error}</p>
          <div className="mt-4 p-4 bg-white rounded border border-red-200">
            <p className="text-xs text-left">
              <strong>To fix:</strong><br/>
              1. Go to <a href="https://console.cloud.google.com/" className="text-blue-600">Google Cloud Console</a><br/>
              2. Enable "Maps JavaScript API"<br/>
              3. Create an API key<br/>
              4. Add to .env: REACT_APP_GOOGLE_MAPS_API_KEY=your_key<br/>
              5. Restart: npm run dev
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
