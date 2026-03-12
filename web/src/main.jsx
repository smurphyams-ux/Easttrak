import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1 style={{ color: 'green' }}>✅ DumpsterTracker is Running!</h1>
      <p>If you can see this, React is working.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
