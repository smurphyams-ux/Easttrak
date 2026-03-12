import React, { useEffect, useRef } from 'react';

export const SimpleMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadMap = () => {
      if (!mapRef.current) {
        console.error('Map container not found');
        return;
      }

      console.log('Initializing map...');
      
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 12,
      });

      console.log('Map initialized successfully');

      // Add a test marker
      new google.maps.Marker({
        position: { lat: 40.7128, lng: -74.0060 },
        map: map,
        title: 'Test Marker',
      });
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      console.log('Google Maps already loaded');
      loadMap();
    } else {
      console.log('Loading Google Maps script...');
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.error('Google Maps API key is missing!');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Maps script loaded');
        loadMap();
      };
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
      };
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '600px', background: '#e5e7eb' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
