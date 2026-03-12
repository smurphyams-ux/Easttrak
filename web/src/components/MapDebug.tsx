import React, { useEffect, useState } from 'react';

export const MapDebug: React.FC = () => {
  const [status, setStatus] = useState<string[]>([]);

  useEffect(() => {
    const checks: string[] = [];

    // Check 1: API Key
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    checks.push(`API Key: ${apiKey ? '✅ Present' : '❌ Missing'}`);
    if (apiKey) {
      checks.push(`API Key length: ${apiKey.length} characters`);
    }

    // Check 2: Google object
    checks.push(`window.google: ${window.google ? '✅ Loaded' : '❌ Not loaded'}`);

    // Check 3: Google Maps
    checks.push(`window.google.maps: ${window.google?.maps ? '✅ Available' : '❌ Not available'}`);

    // Check 4: Environment
    checks.push(`NODE_ENV: ${process.env.NODE_ENV}`);

    setStatus(checks);

    // Try to load script manually
    if (!window.google && apiKey) {
      checks.push('Attempting to load Google Maps...');
      setStatus([...checks]);
    }
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Google Maps Debug Info</h2>
      <div className="space-y-2">
        {status.map((line, i) => (
          <div key={i} className="font-mono text-sm">
            {line}
          </div>
        ))}
      </div>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">Steps to fix:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Get API key from: <a href="https://console.cloud.google.com/" className="text-blue-600">Google Cloud Console</a></li>
          <li>Enable "Maps JavaScript API"</li>
          <li>Add to .env: REACT_APP_GOOGLE_MAPS_API_KEY=your_key</li>
          <li>Restart dev server: npm run dev</li>
        </ol>
      </div>
    </div>
  );
};
